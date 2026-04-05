// ユーザー自身による退会リクエスト / キャンセル
// Stripeのcancel_at_period_endを立てて、サブスク期間終了時に自動削除される
// 期間中は引き続きサービス利用可能、期間終了時にwebhookで完全削除される

type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  STRIPE_SECRET_KEY: string
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
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

// Authorizationヘッダーのユーザートークンからuser_idを取得
async function getAuthedUserId(supabaseUrl: string, serviceRoleKey: string, authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': serviceRoleKey,
    },
  })
  if (!res.ok) return null
  const data = await res.json() as { id?: string }
  return data.id || null
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  try {
    const userId = await getAuthedUserId(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      request.headers.get('Authorization')
    )
    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: '認証が必要です' }), { status: 401, headers: cors })
    }

    const body = await request.json().catch(() => ({})) as { action?: 'request' | 'cancel' }
    const action = body.action || 'request'

    const supaHeaders = {
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    }

    // profile取得
    const pRes = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=stripe_customer_id,stripe_subscription_id,subscription_status`,
      { headers: supaHeaders }
    )
    const profiles = pRes.ok ? await pRes.json() as Array<{
      stripe_customer_id?: string
      stripe_subscription_id?: string
      subscription_status?: string
    }> : []
    const profile = profiles[0]

    // ============================================================
    // action === 'cancel': 退会申請を取り消し
    // ============================================================
    if (action === 'cancel') {
      if (profile?.stripe_subscription_id && env.STRIPE_SECRET_KEY) {
        try {
          await stripeRequest(
            env.STRIPE_SECRET_KEY,
            `/subscriptions/${profile.stripe_subscription_id}`,
            'POST',
            {
              'cancel_at_period_end': 'false',
              'metadata[pending_deletion]': '',
            }
          )
        } catch { /* ignore */ }
      }
      // profilesのフラグを解除
      await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: supaHeaders,
          body: JSON.stringify({
            pending_deletion: false,
            scheduled_deletion_at: null,
            subscription_status: 'active',
            subscription_cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          }),
        }
      )
      return new Response(JSON.stringify({
        success: true,
        message: '退会申請を取り消しました',
      }), { status: 200, headers: cors })
    }

    // ============================================================
    // action === 'request': 退会申請
    // ============================================================
    let periodEnd: number | null = null
    let scheduled = false

    if (env.STRIPE_SECRET_KEY && profile?.stripe_subscription_id) {
      try {
        const subRes = await stripeRequest(env.STRIPE_SECRET_KEY, `/subscriptions/${profile.stripe_subscription_id}`)
        if (subRes.ok) {
          const sub = await subRes.json() as { status: string; current_period_end: number }
          periodEnd = sub.current_period_end
          if (['active', 'trialing', 'past_due'].includes(sub.status)) {
            const cancelRes = await stripeRequest(
              env.STRIPE_SECRET_KEY,
              `/subscriptions/${profile.stripe_subscription_id}`,
              'POST',
              {
                'cancel_at_period_end': 'true',
                'metadata[pending_deletion]': 'true',
                'metadata[userId]': userId,
              }
            )
            if (cancelRes.ok) scheduled = true
          }
        }
      } catch (e) {
        console.error('Stripe cancel error:', e)
      }
    }

    if (scheduled && periodEnd) {
      const scheduledAt = new Date(periodEnd * 1000).toISOString()
      await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: supaHeaders,
          body: JSON.stringify({
            pending_deletion: true,
            scheduled_deletion_at: scheduledAt,
            subscription_status: 'cancelling',
            subscription_cancel_at_period_end: true,
            updated_at: new Date().toISOString(),
          }),
        }
      )
      return new Response(JSON.stringify({
        success: true,
        scheduled: true,
        scheduledDeletionAt: scheduledAt,
        message: `サブスク期間終了時（${new Date(periodEnd * 1000).toLocaleDateString('ja-JP')}）に自動削除されます`,
      }), { status: 200, headers: cors })
    }

    // サブスク無し → 即時削除
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

    if (env.STRIPE_SECRET_KEY && profile?.stripe_customer_id) {
      try {
        await stripeRequest(env.STRIPE_SECRET_KEY, `/customers/${profile.stripe_customer_id}`, 'DELETE')
      } catch { /* ignore */ }
    }

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
      message: 'アカウントを削除しました',
    }), { status: 200, headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), { status: 500, headers: cors })
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { headers: cors })
