type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env; params: Record<string, string> }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

const supaHeaders = (env: Env) => ({
  'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
  'Content-Type': 'application/json',
})

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { headers: cors })

// GET: スタッフ一覧取得
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context
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

// POST: スタッフ新規作成
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context
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
