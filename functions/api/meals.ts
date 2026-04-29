import { verifyUser, verifyAdmin, corsHeaders, handleOptions, authErrorResponse } from '../_shared/auth'
import { invalidateMealFeedCache, invalidateStatsCache } from '../_shared/admin-cache'
import { feedPetOnMealCreated } from '../_shared/pet-hook'

type PagesFunction<Env = Record<string, unknown>> = (context: {
  request: Request
  env: Env
  waitUntil?: (p: Promise<unknown>) => void
}) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  ADMIN_EMAILS?: string
}

/**
 * 認証：管理者トークン優先、次に本人のSupabase JWT
 */
async function authorize(request: Request, env: Env, targetUserId: string) {
  // 1. 管理者HMACトークンを先に試す（管理者は全ユーザーのデータにアクセス可）
  const admin = await verifyAdmin(request, env)
  if (admin.ok) return admin

  // 2. Supabase JWT（本人のデータのみアクセス可）
  const auth = await verifyUser(request, env)
  if (!auth.ok) return auth
  if (auth.user.id === targetUserId) return auth

  return { ok: false as const, status: 403, error: '他のユーザーのデータにはアクセスできません' }
}

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)

// GET /api/meals?userId=xxx&from=YYYY-MM-DD&to=YYYY-MM-DD
export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const cors = corsHeaders(request)
  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')
  if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: cors })

  const authResult = await authorize(request, env, userId)
  if (!authResult.ok) return authErrorResponse(authResult, request)

  const { NEXT_PUBLIC_SUPABASE_URL: sbUrl, SUPABASE_SERVICE_ROLE_KEY: sbKey } = env
  let query = `${sbUrl}/rest/v1/meal_records?user_id=eq.${encodeURIComponent(userId)}&order=meal_date.desc,created_at.desc`
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  if (from) query += `&meal_date=gte.${encodeURIComponent(from)}`
  if (to) query += `&meal_date=lte.${encodeURIComponent(to)}`

  const res = await fetch(query, {
    headers: { Authorization: `Bearer ${sbKey}`, apikey: sbKey },
  })
  const data = await res.json()
  return new Response(JSON.stringify(data), { headers: cors })
}

