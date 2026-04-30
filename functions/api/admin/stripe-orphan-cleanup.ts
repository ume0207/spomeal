import { corsHeaders, handleOptions } from '../../_shared/auth'

type PagesFunction<Env = Record<string, unknown>> = (context: {
  request: Request
  env: Env
}) => Promise<Response> | Response

interface Env {
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
 * POST /api/admin/stripe-orphan-cleanup
 * body: { email: string, password: string }
 *
 * Supabaseに紐づくユーザーがいない（孤立した）Stripe Customer の
 * サブスク全件キャンセル＋charges全件返金を行う。
 * Supabase側は一切触らない。
 *
 * 利用シーン：profile/auth削除済みなのに Stripe側だけ残ってサブスク
 * 自動更新で課金され続けるケース。
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const cors = corsHeaders(request)

  if (!env.STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'Stripe 環境変数が未設定' }), { status: 500, headers: cors })
  }

  let body: { email?: string; password?: string }
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

  const stripeAuth = { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` }
  const errors: string[] = []
  const email = body.email.trim()

  // 1. emailで全Customer取得
  const customers: Array<{ id: string }> = []
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

  if (customers.length === 0) {
    return new Response(
      JSON.stringify({ ok: false, error: '該当するStripe Customerが見つかりません', email, errors }),
      { status: 404, headers: cors }
    )
  }

  const cancelledSubs: Array<{ customerId: string; subId: string; status: string }> = []
  const refunded: Array<{ customerId: string; chargeId: string; amount: number; refundId: string }> = []
  let totalRefunded = 0

  for (const cust of customers) {
    // サブスク全件キャンセル
    try {
      const sRes = await fetch(
        `https://api.stripe.com/v1/subscriptions?customer=${cust.id}&status=all&limit=100`,
        { headers: stripeAuth }
      )
      if (sRes.ok) {
        const sJson = await sRes.json() as { data: Array<{ id: string; status: string }> }
        for (const sub of sJson.data || []) {
          if (sub.status === 'canceled') continue
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

    // charges全件返金
    type Charge = { id: string; status: string; amount: number; amount_refunded: number; refunded: boolean }
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

  return new Response(
    JSON.stringify({
      ok: errors.length === 0,
      email,
      customersFound: customers.map(c => c.id),
      cancelledSubs,
      refunded,
      totalRefunded,
      errors,
    }),
    { status: 200, headers: cors }
  )
}
