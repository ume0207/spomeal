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

async function stripeGet(path: string, secretKey: string) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { 'Authorization': `Bearer ${secretKey}` },
  })
  return res.json()
}

// Cloudflare Edge Cache 用の固定キー。全管理者で共有できる global data のため
// URL ベースのシンプルなキーで十分（TTL は Cache-Control ヘッダで制御）。
const CACHE_KEY_URL = 'https://cache.internal/admin/stats/v2'
const CACHE_TTL_SECONDS = 60

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request, waitUntil } = context

  // 管理者認証
  const auth = await verifyAdmin(request, env)
  if (!auth.ok) return authErrorResponse(auth, request)

  const cors = corsHeaders(request)

  // Cloudflare Edge Cache をチェック
  const cache = (globalThis as unknown as { caches: { default: Cache } }).caches?.default
  const cacheKey = new Request(CACHE_KEY_URL)
  if (cache) {
    try {
      const cached = await cache.match(cacheKey)
      if (cached) {
        const body = await cached.text()
        return new Response(body, { status: 200, headers: { ...cors, 'X-Cache': 'HIT' } })
      }
    } catch {
      // キャッシュ読み出し失敗時は通常処理
    }
  }

  try {
    // Stripe: サブスクリプション一覧取得
    const [activeSubs, trialSubs, cancelledSubs, charges] = await Promise.all([
      stripeGet('subscriptions?status=active&limit=100&expand[]=data.items.data.price', env.STRIPE_SECRET_KEY),
      stripeGet('subscriptions?status=trialing&limit=100&expand[]=data.items.data.price', env.STRIPE_SECRET_KEY),
      stripeGet('subscriptions?status=canceled&limit=100&created[gte]=' + Math.floor(Date.now() / 1000 - 30 * 86400), env.STRIPE_SECRET_KEY),
      stripeGet('charges?limit=100&created[gte]=' + Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000), env.STRIPE_SECRET_KEY),
    ]) as [
      { data: StripeSubscription[] },
      { data: StripeSubscription[] },
      { data: StripeSubscription[] },
      { data: StripeCharge[] },
    ]

    // プラン別カウント（アクティブ）
    const planCount: Record<string, number> = { light: 0, standard: 0, premium: 0 }
    for (const sub of activeSubs.data || []) {
      const nickname = sub.items?.data?.[0]?.price?.nickname?.toLowerCase() || ''
      if (nickname.includes('light') || nickname.includes('ライト')) planCount.light++
      else if (nickname.includes('standard') || nickname.includes('スタンダード')) planCount.standard++
      else if (nickname.includes('premium') || nickname.includes('プレミアム')) planCount.premium++
      else planCount.light++ // デフォルト
    }

    // 今月の新規契約数
    const thisMonthStart = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000)
    const newThisMonth = [...(activeSubs.data || []), ...(trialSubs.data || [])].filter(
      (s) => s.created >= thisMonthStart
    ).length

    // 売上（今月の成功した支払い合計）
    const monthlyRevenue = (charges.data || [])
      .filter((c) => c.status === 'succeeded')
      .reduce((sum, c) => sum + c.amount, 0)

    // 解約率・継続率（直近30日）
    const totalLast30 = (activeSubs.data?.length || 0) + (cancelledSubs.data?.length || 0)
    const churnRate = totalLast30 > 0 ? Math.round((cancelledSubs.data?.length || 0) / totalLast30 * 100) : 0
    const retentionRate = 100 - churnRate

    // Supabase: 会員数
    const supaRes = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1`,
      { headers: { 'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'apikey': env.SUPABASE_SERVICE_ROLE_KEY } }
    )
    const supaData = await supaRes.json() as { total?: number }
    const totalMembers = supaData.total || 0

    const body = JSON.stringify({
      totalMembers,
      trialing: trialSubs.data?.length || 0,
      active: activeSubs.data?.length || 0,
      cancelled30d: cancelledSubs.data?.length || 0,
      planCount,
      newThisMonth,
      monthlyRevenue: Math.round(monthlyRevenue),
      churnRate,
      retentionRate,
    })

    // Edge Cache に保存（60秒）
    if (cache) {
      try {
        const cacheResp = new Response(body, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
          },
        })
        const putPromise = cache.put(cacheKey, cacheResp)
        if (waitUntil) {
          waitUntil(putPromise)
        } else {
          putPromise.catch(() => {})
        }
      } catch {
        // キャッシュ書き込み失敗は無視
      }
    }

    return new Response(body, { status: 200, headers: { ...cors, 'X-Cache': 'MISS' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors })
  }
}

interface StripeSubscription {
  created: number
  status: string
  items?: { data: Array<{ price?: { nickname?: string } }> }
}

interface StripeCharge {
  status: string
  amount: number
}

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)
