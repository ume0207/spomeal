import { verifyUser, verifyAdmin, corsHeaders, handleOptions, authErrorResponse } from '../_shared/auth'

type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  ADMIN_EMAILS?: string
}

async function authorize(request: Request, env: Env, targetUserId: string) {
  const auth = await verifyUser(request, env)
  if (!auth.ok) return auth
  if (auth.user.id === targetUserId) return auth
  const admin = await verifyAdmin(request, env)
  if (admin.ok) return admin
  return { ok: false as const, status: 403, error: '他のユーザーのデータにはアクセスできません' }
}

const PRIZES = [
  { prize: 'ハズレ', rarity: 'miss', icon: '💨', weight: 400 },
  { prize: 'スポミルステッカー', rarity: 'common', icon: '🎫', weight: 350 },
  { prize: 'スポミルTシャツ', rarity: 'rare', icon: '👕', weight: 130 },
  { prize: 'プロテイン1kg', rarity: 'rare', icon: '💪', weight: 80 },
  { prize: 'クオカード500円', rarity: 'super_rare', icon: '💳', weight: 30 },
  { prize: 'リカバリープロ', rarity: 'ultra_rare', icon: '🏆', weight: 10 },
]

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)

// GET /api/user-points?userId=xxx
export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const cors = corsHeaders(request)
  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')
  if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: cors })

  const authResult = await authorize(request, env, userId)
  if (!authResult.ok) return authErrorResponse(authResult, request)

  const { NEXT_PUBLIC_SUPABASE_URL: sbUrl, SUPABASE_SERVICE_ROLE_KEY: sbKey } = env
  const res = await fetch(`${sbUrl}/rest/v1/user_points?user_id=eq.${encodeURIComponent(userId)}&limit=1`, {
    headers: { Authorization: `Bearer ${sbKey}`, apikey: sbKey },
  })
  const data = await res.json() as any[]
  return new Response(JSON.stringify(data[0] || { total_points: 0, lottery_count: 0, records: [], lottery_history: [] }), { headers: cors })
}

// POST /api/user-points
// action: 'addMeal' | 'addBody' | 'lottery' | 'save'
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const cors = corsHeaders(request)
  const { NEXT_PUBLIC_SUPABASE_URL: sbUrl, SUPABASE_SERVICE_ROLE_KEY: sbKey } = env
  const body = await request.json() as any
  const { userId, action } = body
  if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: cors })

  const authResult = await authorize(request, env, userId)
  if (!authResult.ok) return authErrorResponse(authResult, request)

  // 現在のポイントデータを取得
  const getRes = await fetch(`${sbUrl}/rest/v1/user_points?user_id=eq.${userId}&limit=1`, {
    headers: { Authorization: `Bearer ${sbKey}`, apikey: sbKey },
  })
  const existing = await getRes.json() as any[]
  const current = existing[0] || { total_points: 0, lottery_count: 0, records: [], lottery_history: [] }

  let totalPoints: number = current.total_points ?? 0
  let lotteryCount: number = current.lottery_count ?? 0
  let records: any[] = Array.isArray(current.records) ? [...current.records] : []
  let lotteryHistory: any[] = Array.isArray(current.lottery_history) ? [...current.lottery_history] : []
  let lotteryResult = null

  if (action === 'addMeal') {
    const { dateStr, mealType } = body
    let record = records.find((r: any) => r.date === dateStr)
    if (!record) {
      record = { date: dateStr, breakfast: false, lunch: false, dinner: false, snack: false, bonus: false, body: false }
      records.push(record)
    }
    if (!record.body) record.body = false
    const mealKey = mealType as string
    if (['breakfast', 'lunch', 'dinner', 'snack'].includes(mealKey) && !record[mealKey]) {
      record[mealKey] = true
      totalPoints += 1
    }
    if (record.breakfast && record.lunch && record.dinner && !record.bonus) {
      record.bonus = true
      totalPoints += 1
    }
  } else if (action === 'addBody') {
    const { dateStr } = body
    let record = records.find((r: any) => r.date === dateStr)
    if (!record) {
      record = { date: dateStr, breakfast: false, lunch: false, dinner: false, snack: false, bonus: false, body: false }
      records.push(record)
    }
    if (!record.body) {
      record.body = true
      totalPoints += 1
    }
  } else if (action === 'lottery') {
    if (totalPoints < 100) {
      return new Response(JSON.stringify({ error: 'ポイント不足' }), { status: 400, headers: cors })
    }
    totalPoints -= 100
    lotteryCount += 1
    const totalWeight = PRIZES.reduce((s, p) => s + p.weight, 0)
    let random = Math.random() * totalWeight
    let selected = PRIZES[0]
    for (const prize of PRIZES) {
      random -= prize.weight
      if (random <= 0) { selected = prize; break }
    }
    lotteryResult = {
      prize: selected.prize, rarity: selected.rarity, icon: selected.icon,
      date: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Tokyo' }),
    }
    lotteryHistory.unshift(lotteryResult)
  } else if (action === 'save') {
    // 外部から直接データを保存（マイグレーション用）
    totalPoints = body.totalPoints ?? totalPoints
    lotteryCount = body.lotteryCount ?? lotteryCount
    records = body.records ?? records
    lotteryHistory = body.lotteryHistory ?? lotteryHistory
  }

  // upsert
  const saveRes = await fetch(`${sbUrl}/rest/v1/user_points`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sbKey}`, apikey: sbKey,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({
      user_id: userId,
      total_points: totalPoints,
      lottery_count: lotteryCount,
      records,
      lottery_history: lotteryHistory,
      updated_at: new Date().toISOString(),
    }),
  })
  const saved = await saveRes.json() as any[]
  const result = saved[0] || { total_points: totalPoints, lottery_count: lotteryCount, records, lottery_history: lotteryHistory }
  return new Response(JSON.stringify({ ...result, lotteryResult }), { status: saveRes.ok ? 200 : 500, headers: cors })
}
