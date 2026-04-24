import { verifyAdmin, corsHeaders, handleOptions, authErrorResponse } from '../../_shared/auth'

type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  ADMIN_EMAILS?: string
}

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context

  // 管理者認証
  const auth = await verifyAdmin(request, env)
  if (!auth.ok) return authErrorResponse(auth, request)

  const cors = corsHeaders(request)

  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get('id')
    if (!userId) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: cors })

    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY

    // ユーザー基本情報を取得
    const userRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey },
    })
    if (!userRes.ok) {
      const err = await userRes.text()
      return new Response(JSON.stringify({ error: err }), { status: 500, headers: cors })
    }
    const userData = await userRes.json()
    const meta = userData.user_metadata || {}

    // 食事記録を新テーブルから取得（最新90件）
    const mealRes = await fetch(
      `${supabaseUrl}/rest/v1/meal_records?user_id=eq.${userId}&order=meal_date.desc,created_at.desc&limit=90`,
      { headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey } }
    )
    const mealData = mealRes.ok ? await mealRes.json() : []
    const meal_activity = (mealData || []).map((r: any) => ({
      mealType: r.meal_type,
      items: (r.items || []).map((i: any) => ({ name: i.foodName || i.name, kcal: i.caloriesKcal || i.kcal, protein: i.proteinG || i.protein, fat: i.fatG || i.fat, carbs: i.carbsG || i.carbs })),
      totalKcal: r.calories_kcal, totalProtein: r.protein_g, totalFat: r.fat_g, totalCarbs: r.carbs_g,
      date: r.meal_date, time: '', updatedAt: r.created_at,
    }))

    // 体組成記録を新テーブルから取得
    const bodyRes = await fetch(
      `${supabaseUrl}/rest/v1/body_records?user_id=eq.${userId}&order=date.desc&limit=30`,
      { headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey } }
    )
    const bodyData = bodyRes.ok ? await bodyRes.json() : []
    const body_activity = (bodyData || []).map((r: any) => ({
      date: r.date, weight: r.weight, bodyFat: r.body_fat, muscle: r.muscle, bmi: r.bmi, recordedAt: r.created_at,
    }))

    // 目標データを新テーブルから取得
    const goalRes = await fetch(
      `${supabaseUrl}/rest/v1/user_goals?user_id=eq.${userId}&limit=1`,
      { headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey } }
    )
    const goalData = goalRes.ok ? await goalRes.json() : []
    const goal = goalData[0] ? {
      cal: goalData[0].cal, protein: goalData[0].protein, fat: goalData[0].fat, carbs: goalData[0].carbs,
      targetWeight: goalData[0].target_weight, height: goalData[0].height,
      activityLevel: goalData[0].activity_level, goalType: goalData[0].goal_type,
    } : (meta.goal_data || null)

    // ★修正: user_metadata へのフォールバックを廃止。
    // meal_activity / body_activity / goal_activity API を no-op 化したため、
    // user_metadata にはもう書き込まれない。古い残骸と新データが混ざるのを防ぐ
    // ため、真実源は meal_records / body_records / user_goals テーブルのみ。
    return new Response(JSON.stringify({
      meal_activity,
      body_activity,
      goal_data: goal,
      display_name: meta.full_name || meta.display_name || userData.email || '',
      email: userData.email || '',
    }), { headers: cors })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors })
  }
}

/**
 * POST /api/admin/member-data
 *
 * ★重要バグ修正★ この POST は以前 user_metadata を read-modify-write していて、
 * 他の activity API（meal-activity / body-activity / goal-activity）と衝突すると
 * 他フィールドを巻き添えで破壊するリスクがあった。
 *
 * 食事・体組成・目標データの本体はそれぞれ専用テーブル（meal_records /
 * body_records / user_goals）に保存されており、GET はこのテーブルを優先して
 * 読む実装になっている。したがって user_metadata 側への書き込みは不要。
 *
 * race を根絶するため、この POST は **no-op（認証のみ通して 200 を返す）** に変更。
 * 管理者画面から呼ばれても、本体データを破壊することはなくなる。
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context

  // 管理者認証だけは維持
  const auth = await verifyAdmin(request, env)
  if (!auth.ok) return authErrorResponse(auth, request)

  const cors = corsHeaders(request)

  try {
    const body = await request.json().catch(() => ({})) as { userId?: string; type?: string }
    const { userId, type } = body
    if (!userId || !type) return new Response(JSON.stringify({ error: 'userId and type required' }), { status: 400, headers: cors })

    // 意図的に何も書き込まない。
    // 本体テーブル（meal_records / body_records / user_goals）が真実源。
    return new Response(JSON.stringify({ ok: true, noop: true }), { status: 200, headers: cors })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: cors })
  }
}