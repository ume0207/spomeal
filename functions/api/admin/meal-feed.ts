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
 * 会員のuser_metadataに保存された食事記録(meal_activity)からフィードを生成
 * 同じ会員の更新は1エントリにまとめる（日別・会員別でグループ化）
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const url = new URL(request.url)
  const range = url.searchParams.get('range') || 'today'

  try {
    // 全ユーザーを取得
    const res = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=100`,
      {
        headers: {
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    )

    if (!res.ok) {
      const errText = await res.text()
      return new Response(JSON.stringify({ feed: [], total: 0, error: `Supabase error: ${res.status}`, detail: errText }), { status: 200, headers: cors })
    }

    const data = await res.json() as {
      users: Array<{
        id: string
        email: string
        user_metadata: Record<string, unknown>
      }>
    }

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

    // 各ユーザーのmeal_activityからフィードを構築
    // 同じ会員・同じ日付のエントリをまとめる
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

    // memberId + date をキーにしてグループ化
    const groupMap = new Map<string, GroupedFeedItem>()

    for (const user of (data.users || [])) {
      const meta = user.user_metadata || {}
      const activity = (meta.meal_activity as Array<{
        mealType: string
        items: { name: string; kcal: number; protein: number; fat: number; carbs: number }[]
        totalKcal: number
        totalProtein: number
        totalFat: number
        totalCarbs: number
        date: string
        time: string
        updatedAt: string
      }>) || []

      if (activity.length === 0) continue

      const memberName = (meta.full_name as string) || (meta.name as string) || user.email?.split('@')[0] || '会員'

      for (const entry of activity) {
        if (!entry.date || entry.date < filterDate) continue

        const groupKey = `${user.id}_${entry.date}`

        if (!groupMap.has(groupKey)) {
          groupMap.set(groupKey, {
            id: groupKey,
            memberId: user.id,
            memberName,
            memberEmail: user.email,
            date: entry.date,
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

        // 同じmealTypeが既にある場合は上書き（最新の記録を採用）
        const existingIdx = group.meals.findIndex(m => m.mealType === entry.mealType)
        if (existingIdx >= 0) {
          // 古いエントリの分を引く
          group.dayTotalKcal -= group.meals[existingIdx].totalKcal
          group.dayTotalProtein -= group.meals[existingIdx].totalProtein
          group.dayTotalFat -= group.meals[existingIdx].totalFat
          group.dayTotalCarbs -= group.meals[existingIdx].totalCarbs
          group.meals[existingIdx] = {
            mealType: entry.mealType || '食事',
            items: entry.items || [],
            totalKcal: entry.totalKcal || 0,
            totalProtein: entry.totalProtein || 0,
            totalFat: entry.totalFat || 0,
            totalCarbs: entry.totalCarbs || 0,
            time: entry.time || '',
            updatedAt: entry.updatedAt || '',
          }
        } else {
          group.meals.push({
            mealType: entry.mealType || '食事',
            items: entry.items || [],
            totalKcal: entry.totalKcal || 0,
            totalProtein: entry.totalProtein || 0,
            totalFat: entry.totalFat || 0,
            totalCarbs: entry.totalCarbs || 0,
            time: entry.time || '',
            updatedAt: entry.updatedAt || '',
          })
        }

        // 日計を再計算
        group.dayTotalKcal += entry.totalKcal || 0
        group.dayTotalProtein += entry.totalProtein || 0
        group.dayTotalFat += entry.totalFat || 0
        group.dayTotalCarbs += entry.totalCarbs || 0
        group.mealCount = group.meals.length

        const entryUpdatedAt = entry.updatedAt || `${entry.date}T${entry.time || '00:00'}:00+09:00`
        if (!group.latestUpdatedAt || entryUpdatedAt > group.latestUpdatedAt) {
          group.latestUpdatedAt = entryUpdatedAt
        }
      }
    }

    // 食事を時系列順にソート（朝食→昼食→夕食→間食）
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
