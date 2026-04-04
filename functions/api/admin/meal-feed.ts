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
 * 会員の食事記録更新フィードを返す
 * 将来的にはSupabaseのmealsテーブルから取得する想定
 * 現在はデモデータ + 実メンバー情報を返す
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const url = new URL(request.url)
  const range = url.searchParams.get('range') || 'today'

  try {
    // 実メンバー一覧を取得
    const res = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=100`,
      {
        headers: {
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    )

    let realMembers: Array<{ id: string; name: string; email: string }> = []
    if (res.ok) {
      const data = await res.json() as { users: Array<{ id: string; email: string; user_metadata: Record<string, string> }> }
      realMembers = (data.users || []).map(u => ({
        id: u.id,
        name: u.user_metadata?.full_name || u.email?.split('@')[0] || '会員',
        email: u.email,
      }))
    }

    // デモメンバー（実メンバーがいない場合のフォールバック）
    const demoMembers = [
      { id: 'demo-1', name: '山田 太郎', email: 'yamada@example.com' },
      { id: 'demo-2', name: '佐藤 花子', email: 'sato@example.com' },
      { id: 'demo-3', name: '田中 健太', email: 'tanaka@example.com' },
      { id: 'demo-4', name: '鈴木 美咲', email: 'suzuki@example.com' },
      { id: 'demo-5', name: '高橋 翔', email: 'takahashi@example.com' },
    ]

    const members = realMembers.length > 0 ? realMembers : demoMembers

    // 日付範囲の計算（JST）
    const now = new Date()
    const jstOffset = 9 * 60 * 60 * 1000
    const jstNow = new Date(now.getTime() + jstOffset)
    const todayStr = jstNow.toISOString().slice(0, 10)

    const yesterday = new Date(jstNow)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().slice(0, 10)

    const threeDaysAgo = new Date(jstNow)
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const threeDaysAgoStr = threeDaysAgo.toISOString().slice(0, 10)

    const weekAgo = new Date(jstNow)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoStr = weekAgo.toISOString().slice(0, 10)

    // デモ食事データ生成
    const mealTypes = ['朝食', '昼食', '夕食', '間食']
    const mealItems = [
      [{ name: '鶏むね肉のグリル', kcal: 230, protein: 38, fat: 5, carbs: 0 }, { name: '玄米ごはん', kcal: 264, protein: 5.6, fat: 1.8, carbs: 57 }],
      [{ name: 'サーモンの刺身定食', kcal: 580, protein: 32, fat: 18, carbs: 65 }],
      [{ name: 'ギリシャヨーグルト', kcal: 130, protein: 20, fat: 0, carbs: 10 }, { name: 'バナナ', kcal: 86, protein: 1.1, fat: 0.2, carbs: 22.5 }],
      [{ name: 'ささみと野菜の炒め物', kcal: 320, protein: 35, fat: 8, carbs: 20 }, { name: '味噌汁', kcal: 45, protein: 3, fat: 1.5, carbs: 5 }],
      [{ name: 'プロテインバー', kcal: 190, protein: 15, fat: 8, carbs: 20 }],
      [{ name: 'オートミール', kcal: 150, protein: 5, fat: 3, carbs: 27 }, { name: 'ブルーベリー', kcal: 30, protein: 0.4, fat: 0.2, carbs: 7 }],
      [{ name: '親子丼', kcal: 620, protein: 28, fat: 15, carbs: 80 }],
      [{ name: 'サラダチキン', kcal: 110, protein: 24, fat: 1.5, carbs: 0 }, { name: '野菜サラダ', kcal: 50, protein: 2, fat: 0.5, carbs: 8 }],
    ]

    const hours = [7, 8, 9, 12, 13, 14, 18, 19, 20, 21]

    // フィード生成
    interface FeedItem {
      id: string
      memberId: string
      memberName: string
      memberEmail: string
      mealType: string
      items: typeof mealItems[number]
      totalKcal: number
      totalProtein: number
      date: string
      time: string
      updatedAt: string
    }

    const feed: FeedItem[] = []
    const dates = [todayStr, yesterdayStr]
    if (range === '3days' || range === 'week') {
      for (let d = 2; d <= (range === 'week' ? 6 : 2); d++) {
        const dt = new Date(jstNow)
        dt.setDate(dt.getDate() - d)
        dates.push(dt.toISOString().slice(0, 10))
      }
    }

    const filterDate = range === 'today' ? todayStr
      : range === 'yesterday' ? yesterdayStr
      : range === '3days' ? threeDaysAgoStr
      : weekAgoStr

    let idCounter = 0
    for (const member of members) {
      // 各メンバーにランダムな食事データを割り当て
      const seed = member.id.charCodeAt(0) + member.id.charCodeAt(member.id.length - 1)
      for (const date of dates) {
        if (date < filterDate) continue
        const mealsPerDay = 1 + (seed % 3) // 1-3食/日
        for (let m = 0; m < mealsPerDay; m++) {
          const mealIdx = (seed + m + date.charCodeAt(8)) % mealTypes.length
          const itemsIdx = (seed + m + date.charCodeAt(9)) % mealItems.length
          const hour = hours[(seed + m) % hours.length]
          const minute = (seed * 7 + m * 13) % 60
          const items = mealItems[itemsIdx]
          const totalKcal = items.reduce((s, i) => s + i.kcal, 0)
          const totalProtein = items.reduce((s, i) => s + i.protein, 0)

          feed.push({
            id: `feed-${++idCounter}`,
            memberId: member.id,
            memberName: member.name,
            memberEmail: member.email,
            mealType: mealTypes[mealIdx],
            items,
            totalKcal,
            totalProtein,
            date,
            time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
            updatedAt: `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+09:00`,
          })
        }
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
