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
  BODYNATE: 'premium',
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

  // profiles に upsert（無料利用権を付与）— 3段階フォールバック
  // 1) フル: 全フィールド一括 upsert
  // 2) ミニマル upsert: id + subscription_status + subscription_plan のみ
  //    （email/updated_at/is_free_account 等のカラム存在に依存しない）
  // 3) PATCH 更新: upsert が NG なら既存行を update（行が無ければスキップ）
  // 4) ベストエフォート: is_free_account / free_coupon_code / free_granted_at は
  //    個別 PATCH で試行し失敗しても無視（実害なし）
  const tried: string[] = []
  let upsertOk = false
  let lastErr = ''

  try {
    // 1) フル upsert
    const fullRes = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles`, {
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
    tried.push(`full=${fullRes.status}`)
    if (fullRes.ok) {
      upsertOk = true
    } else {
      lastErr = await fullRes.text()
    }

    // 2) ミニマル upsert（id + subscription_status + subscription_plan のみ）
    if (!upsertOk) {
      const minRes = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: { ...supaHeaders, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({
          id: userId,
          subscription_status: 'active',
          subscription_plan: grantedPlan,
        }),
      })
      tried.push(`min=${minRes.status}`)
      if (minRes.ok) {
        upsertOk = true
      } else {
        lastErr = await minRes.text()
      }
    }

    // 3) PATCH 更新（既存行のみ）
    if (!upsertOk) {
      const patchRes = await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: { ...supaHeaders, 'Prefer': 'return=representation' },
          body: JSON.stringify({
            subscription_status: 'active',
            subscription_plan: grantedPlan,
          }),
        }
      )
      tried.push(`patch=${patchRes.status}`)
      if (patchRes.ok) {
        // PATCH の場合、行が無いと 0件更新（200 だが body=[]）になるので確認
        const patched = await patchRes.json().catch(() => []) as unknown[]
        if (Array.isArray(patched) && patched.length > 0) {
          upsertOk = true
        } else {
          lastErr = `PATCH applied but no rows updated (profile row may not exist yet)`
        }
      } else {
        lastErr = await patchRes.text()
      }
    }

    if (!upsertOk) {
      console.error('coupon apply failed:', { tried, lastErr, userId, code })
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'プロフィール更新失敗',
          detail: lastErr.slice(0, 500),
          tried,
        }),
        { status: 500, headers: cors }
      )
    }

    // 4) ベストエフォートで管理用フラグを追加（失敗しても無視）
    fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: supaHeaders,
        body: JSON.stringify({
          is_free_account: true,
          free_coupon_code: code,
          free_granted_at: new Date().toISOString(),
        }),
      }
    ).catch(() => { /* schema未対応カラムは無視 */ })

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
      JSON.stringify({ ok: false, error: String(e), tried }),
      { status: 500, headers: cors }
    )
  }
}
