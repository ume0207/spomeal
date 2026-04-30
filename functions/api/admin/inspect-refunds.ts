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

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)

/**
 * POST /api/admin/inspect-refunds
 * body: { email: string, password: string }
 *
 * email に紐づく全Customer横断で、charges と refunds の詳細を出力する診断用。
 * inspect-billing よりも詳細にrefund状況を確認できる。
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const cors = corsHeaders(request)

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

  // 1. emailで全Customer取得
  const cRes = await fetch(
    `https://api.stripe.com/v1/customers?email=${encodeURIComponent(body.email)}&limit=20`,
    { headers: stripeAuth }
  )
  const cJson = await cRes.json() as { data: Array<{ id: string; email?: string }> }
  const customers = (cJson.data || []).filter(c => (c.email || '').toLowerCase() === body.email!.toLowerCase())

  const result = {
    email: body.email,
    customers: [] as unknown[],
    summary: { totalCharged: 0, totalRefunded: 0, netCharged: 0 },
  }

  for (const c of customers) {
    // 2. 各Customerのcharges取得
    const chRes = await fetch(
      `https://api.stripe.com/v1/charges?customer=${c.id}&limit=100`,
      { headers: stripeAuth }
    )
    const chJson = await chRes.json() as {
      data: Array<{
        id: string; status: string; amount: number; amount_refunded: number;
        refunded: boolean; created: number; currency: string;
      }>
    }

    const charges = []
    for (const ch of chJson.data || []) {
      // 3. 各chargeのrefunds取得
      const rRes = await fetch(
        `https://api.stripe.com/v1/refunds?charge=${ch.id}&limit=10`,
        { headers: stripeAuth }
      )
      const rJson = await rRes.json() as {
        data: Array<{ id: string; amount: number; status: string; created: number; reason?: string }>
      }
      charges.push({
        chargeId: ch.id,
        status: ch.status,
        amount: ch.amount,
        amount_refunded: ch.amount_refunded,
        refunded: ch.refunded,
        created: new Date(ch.created * 1000).toISOString(),
        currency: ch.currency,
        refunds: (rJson.data || []).map(r => ({
          id: r.id,
          amount: r.amount,
          status: r.status,
          reason: r.reason,
          created: new Date(r.created * 1000).toISOString(),
        })),
      })

      if (ch.status === 'succeeded') {
        result.summary.totalCharged += ch.amount
        result.summary.totalRefunded += ch.amount_refunded
      }
    }

    ;(result.customers as unknown[]).push({
      id: c.id,
      charges,
    })
  }

  result.summary.netCharged = result.summary.totalCharged - result.summary.totalRefunded

  return new Response(JSON.stringify(result, null, 2), { status: 200, headers: cors })
}
