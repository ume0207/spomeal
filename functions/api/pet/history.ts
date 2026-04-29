/**
 * GET /api/pet/history?userId=xxx
 *   卒業したペットの履歴一覧（図鑑用）を返す
 */

import { verifyUser, corsHeaders, handleOptions, authErrorResponse } from '../../_shared/auth'
import { getSupabaseUrl, getSupabaseAnonKey } from '../../_shared/env-fallback'

type PagesFunction<Env = Record<string, unknown>> = (context: {
  request: Request
  env: Env
}) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
}

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const cors = corsHeaders(request)
  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')
  if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: cors })

  const auth = await verifyUser(request, env)
  if (!auth.ok) return authErrorResponse(auth, request)
  if (auth.user.id !== userId) {
    return new Response(JSON.stringify({ error: '他のユーザーは閲覧できません' }), { status: 403, headers: cors })
  }

  // ★ユーザーJWT + anon key で RLS 経由で読む
  const supabaseUrl = getSupabaseUrl(env as unknown as Record<string, unknown>)
  const anonKey = getSupabaseAnonKey(env as unknown as Record<string, unknown>)
  const authHeader = request.headers.get('Authorization') || ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim() || anonKey

  const r = await fetch(
    `${supabaseUrl}/rest/v1/pet_history?user_id=eq.${userId}&order=graduated_at.desc&limit=100`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${jwt}`,
      },
    }
  )
  if (!r.ok) {
    return new Response(JSON.stringify({ error: 'history取得失敗' }), { status: 500, headers: cors })
  }
  const data = await r.json()
  return new Response(JSON.stringify({ ok: true, history: data }), { headers: cors })
}
