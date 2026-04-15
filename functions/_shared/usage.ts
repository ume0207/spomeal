/**
 * プラン別制限の使用量チェック・インクリメントヘルパー
 *
 * - ミーティング予約回数: reservations テーブルから集計
 * - AI食事解析回数: user_points.records[date].aiAnalysis に日次カウンタ
 */

// プラン定義を_shared内に複製（functions/から lib/ を直接importできないため）
export type PlanId = 'trial' | 'light' | 'standard' | 'premium'

export interface PlanLimits {
  aiAnalysisPerDay: number
  meetingsPerMonth: number
  meetingsTotal?: number
  weeklyFeedback: boolean
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  trial: { aiAnalysisPerDay: 5, meetingsPerMonth: 0, meetingsTotal: 1, weeklyFeedback: false },
  light: { aiAnalysisPerDay: 5, meetingsPerMonth: 0, weeklyFeedback: false },
  standard: { aiAnalysisPerDay: 10, meetingsPerMonth: 1, weeklyFeedback: false },
  premium: { aiAnalysisPerDay: -1, meetingsPerMonth: 2, weeklyFeedback: true },
}

export function resolvePlanId(
  subscriptionStatus: string | null | undefined,
  subscriptionPlan: string | null | undefined
): PlanId {
  const status = (subscriptionStatus || '').toLowerCase()
  const plan = (subscriptionPlan || '').toLowerCase()
  if (status === 'trialing' || status === 'trial') return 'trial'
  if (plan === 'premium') return 'premium'
  if (plan === 'standard') return 'standard'
  if (plan === 'light') return 'light'
  return 'light'
}

/**
 * Supabaseから会員のサブスクリプション情報を取得してプランIDを判定
 */
export async function getUserPlanId(
  userId: string,
  env: { NEXT_PUBLIC_SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string }
): Promise<PlanId> {
  try {
    const res = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=subscription_status,subscription_plan`,
      {
        headers: {
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    )
    if (!res.ok) return 'light'
    const rows = (await res.json()) as Array<{ subscription_status?: string; subscription_plan?: string }>
    const profile = rows[0]
    if (!profile) return 'light'
    return resolvePlanId(profile.subscription_status, profile.subscription_plan)
  } catch {
    return 'light'
  }
}

// =============================================================================
// ミーティング予約回数のカウント（reservations テーブルから集計）
// =============================================================================

/**
 * 当月のミーティング予約数を取得（cancelled は除外）
 */
export async function getMeetingCountThisMonth(
  userId: string,
  env: { NEXT_PUBLIC_SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string }
): Promise<number> {
  const now = new Date()
  const jstOffset = 9 * 60 * 60 * 1000
  const jstNow = new Date(now.getTime() + jstOffset)
  const year = jstNow.getUTCFullYear()
  const month = jstNow.getUTCMonth() + 1
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = `${year}-${String(month).padStart(2, '0')}-31`

  const res = await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/reservations?user_id=eq.${encodeURIComponent(userId)}&date=gte.${firstDay}&date=lte.${lastDay}&status=neq.cancelled&select=id`,
    {
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      },
    }
  )
  if (!res.ok) return 0
  const rows = (await res.json()) as unknown[]
  return rows.length
}

/**
 * トライアル期間中の合計ミーティング予約数を取得
 */
