import { corsHeaders, handleOptions } from '../../_shared/auth'

type PagesFunction<Env = Record<string, unknown>> = (context: {
  request: Request
  env: Env
}) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  STRIPE_SECRET_KEY: string
  ADMIN_DANGER_PASSWORD?: string
}

const DEFAULT_DANGER_PASSWORD = '0323@'

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

async function stripeRequest(
  secretKey: string,
  path: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: Record<string, string>
) {
  const headers: Record<string, string> = { 'Authorization': `Bearer ${secretKey}` }
  let bodyStr: string | undefined
  if (body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    bodyStr = new URLSearchParams(body).toString()
  }
  return fetch(`https://api.stripe.com/v1${path}`, { method, headers, body: bodyStr })
}

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)

/**
 * POST /api/admin/refund-past-charges
 * body: { userId?: string, email?: string, password: string, dryRun?: boolean }
 *
 * 「アカウントは残したまま、過去の決済を全額返金する」操作。
 * - サブスク／プロフィール／アカウントは一切触らない
 * - Stripe Charge を全件取得（最大100件）
 * - succeeded かつ未返金（または部分返金）のものを全額返金
 * - dryRun=true なら返金対象を一覧するだけで実行しない
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const cors = corsHeaders(request)

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'Supabase 環境変数が未設定' }), { status: 500, headers: cors })
  }
  if (!env.STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'Stripe 環境変数が未設定' }), { status: 500, headers: cors })
  }

  let body: { userId?: string; email?: string; password?: string; dryRun?: boolean }
  try {
    body = await request.json() as typeof body
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'JSON 解析失敗' }), { status: 400, headers: cors })
  }

  const expected = env.ADMIN_DANGER_PASSWORD || DEFAULT_DANGER_PASSWORD
  if (!body.password || !safeEqual(String(body.password), expected)) {
    return new Response(JSON.stringify({ ok: false, error: '追加パスワードが違います' }), { status: 401, headers: cors })
  }

  if (!body.userId && !body.email) {
    return new Response(JSON.stringify({ ok: false, error: 'userId または email が必要です' }), { status: 400, headers: cors })
  }

  const dryRun = body.dryRun === true

  const supaHeaders = {
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    'Content-Type': 'application/json',
  }

  const errors: string[] = []

  // userId 解決
  let userId = (body.userId || '').trim()
  let emailUsed = (body.email || '').trim()
  if (!userId && emailUsed) {
    try {
      const r = await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(emailUsed)}`,
        { headers: supaHeaders }
      )
      if (r.ok) {
        const j = await r.json() as { users?: Array<{ id: string; email?: string }> }
        const match = (j.users || []).find(u => (u.email || '').toLowerCase() === emailUsed.toLowerCase())
        if (match) { userId = match.id; emailUsed = match.email || emailUsed }
      }
    } catch (e) { errors.push(`ユーザー検索失敗: ${String(e)}`) }
  }

  if (!userId) {
    return new Response(
      JSON.stringify({ ok: false, error: 'ユーザーが見つかりません', email: emailUsed }),
      { status: 404, headers: cors }
    )
  }

  // Stripe Customer ID を取得
  let stripeCustomerId: string | null = null
  try {
    const pRes = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=stripe_customer_id`,
      { headers: supaHeaders }
    )
    if (pRes.ok) {
      const rows = await pRes.json() as Array<{ stripe_customer_id?: string }>
      stripeCustomerId = rows[0]?.stripe_customer_id || null
    }
  } catch (e) { errors.push(`profile 取得失敗: ${String(e)}`) }

  // 見つからなければ email でも検索
  if (!stripeCustomerId && emailUsed) {
    try {
      const url = `https://api.stripe.com/v1/customers?email=${encodeURIComponent(emailUsed)}&limit=10`
      const r = await fetch(url, { headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` } })
      if (r.ok) {
        const j = await r.json() as { data?: Array<{ id: string; email?: string }> }
        const match = (j.data || []).find(c => (c.email || '').toLowerCase() === emailUsed.toLowerCase())
        if (match) stripeCustomerId = match.id
      }
    } catch (e) { errors.push(`Stripe Customer 検索失敗: ${String(e)}`) }
  }

  if (!stripeCustomerId) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Stripe Customer が見つかりません', userId, email: emailUsed }),
      { status: 404, headers: cors }
    )
  }

  // Charge を全件取得（ページング）
  type Charge = {
    id: string
    status: string
    amount: number
    amount_refunded: number
    refunded: boolean
    currency: string
    created: number
    description?: string | null
  }
  const allCharges: Charge[] = []
  let startingAfter: string | null = null
  let fetchedPages = 0
  while (fetchedPages < 5) {
    // 100 × 5 = 最大500件まで対応（事実上充分）
    let url = `https://api.stripe.com/v1/charges?customer=${stripeCustomerId}&limit=100`
    if (startingAfter) url += `&starting_after=${startingAfter}`
    try {
      const r = await fetch(url, { headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` } })
      if (!r.ok) {
        errors.push(`charges 取得失敗: ${await r.text()}`)
        break
      }
      const j = await r.json() as { data: Charge[]; has_more: boolean }
      allCharges.push(...j.data)
      fetchedPages += 1
      if (!j.has_more || j.data.length === 0) break
      startingAfter = j.data[j.data.length - 1].id
    } catch (e) {
      errors.push(`charges 取得で例外: ${String(e)}`)
      break
    }
  }

  // 返金候補を抽出（succeeded で未返金 or 部分返金）
  const candidates = allCharges.filter(c =>
    c.status === 'succeeded' && c.amount > c.amount_refunded
  )

  const candidateInfo = candidates.map(c => ({
    id: c.id,
    amount: c.amount,
    amount_refunded: c.amount_refunded,
    refundable: c.amount - c.amount_refunded,
    currency: c.currency,
    created: new Date(c.created * 1000).toISOString(),
    description: c.description || null,
  }))
  const totalRefundable = candidateInfo.reduce((sum, c) => sum + c.refundable, 0)

  // dryRun ならここで返す
  if (dryRun) {
    return new Response(
      JSON.stringify({
        ok: true,
        dryRun: true,
        userId,
        email: emailUsed,
        stripeCustomerId,
        totalCharges: allCharges.length,
        refundCandidates: candidateInfo,
        totalRefundable,
        currency: candidateInfo[0]?.currency || 'jpy',
        errors,
      }),
      { status: 200, headers: cors }
    )
  }

  // 実行：候補を順次返金
  const refunded: Array<{ chargeId: string; amount: number; refundId: string }> = []
  let totalRefunded = 0
  for (const ch of candidates) {
    const refundable = ch.amount - ch.amount_refunded
    try {
      const refundRes = await stripeRequest(
        env.STRIPE_SECRET_KEY,
        '/refunds',
        'POST',
        { charge: ch.id, reason: 'requested_by_customer' }
      )
      if (refundRes.ok) {
        const refundJson = await refundRes.json() as { id: string }
        refunded.push({ chargeId: ch.id, amount: refundable, refundId: refundJson.id })
        totalRefunded += refundable
      } else {
        errors.push(`refund失敗(${ch.id}): ${await refundRes.text()}`)
      }
    } catch (e) {
      errors.push(`refund例外(${ch.id}): ${String(e)}`)
    }
  }

  return new Response(
    JSON.stringify({
      ok: errors.length === 0,
      dryRun: false,
      userId,
      email: emailUsed,
      stripeCustomerId,
      totalCharges: allCharges.length,
      refundedCount: refunded.length,
      totalRefunded,
      refunded,
      errors,
    }),
    { status: 200, headers: cors }
  )
}
