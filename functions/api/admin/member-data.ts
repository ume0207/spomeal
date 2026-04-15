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

    return new Response(JSON.stringify({
      meal_activity: meal_activity.length > 0 ? meal_activity : (meta.meal_activity || []),
      body_activity: body_activity.length > 0 ? body_activity : (meta.body_activity || []),
      goal_data: goal,
      display_name: meta.display_name || userData.email || '',
      email: userData.email || '',
    }), { headers: cors })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors })
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context

  // 管理者認証
  const auth = await verifyAdmin(request, env)
  if (!auth.ok) return authErrorResponse(auth, request)

  const cors = corsHeaders(request)

  try {
    const body = await request.json() as { userId?: string; type?: string; data?: unknown }
    const { userId, type, data } = body
    if (!userId || !type) return new Response(JSON.stringify({ error: 'userId and type required' }), { status: 400, headers: cors })

    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY

    const userRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey },
    })
    const userData = await userRes.json()
    const meta = userData.user_metadata || {}

    let updatedMeta = { ...meta }

    if (type === 'goal') {
      updatedMeta.goal_data = data
    } else if (type === 'body') {
      let bodyActivity = Array.isArray(meta.body_activity) ? [...meta.body_activity] : []
      const existingIdx = bodyActivity.findIndex((e) => e.date === data.date)
      if (existingIdx >= 0) {
        bodyActivity[existingIdx] = { ...data, recordedAt: new Date().toISOString() }
      } else {
        bodyActivity.unshift({ ...data, recordedAt: new Date().toISOString() })
      }
      updatedMeta.body_activity = bodyActivity.slice(0, 30)
    } else if (type === 'meal') {
      let mealActivity = Array.isArray(meta.meal_activity) ? [...meta.meal_activity] : []
      mealActivity.unshift({ ...data, recordedAt: new Date().toISOString() })
      updatedMeta.meal_activity = mealActivity.slice(0, 90)
    }

    const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_metadata: updatedMeta }),
    })
    if (!updateRes.ok) {
      const err = await updateRes.text()
      return new Response(JSON.stringify({ error: err }), { status: 500, headers: cors })
    }

    return new Response(JSON.stringify({ ok: true }), { headers: cors })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors })
  }
}