export async function getMeetingCountTotal(
  userId: string,
  env: { NEXT_PUBLIC_SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string }
): Promise<number> {
  const res = await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/reservations?user_id=eq.${encodeURIComponent(userId)}&status=neq.cancelled&select=id`,
    {
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      },
    }
  )
  if (!res.ok) return 0
  const rows = (await res.json()) as unknown[]
  return rows.length
}

/**
 * ミーティング予約可能かチェック
 */
export async function canBookMeeting(
  userId: string,
  env: { NEXT_PUBLIC_SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string }
): Promise<{ ok: boolean; planId: PlanId; current: number; limit: number; message?: string }> {
  const planId = await getUserPlanId(userId, env)
  const limits = PLAN_LIMITS[planId]

  if (planId === 'trial') {
    const total = await getMeetingCountTotal(userId, env)
    const limit = limits.meetingsTotal || 0
    if (total >= limit) {
      return {
        ok: false,
        planId,
        current: total,
        limit,
        message: `トライアルプランのミーティング予約上限(${limit}回)に達しています。有料プランへアップグレードしてください。`,
      }
    }
    return { ok: true, planId, current: total, limit }
  }

  const limit = limits.meetingsPerMonth
  if (limit === 0) {
    return {
      ok: false,
      planId,
      current: 0,
      limit,
      message: `ライトプランではミーティング予約はご利用いただけません。スタンダード以上にアップグレードしてください。`,
    }
  }
  if (limit === -1) {
    return { ok: true, planId, current: 0, limit }
  }

  const count = await getMeetingCountThisMonth(userId, env)
  if (count >= limit) {
    return {
      ok: false,
      planId,
      current: count,
      limit,
      message: `今月のミーティング予約上限(${limit}回)に達しています。来月以降にご予約いただくか、プランをアップグレードしてください。`,
    }
  }
  return { ok: true, planId, current: count, limit }
}

// =============================================================================
// AI食事解析回数（user_points.records の日次カウンタ）
// =============================================================================

interface PointsRecord {
  date: string
  breakfast: boolean
  lunch: boolean
  dinner: boolean
  snack: boolean
  bonus: boolean
  body: boolean
  aiAnalysis?: number
}

interface UserPointsRow {
  user_id: string
  total_points: number
  lottery_count: number
  records: PointsRecord[]
  lottery_history: unknown[]
}

function getJSTDateStr(): string {
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().slice(0, 10)
}

/**
 * 本日のAI解析回数を取得
 */
export async function getAiAnalysisCountToday(
  userId: string,
  env: { NEXT_PUBLIC_SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string }
): Promise<number> {
  const res = await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_points?user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      },
    }
  )
  if (!res.ok) return 0
  const rows = (await res.json()) as UserPointsRow[]
  if (rows.length === 0) return 0

  const today = getJSTDateStr()
  const record = rows[0].records?.find((r) => r.date === today)
  return record?.aiAnalysis || 0
}

/**
 * AI解析が可能かチェック
 */
export async function canUseAiAnalysis(
  userId: string,
  env: { NEXT_PUBLIC_SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string }
): Promise<{ ok: boolean; planId: PlanId; current: number; limit: number; message?: string }> {
  const planId = await getUserPlanId(userId, env)
  const limits = PLAN_LIMITS[planId]
  const limit = limits.aiAnalysisPerDay

  if (limit === -1) {
    return { ok: true, planId, current: 0, limit }
  }

  const count = await getAiAnalysisCountToday(userId, env)
  if (count >= limit) {
    return {
      ok: false,
      planId,
      current: count,
      limit,
      message: `本日のAI食事解析の上限(${limit}回)に達しています。明日リセットされます。プランをアップグレードすると回数を増やせます。`,
    }
  }
  return { ok: true, planId, current: count, limit }
}

/**
 * AI解析回数をインクリメント
 */
export async function incrementAiAnalysisCount(
  userId: string,
  env: { NEXT_PUBLIC_SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string }
): Promise<void> {
  const sbUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const sbKey = env.SUPABASE_SERVICE_ROLE_KEY

  // 現在のレコードを取得
  const getRes = await fetch(
    `${sbUrl}/rest/v1/user_points?user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    { headers: { Authorization: `Bearer ${sbKey}`, apikey: sbKey } }
  )
  if (!getRes.ok) return

  const existing = (await getRes.json()) as UserPointsRow[]
  const today = getJSTDateStr()

  const current = existing[0] || {
    user_id: userId,
    total_points: 0,
    lottery_count: 0,
    records: [],
    lottery_history: [],
  }

  const records = Array.isArray(current.records) ? [...current.records] : []
  let record = records.find((r) => r.date === today)
  if (!record) {
    record = {
      date: today,
      breakfast: false,
      lunch: false,
      dinner: false,
      snack: false,
      bonus: false,
      body: false,
      aiAnalysis: 0,
    }
    records.push(record)
  }
  record.aiAnalysis = (record.aiAnalysis || 0) + 1

  await fetch(`${sbUrl}/rest/v1/user_points`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sbKey}`,
      apikey: sbKey,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      user_id: userId,
      total_points: current.total_points || 0,
      lottery_count: current.lottery_count || 0,
      records,
      lottery_history: current.lottery_history || [],
      updated_at: new Date().toISOString(),
    }),
  })
}
