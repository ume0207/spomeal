import { verifyUser, verifyAdmin, corsHeaders, handleOptions, authErrorResponse } from '../_shared/auth'

type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  ADMIN_EMAILS?: string
}

async function authorize(request: Request, env: Env, targetUserId: string) {
  const admin = await verifyAdmin(request, env)
  if (admin.ok) return admin
  const auth = await verifyUser(request, env)
  if (!auth.ok) return auth
  if (auth.user.id === targetUserId) return auth
  return { ok: false as const, status: 403, error: '他のユーザーのデータにはアクセスできません' }
}

// 景品テーブル（合計weight=300、LCM(50,100,150)=300で確率を厳密に揃える）
// - クオカード500円:       6/300 = 1/50    super_rare
// - Amazonギフト券1000円:  3/300 = 1/100   ultra_rare
// - スタバギフト券1000円:  3/300 = 1/100   ultra_rare
// - リカバリープロ:        2/300 = 1/150   legendary（最上位）
// - ハズレ:              286/300           miss
const PRIZES = [
  { prize: 'ハズレ', rarity: 'miss', icon: '', weight: 286 },
  { prize: 'クオカード500円', rarity: 'super_rare', icon: '', weight: 6 },
  { prize: 'Amazonギフト券1000円', rarity: 'ultra_rare', icon: '', weight: 3 },
  { prize: 'スタバギフト券1000円', rarity: 'ultra_rare', icon: '', weight: 3 },
  { prize: 'リカバリープロ', rarity: 'legendary', icon: '', weight: 2 },
]

function drawPrize() {
  const totalWeight = PRIZES.reduce((s, p) => s + p.weight, 0)
  let random = Math.random() * totalWeight
  let selected = PRIZES[0]
  for (const prize of PRIZES) {
    random -= prize.weight
    if (random <= 0) { selected = prize; break }
  }
  return selected
}

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
// action: 'addMeal' | 'addBody' | 'lottery' | 'testLottery' | 'adminAddPoints'
// ※ 'save' action は削除（records/lottery_history の破壊的上書きを防止）
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
  const hasExisting = Array.isArray(existing) && existing.length > 0
  const current = hasExisting ? existing[0] : { total_points: 0, lottery_count: 0, records: [], lottery_history: [] }

  const prevTotalPoints: number = current.total_points ?? 0
  let totalPoints: number = prevTotalPoints
  let lotteryCount: number = current.lottery_count ?? 0
  let records: any[] = Array.isArray(current.records) ? [...current.records] : []
  let lotteryHistory: any[] = Array.isArray(current.lottery_history) ? [...current.lottery_history] : []
  let lotteryResult = null
  // adminAddPoints はレスポンスをadminに返すだけで保存処理はそのまま流す
  let isTestLotteryOnly = false

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
    const selected = drawPrize()
    lotteryResult = {
      prize: selected.prize, rarity: selected.rarity, icon: selected.icon,
      date: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Tokyo' }),
    }
    lotteryHistory.unshift(lotteryResult)
  } else if (action === 'testLottery') {
    // テスト用：ポイント消費なし & DB書き込みなしで抽選結果のみ返す
    const selected = drawPrize()
    lotteryResult = {
      prize: selected.prize, rarity: selected.rarity, icon: selected.icon,
      date: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Tokyo' }),
      isTest: true,
    }
    isTestLotteryOnly = true
  } else if (action === 'adminAddPoints') {
    // 管理者による手動ポイント加算。total_points のみ atomic に加算し
    // records / lottery_history / lottery_count は一切触らない。
    const admin = await verifyAdmin(request, env)
    if (!admin.ok) {
      return new Response(JSON.stringify({ error: '管理者のみ実行可能' }), { status: 403, headers: cors })
    }
    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount === 0) {
      return new Response(JSON.stringify({ error: 'amount が不正です' }), { status: 400, headers: cors })
    }
    totalPoints = Math.max(0, prevTotalPoints + Math.trunc(amount))
  } else {
    return new Response(JSON.stringify({ error: `未対応のaction: ${action}` }), { status: 400, headers: cors })
  }

  // testLottery は DB書き込み不要。結果だけ返す。
  if (isTestLotteryOnly) {
    return new Response(JSON.stringify({
      total_points: prevTotalPoints,
      lottery_count: lotteryCount,
      records,
      lottery_history: lotteryHistory,
      lotteryResult,
      pointsAdded: 0,
    }), { status: 200, headers: cors })
  }

  // 既存レコード有無で PATCH / POST を分岐（Supabaseのupsert衝突を回避）
  // adminAddPoints は total_points / updated_at のみ更新（他フィールドへの副作用ゼロ）
  const isAdminAdd = action === 'adminAddPoints'
  const payload: Record<string, unknown> = isAdminAdd
    ? { total_points: totalPoints, updated_at: new Date().toISOString() }
    : {
        total_points: totalPoints,
        lottery_count: lotteryCount,
        records,
        lottery_history: lotteryHistory,
        updated_at: new Date().toISOString(),
      }

  let saveRes: Response
  if (hasExisting) {
    saveRes = await fetch(`${sbUrl}/rest/v1/user_points?user_id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${sbKey}`, apikey: sbKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(payload),
    })
  } else {
    saveRes = await fetch(`${sbUrl}/rest/v1/user_points`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sbKey}`, apikey: sbKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ user_id: userId, ...payload }),
    })
  }

  if (!saveRes.ok) {
    const errText = await saveRes.text().catch(() => '')
    return new Response(JSON.stringify({
      error: 'Supabase保存失敗',
      status: saveRes.status,
      supabaseError: errText.slice(0, 500),
      mode: hasExisting ? 'PATCH' : 'POST',
    }), { status: 500, headers: cors })
  }

  const saved = await saveRes.json() as any[]
  const result = (Array.isArray(saved) && saved[0])
    || { total_points: totalPoints, lottery_count: lotteryCount, records, lottery_history: lotteryHistory }
  const pointsAdded = Math.max(0, (result.total_points ?? totalPoints) - prevTotalPoints)
  return new Response(JSON.stringify({ ...result, lotteryResult, pointsAdded }), { status: 200, headers: cors })
}
