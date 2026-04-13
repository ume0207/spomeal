// ===== ポイントシステム =====
// 1pt per meal entry: 朝食/昼食/夕食 各1pt (max 3pt) + 間食1pt + 3食コンプリートボーナス1pt + 体組成1pt = max 6pt/day
// 100pt で抽選1回

function pointsKey(userId?: string) {
  return userId ? `spomeal_points_v1_${userId}` : 'spomeal_points_v1'
}
function lotteryKey(userId?: string) {
  return userId ? `spomeal_lottery_v1_${userId}` : 'spomeal_lottery_v1'
}

export interface PointRecord {
  date: string       // YYYY-MM-DD
  breakfast: boolean
  lunch: boolean
  dinner: boolean
  snack: boolean
  bonus: boolean     // 3食コンプリートボーナス
  body: boolean      // 体組成記録ボーナス
}

export interface PointsData {
  totalPoints: number
  lotteryCount: number  // 抽選した回数
  records: PointRecord[]
}

export interface LotteryResult {
  prize: string
  rarity: string
  icon: string
  date: string
}

export interface LotteryHistory {
  results: LotteryResult[]
}

const PRIZES = [
  { prize: 'ハズレ', rarity: 'miss', icon: '💨', weight: 400 },
  { prize: 'スポミルステッカー', rarity: 'common', icon: '🎫', weight: 350 },
  { prize: 'スポミルTシャツ', rarity: 'rare', icon: '👕', weight: 130 },
  { prize: 'プロテイン1kg', rarity: 'rare', icon: '💪', weight: 80 },
  { prize: 'クオカード500円', rarity: 'super_rare', icon: '💳', weight: 30 },
  { prize: 'リカバリープロ', rarity: 'ultra_rare', icon: '🏆', weight: 10 },
]

export function getPointsData(userId?: string): PointsData {
  if (typeof window === 'undefined') return { totalPoints: 0, lotteryCount: 0, records: [] }
  try {
    const raw = localStorage.getItem(pointsKey(userId))
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { totalPoints: 0, lotteryCount: 0, records: [] }
}

export function savePointsData(data: PointsData, userId?: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(pointsKey(userId), JSON.stringify(data))
}

export function getLotteryHistory(userId?: string): LotteryHistory {
  if (typeof window === 'undefined') return { results: [] }
  try {
    const raw = localStorage.getItem(lotteryKey(userId))
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { results: [] }
}

function saveLotteryHistory(data: LotteryHistory, userId?: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(lotteryKey(userId), JSON.stringify(data))
}

/** 食事記録時にポイントを付与。mealType = 'breakfast'|'lunch'|'dinner'|'snack' */
export function addMealPoint(dateStr: string, mealType: string, userId?: string): { pointsAdded: number; totalPoints: number } {
  const data = getPointsData(userId)
  let record = data.records.find(r => r.date === dateStr)
  if (!record) {
    record = { date: dateStr, breakfast: false, lunch: false, dinner: false, snack: false, bonus: false, body: false }
    data.records.push(record)
  }

  if (record.body === undefined) record.body = false

  let pointsAdded = 0
  const mealKey = mealType as keyof Pick<PointRecord, 'breakfast' | 'lunch' | 'dinner' | 'snack'>

  if (['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType) && !record[mealKey]) {
    record[mealKey] = true
    pointsAdded = 1
    data.totalPoints += 1
  }

  if (record.breakfast && record.lunch && record.dinner && !record.bonus) {
    record.bonus = true
    pointsAdded += 1
    data.totalPoints += 1
  }

  savePointsData(data, userId)
  return { pointsAdded, totalPoints: data.totalPoints }
}

/** 体組成記録時にポイントを付与（1日1回上限） */
export function addBodyPoint(dateStr: string, userId?: string): { pointsAdded: number; totalPoints: number } {
  const data = getPointsData(userId)
  let record = data.records.find(r => r.date === dateStr)
  if (!record) {
    record = { date: dateStr, breakfast: false, lunch: false, dinner: false, snack: false, bonus: false, body: false }
    data.records.push(record)
  }

  if (record.body === undefined) record.body = false

  let pointsAdded = 0
  if (!record.body) {
    record.body = true
    pointsAdded = 1
    data.totalPoints += 1
  }

  savePointsData(data, userId)
  return { pointsAdded, totalPoints: data.totalPoints }
}

/** 今日のポイント獲得状況 */
export function getTodayPoints(dateStr: string, userId?: string): { earned: number; max: number; record: PointRecord | null } {
  const data = getPointsData(userId)
  const record = data.records.find(r => r.date === dateStr) ?? null
  if (!record) return { earned: 0, max: 6, record: null }
  const earned = [record.breakfast, record.lunch, record.dinner, record.snack, record.bonus, record.body ?? false].filter(Boolean).length
  return { earned, max: 6, record }
}

/** 抽選を実行（100pt消費） */
export function doLottery(userId?: string): LotteryResult | null {
  const data = getPointsData(userId)
  if (data.totalPoints < 100) return null

  data.totalPoints -= 100
  data.lotteryCount += 1
  savePointsData(data, userId)

  const totalWeight = PRIZES.reduce((sum, p) => sum + p.weight, 0)
  let random = Math.random() * totalWeight
  let selected = PRIZES[0]
  for (const prize of PRIZES) {
    random -= prize.weight
    if (random <= 0) {
      selected = prize
      break
    }
  }

  const result: LotteryResult = {
    prize: selected.prize,
    rarity: selected.rarity,
    icon: selected.icon,
    date: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Tokyo' }),
  }

  const history = getLotteryHistory(userId)
  history.results.unshift(result)
  saveLotteryHistory(history, userId)

  return result
}

/** 抽選可能回数 */
export function getAvailableLotteries(userId?: string): number {
  const data = getPointsData(userId)
  return Math.floor(data.totalPoints / 100)
}

export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'common': return '#6b7280'
    case 'rare': return '#3b82f6'
    case 'super_rare': return '#f59e0b'
    case 'ultra_rare': return '#ef4444'
    default: return '#9ca3af'
  }
}

export function getRarityLabel(rarity: string): string {
  switch (rarity) {
    case 'miss': return ''
    case 'common': return 'コモン'
    case 'rare': return 'レア'
    case 'super_rare': return 'スーパーレア'
    case 'ultra_rare': return 'ウルトラレア!'
    default: return ''
  }
}
