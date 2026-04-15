import { verifyUser, verifyAdmin, corsHeaders, handleOptions, authErrorResponse } from '../_shared/auth'

type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
    NEXT_PUBLIC_SUPABASE_URL: string
    SUPABASE_SERVICE_ROLE_KEY: string
    ADMIN_EMAILS?: string
}

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const { env, request } = context
    const cors = corsHeaders(request)
    try {
          const body = await request.json() as any
          const { userId, date, weight, bodyFat, muscle, bmi } = body
          if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: cors })

          // 認証：管理者トークン優先、次に本人のSupabase JWT
          const admin = await verifyAdmin(request, env)
          if (!admin.ok) {
            const auth = await verifyUser(request, env)
            if (!auth.ok) return authErrorResponse(auth, request)
            if (auth.user.id !== userId) {
              return authErrorResponse({ ok: false, status: 403, error: '他のユーザーのデータは更新できません' }, request)
            }
          }

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
