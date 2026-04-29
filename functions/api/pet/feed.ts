/**
 * POST /api/pet/feed
 * body: { userId }
 *
 * 食事記録が作成されたタイミングで呼ばれる「ペット給餌」エンドポイント。
 * - HP回復（+33、上限100）
 * - 食事カウント+1
 * - ストリーク更新（同日内なら据え置き、翌日なら+1、間が空けばリセット）
 * - 進化判定（時間 + 食事数の両条件）
 * - 大人化時は直近30日のmeal_recordsからPFC比率を算出してフォーム決定
 * - 卒業判定（大人になって30日経過）
 *
 * 冪等性：同じ食事記録に対して複数回呼ばれても、ストリークと食事カウントが
 * 重複加算されないよう、呼び元（meal記録API）が「初回作成時のみ呼ぶ」前提
 */

import { verifyUser, corsHeaders, handleOptions, authErrorResponse } from '../../_shared/auth'

type PagesFunction<Env = Record<string, unknown>> = (context: {
  request: Request
  env: Env
}) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

const HP_PER_MEAL = 33
const HP_DECAY_PER_DAY = 50
const HP_MAX = 100
const HP_MIN = 0
const MS_PER_DAY = 24 * 60 * 60 * 1000

const STAGES = [
  { stage: 'egg',   days: 0,  meals: 0  },
  { stage: 'baby',  days: 0,  meals: 1  },
  { stage: 'child', days: 3,  meals: 6  },
  { stage: 'teen',  days: 7,  meals: 15 },
  { stage: 'adult', days: 14, meals: 40 },
] as const

const GRADUATION_DAYS = 30

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
  pet_skip_passes?: number | null
  pet_skip_passes_refilled_at?: string | null
  pet_name?: string | null
  pet_enabled?: boolean | null
}

interface MealRow {
  protein_g?: number | null
  fat_g?: number | null
  carbs_g?: number | null
  meal_date?: string | null
}

