import { verifyUser, verifyAdmin, corsHeaders, handleOptions, authErrorResponse } from '../../_shared/auth'
import { canBookMeeting } from '../../_shared/usage'

type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env; params: Record<string, string> }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  GOOGLE_REFRESH_TOKEN: string
  GOOGLE_CALENDAR_ID: string
  ADMIN_EMAILS?: string
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

// Google Meet リンクをサーバー側で自動作成
async function createMeetLink(env: Env, body: Record<string, unknown>): Promise<{ meetLink: string | null; calendarEventId: string | null }> {
  if (!env.GOOGLE_REFRESH_TOKEN || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return { meetLink: null, calendarEventId: null }
  }

  try {
    // アクセストークン取得
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        refresh_token: env.GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
    })
    const tokenData = await tokenRes.json() as { access_token?: string }
    if (!tokenData.access_token) return { meetLink: null, calendarEventId: null }

    // 開始・終了時刻（30分）
    const date = String(body.date || '')
    const time = String(body.time || '00:00')
    const [hour, min] = time.split(':').map(Number)
    const endTotalMin = hour * 60 + min + 30
    const pad = (n: number) => String(n).padStart(2, '0')
    const startDateTime = `${date}T${pad(hour)}:${pad(min)}:00+09:00`
    const endDateTime = `${date}T${pad(Math.floor(endTotalMin / 60))}:${pad(endTotalMin % 60)}:00+09:00`

    const calendarId = env.GOOGLE_CALENDAR_ID || 'spomeal20260323@gmail.com'
    const memberName = String(body.memberName || body.member_name || 'お客様')
    const notes = String(body.notes || '')

    const event = {
      summary: `【スポミル】ミーティング - ${memberName}`,
      description: notes ? `内容: ${notes}` : 'スポミル ミーティング',
      start: { dateTime: startDateTime, timeZone: 'Asia/Tokyo' },
      end: { dateTime: endDateTime, timeZone: 'Asia/Tokyo' },
      conferenceData: {
        createRequest: {
          requestId: `spomeal-${body.id || Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    }

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    )

    const calData = await calRes.json() as {
      id?: string
      conferenceData?: { entryPoints?: Array<{ entryPointType: string; uri: string }> }
    }

    const meetLink = calData.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri ?? null
    return { meetLink, calendarEventId: calData.id ?? null }
  } catch {
    return { meetLink: null, calendarEventId: null }
  }
}

// GET: ?userId=xxx → その会員の予約 / ?admin=true → 全予約
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const cors = corsHeaders(request)
  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')
  const isAdmin = url.searchParams.get('admin') === 'true'

  if (!userId && !isAdmin) {
    return new Response(JSON.stringify({ error: 'userId or admin=true required' }), { status: 400, headers: cors })
  }

  // 認証: 管理者トークン優先、次に本人のSupabase JWT
  const adminAuth = await verifyAdmin(request, env)
  if (adminAuth.ok) {
    // 管理者は全予約を閲覧可能
  } else if (isAdmin) {
    // admin=true なのに管理者トークンが無効
    return authErrorResponse(adminAuth, request)
  } else if (userId) {
    const userAuth = await verifyUser(request, env)
    if (!userAuth.ok) return authErrorResponse(userAuth, request)
    if (userAuth.user.id !== userId) {
      return authErrorResponse({ ok: false, status: 403, error: '他のユーザーの予約は閲覧できません' }, request)
    }
  }

  try {
    const supaHeaders = {
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    }

    const query = isAdmin
      ? 'order=date.asc,time.asc'
      : `user_id=eq.${encodeURIComponent(userId || '')}&order=date.asc,time.asc`

    const res = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/reservations?${query}`,
      { headers: supaHeaders }
    )

    if (!res.ok) {
      const errText = await res.text()
      return new Response(JSON.stringify({ error: `Supabase error: ${errText}` }), { status: res.status, headers: cors })
    }

    const rows = await res.json() as Record<string, unknown>[]
    return new Response(JSON.stringify(rows.map(toCamel)), { status: 200, headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors })
  }
}

// POST: 新規予約作成（Google Meet リンクも自動生成）
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const cors = corsHeaders(request)

  // 認証: ログイン中ユーザーのみ
  const auth = await verifyUser(request, env)
  if (!auth.ok) return authErrorResponse(auth, request)

  try {
    const body = await request.json() as Record<string, unknown>

    if (!body.id || !body.date || !body.time) {
      return new Response(JSON.stringify({ error: 'id, date, time are required' }), { status: 400, headers: cors })
    }

    // 予約者IDは認証済みユーザーで強制上書き（クライアント偽装防止）
    body.userId = auth.user.id
    if (!body.userEmail) body.userEmail = auth.user.email

    // プラン別ミーティング予約回数チェック
    const quota = await canBookMeeting(auth.user.id, env)
    if (!quota.ok) {
      return new Response(
        JSON.stringify({
          error: quota.message,
          planId: quota.planId,
          current: quota.current,
          limit: quota.limit,
        }),
        { status: 429, headers: cors }
      )
    }

    // Google Meet リンクをサーバー側で自動生成
    const { meetLink, calendarEventId } = await createMeetLink(env, body)
    if (meetLink) {
      body.meetLink = meetLink
      body.calendarEventId = calendarEventId
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

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)
