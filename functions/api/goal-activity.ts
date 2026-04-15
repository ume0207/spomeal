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
          const { userId, cal, protein, fat, carbs, targetWeight, currentWeight, height, activityLevel, goalType, pfcP, pfcF, pfcC } = body
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
