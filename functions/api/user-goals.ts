type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })

// GET /api/user-goals?userId=xxx
export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')
  if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: cors })

  const { NEXT_PUBLIC_SUPABASE_URL: sbUrl, SUPABASE_SERVICE_ROLE_KEY: sbKey } = env
  const res = await fetch(`${sbUrl}/rest/v1/user_goals?user_id=eq.${userId}&limit=1`, {
    headers: { Authorization: `Bearer ${sbKey}`, apikey: sbKey },
  })
  const data = await res.json() as any[]
  return new Response(JSON.stringify(data[0] || null), { headers: cors })
}

// POST /api/user-goals  { userId, cal, protein, fat, carbs, targetWeight, height, activityLevel, goalType, pfcP, pfcF, pfcC }
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const { NEXT_PUBLIC_SUPABASE_URL: sbUrl, SUPABASE_SERVICE_ROLE_KEY: sbKey } = env
  const body = await request.json() as any
  const { userId, cal, protein, fat, carbs, targetWeight, height, activityLevel, goalType, pfcP, pfcF, pfcC } = body
  if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: cors })

  const res = await fetch(`${sbUrl}/rest/v1/user_goals`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sbKey}`, apikey: sbKey,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({
      user_id: userId, cal, protein, fat, carbs,
      target_weight: targetWeight || null,
      height: height || null,
      activity_level: activityLevel || null,
      goal_type: goalType || null,
      pfc_p: pfcP || 25,
      pfc_f: pfcF || 20,
      pfc_c: pfcC || 55,
      updated_at: new Date().toISOString(),
    }),
  })
  const data = await res.json()
  return new Response(JSON.stringify(data), { status: res.ok ? 200 : 500, headers: cors })
}
