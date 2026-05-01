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

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)

/**
 * POST /api/admin/inspect-billing
 * body: { email: string, password: string }
 *
 * Stripe Customer の Invoice / PaymentIntent / Subscription を一括取得する診断用。
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

  // Stripe Customer 検索
  const stripeAuth = { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` }
  const cRes = await fetch(
    `https://api.stripe.com/v1/customers?email=${encodeURIComponent(body.email)}&limit=10`,
    { headers: stripeAuth }
  )
  const cJson = await cRes.json() as { data: Array<{ id: string; email?: string; created: number }> }
  const customers = (cJson.data || []).filter(c => (c.email || '').toLowerCase() === body.email!.toLowerCase())

  const result: Record<string, unknown> = { customers: [] }
  for (const c of customers) {
    const customerInfo: Record<string, unknown> = { id: c.id, created: new Date(c.created * 1000).toISOString() }

    // Invoices
    const iRes = await fetch(
      `https://api.stripe.com/v1/invoices?customer=${c.id}&limit=20`,
      { headers: stripeAuth }
    )
    const iJson = await iRes.json() as {
      data: Array<{
        id: string; status: string; amount_paid: number; amount_due: number;
        amount_remaining: number; created: number; total: number;
      }>
    }
    customerInfo.invoices = (iJson.data || []).map(i => ({
      id: i.id, status: i.status, amount_paid: i.amount_paid, amount_due: i.amount_due,
      amount_remaining: i.amount_remaining, total: i.total,
      created: new Date(i.created * 1000).toISOString(),
    }))

    // PaymentIntents（last_payment_error と latest_charge.outcome / failure_* を取得）
    const piRes = await fetch(
      `https://api.stripe.com/v1/payment_intents?customer=${c.id}&limit=20&expand[]=data.latest_charge`,
      { headers: stripeAuth }
    )
    type StripeChargeExpanded = {
      id: string
      status?: string
      failure_code?: string | null
      failure_message?: string | null
      outcome?: {
        network_status?: string
        reason?: string
        risk_level?: string
        seller_message?: string
        type?: string
      } | null
    }
    type StripePI = {
      id: string
      status: string
      amount: number
      created: number
      latest_charge?: string | StripeChargeExpanded | null
      last_payment_error?: {
        code?: string
        decline_code?: string
        message?: string
        type?: string
      } | null
    }
    const piJson = await piRes.json() as { data: StripePI[] }
    customerInfo.payment_intents = (piJson.data || []).map(p => {
      const charge: StripeChargeExpanded | null =
        p.latest_charge && typeof p.latest_charge === 'object' ? p.latest_charge : null
      return {
        id: p.id,
        status: p.status,
        amount: p.amount,
        created: new Date(p.created * 1000).toISOString(),
        last_payment_error: p.last_payment_error
          ? {
              code: p.last_payment_error.code || null,
              decline_code: p.last_payment_error.decline_code || null,
              message: p.last_payment_error.message || null,
              type: p.last_payment_error.type || null,
            }
          : null,
        charge: charge
          ? {
              id: charge.id,
              status: charge.status || null,
              failure_code: charge.failure_code || null,
              failure_message: charge.failure_message || null,
              outcome: charge.outcome || null,
            }
          : (typeof p.latest_charge === 'string' ? { id: p.latest_charge } : null),
      }
    })

    // Subscriptions
    const sRes = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${c.id}&status=all&limit=20`,
      { headers: stripeAuth }
    )
    const sJson = await sRes.json() as {
      data: Array<{
        id: string; status: string; trial_end?: number; current_period_end?: number;
        canceled_at?: number; created: number;
      }>
    }
    customerInfo.subscriptions = (sJson.data || []).map(s => ({
      id: s.id, status: s.status,
      trial_end: s.trial_end ? new Date(s.trial_end * 1000).toISOString() : null,
      current_period_end: s.current_period_end ? new Date(s.current_period_end * 1000).toISOString() : null,
      canceled_at: s.canceled_at ? new Date(s.canceled_at * 1000).toISOString() : null,
      created: new Date(s.created * 1000).toISOString(),
    }))

    ;(result.customers as unknown[]).push(customerInfo)
  }

  return new Response(JSON.stringify(result, null, 2), { status: 200, headers: cors })
}
