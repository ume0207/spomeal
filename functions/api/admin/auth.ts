import { verifyAdmin, corsHeaders, handleOptions, authErrorResponse } from '../../_shared/auth'

type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  ADMIN_EMAILS?: string
}

/**
 * POST /api/admin/auth
 * ログイン中のSupabaseユーザーが管理者かどうかを検証するのみ
 * （旧: ID/パスワード認証は廃止済み）
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const cors = corsHeaders(request)

  const auth = await verifyAdmin(request, env)
  if (!auth.ok) return authErrorResponse(auth, request)

  return new Response(
    JSON.stringify({
      success: true,
      admin: {
        id: auth.user.id,
        email: auth.user.email,
        name: auth.user.user_metadata?.full_name || auth.user.email,
      },
    }),
    { status: 200, headers: cors }
  )
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const cors = corsHeaders(request)

  const auth = await verifyAdmin(request, env)
  if (!auth.ok) return authErrorResponse(auth, request)

  return new Response(
    JSON.stringify({
      success: true,
      admin: {
        id: auth.user.id,
        email: auth.user.email,
        name: auth.user.user_metadata?.full_name || auth.user.email,
      },
    }),
    { status: 200, headers: cors }
  )
}

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)