function todayStr(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function calculateCurrentHP(hp: number | null, lastFedAt: string | null, now = new Date()): number {
  if (hp == null) return HP_MAX
  if (!lastFedAt) return hp
  const last = new Date(lastFedAt).getTime()
  const elapsedMs = now.getTime() - last
  if (elapsedMs <= 0) return hp
  const daysElapsed = elapsedMs / MS_PER_DAY
  const decay = Math.floor(daysElapsed * HP_DECAY_PER_DAY)
  return Math.max(HP_MIN, hp - decay)
}

function determineNextStage(currentStage: string, days: number, meals: number): string {
  const currentIdx = STAGES.findIndex(s => s.stage === currentStage)
  if (currentIdx < 0) return currentStage
  let next = currentStage
  for (let i = currentIdx + 1; i < STAGES.length; i++) {
    const t = STAGES[i]
    if (days >= t.days && meals >= t.meals) next = t.stage
    else break
  }
  return next
}

function computePFC(meals: MealRow[]): { p: number; f: number; c: number } {
  let pCal = 0, fCal = 0, cCal = 0
  for (const m of meals) {
    pCal += (m.protein_g || 0) * 4
    fCal += (m.fat_g || 0) * 9
    cCal += (m.carbs_g || 0) * 4
  }
  const total = pCal + fCal + cCal
  if (total === 0) return { p: 0, f: 0, c: 0 }
  return {
    p: (pCal / total) * 100,
    f: (fCal / total) * 100,
    c: (cCal / total) * 100,
  }
}

function determineAdultForm(streakDays: number, pfc: { p: number; f: number; c: number }): string {
  if (streakDays >= 30) return 'secret_ninja'
  const isPerfect = pfc.p >= 25 && pfc.p <= 35 && pfc.f >= 20 && pfc.f <= 30 && pfc.c >= 40 && pfc.c <= 50
  if (isPerfect && streakDays >= 14) return 'secret_warrior'
  if (isPerfect) return 'gold'
  if (pfc.p >= 35) return 'muscle'
  if (pfc.f >= 35) return 'fluffy'
  if (pfc.c >= 60) return 'energy'
  if (pfc.p >= 20 && pfc.f <= 25 && pfc.c >= 45) return 'green'
  return 'energy'
}

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const cors = corsHeaders(request)
  const auth = await verifyUser(request, env)
  if (!auth.ok) return authErrorResponse(auth, request)

  let body: { userId?: string }
  try {
    body = await request.json() as typeof body
  } catch {
    return new Response(JSON.stringify({ error: 'JSON 解析失敗' }), { status: 400, headers: cors })
  }
  if (!body.userId || body.userId !== auth.user.id) {
    return new Response(JSON.stringify({ error: '不正なuserId' }), { status: 403, headers: cors })
  }

  const userId = body.userId
  const now = new Date()

  const supaHeaders = {
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    'Content-Type': 'application/json',
  }

  // 1. 現状取得
  const profRes = await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`,
    { headers: supaHeaders }
  )
  if (!profRes.ok) {
    return new Response(JSON.stringify({ error: 'profile取得失敗' }), { status: 500, headers: cors })
  }
  const rows = await profRes.json() as ProfileRow[]
  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: 'profileなし' }), { status: 404, headers: cors })
  }
  const cur = rows[0]

  // ペット無効化中なら何もしない
  if (cur.pet_enabled === false) {
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'disabled' }), { headers: cors })
  }

  // 2. HP/カウント/ストリーク更新
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

  // 3. 進化判定
  const daysSinceStart = Math.floor((now.getTime() - startedAt.getTime()) / MS_PER_DAY)
  const currentStage = cur.pet_stage || 'egg'
  const nextStage = determineNextStage(currentStage, daysSinceStart, newMealsCount)
  const evolved = nextStage !== currentStage

  // 4. 大人化したらフォーム決定
  let newForm = cur.pet_form
  let madeAdult = false
  if (nextStage === 'adult' && currentStage !== 'adult') {
    madeAdult = true
    // 直近30日のmeal_recordsを取得
    const mealRes = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/meal_records?user_id=eq.${userId}&select=protein_g,fat_g,carbs_g,meal_date&order=meal_date.desc&limit=200`,
      { headers: supaHeaders }
    )
    let pfc = { p: 0, f: 0, c: 0 }
    if (mealRes.ok) {
      const meals = await mealRes.json() as MealRow[]
      pfc = computePFC(meals)
    }
    newForm = determineAdultForm(newStreak, pfc)
  }

  // 5. 卒業判定（大人になって30日以上経過）
  let graduated = false
  let graduatedForm: string | null = null
  if (currentStage === 'adult' && nextStage === 'adult') {
    // 大人になった日 = pet_started_at + 14日
    const adultAt = startedAt.getTime() + 14 * MS_PER_DAY
    const daysAsAdult = Math.floor((now.getTime() - adultAt) / MS_PER_DAY)
    if (daysAsAdult >= GRADUATION_DAYS) {
      graduated = true
      graduatedForm = cur.pet_form || 'energy'
    }
  }

  // 6. DBへ書き戻し
  if (graduated && graduatedForm) {
    // 履歴に保存
    await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/pet_history`, {
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
    }).catch(() => {})
    // 新しい卵を生成
    const patch = {
      pet_stage: 'egg',
      pet_form: null,
      pet_hp: HP_MAX,
      pet_last_fed_at: now.toISOString(),
      pet_started_at: now.toISOString(),
      pet_meals_count: 0,
      pet_streak_days: newStreak, // ストリークだけは引き継ぐ
      pet_last_streak_date: today,
    }
    await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
      { method: 'PATCH', headers: supaHeaders, body: JSON.stringify(patch) }
    )
    return new Response(JSON.stringify({
      ok: true,
      graduated: true,
      graduatedForm,
      newStage: 'egg',
    }), { headers: cors })
  }

  const patch: Record<string, unknown> = {
    pet_hp: newHP,
    pet_last_fed_at: now.toISOString(),
    pet_meals_count: newMealsCount,
    pet_streak_days: newStreak,
    pet_last_streak_date: today,
    pet_stage: nextStage,
  }
  if (madeAdult) patch.pet_form = newForm
  // pet_started_at 未設定なら今を入れる（ペット未開始の人を救済）
  if (!cur.pet_started_at) patch.pet_started_at = now.toISOString()

  const updRes = await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
    { method: 'PATCH', headers: supaHeaders, body: JSON.stringify(patch) }
  )
  if (!updRes.ok) {
    return new Response(JSON.stringify({ error: 'profile更新失敗', detail: await updRes.text() }), { status: 500, headers: cors })
  }

  return new Response(JSON.stringify({
    ok: true,
    evolved,
    madeAdult,
    newStage: nextStage,
    newForm: madeAdult ? newForm : null,
    newHP,
    newMealsCount,
    newStreak,
  }), { headers: cors })
}
