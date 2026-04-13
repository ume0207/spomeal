type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

const BUCKET = 'app-config'
const SCHEDULE_FILE = 'schedule.json'

/**
 * GET /api/schedule
 * タイムスロット設定を取得（管理者・会員共通）
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context
  const sbUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const sbKey = env.SUPABASE_SERVICE_ROLE_KEY

  try {
    const res = await fetch(
      `${sbUrl}/storage/v1/object/public/${BUCKET}/${SCHEDULE_FILE}`,
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
 * POST /api/schedule
 * タイムスロット設定を保存（管理者用）
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const sbUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const sbKey = env.SUPABASE_SERVICE_ROLE_KEY

  try {
    const schedule = await request.json()

    const res = await fetch(
      `${sbUrl}/storage/v1/object/${BUCKET}/${SCHEDULE_FILE}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sbKey}`,
          apikey: sbKey,
          'Content-Type': 'application/json',
          'x-upsert': 'true',
        },
        body: JSON.stringify(schedule),
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

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
