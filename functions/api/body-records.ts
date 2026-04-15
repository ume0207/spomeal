import { verifyUser, verifyAdmin, corsHeaders, handleOptions, authErrorResponse } from '../_shared/auth'

type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  ADMIN_EMAILS?: string
}

async function authorize(request: Request, env: Env, targetUserId: string) {
  const auth = await verifyUser(request, env)
  if (!auth.ok) return auth
  if (auth.user.id === targetUserId) return auth
  const admin = await verifyAdmin(request, env)
  if (admin.ok) return admin
  return { ok: false as const, status: 403, error: '他のユーザーのデータにはアクセスできません' }
}

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)

// GET /api/body-records?userId=xxx
export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const cors = corsHeaders(request)
  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')
  if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: cors })

  const authResult = await authorize(request, env, userId)
  if (!authResult.ok) return authErrorResponse(authResult, request)

  const { NEXT_PUBLIC_SUPABASE_URL: sbUrl, SUPABASE_SERVICE_ROLE_KEY: sbKey } = env
  const res = await fetch(`${sbUrl}/rest/v1/body_records?user_id=eq.${encodeURIComponent(userId)}&order=date.desc`, {
    headers: { Authorization: `Bearer ${sbKey}`, apikey: sbKey },
  })
  const data = await res.json()
  return new Response(JSON.stringify(data), { headers: cors })
}

// POST /api/body-records  { userId, date, weight, bodyFat, muscle, bmi }  → upsert by (user_id, date)
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const cors = corsHeaders(request)
  const { NEXT_PUBLIC_SUPABASE_URL: sbUrl, SUPABASE_SERVICE_ROLE_KEY: sbKey } = env
  const body = await request.json() as {
    userId?: string
    date?: string
    weight?: number
    bodyFat?: number
    muscle?: number
    bmi?: number
  }
  const { userId, date, weight, bodyFat, muscle, bmi } = body
  if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: cors })

  const authResult = await authorize(request, env, userId)
  if (!authResult.ok) return authErrorResponse(authResult, request)

  const res = await fetch(`${sbUrl}/rest/v1/body_records`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sbKey}`, apikey: sbKey,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({ user_id: userId, date, weight, body_fat: bodyFat, muscle, bmi }),
  })
  const data = await res.json()
  return new Response(JSON.stringify(data), { status: res.ok ? 200 : 500, headers: cors })
}

// DELETE /api/body-records?userId=xxx&date=YYYY-MM-DD
export const onRequestDelete: PagesFunction<Env> = async ({ env, request }) => {
  const cors = corsHeaders(request)
  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')
  const date = url.searchParams.get('date')
  if (!userId || !date) return new Response(JSON.stringify({ error: 'userId and date required' }), { status: 400, headers: cors })

  const authResult = await authorize(request, env, userId)
  if (!authResult.ok) return authErrorResponse(authResult, request)

  const { NEXT_PUBLIC_SUPABASE_URL: sbUrl, SUPABASE_SERVICE_ROLE_KEY: sbKey } = env
  const res = await fetch(`${sbUrl}/rest/v1/body_records?user_id=eq.${encodeURIComponent(userId)}&date=eq.${encodeURIComponent(date)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${sbKey}`, apikey: sbKey },
  })
  return new Response(JSON.stringify({ ok: res.ok }), { status: res.ok ? 200 : 500, headers: cors })
}
