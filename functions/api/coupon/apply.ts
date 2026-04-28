import { corsHeaders, handleOptions } from '../../_shared/auth'

type PagesFunction<Env = Record<string, unknown>> = (context: {
  request: Request
  env: Env
}) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  // 任意：Cloudflare 環境変数で上書き（カンマ区切りで複数定義可）
  // 既定値は本ファイル内の VALID_COUPONS
  COUPON_CODES?: string
}

/**
 * 無料利用権を付与するクーポンの一覧。
 * - 鍵がコード（大文字小文字無視）、値が付与する subscription_plan
 * - 全コードで subscription_status は 'active' に固定
 * - 必要なら Cloudflare 環境変数 COUPON_CODES="YASERU:premium,STAFF:premium" で上書き可能
 */
const VALID_COUPONS: Record<string, 'light' | 'standard' | 'premium'> = {
  YASERU: 'premium',
}

function parseEnvCoupons(env: Env): Record<string, 'light' | 'standard' | 'premium'> {
  if (!env.COUPON_CODES) return VALID_COUPONS
  const map: Record<string, 'light' | 'standard' | 'premium'> = {}
  for (const item of env.COUPON_CODES.split(',')) {
    const [codeRaw, planRaw] = item.split(':').map(s => s.trim())
    const code = (codeRaw || '').toUpperCase()
    const plan = (planRaw || 'premium').toLowerCase() as 'light' | 'standard' | 'premium'
    if (code) map[code] = ['light', 'standard', 'premium'].includes(plan) ? plan : 'premium'
  }
  return Object.keys(map).length > 0 ? map : VALID_COUPONS
}

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)

/**
 * POST /api/coupon/apply
 * body: { code: string, userId: string, email?: string }
 *
 * - クーポンコードを検証して、profiles に無料利用権を upsert
 * - 二重登録/水増し防止：同一 userId で is_free_account=true ならノーオペ
 * - 認証は不要（コード自体が秘密。HTTPS 経由で送信される）
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const cors = corsHeaders(request)

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'Supabase 環境変数が未設定' }), { status: 500, headers: cors })
  }

  let body: { code?: string; userId?: string; email?: string }
  try {
    body = await request.json() as { code?: string; userId?: string; email?: string }
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'JSON 解析失敗' }), { status: 400, headers: cors })
  }

  const code = (body.code || '').trim().toUpperCase()
  if (!code) {
    return new Response(JSON.stringify({ ok: false, error: 'クーポンコードが空です' }), { status: 400, headers: cors })
  }

  const coupons = parseEnvCoupons(env)
  const grantedPlan = coupons[code]
  if (!grantedPlan) {
    return new Response(JSON.stringify({ ok: false, error: '無効なクーポンコードです' }), { status: 404, headers: cors })
  }

  const supaHeaders = {
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    'Content-Type': 'application/json',
  }

  // userId が無い場合は email から解決
  let userId = (body.userId || '').trim()
  if (!userId && body.email) {
    try {
      const r = await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(body.email)}`,
        { headers: supaHeaders }
      )
      if (r.ok) {
        const j = await r.json() as { users?: Array<{ id: string; email?: string }> }
        const match = (j.users || []).find(u => (u.email || '').toLowerCase() === body.email!.toLowerCase())
        if (match) userId = match.id
      }
    } catch { /* ignore */ }
  }

  if (!userId) {
    return new Response(JSON.stringify({ ok: false, error: 'ユーザーが見つかりません' }), { status: 404, headers: cors })
  }

  // profiles に upsert（無料利用権を付与）
  // - subscription_status='active'：プラン制限を通過させる
  // - subscription_plan=grantedPlan：YASERU の場合は premium 相当
  // - is_free_account=true：管理者画面で識別できるようにフラグ立て
  // - free_coupon_code：どのコードで付与されたか記録
  // - free_granted_at：付与日時
  try {
    const upsertRes = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: { ...supaHeaders, 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        id: userId,
        email: body.email || null,
        subscription_status: 'active',
        subscription_plan: grantedPlan,
        is_free_account: true,
        free_coupon_code: code,
        free_granted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    })

    if (!upsertRes.ok) {
      const errTxt = await upsertRes.text()
      // is_free_account / free_coupon_code / free_granted_at カラムが無い場合のフォールバック
      // （マイグレーション未適用でも最低限の機能だけは動かす）
      const fallbackRes = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: { ...supaHeaders, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({
          id: userId,
          email: body.email || null,
          subscription_status: 'active',
          subscription_plan: grantedPlan,
          updated_at: new Date().toISOString(),
        }),
      })
      if (!fallbackRes.ok) {
        return new Response(
          JSON.stringify({ ok: false, error: 'プロフィール更新失敗', detail: errTxt }),
          { status: 500, headers: cors }
        )
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        plan: grantedPlan,
        message: `クーポン「${code}」が適用されました（${grantedPlan}プラン無料）`,
      }),
      { status: 200, headers: cors }
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: cors }
    )
  }
}