// POST /api/meals
export const onRequestPost: PagesFunction<Env> = async ({ env, request, waitUntil }) => {
  const cors = corsHeaders(request)
  const { NEXT_PUBLIC_SUPABASE_URL: sbUrl, SUPABASE_SERVICE_ROLE_KEY: sbKey } = env
  const body = await request.json() as {
    userId?: string
    id?: string
    mealDate?: string
    mealType?: string
    foodName?: string
    caloriesKcal?: number
    proteinG?: number
    fatG?: number
    carbsG?: number
    items?: unknown[]
    photoUrl?: string | null
    advice?: string | null
  }
  const { userId, id, ...record } = body
  if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: cors })

  const authResult = await authorize(request, env, userId)
  if (!authResult.ok) return authErrorResponse(authResult, request)

  // idがある場合はUPDATE、ない場合はINSERT
  if (id) {
    // ★重要バグ修正★
    // 以前は、送られなかったフィールドに `|| 0` `|| []` `|| null` でデフォルト値を
    // 入れて PATCH していたため、AIアドバイスだけ後追い保存する経路や
    // インライン編集経路で「栄養価 / items / 写真」が毎回ゼロ・空配列・null で
    // 上書きされて消えていた。
    //
    // 差分更新に変更：body に実際に含まれているキーだけを PATCH する。
    // （undefined のフィールドには触らない）
    const patch: Record<string, unknown> = {}
    if ('mealDate' in record && record.mealDate !== undefined) patch.meal_date = record.mealDate
    if ('mealType' in record && record.mealType !== undefined) patch.meal_type = record.mealType
    if ('foodName' in record && record.foodName !== undefined) patch.food_name = record.foodName
    if ('caloriesKcal' in record && record.caloriesKcal !== undefined) patch.calories_kcal = record.caloriesKcal
    if ('proteinG' in record && record.proteinG !== undefined) patch.protein_g = record.proteinG
    if ('fatG' in record && record.fatG !== undefined) patch.fat_g = record.fatG
    if ('carbsG' in record && record.carbsG !== undefined) patch.carbs_g = record.carbsG
    if ('items' in record && record.items !== undefined) patch.items = record.items
    // photoUrl と advice は「明示的に null」で消したいケースがあるので undefined のみ除外
    if ('photoUrl' in record && record.photoUrl !== undefined) patch.photo_url = record.photoUrl
    if ('advice' in record && record.advice !== undefined) patch.advice = record.advice

    if (Object.keys(patch).length === 0) {
      return new Response(JSON.stringify({ error: '更新するフィールドがありません' }), { status: 400, headers: cors })
    }

    const res = await fetch(`${sbUrl}/rest/v1/meal_records?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${sbKey}`, apikey: sbKey,
        'Content-Type': 'application/json', 'Prefer': 'return=representation',
      },
      body: JSON.stringify(patch),
    })
    const data = await res.json()
    if (!res.ok) {
      const errText = typeof data === 'string' ? data : JSON.stringify(data)
      return new Response(JSON.stringify({ error: 'meal_records PATCH失敗', status: res.status, supabaseError: errText.slice(0, 500) }), { status: 500, headers: cors })
    }
    // 管理者画面のフィード/統計キャッシュを無効化（反映遅延を防ぐ）
    invalidateMealFeedCache(waitUntil)
    invalidateStatsCache(waitUntil)
    return new Response(JSON.stringify(data), { status: 200, headers: cors })
  }

  const res = await fetch(`${sbUrl}/rest/v1/meal_records`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sbKey}`, apikey: sbKey,
      'Content-Type': 'application/json', 'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      user_id: userId,
      meal_date: record.mealDate,
      meal_type: record.mealType,
      food_name: record.foodName,
      calories_kcal: record.caloriesKcal || 0,
      protein_g: record.proteinG || 0,
      fat_g: record.fatG || 0,
      carbs_g: record.carbsG || 0,
      items: record.items || [],
      photo_url: record.photoUrl || null,
      advice: record.advice || null,
    }),
  })
  const data = await res.json()
  if (res.ok) {
    invalidateMealFeedCache(waitUntil)
    invalidateStatsCache(waitUntil)
    // ★たまごっち式ペット機能：新規食事記録時にHP回復・進化判定
    //   失敗しても食事記録自体には影響させない（best-effort）
    if (waitUntil) {
      waitUntil(feedPetOnMealCreated(sbUrl, sbKey, userId))
    } else {
      // waitUntil が無い実行環境ではfire-and-forget
      feedPetOnMealCreated(sbUrl, sbKey, userId).catch(() => {})
    }
  }
  return new Response(JSON.stringify(data), { status: res.ok ? 200 : 500, headers: cors })
}

// DELETE /api/meals?id=xxx&userId=xxx
export const onRequestDelete: PagesFunction<Env> = async ({ env, request, waitUntil }) => {
  const cors = corsHeaders(request)
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  const userId = url.searchParams.get('userId')
  if (!id || !userId) return new Response(JSON.stringify({ error: 'id and userId required' }), { status: 400, headers: cors })

  const authResult = await authorize(request, env, userId)
  if (!authResult.ok) return authErrorResponse(authResult, request)

  const { NEXT_PUBLIC_SUPABASE_URL: sbUrl, SUPABASE_SERVICE_ROLE_KEY: sbKey } = env
  const res = await fetch(`${sbUrl}/rest/v1/meal_records?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${sbKey}`, apikey: sbKey },
  })
  if (res.ok) {
    invalidateMealFeedCache(waitUntil)
    invalidateStatsCache(waitUntil)
  }
  return new Response(JSON.stringify({ ok: res.ok }), { status: res.ok ? 200 : 500, headers: cors })
}
