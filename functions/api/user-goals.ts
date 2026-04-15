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
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const cors = corsHeaders(request)
  const { NEXT_PUBLIC_SUPABASE_URL: sbUrl, SUPABASE_SERVICE_ROLE_KEY: sbKey } = env
  const body = await request.json() as {
    userId?: string
    cal?: number
    protein?: number
    fat?: number
    carbs?: number
    targetWeight?: number
    height?: number
    activityLevel?: string
    goalType?: string
    pfcP?: number
    pfcF?: number
    pfcC?: number
  }
  const { userId, cal, protein, fat, carbs, targetWeight, height, activityLevel, goalType, pfcP, pfcF, pfcC } = body
  if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: cors })

  const authResult = await authorize(request, env, userId)
  if (!authResult.ok) return authErrorResponse(authResult, request)

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
