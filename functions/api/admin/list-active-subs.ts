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
 * POST /api/admin/list-active-subs
 * body: { password: string }
 *
 * Stripeから active / trialing / past_due な全サブスクを取得する診断用。
 * danger password 認証なので、ターミナルから直接叩ける。
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const cors = corsHeaders(request)

  let body: { password?: string }
  try {
    body = await request.json() as typeof body
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'JSON 解析失敗' }), { status: 400, headers: cors })
  }

  const expected = env.ADMIN_DANGER_PASSWORD || DEFAULT_DANGER_PASSWORD
  if (!body.password || !safeEqual(String(body.password), expected)) {
    return new Response(JSON.stringify({ ok: false, error: '追加パスワードが違います' }), { status: 401, headers: cors })
  }

  if (!env.STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'Stripe 環境変数が未設定' }), { status: 500, headers: cors })
  }

  const stripeAuth = { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` }

  // 全件ページング取得
  type Sub = {
    id: string
    status: string
    customer: { id: string; email?: string; name?: string } | string
    created?: number
    trial_end?: number | null
    current_period_end?: number | null
    items?: { data?: Array<{ price?: { unit_amount?: number; currency?: string }; plan?: { amount?: number } }> }
    metadata?: Record<string, string>
  }
  const allSubs: Sub[] = []
  let startingAfter: string | null = null
  for (let page = 0; page < 5; page++) {
    const url = new URL('https://api.stripe.com/v1/subscriptions')
    url.searchParams.set('status', 'all')
    url.searchParams.set('limit', '100')
    url.searchParams.append('expand[]', 'data.customer')
    if (startingAfter) url.searchParams.set('starting_after', startingAfter)
    const r = await fetch(url.toString(), { headers: stripeAuth })
    if (!r.ok) break
    const j = await r.json() as { data: Sub[]; has_more: boolean }
    allSubs.push(...j.data)
    if (!j.has_more || j.data.length === 0) break
    startingAfter = j.data[j.data.length - 1].id
  }

  // 全ステータスをマップして表示（カード登録途中のincompleteも含めて把握できるように）
  const list = allSubs.map(s => {
    const cust = typeof s.customer === 'string' ? { id: s.customer } : s.customer
    const item = s.items?.data?.[0]
    const amount = item?.price?.unit_amount ?? item?.plan?.amount ?? 0
    return {
      subId: s.id,
      status: s.status,
      customerId: cust.id,
      email: cust.email || '',
      name: cust.name || '',
      amount,
      created: s.created ? new Date(s.created * 1000).toISOString() : null,
      trial_end: s.trial_end ? new Date(s.trial_end * 1000).toISOString() : null,
      current_period_end: s.current_period_end ? new Date(s.current_period_end * 1000).toISOString() : null,
    }
  })

  // 開始日新しい順
  list.sort((a, b) => (b.created || '').localeCompare(a.created || ''))

  const billing = list.filter(s => ['active', 'trialing', 'past_due'].includes(s.status))
  const summary = {
    total_all: list.length,
    billing: billing.length,
    trialing: list.filter(s => s.status === 'trialing').length,
    active: list.filter(s => s.status === 'active').length,
    past_due: list.filter(s => s.status === 'past_due').length,
    incomplete: list.filter(s => s.status === 'incomplete').length,
    incomplete_expired: list.filter(s => s.status === 'incomplete_expired').length,
    canceled: list.filter(s => s.status === 'canceled').length,
    unpaid: list.filter(s => s.status === 'unpaid').length,
    totalMonthly: billing.reduce((sum, s) => sum + (s.amount || 0), 0),
  }

  return new Response(JSON.stringify({ ok: true, summary, list }, null, 2), { status: 200, headers: cors })
}
