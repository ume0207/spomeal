type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

/**
 * GET /api/admin/meal-feed?range=today|yesterday|3days|week
 * meal_records テーブルから食事フィードを生成（会員・日付でグループ化）
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const url = new URL(request.url)
  const range = url.searchParams.get('range') || 'today'

  const sbUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const sbKey = env.SUPABASE_SERVICE_ROLE_KEY

  try {
    // 日付フィルターの計算（JST）
    const now = new Date()
    const jstOffset = 9 * 60 * 60 * 1000
    const jstNow = new Date(now.getTime() + jstOffset)
    const todayStr = jstNow.toISOString().slice(0, 10)

    const getDateNDaysAgo = (n: number) => {
      const d = new Date(jstNow)
      d.setDate(d.getDate() - n)
      return d.toISOString().slice(0, 10)
    }

    const filterDate = range === 'today' ? todayStr
      : range === 'yesterday' ? getDateNDaysAgo(1)
      : range === '3days' ? getDateNDaysAgo(3)
      : getDateNDaysAgo(7)

    // meal_records テーブルから対象期間の記録を取得
    const mealRes = await fetch(
      `${sbUrl}/rest/v1/meal_records?meal_date=gte.${filterDate}&order=meal_date.desc,created_at.desc&limit=500`,
      { headers: { Authorization: `Bearer ${sbKey}`, apikey: sbKey } }
    )
    const mealRecords: any[] = mealRes.ok ? await mealRes.json() : []

    if (mealRecords.length === 0) {
      return new Response(JSON.stringify({ feed: [], total: 0 }), { status: 200, headers: cors })
    }

    // ユーザー一覧を取得（名前表示用）
    const usersRes = await fetch(
      `${sbUrl}/auth/v1/admin/users?page=1&per_page=100`,
      { headers: { Authorization: `Bearer ${sbKey}`, apikey: sbKey } }
    )
    const usersData: { users?: any[] } = usersRes.ok ? await usersRes.json() : { users: [] }
    const userMap = new Map<string, { name: string; email: string }>(
      (usersData.users || []).map((u: any) => [
        u.id,
        {
          name: u.user_metadata?.full_name || u.email?.split('@')[0] || '会員',
          email: u.email || '',
        },
      ])
    )

    // 会員ID + 日付でグループ化
    interface MealEntry {
      mealType: string
      items: { name: string; kcal: number; protein: number; fat: number; carbs: number }[]
      totalKcal: number
      totalProtein: number
      totalFat: number
      totalCarbs: number
      time: string
      updatedAt: string
    }
    interface GroupedFeedItem {
      id: string
      memberId: string
      memberName: string
      memberEmail: string
      date: string
      meals: MealEntry[]
      dayTotalKcal: number
      dayTotalProtein: number
      dayTotalFat: number
      dayTotalCarbs: number
      latestUpdatedAt: string
      mealCount: number
    }

    const groupMap = new Map<string, GroupedFeedItem>()

    for (const record of mealRecords) {
      const groupKey = `${record.user_id}_${record.meal_date}`
      const user = userMap.get(record.user_id) || { name: '会員', email: '' }

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          id: groupKey,
          memberId: record.user_id,
          memberName: user.name,
          memberEmail: user.email,
          date: record.meal_date,
          meals: [],
          dayTotalKcal: 0,
          dayTotalProtein: 0,
          dayTotalFat: 0,
          dayTotalCarbs: 0,
          latestUpdatedAt: '',
          mealCount: 0,
        })
      }

      const group = groupMap.get(groupKey)!

      const mealEntry: MealEntry = {
        mealType: record.meal_type || '食事',
        items: (record.items || []).map((i: any) => ({
          name: i.foodName || i.name || '',
          kcal: i.caloriesKcal || i.kcal || 0,
          protein: i.proteinG || i.protein || 0,
          fat: i.fatG || i.fat || 0,
          carbs: i.carbsG || i.carbs || 0,
        })),
        totalKcal: record.calories_kcal || 0,
        totalProtein: record.protein_g || 0,
        totalFat: record.fat_g || 0,
        totalCarbs: record.carbs_g || 0,
        time: (record.created_at || '').slice(11, 16),
        updatedAt: record.created_at || '',
      }

      // 同じmealTypeは最新で上書き
      const existingIdx = group.meals.findIndex(m => m.mealType === mealEntry.mealType)
      if (existingIdx >= 0) {
        group.dayTotalKcal -= group.meals[existingIdx].totalKcal
        group.dayTotalProtein -= group.meals[existingIdx].totalProtein
        group.dayTotalFat -= group.meals[existingIdx].totalFat
        group.dayTotalCarbs -= group.meals[existingIdx].totalCarbs
        group.meals[existingIdx] = mealEntry
      } else {
        group.meals.push(mealEntry)
      }

      group.dayTotalKcal += mealEntry.totalKcal
      group.dayTotalProtein += mealEntry.totalProtein
      group.dayTotalFat += mealEntry.totalFat
      group.dayTotalCarbs += mealEntry.totalCarbs
      group.mealCount = group.meals.length

      if (mealEntry.updatedAt > group.latestUpdatedAt) {
        group.latestUpdatedAt = mealEntry.updatedAt
      }
    }

    // 食事を時系列順にソート
    const mealOrder: Record<string, number> = { '朝食': 1, '昼食': 2, '夕食': 3, '間食': 4, '食事': 5 }
    for (const group of groupMap.values()) {
      group.meals.sort((a, b) => (mealOrder[a.mealType] || 9) - (mealOrder[b.mealType] || 9))
    }

    // 最新更新順にソート
    const feed = Array.from(groupMap.values())
      .sort((a, b) => b.latestUpdatedAt.localeCompare(a.latestUpdatedAt))

    return new Response(JSON.stringify({ feed, total: feed.length }), { status: 200, headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ feed: [], total: 0, error: String(err) }), { status: 200, headers: cors })
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' } })
