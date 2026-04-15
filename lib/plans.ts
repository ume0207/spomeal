/**
 * プラン別制限値の定義
 * API側（Cloudflare Functions）とフロント両方から参照する
 *
 * - trial: トライアル期間中（subscription_status === 'trialing'）
 *   ライトプランの内容 + ミーティング1回（トライアル期間合計）
 * - light/standard/premium: subscription_status === 'active' + subscription_plan
 */

export type PlanId = 'trial' | 'light' | 'standard' | 'premium'

export interface PlanLimits {
  /** AI食事解析・AIアドバイスの1日あたり実行回数上限（-1 = 無制限） */
  aiAnalysisPerDay: number
  /** ミーティング予約の月次上限（-1 = 無制限、0 = 不可） */
  meetingsPerMonth: number
  /** トライアル期間中の合計ミーティング回数（trialのみ有効） */
  meetingsTotal?: number
  /** 週1回フィードバックコメント（プレミアム専用） */
  weeklyFeedback: boolean
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  trial: {
    aiAnalysisPerDay: 5,
    meetingsPerMonth: 0,
    meetingsTotal: 1,
    weeklyFeedback: false,
  },
  light: {
    aiAnalysisPerDay: 5,
    meetingsPerMonth: 0,
    weeklyFeedback: false,
  },
  standard: {
    aiAnalysisPerDay: 10,
    meetingsPerMonth: 1,
    weeklyFeedback: false,
  },
  premium: {
    aiAnalysisPerDay: -1,
    meetingsPerMonth: 2,
    weeklyFeedback: true,
  },
}

/**
 * Supabase profiles の subscription_status / subscription_plan から PlanId を判定
 */
export function resolvePlanId(
  subscriptionStatus: string | null | undefined,
  subscriptionPlan: string | null | undefined
): PlanId {
  const status = (subscriptionStatus || '').toLowerCase()
  const plan = (subscriptionPlan || '').toLowerCase()

  // トライアル中は常に trial 制限を適用
  if (status === 'trialing' || status === 'trial') return 'trial'

  // プラン別の制限
  if (plan === 'premium') return 'premium'
  if (plan === 'standard') return 'standard'
  if (plan === 'light') return 'light'

  // デフォルト（未課金・不明）はライトの制限を適用
  return 'light'
}

/**
 * プラン別の制限値を取得
 */
export function getPlanLimits(planId: PlanId): PlanLimits {
  return PLAN_LIMITS[planId]
}

/**
 * プラン名の表示文字列
 */
export const PLAN_LABELS: Record<PlanId, string> = {
  trial: 'トライアル',
  light: 'ライト',
  standard: 'スタンダード',
  premium: 'プレミアム',
}

/**
 * 無制限チェック用ヘルパー
 */
export function isUnlimited(value: number): boolean {
  return value === -1
}
