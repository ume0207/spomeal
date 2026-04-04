type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get('id')
    if (!userId) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: cors })

    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY

    const userRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey },
    })
    if (!userRes.ok) {
      const err = await userRes.text()
      return new Response(JSON.stringify({ error: err }), { status: 500, headers: cors })
    }
    const userData = await userRes.json()
    const meta = userData.user_metadata || {}

    return new Response(JSON.stringify({
      meal_activity: meta.meal_activity || [],
      body_activity: meta.body_activity || [],
      goal_data: meta.goal_data || null,
      display_name: meta.display_name || userData.email || '',
      email: userData.email || '',
    }), { headers: cors })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors })
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  try {
    const body = await request.json()
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