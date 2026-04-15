import { verifyUser, verifyAdmin, corsHeaders, handleOptions, authErrorResponse } from '../../_shared/auth'

type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env; params: Record<string, string> }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  ADMIN_EMAILS?: string
}

const supaHeaders = (env: Env) => ({
  'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
  'Content-Type': 'application/json',
})

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)

// GET: スタッフ一覧取得（ログイン済みユーザー・会員の予約ページで利用）
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const cors = corsHeaders(request)

  // 管理者または会員（どちらかの認証が通ればOK）
  const admin = await verifyAdmin(request, env)
  if (!admin.ok) {
    const auth = await verifyUser(request, env)
    if (!auth.ok) return authErrorResponse(auth, request)
  }

  try {
    const res = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/staff?order=created_at.asc`,
      { headers: supaHeaders(env) }
    )
    if (!res.ok) {
      const err = await res.text()
      return new Response(JSON.stringify({ error: err }), { status: res.status, headers: cors })
    }
    const rows = await res.json()
    return new Response(JSON.stringify(rows), { status: 200, headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors })
  }
}

// POST: スタッフ新規作成（管理者のみ）
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const cors = corsHeaders(request)

  const auth = await verifyAdmin(request, env)
  if (!auth.ok) return authErrorResponse(auth, request)

  try {
    const body = await request.json() as Record<string, unknown>
    const res = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/staff`,
      {
        method: 'POST',
        headers: { ...supaHeaders(env), 'Prefer': 'return=representation' },
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) {
      const err = await res.text()
      return new Response(JSON.stringify({ error: err }), { status: res.status, headers: cors })
    }
    const rows = await res.json() as unknown[]
    return new Response(JSON.stringify(rows[0] ?? body), { status: 201, headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors })
  }
}
