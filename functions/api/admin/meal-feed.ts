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
 * デモデータは使用しない（実際に食事を登録した人のみ表示）
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
      return new Response(JSON.stringify({ feed: [], total: 0 }), { status: 200, headers: cors })
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
    interface FeedItem {
      id: string
      memberId: string
      memberName: string
      memberEmail: string
      mealType: string
      items: { name: string; kcal: number; protein: number; fat: number; carbs: number }[]
      totalKcal: number
      totalProtein: number
      date: string
      time: string
      updatedAt: string
    }

    const feed: FeedItem[] = []
    let idCounter = 0

    for (const user of (data.users || [])) {
      const meta = user.user_metadata || {}
      const activity = (meta.meal_activity as Array<{
        mealType: string
        items: { name: string; kcal: number; protein: number; fat: number; carbs: number }[]
        totalKcal: number
        totalProtein: number
        date: string
        time: string
        updatedAt: string
      }>) || []

      if (activity.length === 0) continue

      const memberName = (meta.full_name as string) || user.email?.split('@')[0] || '会員'

      for (const entry of activity) {
        // 日付フィルター: filterDate以降のデータのみ表示
        if (!entry.date || entry.date < filterDate) continue

        feed.push({
          id: `feed-${++idCounter}`,
          memberId: user.id,
          memberName,
          memberEmail: user.email,
          mealType: entry.mealType || '食事',
          items: entry.items || [],
          totalKcal: entry.totalKcal || 0,
          totalProtein: entry.totalProtein || 0,
          date: entry.date,
          time: entry.time || '',
          updatedAt: entry.updatedAt || `${entry.date}T${entry.time || '00:00'}:00+09:00`,
        })
      }
    }

    // 更新日時の降順でソート
    feed.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

    return new Response(JSON.stringify({ feed, total: feed.length }), { status: 200, headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors })
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' } })
