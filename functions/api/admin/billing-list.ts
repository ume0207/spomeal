import { verifyAdmin, corsHeaders, handleOptions, authErrorResponse } from '../../_shared/auth'

type PagesFunction<Env = Record<string, unknown>> = (context: {
  request: Request
  env: Env
  waitUntil?: (p: Promise<unknown>) => void
}) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  STRIPE_SECRET_KEY: string
  ADMIN_EMAILS?: string
}

/**
 * Stripe からサブスク一覧を取得し、Spomeal の課金中ユーザーをまとめて返す。
 * - status=all で取得して trialing/active/past_due/canceled もすべて含める
 * - 顧客（customer）の email/name/created も同時取得
 * - Spomeal 側 profiles の display 情報（full_name など）も付与
 *
 * GET /api/admin/billing-list?status=active
 *   status: 'active' | 'trialing' | 'all' (default: active+trialing)
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const cors = corsHeaders(request)

  // 管理者認証
  const auth = await verifyAdmin(request, env)
  if (!auth.ok) return authErrorResponse(auth, request)

  if (!env.STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ error: 'STRIPE_SECRET_KEY not configured' }), { status: 500, headers: cors })
  }

  const url = new URL(request.url)
  const statusFilter = url.searchParams.get('status') || 'all'

  try {
    // Stripe: 全サブスクリプションを取得（最大100件、expand で customer も同時取得）
    const stripeUrl = new URL('https://api.stripe.com/v1/subscriptions')
    stripeUrl.searchParams.set('status', statusFilter === 'all' ? 'all' : statusFilter)
    stripeUrl.searchParams.set('limit', '100')
    stripeUrl.searchParams.append('expand[]', 'data.customer')

    const subRes = await fetch(stripeUrl.toString(), {
      headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` },
    })

    if (!subRes.ok) {
      const errTxt = await subRes.text()
      return new Response(JSON.stringify({ error: 'Stripe API error', detail: errTxt }), { status: 500, headers: cors })
    }

    interface StripeCustomer {
      id: string
      email?: string
      name?: string
      created?: number
      deleted?: boolean
    }

    interface StripePlan {
      id: string
      nickname?: string
      product?: string
      amount?: number
      currency?: string
      interval?: string
    }

    interface StripeSubItem {
      price?: { id: string; product?: string; unit_amount?: number; currency?: string; recurring?: { interval?: string } }
      plan?: StripePlan
    }

    interface StripeSub {
      id: string
      status: string
      customer: string | StripeCustomer
      current_period_start?: number
      current_period_end?: number
      cancel_at_period_end?: boolean
      canceled_at?: number | null
      created?: number
      items?: { data?: StripeSubItem[] }
      metadata?: Record<string, string>
    }

    const subData = await subRes.json() as { data: StripeSub[]; has_more?: boolean }

    // active / trialing / past_due だけ抽出（cancelled は除外）
    const billingStatuses = ['active', 'trialing', 'past_due']
    const billing = (subData.data || []).filter(s => billingStatuses.includes(s.status))

    // Supabase profiles から full_name 情報を引く（並列）
    const customerIds = billing
      .map(s => (typeof s.customer === 'string' ? s.customer : s.customer.id))
      .filter(Boolean)

    let profileByCustomerId: Record<string, { full_name?: string; email?: string; user_id?: string; plan_id?: string }> = {}
    if (customerIds.length > 0 && env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const idsParam = customerIds.map(id => `"${id}"`).join(',')
        const profRes = await fetch(
          `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?stripe_customer_id=in.(${idsParam})&select=id,email,full_name,stripe_customer_id,plan_id`,
          {
            headers: {
              'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            },
          }
        )
        if (profRes.ok) {
          const rows = await profRes.json() as Array<{ id?: string; email?: string; full_name?: string; stripe_customer_id?: string; plan_id?: string }>
          profileByCustomerId = Object.fromEntries(
            rows
              .filter(r => r.stripe_customer_id)
              .map(r => [r.stripe_customer_id!, { full_name: r.full_name, email: r.email, user_id: r.id, plan_id: r.plan_id }])
          )
        }
      } catch { /* ignore */ }
    }

    const list = billing.map(s => {
      const cust = typeof s.customer === 'string'
        ? { id: s.customer } as StripeCustomer
        : s.customer
      const item = s.items?.data?.[0]
      const amount = item?.price?.unit_amount ?? item?.plan?.amount ?? 0
      const currency = item?.price?.currency ?? item?.plan?.currency ?? 'jpy'
      const interval = item?.price?.recurring?.interval ?? item?.plan?.interval ?? 'month'
      const profile = profileByCustomerId[cust.id]

      return {
        subscriptionId: s.id,
        status: s.status,
        cancelAtPeriodEnd: s.cancel_at_period_end || false,
        currentPeriodStart: s.current_period_start ? new Date(s.current_period_start * 1000).toISOString() : null,
        currentPeriodEnd: s.current_period_end ? new Date(s.current_period_end * 1000).toISOString() : null,
        createdAt: s.created ? new Date(s.created * 1000).toISOString() : null,
        amount, currency, interval,
        customer: {
          id: cust.id,
          email: cust.email || profile?.email || '',
          stripeName: cust.name || '',
          appName: profile?.full_name || '',
          appUserId: profile?.user_id || null,
          appPlanId: profile?.plan_id || null,
        },
      }
    })

    // 開始日順（新しい順）にソート
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))

    const totalMonthlyJpy = list.reduce((sum, s) => sum + (s.amount || 0), 0)

    return new Response(
      JSON.stringify({
        count: list.length,
        totalMonthlyJpy,
        hasMore: !!subData.has_more,
        list,
      }),
      { status: 200, headers: cors }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors })
  }
}

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)
