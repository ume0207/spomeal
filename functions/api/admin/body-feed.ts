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
 * body_records テーブルから体組成フィードを生成
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const url = new URL(request.url)
  const range = url.searchParams.get('range') || 'week'

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

    // body_records テーブルから対象期間の記録を取得
    const bodyRes = await fetch(
      `${sbUrl}/rest/v1/body_records?date=gte.${filterDate}&order=date.desc,created_at.desc&limit=200`,
      { headers: { Authorization: `Bearer ${sbKey}`, apikey: sbKey } }
    )
    const bodyRecords: any[] = bodyRes.ok ? await bodyRes.json() : []

    if (bodyRecords.length === 0) {
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

    // フィード生成（ユーザーID+日付でユニーク）
    const seen = new Set<string>()
    const feedItems = []

    for (const record of bodyRecords) {
      const key = `${record.user_id}_${record.date}`
      if (seen.has(key)) continue // 同日同ユーザーは最初の1件のみ
      seen.add(key)

      const user = userMap.get(record.user_id) || { name: '会員', email: '' }
      feedItems.push({
        id: key,
        memberId: record.user_id,
        memberName: user.name,
        memberEmail: user.email,
        date: record.date,
        weight: record.weight || 0,
        bodyFat: record.body_fat || 0,
        muscle: record.muscle || 0,
        bmi: record.bmi || 0,
        updatedAt: record.created_at || '',
      })
    }

    return new Response(JSON.stringify({ feed: feedItems, total: feedItems.length }), { status: 200, headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ feed: [], total: 0, error: String(err) }), { status: 200, headers: cors })
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' } })
