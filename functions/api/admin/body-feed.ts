import { verifyAdmin, corsHeaders, handleOptions, authErrorResponse } from '../../_shared/auth'

type PagesFunction<Env = Record<string, unknown>> = (context: {
  request: Request
  env: Env
  waitUntil?: (p: Promise<unknown>) => void
}) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  ADMIN_EMAILS?: string
}

// Edge Cache: range 別に短 TTL。
const CACHE_TTL_SECONDS = 20

/**
 * GET /api/admin/body-feed?range=today|yesterday|3days|week
 * body_records テーブルから体組成フィードを生成
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request, waitUntil } = context

  // 管理者認証
  const auth = await verifyAdmin(request, env)
  if (!auth.ok) return authErrorResponse(auth, request)

  const cors = corsHeaders(request)
  const url = new URL(request.url)
  const range = url.searchParams.get('range') || 'week'

  const sbUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const sbKey = env.SUPABASE_SERVICE_ROLE_KEY

  // Edge Cache チェック（range 別キー）
  const cache = (globalThis as unknown as { caches: { default: Cache } }).caches?.default
  const cacheKey = new Request(`https://cache.internal/admin/body-feed/v1?range=${encodeURIComponent(range)}`)
  if (cache) {
    try {
      const cached = await cache.match(cacheKey)
      if (cached) {
        const body = await cached.text()
        return new Response(body, { status: 200, headers: { ...cors, 'X-Cache': 'HIT' } })
      }
    } catch {}
  }

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

    // ★高速化★ body_records と users を並列取得（以前は逐次だった）
    const [bodyRes, usersRes] = await Promise.all([
      fetch(
        `${sbUrl}/rest/v1/body_records?date=gte.${filterDate}&order=date.desc,created_at.desc&limit=200`,
        { headers: { Authorization: `Bearer ${sbKey}`, apikey: sbKey } }
      ),
      fetch(
        `${sbUrl}/auth/v1/admin/users?page=1&per_page=100`,
        { headers: { Authorization: `Bearer ${sbKey}`, apikey: sbKey } }
      ),
    ])

    const bodyRecords: any[] = bodyRes.ok ? await bodyRes.json() : []

    if (bodyRecords.length === 0) {
      const emptyBody = JSON.stringify({ feed: [], total: 0 })
      if (cache) {
        try {
          const cacheResp = new Response(emptyBody, {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}` },
          })
          const putP = cache.put(cacheKey, cacheResp)
          if (waitUntil) waitUntil(putP); else putP.catch(() => {})
        } catch {}
      }
      return new Response(emptyBody, { status: 200, headers: { ...cors, 'X-Cache': 'MISS' } })
    }

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

    const body = JSON.stringify({ feed: feedItems, total: feedItems.length })

    // Edge Cache 保存
    if (cache) {
      try {
        const cacheResp = new Response(body, {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}` },
        })
        const putP = cache.put(cacheKey, cacheResp)
        if (waitUntil) waitUntil(putP); else putP.catch(() => {})
      } catch {}
    }

    return new Response(body, { status: 200, headers: { ...cors, 'X-Cache': 'MISS' } })
  } catch (err) {
    return new Response(JSON.stringify({ feed: [], total: 0, error: String(err) }), { status: 200, headers: cors })
  }
}

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)
