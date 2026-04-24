import { verifyAdmin, corsHeaders, handleOptions, authErrorResponse } from '../../_shared/auth'
import { invalidateMembersCache, invalidateStatsCache, invalidateMealFeedCache, invalidateBodyFeedCache } from '../../_shared/admin-cache'

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
  // 危険操作（返金＋即時削除）用の追加パスワード
  // ダッシュボードに環境変数として設定してもよいが、未設定時は既定値にフォールバック
  ADMIN_DANGER_PASSWORD?: string
}

// 「返金 + 即時削除」専用の追加パスワード。
// ※ ユーザー指示により既定値を設定。Cloudflare 環境変数 ADMIN_DANGER_PASSWORD が
//    設定されていればそちらを優先。
const DEFAULT_DANGER_PASSWORD = '0323@'

// タイミング攻撃耐性のある文字列比較
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
 * POST /api/admin/refund-and-delete
 * body: { userId?: string, email?: string, password: string }
 *
 * 処理内容:
 *   1. 追加パスワード検証
 *   2. userId または email から Supabase ユーザー / Stripe 顧客情報を特定
 *   3. Stripe: 最新の支払いを全額返金（refund）
 *   4. Stripe: サブスクを即時キャンセル（cancel_at_period_end ではない）
 *   5. Stripe: Customer を削除
 *   6. Supabase: meal_records / body_records / reservations / user_points /
 *               user_goals / nutritionist_comments / profiles を削除
 *   7. Supabase Auth: ユーザーを削除
 *   8. 管理者キャッシュを無効化
 *
 * 返金・サブスク解約・削除のいずれかで失敗があっても、他のステップは極力進める
 * （best-effort）。最終的に errors 配列として結果を返す。
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env, waitUntil } = context
  const cors = corsHeaders(request)

  // 1. 管理者認証（HMAC）
  const auth = await verifyAdmin(request, env)
  if (!auth.ok) return authErrorResponse(auth, request)

  try {
    const body = await request.json() as { userId?: string; email?: string; password?: string }
    const { userId: rawUserId, email: rawEmail, password } = body

    // 2. 追加パスワード検証
    const expected = env.ADMIN_DANGER_PASSWORD || DEFAULT_DANGER_PASSWORD
    if (!password || !safeEqual(String(password), expected)) {
      return new Response(
        JSON.stringify({ success: false, error: '追加パスワードが違います' }),
        { status: 401, headers: cors }
      )
    }

    if (!rawUserId && !rawEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId または email が必要です' }),
        { status: 400, headers: cors }
      )
    }

    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Supabase環境変数が未設定' }),
        { status: 500, headers: cors }
      )
    }

    const supaHeaders = {
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    }

    const errors: string[] = []
    const steps: Record<string, unknown> = {}

    // 3. userId を email から解決（必要なら Auth Admin API で検索）
    let userId: string | null = rawUserId || null
    let emailUsed: string | null = rawEmail || null
    if (!userId && rawEmail) {
      try {
        const searchUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(rawEmail)}`
        const r = await fetch(searchUrl, { headers: supaHeaders })
        if (r.ok) {
          const j = await r.json() as { users?: Array<{ id: string; email?: string }> }
          const match = (j.users || []).find(u => (u.email || '').toLowerCase() === rawEmail.toLowerCase())
          if (match) { userId = match.id; emailUsed = match.email || rawEmail }
        }
      } catch (e) { errors.push(`ユーザー検索失敗: ${String(e)}`) }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: '該当するユーザーが見つかりません', email: rawEmail }),
        { status: 404, headers: cors }
      )
    }

    // 4. profile から Stripe 情報を取得
    let stripeCustomerId: string | null = null
    let stripeSubscriptionId: string | null = null
    try {
      const pRes = await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=stripe_customer_id,stripe_subscription_id,email`,
        { headers: supaHeaders }
      )
      if (pRes.ok) {
        const rows = await pRes.json() as Array<{ stripe_customer_id?: string; stripe_subscription_id?: string; email?: string }>
        stripeCustomerId = rows[0]?.stripe_customer_id || null
        stripeSubscriptionId = rows[0]?.stripe_subscription_id || null
        if (!emailUsed) emailUsed = rows[0]?.email || null
      }
    } catch (e) { errors.push(`profile 取得失敗: ${String(e)}`) }

    // 5. Stripe: 最新の支払いを返金（最新の成功した Charge を全額 refund）
    let refundedCount = 0
    let refundedAmount = 0
    if (env.STRIPE_SECRET_KEY && stripeCustomerId) {
      try {
        // 最新の charges 10件を取得し、succeeded かつ未返金のものを全額返金
        const chRes = await stripeRequest(env.STRIPE_SECRET_KEY, `/charges?customer=${stripeCustomerId}&limit=10`)
        if (chRes.ok) {
          const chJson = await chRes.json() as {
            data: Array<{ id: string; status: string; amount: number; amount_refunded: number; refunded: boolean }>
          }
          for (const ch of chJson.data || []) {
            if (ch.status === 'succeeded' && !ch.refunded && ch.amount > ch.amount_refunded) {
              const refundRes = await stripeRequest(
                env.STRIPE_SECRET_KEY,
                '/refunds',
                'POST',
                { charge: ch.id, reason: 'requested_by_customer' }
              )
              if (refundRes.ok) {
                refundedCount += 1
                refundedAmount += (ch.amount - ch.amount_refunded)
              } else {
                const errTxt = await refundRes.text()
                errors.push(`refund失敗(${ch.id}): ${errTxt}`)
              }
            }
          }
        } else {
          errors.push(`charges取得失敗: ${await chRes.text()}`)
        }
      } catch (e) { errors.push(`返金処理で例外: ${String(e)}`) }
    }
    steps.refund = { count: refundedCount, amount: refundedAmount }

    // 6. Stripe: サブスクを即時キャンセル
    let subscriptionCancelled = false
    if (env.STRIPE_SECRET_KEY && stripeSubscriptionId) {
      try {
        const delRes = await stripeRequest(
          env.STRIPE_SECRET_KEY,
          `/subscriptions/${stripeSubscriptionId}`,
          'DELETE'
        )
        subscriptionCancelled = delRes.ok
        if (!delRes.ok) {
          const t = await delRes.text()
          // 既にキャンセル済みならエラー扱いしない
          if (!t.includes('No such subscription') && !t.includes('canceled')) {
            errors.push(`サブスク解約失敗: ${t}`)
          } else {
            subscriptionCancelled = true
          }
        }
      } catch (e) { errors.push(`サブスク解約で例外: ${String(e)}`) }
    }
    steps.subscriptionCancelled = subscriptionCancelled

    // 7. Stripe: Customer を削除
    let customerDeleted = false
    if (env.STRIPE_SECRET_KEY && stripeCustomerId) {
      try {
        const r = await stripeRequest(env.STRIPE_SECRET_KEY, `/customers/${stripeCustomerId}`, 'DELETE')
        customerDeleted = r.ok
        if (!r.ok) errors.push(`Stripe Customer 削除失敗: ${await r.text()}`)
      } catch (e) { errors.push(`Stripe Customer 削除で例外: ${String(e)}`) }
    }
    steps.customerDeleted = customerDeleted

    // 8. Supabase: 関連テーブル削除（delete-member.ts と同じ）
    const tables = ['meal_records', 'body_records', 'reservations', 'user_points', 'user_goals', 'nutritionist_comments']
    for (const table of tables) {
      try {
        await fetch(
          `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?user_id=eq.${userId}`,
          { method: 'DELETE', headers: supaHeaders }
        )
      } catch { /* ignore */ }
    }

    // profiles は id=userId
    try {
      await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
        { method: 'DELETE', headers: supaHeaders }
      )
    } catch { /* ignore */ }

    // 9. Supabase Auth ユーザー削除
    let authDeleted = false
    try {
      const delRes = await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`,
        { method: 'DELETE', headers: supaHeaders }
      )
      authDeleted = delRes.ok
      if (!delRes.ok) errors.push(`Auth ユーザー削除失敗: ${await delRes.text()}`)
    } catch (e) { errors.push(`Auth 削除で例外: ${String(e)}`) }
    steps.authDeleted = authDeleted

    // 10. 管理画面キャッシュ無効化
    invalidateMembersCache(waitUntil)
    invalidateStatsCache(waitUntil)
    invalidateMealFeedCache(waitUntil)
    invalidateBodyFeedCache(waitUntil)

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        userId,
        email: emailUsed,
        stripeCustomerId,
        stripeSubscriptionId,
        steps,
        errors,
      }),
      { status: 200, headers: cors }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: cors }
    )
  }
}
