import { verifyAdmin, corsHeaders, handleOptions, authErrorResponse } from '../../_shared/auth'

type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  STRIPE_SECRET_KEY: string
  ADMIN_EMAILS?: string
}

// Stripe API呼び出しヘルパー
async function stripeRequest(
  secretKey: string,
  path: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: Record<string, string>
) {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${secretKey}`,
  }
  let bodyStr: string | undefined
  if (body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    bodyStr = new URLSearchParams(body).toString()
  }
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers,
    body: bodyStr,
  })
  return res
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  // 管理者認証
  const auth = await verifyAdmin(request, env)
  if (!auth.ok) return authErrorResponse(auth, request)

  const cors = corsHeaders(request)

  try {
    const body = await request.json() as { userId?: string }
    const { userId } = body

    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: 'userIdが必要です' }), { status: 400, headers: cors })
    }

    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'Supabase環境変数が設定されていません' }), { status: 500, headers: cors })
    }

    const supaHeaders = {
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    }

    // 1. profileからStripe情報を取得
    let stripeCustomerId: string | null = null
    let stripeSubscriptionId: string | null = null
    try {
      const pRes = await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=stripe_customer_id,stripe_subscription_id`,
        { headers: supaHeaders }
      )
      if (pRes.ok) {
        const rows = await pRes.json() as Array<{ stripe_customer_id?: string; stripe_subscription_id?: string }>
        stripeCustomerId = rows[0]?.stripe_customer_id || null
        stripeSubscriptionId = rows[0]?.stripe_subscription_id || null
      }
    } catch { /* ignore */ }

    // 2. Stripeサブスクリプションを期間終了時キャンセルに設定
    let periodEnd: number | null = null
    let scheduled = false
    if (env.STRIPE_SECRET_KEY && stripeSubscriptionId) {
      try {
        // まずsubscriptionの状態を取得
        const subRes = await stripeRequest(env.STRIPE_SECRET_KEY, `/subscriptions/${stripeSubscriptionId}`)
        if (subRes.ok) {
          const sub = await subRes.json() as { status: string; current_period_end: number; cancel_at_period_end: boolean }
          periodEnd = sub.current_period_end

          // アクティブなサブスクのみキャンセル予約
          if (sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due') {
            const cancelRes = await stripeRequest(
              env.STRIPE_SECRET_KEY,
              `/subscriptions/${stripeSubscriptionId}`,
              'POST',
              {
                'cancel_at_period_end': 'true',
                'metadata[pending_deletion]': 'true',
                'metadata[userId]': userId,
              }
            )
            if (cancelRes.ok) {
              scheduled = true
            }
          }
        }
      } catch (e) {
        console.error('Stripe cancel error:', e)
      }
    }

    // 3. 期間終了時に削除するフラグをprofilesに立てる
    if (scheduled && periodEnd) {
      try {
        await fetch(
          `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
          {
            method: 'PATCH',
            headers: supaHeaders,
            body: JSON.stringify({
              pending_deletion: true,
              scheduled_deletion_at: new Date(periodEnd * 1000).toISOString(),
              subscription_status: 'cancelling',
              updated_at: new Date().toISOString(),
            }),
          }
        )
      } catch { /* ignore */ }

      // サブスク期間中はアクセスを維持するため、この段階ではAuthユーザーは削除しない
      // webhook (customer.subscription.deleted) が期間終了時に完全削除を実行する
      return new Response(JSON.stringify({
        success: true,
        scheduled: true,
        scheduledDeletionAt: new Date(periodEnd * 1000).toISOString(),
        message: 'サブスク期間終了時に自動削除されます',
      }), { status: 200, headers: cors })
    }

    // 4. サブスクが無い/既にキャンセル済み → 即時削除
    const tables = ['meals', 'body_records', 'reservations']
    for (const table of tables) {
      try {
        await fetch(
          `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?user_id=eq.${userId}`,
          { method: 'DELETE', headers: supaHeaders }
        )
      } catch { /* ignore */ }
    }
    try {
      await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
        { method: 'DELETE', headers: supaHeaders }
      )
    } catch { /* ignore */ }

    // Stripe Customerも削除（サブスクが無い場合）
    if (env.STRIPE_SECRET_KEY && stripeCustomerId) {
      try {
        await stripeRequest(env.STRIPE_SECRET_KEY, `/customers/${stripeCustomerId}`, 'DELETE')
      } catch { /* ignore */ }
    }

    // Supabase Authユーザー削除
    const delRes = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`,
      { method: 'DELETE', headers: supaHeaders }
    )
    if (!delRes.ok) {
      const errText = await delRes.text()
      return new Response(JSON.stringify({ success: false, error: `削除に失敗しました: ${errText}` }), { status: 500, headers: cors })
    }

    return new Response(JSON.stringify({
      success: true,
      scheduled: false,
      message: '即時削除しました',
    }), { status: 200, headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), { status: 500, headers: cors })
  }
}

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)
