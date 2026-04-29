/**
 * ペット給餌フック
 * meal_records が新規作成された時に呼ぶ。HP/食事カウント/ストリーク/進化判定を一括処理。
 *
 * - 食事更新（PATCH）では呼ばない（重複加算防止）
 * - 失敗してもメイン処理（食事記録）は失敗扱いにしない
 */

const HP_PER_MEAL = 33
const HP_DECAY_PER_DAY = 50
const HP_MAX = 100
const HP_MIN = 0
const MS_PER_DAY = 24 * 60 * 60 * 1000
const GRADUATION_DAYS = 30

const STAGES = [
  { stage: 'egg', days: 0, meals: 0 },
  { stage: 'baby', days: 0, meals: 1 },
  { stage: 'child', days: 3, meals: 6 },
  { stage: 'teen', days: 7, meals: 15 },
  { stage: 'adult', days: 14, meals: 40 },
] as const

interface ProfileRow {
  id: string
  pet_stage?: string | null
  pet_form?: string | null
  pet_hp?: number | null
  pet_last_fed_at?: string | null
  pet_started_at?: string | null
  pet_meals_count?: number | null
  pet_streak_days?: number | null
  pet_last_streak_date?: string | null
  pet_name?: string | null
  pet_enabled?: boolean | null
}

interface MealRow {
  protein_g?: number | null
  fat_g?: number | null
  carbs_g?: number | null
}

function todayStr(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function calculateCurrentHP(hp: number | null, lastFedAt: string | null, now: Date): number {
  if (hp == null) return HP_MAX
  if (!lastFedAt) return hp
  const elapsedMs = now.getTime() - new Date(lastFedAt).getTime()
  if (elapsedMs <= 0) return hp
  const decay = Math.floor((elapsedMs / MS_PER_DAY) * HP_DECAY_PER_DAY)
  return Math.max(HP_MIN, hp - decay)
}

function determineNextStage(currentStage: string, days: number, meals: number): string {
  const idx = STAGES.findIndex(s => s.stage === currentStage)
  if (idx < 0) return currentStage
  let next = currentStage
  for (let i = idx + 1; i < STAGES.length; i++) {
    if (days >= STAGES[i].days && meals >= STAGES[i].meals) next = STAGES[i].stage
    else break
  }
  return next
}

function determineAdultForm(streakDays: number, meals: MealRow[]): string {
  let pCal = 0, fCal = 0, cCal = 0
  for (const m of meals) {
    pCal += (m.protein_g || 0) * 4
    fCal += (m.fat_g || 0) * 9
    cCal += (m.carbs_g || 0) * 4
  }
  const total = pCal + fCal + cCal
  if (total === 0) return 'energy'
  const p = (pCal / total) * 100
  const f = (fCal / total) * 100
  const c = (cCal / total) * 100

  if (streakDays >= 30) return 'secret_ninja'
  const isPerfect = p >= 25 && p <= 35 && f >= 20 && f <= 30 && c >= 40 && c <= 50
  if (isPerfect && streakDays >= 14) return 'secret_warrior'
  if (isPerfect) return 'gold'
  if (p >= 35) return 'muscle'
  if (f >= 35) return 'fluffy'
  if (c >= 60) return 'energy'
  if (p >= 20 && f <= 25 && c >= 45) return 'green'
  return 'energy'
}

/**
 * meal記録（新規）後に呼ぶ。失敗しても無視。
 */
export async function feedPetOnMealCreated(
  supabaseUrl: string,
  serviceKey: string,
  userId: string
): Promise<void> {
  const now = new Date()
  const supaHeaders = {
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
    'Content-Type': 'application/json',
  }

  try {
    // 1. profile取得
    const r = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=*`,
      { headers: supaHeaders }
    )
    if (!r.ok) return
    const rows = await r.json() as ProfileRow[]
    if (rows.length === 0) return
    const cur = rows[0]
    if (cur.pet_enabled === false) return  // 機能OFF

    // 2. HP / カウント / ストリーク
    const startedAt = cur.pet_started_at ? new Date(cur.pet_started_at) : now
    const decayedHP = calculateCurrentHP(cur.pet_hp ?? HP_MAX, cur.pet_last_fed_at || null, now)
    const newHP = Math.min(HP_MAX, decayedHP + HP_PER_MEAL)
    const newMealsCount = (cur.pet_meals_count || 0) + 1

    const today = todayStr(now)
    let newStreak = cur.pet_streak_days || 0
    if (cur.pet_last_streak_date !== today) {
      if (cur.pet_last_streak_date) {
        const lastDate = new Date(cur.pet_last_streak_date)
        const diffDays = Math.round((now.getTime() - lastDate.getTime()) / MS_PER_DAY)
        newStreak = diffDays === 1 ? newStreak + 1 : 1
      } else {
        newStreak = 1
      }
    }

    // 3. 進化
    const daysSinceStart = Math.floor((now.getTime() - startedAt.getTime()) / MS_PER_DAY)
    const currentStage = cur.pet_stage || 'egg'
    const nextStage = determineNextStage(currentStage, daysSinceStart, newMealsCount)

    // 4. 大人化したらフォーム決定
    let newForm = cur.pet_form
    if (nextStage === 'adult' && currentStage !== 'adult') {
      const mealRes = await fetch(
        `${supabaseUrl}/rest/v1/meal_records?user_id=eq.${userId}&select=protein_g,fat_g,carbs_g&order=meal_date.desc&limit=200`,
        { headers: supaHeaders }
      )
      let meals: MealRow[] = []
      if (mealRes.ok) meals = await mealRes.json() as MealRow[]
      newForm = determineAdultForm(newStreak, meals)
    }

    // 5. 卒業判定
    let graduated = false
    let graduatedForm: string | null = null
    if (currentStage === 'adult' && nextStage === 'adult') {
      const adultAt = startedAt.getTime() + 14 * MS_PER_DAY
      const daysAsAdult = Math.floor((now.getTime() - adultAt) / MS_PER_DAY)
      if (daysAsAdult >= GRADUATION_DAYS) {
        graduated = true
        graduatedForm = cur.pet_form || 'energy'
      }
    }

    if (graduated && graduatedForm) {
      await fetch(`${supabaseUrl}/rest/v1/pet_history`, {
        method: 'POST',
        headers: supaHeaders,
        body: JSON.stringify({
          user_id: userId,
          pet_name: cur.pet_name || 'おにぎり君',
          final_form: graduatedForm,
          started_at: cur.pet_started_at,
          meals_count: newMealsCount,
          streak_max_days: newStreak,
          reason: 'graduated',
        }),
      })
      await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: supaHeaders,
          body: JSON.stringify({
            pet_stage: 'egg',
            pet_form: null,
            pet_hp: HP_MAX,
            pet_last_fed_at: now.toISOString(),
            pet_started_at: now.toISOString(),
            pet_meals_count: 0,
            pet_streak_days: newStreak,
            pet_last_streak_date: today,
          }),
        }
      )
      return
    }

    const patch: Record<string, unknown> = {
      pet_hp: newHP,
      pet_last_fed_at: now.toISOString(),
      pet_meals_count: newMealsCount,
      pet_streak_days: newStreak,
      pet_last_streak_date: today,
      pet_stage: nextStage,
    }
    if (nextStage === 'adult' && currentStage !== 'adult') patch.pet_form = newForm
    if (!cur.pet_started_at) patch.pet_started_at = now.toISOString()

    await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`,
      { method: 'PATCH', headers: supaHeaders, body: JSON.stringify(patch) }
    )
  } catch {
    // ペットフックの失敗は無視（食事記録自体には影響させない）
  }
}
