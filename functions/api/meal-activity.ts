type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

/**
 * POST /api/meal-activity
 * ユーザーが食事を保存した時に呼ばれ、user_metadataに最新の食事情報を記録する
 * これにより管理者が「誰がいつ食事を追加したか」をリアルタイムで見れるようになる
 *
 * Body: { userId, mealType, items, totalKcal, totalProtein, totalFat, totalCarbs }
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context

  try {
    const body = await request.json() as {
      userId: string
      mealType: string
      items: { name: string; kcal: number; protein: number; fat: number; carbs: number }[]
      totalKcal: number
      totalProtein: number
      totalFat: number
      totalCarbs: number
    }

    if (!body.userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), { status: 400, headers: cors })
    }

    // 現在のユーザーメタデータを取得
    const userRes = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${body.userId}`,
      {
        headers: {
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    )

    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: cors })
    }

    const userData = await userRes.json() as { user_metadata?: Record<string, unknown> }
    const existingMeta = userData.user_metadata || {}

    // meal_activity 配列を更新（最新20件を保持）
    const existingActivity = (existingMeta.meal_activity as Array<Record<string, unknown>>) || []

    const now = new Date()
    const jstStr = now.toLocaleString('sv-SE', { timeZone: 'Asia/Tokyo' })
    const dateStr = jstStr.slice(0, 10)
    const timeStr = jstStr.slice(11, 16)

    const newEntry = {
      mealType: body.mealType || '食事',
      items: (body.items || []).map(i => ({ name: i.name, kcal: i.kcal, protein: i.protein, fat: i.fat, carbs: i.carbs })).slice(0, 10),
      totalKcal: body.totalKcal || 0,
      totalProtein: body.totalProtein || 0,
      totalFat: body.totalFat || 0,
      totalCarbs: body.totalCarbs || 0,
      date: dateStr,
      time: timeStr,
      updatedAt: now.toISOString(),
    }

    // 最新を先頭に追加、20件まで保持
    const updatedActivity = [newEntry, ...existingActivity].slice(0, 20)

    // user_metadataを更新
    const updateRes = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${body.userId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_metadata: {
            ...existingMeta,
            meal_activity: updatedActivity,
            last_meal_at: now.toISOString(),
          },
        }),
      }
    )

    if (!updateRes.ok) {
      const errText = await updateRes.text()
      return new Response(JSON.stringify({ error: 'Failed to update', detail: errText }), { status: 500, headers: cors })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors })
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
