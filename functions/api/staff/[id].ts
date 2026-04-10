type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env; params: Record<string, string> }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH, DELETE, OPTIONS',
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

// PATCH: スタッフ更新
export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context
  const id = params.id
  try {
    const body = await request.json() as Record<string, unknown>
    const res = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/staff?id=eq.${id}`,
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

// DELETE: スタッフ削除
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { env, params } = context
  const id = params.id
  try {
    const res = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/staff?id=eq.${id}`,
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
