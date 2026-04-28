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
 * POST /api/admin/full-free-conversion
 * body: { email: string, password: string, plan?: 'light'|'standard'|'premium' }
 *
 * 「課金は完全停止＋過去の決済を全額返金、機能はそのまま」操作。
 * - email に紐づく Stripe Customer を全件取得
 * - 各 Customer の active/trialing/past_due な subscription を全件キャンセル
 * - 各 Customer の Charge を全件取得 → succeeded で未/部分返金のものを全額返金
 * - profile を subscription_status='active' / subscription_plan=plan に更新
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const cors = corsHeaders(request)

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'Supabase 環境変数が未設定' }), { status: 500, headers: cors })
  }
  if (!env.STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'Stripe 環境変数が未設定' }), { status: 500, headers: cors })
  }

  let body: { email?: string; password?: string; plan?: 'light' | 'standard' | 'premium' }
  try {
    body = await request.json() as typeof body
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'JSON 解析失敗' }), { status: 400, headers: cors })
  }

  const expected = env.ADMIN_DANGER_PASSWORD || DEFAULT_DANGER_PASSWORD
  if (!body.password || !safeEqual(String(body.password), expected)) {
    return new Response(JSON.stringify({ ok: false, error: '追加パスワードが違います' }), { status: 401, headers: cors })
  }

  if (!body.email) {
    return new Response(JSON.stringify({ ok: false, error: 'email が必要です' }), { status: 400, headers: cors })
  }

  const grantedPlan: 'light' | 'standard' | 'premium' = body.plan && ['light', 'standard', 'premium'].includes(body.plan)
    ? body.plan
    : 'premium'

  const supaHeaders = {
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    'Content-Type': 'application/json',
  }
  const stripeAuth = { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` }

  const errors: string[] = []
  const email = body.email.trim()

  // 1. Supabase user を解決
  let userId = ''
  try {
    const r = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      { headers: supaHeaders }
    )
    if (r.ok) {
      const j = await r.json() as { users?: Array<{ id: string; email?: string }> }
      const match = (j.users || []).find(u => (u.email || '').toLowerCase() === email.toLowerCase())
      if (match) userId = match.id
    }
  } catch (e) { errors.push(`ユーザー検索失敗: ${String(e)}`) }

  if (!userId) {
    return new Response(
      JSON.stringify({ ok: false, error: 'ユーザーが見つかりません', email }),
      { status: 404, headers: cors }
    )
  }

  // 2. このメールに紐づく Stripe Customer を全件取得
  const customers: Array<{ id: string; email?: string }> = []
  try {
    const r = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=100`,
      { headers: stripeAuth }
    )
    if (r.ok) {
      const j = await r.json() as { data: Array<{ id: string; email?: string }> }
      customers.push(...j.data.filter(c => (c.email || '').toLowerCase() === email.toLowerCase()))
    } else {
      errors.push(`Stripe Customer 検索失敗: ${await r.text()}`)
    }
  } catch (e) { errors.push(`Stripe Customer 検索で例外: ${String(e)}`) }

  // 3. 各 Customer ごとにサブスク全件キャンセル＋ charge 全件返金
  const cancelledSubs: Array<{ customerId: string; subId: string; status: string }> = []
  const refunded: Array<{ customerId: string; chargeId: string; amount: number; refundId: string }> = []
  let totalRefunded = 0

  for (const cust of customers) {
    // サブスク取得（status=all で過去のキャンセル済みも含む全件）
    try {
      const sRes = await fetch(
        `https://api.stripe.com/v1/subscriptions?customer=${cust.id}&status=all&limit=100`,
        { headers: stripeAuth }
      )
      if (sRes.ok) {
        const sJson = await sRes.json() as { data: Array<{ id: string; status: string }> }
        for (const sub of sJson.data || []) {
          if (sub.status === 'canceled') continue
          // active / trialing / past_due / incomplete は即時キャンセル
          const dRes = await stripeRequest(env.STRIPE_SECRET_KEY, `/subscriptions/${sub.id}`, 'DELETE')
          if (dRes.ok) {
            cancelledSubs.push({ customerId: cust.id, subId: sub.id, status: sub.status })
          } else {
            const t = await dRes.text()
            if (!t.includes('No such subscription') && !t.includes('canceled')) {
              errors.push(`サブスク解約失敗(${sub.id}): ${t}`)
            }
          }
        }
      } else {
        errors.push(`サブスク取得失敗(${cust.id}): ${await sRes.text()}`)
      }
    } catch (e) { errors.push(`サブスク処理で例外(${cust.id}): ${String(e)}`) }

    // charge 取得（ページング、最大500件）
    type Charge = {
      id: string; status: string; amount: number; amount_refunded: number; refunded: boolean
    }
    const charges: Charge[] = []
    let startingAfter: string | null = null
    for (let page = 0; page < 5; page++) {
      let url = `https://api.stripe.com/v1/charges?customer=${cust.id}&limit=100`
      if (startingAfter) url += `&starting_after=${startingAfter}`
      try {
        const r = await fetch(url, { headers: stripeAuth })
        if (!r.ok) {
          errors.push(`charges 取得失敗(${cust.id}): ${await r.text()}`)
          break
        }
        const j = await r.json() as { data: Charge[]; has_more: boolean }
        charges.push(...j.data)
        if (!j.has_more || j.data.length === 0) break
        startingAfter = j.data[j.data.length - 1].id
      } catch (e) { errors.push(`charges 取得で例外(${cust.id}): ${String(e)}`); break }
    }
    // 返金実行
    for (const ch of charges) {
      const refundable = ch.amount - ch.amount_refunded
      if (ch.status !== 'succeeded' || refundable <= 0) continue
      try {
        const rRes = await stripeRequest(env.STRIPE_SECRET_KEY, '/refunds', 'POST', {
          charge: ch.id, reason: 'requested_by_customer',
        })
        if (rRes.ok) {
          const rJson = await rRes.json() as { id: string }
          refunded.push({ customerId: cust.id, chargeId: ch.id, amount: refundable, refundId: rJson.id })
          totalRefunded += refundable
        } else {
          errors.push(`refund失敗(${ch.id}): ${await rRes.text()}`)
        }
      } catch (e) { errors.push(`refund例外(${ch.id}): ${String(e)}`) }
    }
  }

  // 4. profile を active/premium に強制
  let profileUpdated = false
  const tryPatch = async (field: string, value: unknown): Promise<boolean> => {
    try {
      const r = await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
        { method: 'PATCH', headers: supaHeaders, body: JSON.stringify({ [field]: value }) }
      )
      return r.ok
    } catch { return false }
  }
  const sOk = await tryPatch('subscription_status', 'active')
  const pOk = await tryPatch('subscription_plan', grantedPlan)
  profileUpdated = sOk && pOk
  await tryPatch('is_free_account', true).catch(() => false)

  return new Response(
    JSON.stringify({
      ok: errors.length === 0,
      userId,
      email,
      plan: grantedPlan,
      customersFound: customers.map(c => c.id),
      cancelledSubs,
      refunded,
      totalRefunded,
      profileUpdated,
      errors,
    }),
    { status: 200, headers: cors }
  )
}
