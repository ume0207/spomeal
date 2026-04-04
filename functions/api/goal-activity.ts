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
          const { userId, cal, protein, fat, carbs, targetWeight, currentWeight, height, activityLevel, goalType, pfcP, pfcF, pfcC } = body
          if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: cors })

      const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
          const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY

      const userRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
              headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey },
      })
          const userData = await userRes.json() as any
          const meta = userData.user_metadata || {}

                const goalData = {
                        cal, protein, fat, carbs, targetWeight, currentWeight, height,
                        activityLevel, goalType, pfcP, pfcF, pfcC,
                        updatedAt: new Date().toISOString(),
                }

      const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
              method: 'PUT',
              headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey, 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_metadata: { ...meta, goal_data: goalData } }),
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
