import { verifyUser, corsHeaders, handleOptions, authErrorResponse } from '../_shared/auth'
import {
  getUserPlanId,
  getMeetingCountThisMonth,
  getMeetingCountTotal,
  getAiAnalysisCountToday,
  PLAN_LIMITS,
} from '../_shared/usage'

type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

/**
 * GET /api/plan-usage
 * 認証ユーザーの当月使用量を返す（ダッシュボード用）
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const cors = corsHeaders(request)

  const auth = await verifyUser(request, env)
  if (!auth.ok) return authErrorResponse(auth, request)

  const userId = auth.user.id
  const planId = await getUserPlanId(userId, env)
  const limits = PLAN_LIMITS[planId]

  // ミーティング使用量
  let meetingUsed = 0
  let meetingLimit = 0
  if (planId === 'trial') {
    meetingUsed = await getMeetingCountTotal(userId, env)
    meetingLimit = limits.meetingsTotal || 0
  } else {
    meetingUsed = await getMeetingCountThisMonth(userId, env)
    meetingLimit = limits.meetingsPerMonth
  }

  // AI解析使用量
  const aiUsed = await getAiAnalysisCountToday(userId, env)
  const aiLimit = limits.aiAnalysisPerDay

  return new Response(
    JSON.stringify({
      planId,
      meetings: {
        used: meetingUsed,
        limit: meetingLimit,
        unlimited: meetingLimit === -1,
        period: planId === 'trial' ? 'total' : 'month',
      },
      aiAnalysis: {
        used: aiUsed,
        limit: aiLimit,
        unlimited: aiLimit === -1,
        period: 'day',
      },
    }),
    { status: 200, headers: cors }
  )
}

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)
