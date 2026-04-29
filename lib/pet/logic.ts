/**
 * ペット機能のコアロジック（純粋関数）
 *
 * - HP計算（食事記録回復、時間経過減算）
 * - ステージ進化判定
 * - 大人形態（PFC分岐）判定
 * - 隠しキャラ判定
 *
 * 副作用なし、テストしやすい設計。
 */

import {
  PetState,
  PetStage,
  PetForm,
  MealNutrition,
  STAGE_PROGRESSION,
  GRADUATION_DAYS,
  HP_PER_MEAL,
  HP_DECAY_PER_DAY,
  HP_MAX,
  HP_MIN,
  SKIP_PASSES_PER_MONTH,
} from './types'

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * 現在のHPを「最終給餌時刻からの経過時間」で減算した値を返す
 * （食事記録時にDBに書き戻し、定期バッチでも更新される）
 */
export function calculateCurrentHP(state: PetState, now: Date = new Date()): number {
  if (!state.lastFedAt) return state.hp
  const last = new Date(state.lastFedAt).getTime()
  const elapsedMs = now.getTime() - last
  if (elapsedMs <= 0) return state.hp
  const daysElapsed = elapsedMs / MS_PER_DAY
  const decay = Math.floor(daysElapsed * HP_DECAY_PER_DAY)
  return Math.max(HP_MIN, state.hp - decay)
}

/**
 * 食事記録1件で回復した後のHPを返す
 */
export function applyMealHP(currentHP: number): number {
  return Math.min(HP_MAX, currentHP + HP_PER_MEAL)
}

/**
 * ペットが活動を開始してからの経過日数
 */
export function daysSinceStart(state: PetState, now: Date = new Date()): number {
  const start = new Date(state.startedAt).getTime()
  const elapsed = now.getTime() - start
  return Math.floor(elapsed / MS_PER_DAY)
}

/**
 * 大人になってからの日数（卒業判定用）
 * stageが'adult'でない場合は0を返す
 */
export function daysAsAdult(state: PetState, now: Date = new Date()): number {
  if (state.stage !== 'adult') return 0
  // adult化のタイミングを推定：ペット開始から14日後
  const start = new Date(state.startedAt).getTime()
  const adultAt = start + 14 * MS_PER_DAY
  const elapsed = now.getTime() - adultAt
  return Math.max(0, Math.floor(elapsed / MS_PER_DAY))
}

/**
 * 次に進化できるステージを返す（時間と食事数の両方を満たした時のみ）
 * 進化条件を満たさない場合は現在のステージを返す
 */
export function determineNextStage(state: PetState, now: Date = new Date()): PetStage {
  const days = daysSinceStart(state, now)
  const meals = state.mealsCount
  const currentIndex = STAGE_PROGRESSION.findIndex(s => s.stage === state.stage)
  if (currentIndex < 0 || currentIndex >= STAGE_PROGRESSION.length - 1) return state.stage

  // 現在ステージから順に「進化できる最も先のステージ」を探す
  let next: PetStage = state.stage
  for (let i = currentIndex + 1; i < STAGE_PROGRESSION.length; i++) {
    const target = STAGE_PROGRESSION[i]
    if (days >= target.daysFromStart && meals >= target.mealsRequired) {
      next = target.stage
    } else {
      break
    }
  }
  return next
}

/**
 * 次のステージまでの「あと何食 / あと何日」を返す
 */
export function progressToNextStage(state: PetState, now: Date = new Date()): {
  nextStage: PetStage | null
  mealsNeeded: number
  daysNeeded: number
} {
  const currentIndex = STAGE_PROGRESSION.findIndex(s => s.stage === state.stage)
  if (currentIndex < 0 || currentIndex >= STAGE_PROGRESSION.length - 1) {
    return { nextStage: null, mealsNeeded: 0, daysNeeded: 0 }
  }
  const target = STAGE_PROGRESSION[currentIndex + 1]
  const days = daysSinceStart(state, now)
  return {
    nextStage: target.stage,
    mealsNeeded: Math.max(0, target.mealsRequired - state.mealsCount),
    daysNeeded: Math.max(0, target.daysFromStart - days),
  }
}

/**
 * PFC比率を計算（合計カロリーに対する各栄養素のカロリー%）
 * - protein: 4 kcal/g
 * - fat: 9 kcal/g
 * - carbs: 4 kcal/g
 */
export function computePFCRatio(meals: MealNutrition[]): {
  proteinPct: number
  fatPct: number
  carbsPct: number
  totalCalories: number
} {
  let pCal = 0, fCal = 0, cCal = 0
  for (const m of meals) {
    pCal += (m.protein || 0) * 4
    fCal += (m.fat || 0) * 9
    cCal += (m.carbs || 0) * 4
  }
  const total = pCal + fCal + cCal
  if (total === 0) return { proteinPct: 0, fatPct: 0, carbsPct: 0, totalCalories: 0 }
  return {
    proteinPct: Math.round((pCal / total) * 1000) / 10,
    fatPct: Math.round((fCal / total) * 1000) / 10,
    carbsPct: Math.round((cCal / total) * 1000) / 10,
    totalCalories: Math.round(pCal + fCal + cCal),
  }
}

