type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
    NEXT_PUBLIC_SUPABASE_URL: string
    SUPABASE_SERVICE_ROLE_KEY: string
}

const cors = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
}

export const onRequestOptions: PagesFunction = async () => {
    return new Response(null, {
          headers: {
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'POST, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type',
          },
    })
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const { env, request } = context
    try {
          const body = await request.json() as any
          const { userId, date, weight, bodyFat, muscle, bmi } = body
          if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: cors })

      const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
          const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY

      const userRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
              headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey },
      })
          const userData = await userRes.json() as any
          const meta = userData.user_metadata || {}
                let bodyActivity: any[] = Array.isArray(meta.body_activity) ? [...meta.body_activity] : []

                      const newEntry = { date, weight, bodyFat, muscle, bmi, recordedAt: new Date().toISOString() }
          const existingIdx = bodyActivity.findIndex((e: any) => e.date === date)
          if (existingIdx >= 0) {
                  bodyActivity[existingIdx] = newEntry
          } else {
                  bodyActivity.unshift(newEntry)
          }
          bodyActivity = bodyActivity.slice(0, 30)

      const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
              method: 'PUT',
              headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey, 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_metadata: { ...meta, body_activity: bodyActivity } }),
      })
          if (!updateRes.ok) {
                  const err = await updateRes.text()
                  return new Response(JSON.stringify({ error: err }), { status: 500, headers: cors })
          }
          return new Response(JSON.stringify({ ok: true }), { headers: cors })
    } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors })
    }
}
