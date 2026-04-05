type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  STRIPE_SECRET_KEY: string
  TEST_ACCOUNT_EMAILS?: string
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)
  const email = url.searchParams.get('email')
  const userId = url.searchParams.get('userId')

  if (!email && !userId) {
    return new Response(JSON.stringify({ error: 'email or userId required' }), { status: 400, headers: cors })
  }

  try {
    // 1. テストアカウントチェック（環境変数 TEST_ACCOUNT_EMAILS にカンマ区切りで登録）
    const testEmails = (env.TEST_ACCOUNT_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)

    if (email && testEmails.includes(email.toLowerCase())) {
      return new Response(JSON.stringify({
        active: true,
        reason: 'test_account',
        subscription_status: 'test',
        subscription_plan: 'premium',
      }), { status: 200, headers: cors })
    }

    // 2. Supabase profiles テーブルからサブスク状態を取得
    let subscriptionStatus = ''
    let subscriptionPlan = ''

    // profilesテーブルをチェック
    let profileQuery = ''
    if (userId) {
      profileQuery = `id=eq.${userId}`
    } else if (email) {
      // emailでユーザーIDを取得してからprofilesを確認
      const userRes = await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=50`,
        { headers: { 'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'apikey': env.SUPABASE_SERVICE_ROLE_KEY } }
      )
      if (userRes.ok) {
        const userData = await userRes.json() as { users?: Array<{ id: string; email?: string }> }
        const user = userData.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())
        if (user) {
          profileQuery = `id=eq.${user.id}`
        }
      }
    }

    let pendingDeletion = false
    let scheduledDeletionAt: string | null = null

    if (profileQuery) {
      const profileRes = await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?${profileQuery}&select=subscription_status,subscription_plan,pending_deletion,scheduled_deletion_at`,
        {
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          },
        }
      )
      if (profileRes.ok) {
        const profiles = await profileRes.json() as Array<{
          subscription_status?: string
          subscription_plan?: string
          pending_deletion?: boolean
          scheduled_deletion_at?: string
        }>
        if (profiles.length > 0) {
          subscriptionStatus = profiles[0].subscription_status || ''
          subscriptionPlan = profiles[0].subscription_plan || ''
          pendingDeletion = profiles[0].pending_deletion || false
          scheduledDeletionAt = profiles[0].scheduled_deletion_at || null
        }
      }
    }

    // 削除予定日を過ぎている場合はアクセス不可
    if (pendingDeletion && scheduledDeletionAt && new Date(scheduledDeletionAt) <= new Date()) {
      return new Response(JSON.stringify({
        active: false,
        subscription_status: 'deleted',
        subscription_plan: subscriptionPlan || 'none',
        reason: 'account_deleted',
      }), { status: 200, headers: cors })
    }

    // 3. profilesにデータがない場合、Stripeから直接確認（フォールバック）
    if (!subscriptionStatus && email && env.STRIPE_SECRET_KEY) {
      // Stripe顧客をメールで検索
      const custRes = await fetch(
        `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`,
        { headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` } }
      )
      if (custRes.ok) {
        const custData = await custRes.json() as { data?: Array<{ id: string }> }
        const customerId = custData.data?.[0]?.id
        if (customerId) {
          // そのカスタマーのアクティブなサブスクをチェック
          const subRes = await fetch(
            `https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=active&limit=1`,
            { headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` } }
          )
          const trialRes = await fetch(
            `https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=trialing&limit=1`,
            { headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` } }
          )
          if (subRes.ok && trialRes.ok) {
            const subData = await subRes.json() as { data?: Array<{ status: string }> }
            const trialData = await trialRes.json() as { data?: Array<{ status: string }> }
            if ((subData.data?.length || 0) > 0) {
              subscriptionStatus = 'active'
            } else if ((trialData.data?.length || 0) > 0) {
              subscriptionStatus = 'trialing'
            } else {
              subscriptionStatus = 'inactive'
            }
          }
        } else {
          subscriptionStatus = 'no_customer'
        }
      }
    }

    // 4. 判定
    const activeStatuses = ['active', 'trialing']
    const isActive = activeStatuses.includes(subscriptionStatus)

    return new Response(JSON.stringify({
      active: isActive,
      subscription_status: subscriptionStatus || 'unknown',
      subscription_plan: subscriptionPlan || 'none',
    }), { status: 200, headers: cors })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors })
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { headers: cors })
