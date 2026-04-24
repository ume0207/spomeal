import { verifyUser, verifyAdmin, corsHeaders, handleOptions, authErrorResponse } from '../_shared/auth'

type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  ADMIN_EMAILS?: string
}

async function authorize(request: Request, env: Env, targetUserId: string) {
  const admin = await verifyAdmin(request, env)
  if (admin.ok) return admin
  const auth = await verifyUser(request, env)
  if (!auth.ok) return auth
  if (auth.user.id === targetUserId) return auth
  return { ok: false as const, status: 403, error: '他のユーザーのデータにはアクセスできません' }
}

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)

// GET /api/user-goals?userId=xxx
export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const cors = corsHeaders(request)
  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')
  if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: cors })

  const authResult = await authorize(request, env, userId)
  if (!authResult.ok) return authErrorResponse(authResult, request)

  const { NEXT_PUBLIC_SUPABASE_URL: sbUrl, SUPABASE_SERVICE_ROLE_KEY: sbKey } = env
  const res = await fetch(`${sbUrl}/rest/v1/user_goals?user_id=eq.${encodeURIComponent(userId)}&limit=1`, {
    headers: { Authorization: `Bearer ${sbKey}`, apikey: sbKey },
  })
  const data = await res.json() as unknown[]
  return new Response(JSON.stringify(data[0] || null), { headers: cors })
}

// POST /api/user-goals
// ★重要バグ修正★
// 以前は「送られてないフィールドに `|| null` `|| 25` などのデフォルトを入れて
// merge-duplicates で全列上書き」だったため、部分保存経路（例：PFCだけ変更）
// で既存値（targetWeight や activityLevel 等）が null 上書きされ得た。
// 差分 UPSERT に変更：送られてきたキーだけを書き込み、既存の行に対しては
// そのキー以外の既存値を保持する。
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const cors = corsHeaders(request)
  const { NEXT_PUBLIC_SUPABASE_URL: sbUrl, SUPABASE_SERVICE_ROLE_KEY: sbKey } = env
  const body = await request.json() as {
    userId?: string
    cal?: number
    protein?: number
    fat?: number
    carbs?: number
    targetWeight?: number | null
    height?: number | null
    activityLevel?: string | null
    goalType?: string | null
    pfcP?: number
    pfcF?: number
    pfcC?: number
  }
  const { userId } = body
  if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: cors })

  const authResult = await authorize(request, env, userId)
  if (!authResult.ok) return authErrorResponse(authResult, request)

  // 既存行の有無で PATCH / POST 分岐（user-points.ts と同じ安全パターン）
  const getRes = await fetch(`${sbUrl}/rest/v1/user_goals?user_id=eq.${encodeURIComponent(userId)}&limit=1`, {
    headers: { Authorization: `Bearer ${sbKey}`, apikey: sbKey },
  })
  const existing = getRes.ok ? (await getRes.json() as unknown[]) : []
  const hasExisting = Array.isArray(existing) && existing.length > 0

  // 送られてきたキーだけを対象にする差分オブジェクト
  const patch: Record<string, unknown> = {}
  if ('cal' in body && body.cal !== undefined) patch.cal = body.cal
  if ('protein' in body && body.protein !== undefined) patch.protein = body.protein
  if ('fat' in body && body.fat !== undefined) patch.fat = body.fat
  if ('carbs' in body && body.carbs !== undefined) patch.carbs = body.carbs
  if ('targetWeight' in body && body.targetWeight !== undefined) patch.target_weight = body.targetWeight
  if ('height' in body && body.height !== undefined) patch.height = body.height
  if ('activityLevel' in body && body.activityLevel !== undefined) patch.activity_level = body.activityLevel
  if ('goalType' in body && body.goalType !== undefined) patch.goal_type = body.goalType
  if ('pfcP' in body && body.pfcP !== undefined) patch.pfc_p = body.pfcP
  if ('pfcF' in body && body.pfcF !== undefined) patch.pfc_f = body.pfcF
  if ('pfcC' in body && body.pfcC !== undefined) patch.pfc_c = body.pfcC

  if (Object.keys(patch).length === 0) {
    return new Response(JSON.stringify({ error: '更新するフィールドがありません' }), { status: 400, headers: cors })
  }

  patch.updated_at = new Date().toISOString()

  let saveRes: Response
  if (hasExisting) {
    // 既存行には PATCH（他カラムの既存値はそのまま）
    saveRes = await fetch(`${sbUrl}/rest/v1/user_goals?user_id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${sbKey}`, apikey: sbKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(patch),
    })
  } else {
    // 新規行は INSERT。未指定フィールドは DB のデフォルト値に委ねる
    saveRes = await fetch(`${sbUrl}/rest/v1/user_goals`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sbKey}`, apikey: sbKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ user_id: userId, ...patch }),
    })
  }

  if (!saveRes.ok) {
    const errText = await saveRes.text().catch(() => '')
    return new Response(JSON.stringify({
      error: 'user_goals 保存失敗',
      status: saveRes.status,
      supabaseError: errText.slice(0, 500),
      mode: hasExisting ? 'PATCH' : 'POST',
    }), { status: 500, headers: cors })
  }

  const data = await saveRes.json()
  return new Response(JSON.stringify(data), { status: 200, headers: cors })
}
