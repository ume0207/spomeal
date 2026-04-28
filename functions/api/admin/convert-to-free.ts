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
 * POST /api/admin/convert-to-free
 * body: { userId?: string, email?: string, password: string, plan?: 'light'|'standard'|'premium' }
 *
 * 「課金は止めるが、機能はそのまま使えるようにする」操作。
 * - Stripeのサブスクは全件キャンセル（重複も含めて）
 * - profiles を is_free_account=true / subscription_status='active' / subscription_plan=plan に更新
 * - webhook側で is_free_account=true は降格スキップする実装と組み合わせて使用
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const cors = corsHeaders(request)

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'Supabase 環境変数が未設定' }), { status: 500, headers: cors })
  }

  let body: { userId?: string; email?: string; password?: string; plan?: 'light' | 'standard' | 'premium' }
  try {
    body = await request.json() as typeof body
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'JSON 解析失敗' }), { status: 400, headers: cors })
  }

  // パスワード検証
  const expected = env.ADMIN_DANGER_PASSWORD || DEFAULT_DANGER_PASSWORD
  if (!body.password || !safeEqual(String(body.password), expected)) {
    return new Response(JSON.stringify({ ok: false, error: '追加パスワードが違います' }), { status: 401, headers: cors })
  }

  if (!body.userId && !body.email) {
    return new Response(JSON.stringify({ ok: false, error: 'userId または email が必要です' }), { status: 400, headers: cors })
  }

  const grantedPlan: 'light' | 'standard' | 'premium' = body.plan && ['light', 'standard', 'premium'].includes(body.plan)
    ? body.plan
    : 'premium'

  const supaHeaders = {
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    'Content-Type': 'application/json',
  }

  const errors: string[] = []
  const steps: Record<string, unknown> = {}

  // userId 解決
  let userId = (body.userId || '').trim()
  let emailUsed = (body.email || '').trim()
  if (!userId && emailUsed) {
    try {
      const r = await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(emailUsed)}`,
        { headers: supaHeaders }
      )
      if (r.ok) {
        const j = await r.json() as { users?: Array<{ id: string; email?: string }> }
        const match = (j.users || []).find(u => (u.email || '').toLowerCase() === emailUsed.toLowerCase())
        if (match) { userId = match.id; emailUsed = match.email || emailUsed }
      }
    } catch (e) { errors.push(`ユーザー検索失敗: ${String(e)}`) }
  }

  if (!userId) {
    return new Response(
      JSON.stringify({ ok: false, error: 'ユーザーが見つかりません', email: emailUsed }),
      { status: 404, headers: cors }
    )
  }

  // 1. profile を「無料化」に書き換える
  //    まずは「絶対に存在する標準カラムだけ」で確実に成功させる。
  //    その後に is_free_account / free_coupon_code 等を**個別に**試行（失敗しても無視）。
  let profileUpdated = false
  let isFreeAccountFlagSet = false

  // 1a. まず確実に通る標準カラムだけで upsert
  try {
    const baseRes = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: { ...supaHeaders, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({
        id: userId,
        email: emailUsed || null,
        subscription_status: 'active',
        subscription_plan: grantedPlan,
        updated_at: new Date().toISOString(),
      }),
    })
    if (baseRes.ok) {
      profileUpdated = true
    } else {
      const errTxt = await baseRes.text()
      errors.push(`profile 基本更新失敗: ${errTxt}`)
    }
  } catch (e) { errors.push(`profile 基本更新で例外: ${String(e)}`) }

  // 1b. is_free_account=true を試行（カラムが無ければ無視）
  try {
    const flagRes = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: supaHeaders,
        body: JSON.stringify({
          is_free_account: true,
          free_coupon_code: 'ADMIN_CONVERT',
          free_granted_at: new Date().toISOString(),
        }),
      }
    )
    isFreeAccountFlagSet = flagRes.ok
  } catch { /* ignore */ }

  // 1c. もし is_free_account が落ちたなら、個別カラムを1つずつ試す（カラム単位で存在判定）
  if (!isFreeAccountFlagSet) {
    try {
      const r = await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: supaHeaders,
          body: JSON.stringify({ is_free_account: true }),
        }
      )
      if (r.ok) isFreeAccountFlagSet = true
    } catch { /* ignore */ }
  }

  steps.profileUpdated = profileUpdated
  steps.isFreeAccountFlagSet = isFreeAccountFlagSet

  // 2. Stripe Customer + サブスク全件をキャンセル
  let stripeCustomerId: string | null = null
  let cancelledSubscriptions: string[] = []
  if (env.STRIPE_SECRET_KEY) {
    // profile から stripe_customer_id を取得
    try {
      const pRes = await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=stripe_customer_id`,
        { headers: supaHeaders }
      )
      if (pRes.ok) {
        const rows = await pRes.json() as Array<{ stripe_customer_id?: string }>
        stripeCustomerId = rows[0]?.stripe_customer_id || null
      }
    } catch (e) { errors.push(`profile 取得失敗: ${String(e)}`) }

    // email でも Stripe Customer を検索（profile に customer_id が無い場合）
    if (!stripeCustomerId && emailUsed) {
      try {
        const url = `https://api.stripe.com/v1/customers?email=${encodeURIComponent(emailUsed)}&limit=10`
        const r = await fetch(url, { headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` } })
        if (r.ok) {
          const j = await r.json() as { data?: Array<{ id: string; email?: string }> }
          const match = (j.data || []).find(c => (c.email || '').toLowerCase() === emailUsed.toLowerCase())
          if (match) stripeCustomerId = match.id
        }
      } catch (e) { errors.push(`Stripe Customer 検索失敗: ${String(e)}`) }
    }

    // 全サブスク（active/trialing/past_due）を取得してキャンセル
    if (stripeCustomerId) {
      try {
        const url = `https://api.stripe.com/v1/subscriptions?customer=${stripeCustomerId}&status=all&limit=20`
        const r = await fetch(url, { headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` } })
        if (r.ok) {
          const j = await r.json() as { data?: Array<{ id: string; status: string }> }
          for (const sub of j.data || []) {
            // すでに cancelled は飛ばす
            if (sub.status === 'canceled') continue
            const delRes = await fetch(`https://api.stripe.com/v1/subscriptions/${sub.id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` },
            })
            if (delRes.ok) {
              cancelledSubscriptions.push(sub.id)
            } else {
              errors.push(`サブスク解約失敗(${sub.id}): ${await delRes.text()}`)
            }
          }
        } else {
          errors.push(`サブスク取得失敗: ${await r.text()}`)
        }
      } catch (e) { errors.push(`サブスク解約で例外: ${String(e)}`) }
    }
  }
  steps.stripeCustomerId = stripeCustomerId
  steps.cancelledSubscriptions = cancelledSubscriptions

  // 3. 念のため profile を再 PATCH（webhook が降格を試みた可能性に備える）
  //    標準カラムだけで確実に書き戻す
  try {
    await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: supaHeaders,
        body: JSON.stringify({
          subscription_status: 'active',
          subscription_plan: grantedPlan,
          updated_at: new Date().toISOString(),
        }),
      }
    )
  } catch { /* ignore */ }
  // is_free_account も再度試行
  try {
    await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: supaHeaders,
        body: JSON.stringify({ is_free_account: true }),
      }
    )
  } catch { /* ignore */ }

  return new Response(
    JSON.stringify({
      ok: errors.length === 0,
      userId,
      email: emailUsed,
      plan: grantedPlan,
      stripeCustomerId,
      cancelledSubscriptions,
      steps,
      errors,
    }),
    { status: 200, headers: cors }
  )
}
