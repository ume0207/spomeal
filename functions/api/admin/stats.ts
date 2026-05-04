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
    // ★Supabase profiles を主データソースに
    // Stripe側はキャンセル・売上集計だけ使う（趣旨: Spomealのユーザー状態は profiles が正本）
    const supabaseHeaders = {
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    }
    const thisMonthStartDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const thisMonthStartIso = thisMonthStartDate.toISOString()
    const thisMonthStartUnix = Math.floor(thisMonthStartDate.getTime() / 1000)

    // 並列取得: profiles 全件 + auth users 総数 + Stripe 補助データ
    const [profilesRes, authRes, cancelledSubs, charges] = await Promise.all([
      // profiles 全件（subscription_status・subscription_plan・is_free_account・created_at だけ）
      fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=subscription_status,subscription_plan,is_free_account,created_at&limit=10000`,
        { headers: supabaseHeaders }
      ),
      // 総会員数（auth.users）
      fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1`,
        { headers: supabaseHeaders }
      ),
      // Stripe: 直近30日の解約数（解約率算出用）
      stripeGet('subscriptions?status=canceled&limit=100&created[gte]=' + Math.floor(Date.now() / 1000 - 30 * 86400), env.STRIPE_SECRET_KEY),
      // Stripe: 今月の支払い（売上算出用）
      stripeGet('charges?limit=100&created[gte]=' + thisMonthStartUnix, env.STRIPE_SECRET_KEY),
    ]) as [
      Response,
      Response,
      { data: StripeSubscription[] },
      { data: StripeCharge[] },
    ]

    type Profile = {
      subscription_status?: string | null
      subscription_plan?: string | null
      is_free_account?: boolean | null
      created_at?: string | null
    }
    const profiles = (profilesRes.ok ? await profilesRes.json() : []) as Profile[]
    const authData = (authRes.ok ? await authRes.json() : { total: 0 }) as { total?: number }
    const totalMembers = authData.total || 0

    // ★profilesベースの集計
    let trialing = 0
    let active = 0
    let pastDue = 0
    let unsubscribed = 0      // 未契約（status null/空 or no_customer 等）
    let freeAccount = 0       // is_free_account=true
    let newThisMonth = 0      // 今月の新規プロフィール作成数
    const planCount: Record<string, number> = { light: 0, standard: 0, premium: 0 }

    for (const p of profiles) {
      const status = (p.subscription_status || '').toLowerCase()
      const plan = (p.subscription_plan || '').toLowerCase()

      if (p.is_free_account) freeAccount++

      if (status === 'trialing') trialing++
      else if (status === 'active') {
        active++
        if (plan === 'light') planCount.light++
        else if (plan === 'standard') planCount.standard++
        else if (plan === 'premium') planCount.premium++
      }
      else if (status === 'past_due') pastDue++
      else unsubscribed++  // null・''・no_customer・unpaid・canceled・deleted など

      if (p.created_at && p.created_at >= thisMonthStartIso) {
        newThisMonth++
      }
    }

    // ※ 「auth.usersにいるが profiles にまだ無い」ユーザーは unsubscribed としてカウントされない
    //   → 差分を取って unsubscribed に追加（より正確な未契約数を出す）
    const unsubscribedTotal = Math.max(unsubscribed, totalMembers - profiles.length)

    // 売上（今月の成功した支払い合計）
    const monthlyRevenue = (charges.data || [])
      .filter((c) => c.status === 'succeeded')
      .reduce((sum, c) => sum + c.amount, 0)

    // 解約率・継続率（直近30日 = active + 解約 のうち解約割合）
    const totalLast30 = active + (cancelledSubs.data?.length || 0)
    const churnRate = totalLast30 > 0 ? Math.round((cancelledSubs.data?.length || 0) / totalLast30 * 100) : 0
    const retentionRate = 100 - churnRate

    const body = JSON.stringify({
      totalMembers,
      trialing,
      active,
      pastDue,
      unsubscribed: unsubscribedTotal,
      freeAccount,
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
