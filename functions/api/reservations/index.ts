type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env; params: Record<string, string> }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

// Supabaseのスネークケース → フロントのキャメルケースに変換
function toCamel(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    memberName: row.member_name,
    date: row.date,
    time: row.time,
    staffId: row.staff_id,
    staffName: row.staff_name,
    notes: row.notes,
    status: row.status,
    meetLink: row.meet_link,
    calendarEventId: row.calendar_event_id,
    createdAt: row.created_at,
  }
}

// フロントのキャメルケース → Supabaseのスネークケースに変換
function toSnake(obj: Record<string, unknown>): Record<string, unknown> {
  return {
    id: obj.id,
    user_id: obj.userId,
    user_email: obj.userEmail,
    member_name: obj.memberName,
    date: obj.date,
    time: obj.time,
    staff_id: obj.staffId,
    staff_name: obj.staffName,
    notes: obj.notes,
    status: obj.status,
    meet_link: obj.meetLink,
    calendar_event_id: obj.calendarEventId,
    created_at: obj.createdAt,
  }
}

// GET: ?userId=xxx → その会員の予約 / ?admin=true → 全予約
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')
  const isAdmin = url.searchParams.get('admin') === 'true'

  if (!userId && !isAdmin) {
    return new Response(JSON.stringify({ error: 'userId or admin=true required' }), { status: 400, headers: cors })
  }

  try {
    const supaHeaders = {
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    }

    let query = ''
    if (isAdmin) {
      query = 'order=date.asc,time.asc'
    } else {
      query = `user_id=eq.${userId}&order=date.asc,time.asc`
    }

    const res = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/reservations?${query}`,
      { headers: supaHeaders }
    )

    if (!res.ok) {
      const errText = await res.text()
      return new Response(JSON.stringify({ error: `Supabase error: ${errText}` }), { status: res.status, headers: cors })
    }

    const rows = await res.json() as Record<string, unknown>[]
    const data = rows.map(toCamel)

    return new Response(JSON.stringify(data), { status: 200, headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors })
  }
}

// POST: 新規予約作成
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  try {
    const body = await request.json() as Record<string, unknown>

    if (!body.id || !body.date || !body.time) {
      return new Response(JSON.stringify({ error: 'id, date, time are required' }), { status: 400, headers: cors })
    }

    const supaHeaders = {
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    }

    const snakeRow = toSnake(body)

    const res = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/reservations`,
      {
        method: 'POST',
        headers: supaHeaders,
        body: JSON.stringify(snakeRow),
      }
    )

    if (!res.ok) {
      const errText = await res.text()
      return new Response(JSON.stringify({ error: `Supabase error: ${errText}` }), { status: res.status, headers: cors })
    }

    const rows = await res.json() as Record<string, unknown>[]
    const created = rows[0] ? toCamel(rows[0]) : toCamel(snakeRow)

    return new Response(JSON.stringify(created), { status: 201, headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors })
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { headers: cors })
