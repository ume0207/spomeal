import { verifyUser, verifyAdmin, corsHeaders, handleOptions, authErrorResponse } from '../../_shared/auth'

type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  ADMIN_EMAILS?: string
}

const BUCKET = 'app-config'
const SHIFTS_FILE = 'shifts.json'

/**
 * GET /api/shifts
 * シフトデータを取得（ログインユーザーのみ。会員も予約ページで参照するため管理者限定ではない）
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const cors = corsHeaders(request)

  const auth = await verifyUser(request, env)
  if (!auth.ok) return authErrorResponse(auth, request)

  const sbUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const sbKey = env.SUPABASE_SERVICE_ROLE_KEY

  try {
    const res = await fetch(
      `${sbUrl}/storage/v1/object/public/${BUCKET}/${SHIFTS_FILE}`,
      { headers: { Authorization: `Bearer ${sbKey}`, apikey: sbKey } }
    )
    if (res.ok) {
      const data = await res.json()
      return new Response(JSON.stringify(data), { status: 200, headers: cors })
    }
    return new Response(JSON.stringify([]), { status: 200, headers: cors })
  } catch {
    return new Response(JSON.stringify([]), { status: 200, headers: cors })
  }
}

/**
 * POST /api/shifts
 * シフトデータを保存（管理者のみ）
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const cors = corsHeaders(request)

  const auth = await verifyAdmin(request, env)
  if (!auth.ok) return authErrorResponse(auth, request)

  const sbUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const sbKey = env.SUPABASE_SERVICE_ROLE_KEY

  try {
    const shifts = await request.json()

    const res = await fetch(
      `${sbUrl}/storage/v1/object/${BUCKET}/${SHIFTS_FILE}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sbKey}`,
          apikey: sbKey,
          'Content-Type': 'application/json',
          'x-upsert': 'true',
        },
        body: JSON.stringify(shifts),
      }
    )

    if (res.ok) {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors })
    }
    const err = await res.text()
    return new Response(JSON.stringify({ ok: false, error: err }), { status: 500, headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500, headers: cors })
  }
}

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)
