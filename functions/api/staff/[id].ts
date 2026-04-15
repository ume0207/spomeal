import { verifyAdmin, corsHeaders, handleOptions, authErrorResponse } from '../../_shared/auth'

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

// PATCH: スタッフ更新（管理者のみ）
export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context
  const cors = corsHeaders(request)
  const id = params.id

  const auth = await verifyAdmin(request, env)
  if (!auth.ok) return authErrorResponse(auth, request)

  try {
    const body = await request.json() as Record<string, unknown>
    const res = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/staff?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: { ...supaHeaders(env), 'Prefer': 'return=representation' },
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) {
      const err = await res.text()
      return new Response(JSON.stringify({ error: err }), { status: res.status, headers: cors })
    }
    const rows = await res.json() as unknown[]
    return new Response(JSON.stringify(rows[0] ?? body), { status: 200, headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors })
  }
}

// DELETE: スタッフ削除（管理者のみ）
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context
  const cors = corsHeaders(request)
  const id = params.id

  const auth = await verifyAdmin(request, env)
  if (!auth.ok) return authErrorResponse(auth, request)

  try {
    const res = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/staff?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: supaHeaders(env),
      }
    )
    if (!res.ok) {
      const err = await res.text()
      return new Response(JSON.stringify({ error: err }), { status: res.status, headers: cors })
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors })
  }
}
