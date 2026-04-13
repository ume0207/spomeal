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
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })

// GET /api/meals?userId=xxx&from=YYYY-MM-DD&to=YYYY-MM-DD
export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')
  if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: cors })

  const { NEXT_PUBLIC_SUPABASE_URL: sbUrl, SUPABASE_SERVICE_ROLE_KEY: sbKey } = env
  let query = `${sbUrl}/rest/v1/meal_records?user_id=eq.${userId}&order=meal_date.desc,created_at.desc`
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  if (from) query += `&meal_date=gte.${from}`
  if (to) query += `&meal_date=lte.${to}`

  const res = await fetch(query, {
    headers: { Authorization: `Bearer ${sbKey}`, apikey: sbKey },
  })
  const data = await res.json()
  return new Response(JSON.stringify(data), { headers: cors })
}

// POST /api/meals  { userId, mealDate, mealType, foodName, caloriesKcal, proteinG, fatG, carbsG, items, photoUrl, advice }
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const { NEXT_PUBLIC_SUPABASE_URL: sbUrl, SUPABASE_SERVICE_ROLE_KEY: sbKey } = env
  const body = await request.json() as any
  const { userId, id, ...record } = body
  if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: cors })

  // idがある場合はUPDATE、ない場合はINSERT
  if (id) {
    const res = await fetch(`${sbUrl}/rest/v1/meal_records?id=eq.${id}&user_id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${sbKey}`, apikey: sbKey,
        'Content-Type': 'application/json', 'Prefer': 'return=representation',
      },
      body: JSON.stringify({
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
    return new Response(JSON.stringify(data), { status: res.ok ? 200 : 500, headers: cors })
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
  return new Response(JSON.stringify(data), { status: res.ok ? 200 : 500, headers: cors })
}

// DELETE /api/meals?id=xxx&userId=xxx
export const onRequestDelete: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  const userId = url.searchParams.get('userId')
  if (!id || !userId) return new Response(JSON.stringify({ error: 'id and userId required' }), { status: 400, headers: cors })

  const { NEXT_PUBLIC_SUPABASE_URL: sbUrl, SUPABASE_SERVICE_ROLE_KEY: sbKey } = env
  const res = await fetch(`${sbUrl}/rest/v1/meal_records?id=eq.${id}&user_id=eq.${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${sbKey}`, apikey: sbKey },
  })
  return new Response(JSON.stringify({ ok: res.ok }), { status: res.ok ? 200 : 500, headers: cors })
}
