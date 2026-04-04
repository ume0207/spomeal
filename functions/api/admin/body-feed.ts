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
 * GET /api/admin/body-feed?range=today|yesterday|3days|week
 * 会員のuser_metadataに保存された体組成記録(body_activity)からフィードを生成
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

    interface BodyFeedItem {
      id: string
      memberId: string
      memberName: string
      memberEmail: string
      date: string
      weight: number
      bodyFat: number
      muscle: number
      bmi: number
      updatedAt: string
    }

    const feedItems: BodyFeedItem[] = []

    for (const user of (data.users || [])) {
      const meta = user.user_metadata || {}
      const activity = (meta.body_activity as Array<{
        date: string
        weight: number
        bodyFat: number
        muscle: number
        bmi: number
        updatedAt: string
      }>) || []

      if (activity.length === 0) continue

      const memberName = (meta.full_name as string) || (meta.name as string) || user.email?.split('@')[0] || '会員'

      for (const entry of activity) {
        if (!entry.date || entry.date < filterDate) continue

        feedItems.push({
          id: `${user.id}_${entry.date}`,
          memberId: user.id,
          memberName,
          memberEmail: user.email,
          date: entry.date,
          weight: entry.weight || 0,
          bodyFat: entry.bodyFat || 0,
          muscle: entry.muscle || 0,
          bmi: entry.bmi || 0,
          updatedAt: entry.updatedAt || '',
        })
      }
    }

    // 最新更新順にソート
    feedItems.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

    return new Response(JSON.stringify({ feed: feedItems, total: feedItems.length }), { status: 200, headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ feed: [], total: 0, error: String(err) }), { status: 200, headers: cors })
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' } })