/**
 * 大人になる時のフォーム（進化分岐）を判定
 *
 * 優先順位：
 * 1. 隠しキャラ条件（ストリーク30日 / PFCパーフェクト14日）
 * 2. PFCバランス完璧 → gold
 * 3. PFC偏向 → muscle / energy / fluffy
 * 4. ヘルシー → green（カロリー目標達成 + 偏りなし）
 * 5. デフォルト → energy（炭水化物が主食）
 */
export function determineAdultForm(
  state: PetState,
  meals: MealNutrition[]
): PetForm {
  const pfc = computePFCRatio(meals)

  // 隠しキャラ判定
  if (state.streakDays >= 30) return 'secret_ninja'

  // PFCパーフェクト14日：直近の食事で連続してパーフェクトだった場合（簡易判定）
  // ※詳細な「14日連続パーフェクト」は別途タスクで判定。ここでは流入時のPFC値で代替
  const isPerfectNow = (
    pfc.proteinPct >= 25 && pfc.proteinPct <= 35 &&
    pfc.fatPct >= 20 && pfc.fatPct <= 30 &&
    pfc.carbsPct >= 40 && pfc.carbsPct <= 50
  )
  if (isPerfectNow && state.streakDays >= 14) return 'secret_warrior'
  if (isPerfectNow) return 'gold'

  // PFC偏向
  if (pfc.proteinPct >= 35) return 'muscle'
  if (pfc.fatPct >= 35) return 'fluffy'
  if (pfc.carbsPct >= 60) return 'energy'

  // ヘルシー：野菜・低脂質・バランス気味
  // タンパク質しっかり（>=20%）かつ脂質控えめ（<=25%）
  if (pfc.proteinPct >= 20 && pfc.fatPct <= 25 && pfc.carbsPct >= 45) return 'green'

  // デフォルト
  return 'energy'
}

/**
 * 卒業判定：大人になってGRADUATION_DAYS日経過したら true
 */
export function shouldGraduate(state: PetState, now: Date = new Date()): boolean {
  return state.stage === 'adult' && daysAsAdult(state, now) >= GRADUATION_DAYS
}

/**
 * 衰弱判定：HPが0で、かつ72時間以上記録なし → 「お別れ」演出（モダンUX）
 * ※死ではなく「旅に出た」演出にする
 */
export function shouldFarewell(state: PetState, now: Date = new Date()): boolean {
  if (state.hp > 0) return false
  if (!state.lastFedAt) {
    // 1度も給餌されてない場合、ペット開始から72h
    return now.getTime() - new Date(state.startedAt).getTime() >= 3 * MS_PER_DAY
  }
  return now.getTime() - new Date(state.lastFedAt).getTime() >= 3 * MS_PER_DAY
}

/**
 * 連続記録日数の更新
 * - 今日初めて記録した: streak += 1
 * - すでに今日記録していた: 変化なし
 * - 1日以上空いた: streak = 1（リセット）
 *
 * skip pass を使えば「1日サボっても継続扱い」にできる
 */
export function updateStreak(
  lastStreakDate: string | null,
  todayStr: string,
  currentStreak: number,
  options: { useSkipPass?: boolean } = {}
): { newStreak: number; skipPassUsed: boolean } {
  if (!lastStreakDate) {
    return { newStreak: 1, skipPassUsed: false }
  }
  if (lastStreakDate === todayStr) {
    return { newStreak: currentStreak, skipPassUsed: false }
  }

  // 連続日数の差分計算
  const last = new Date(lastStreakDate)
  const today = new Date(todayStr)
  const diffDays = Math.round((today.getTime() - last.getTime()) / MS_PER_DAY)

  if (diffDays === 1) {
    return { newStreak: currentStreak + 1, skipPassUsed: false }
  }

  if (diffDays === 2 && options.useSkipPass) {
    // 1日サボったがskip passで救済
    return { newStreak: currentStreak + 1, skipPassUsed: true }
  }

  // 2日以上空いた → リセット
  return { newStreak: 1, skipPassUsed: false }
}

/**
 * 月初（または初回）に skip passes を補充するロジック
 * 月をまたいだら 2 個に補充
 */
export function shouldRefillSkipPasses(
  lastRefilledAt: string | null,
  now: Date = new Date()
): boolean {
  if (!lastRefilledAt) return true
  const last = new Date(lastRefilledAt)
  const lastMonth = last.getFullYear() * 100 + last.getMonth()
  const nowMonth = now.getFullYear() * 100 + now.getMonth()
  return nowMonth > lastMonth
}

export function refilledSkipPasses(): number {
  return SKIP_PASSES_PER_MONTH
}

/**
 * 'YYYY-MM-DD' 形式の日付文字列を返す（JST想定でDate→string変換）
 */
export function dateToISOString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * デフォルト（卵）状態を生成
 */
export function createDefaultPetState(now: Date = new Date()): PetState {
  return {
    stage: 'egg',
    form: null,
    hp: HP_MAX,
    lastFedAt: null,
    startedAt: now.toISOString(),
    mealsCount: 0,
    streakDays: 0,
    lastStreakDate: null,
    skipPasses: 2,
    skipPassesRefilledAt: now.toISOString(),
    name: 'おにぎり君',
    enabled: true,
  }
}
