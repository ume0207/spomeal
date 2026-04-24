import { verifyUser, verifyAdmin, corsHeaders, handleOptions, authErrorResponse } from '../../_shared/auth'

type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env; params: Record<string, string> }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  GOOGLE_REFRESH_TOKEN?: string
  GOOGLE_CALENDAR_ID?: string
  ADMIN_EMAILS?: string
}

/**
 * Google Calendar のイベントを削除する。
 * キャンセルされた予約のイベントが Google Calendar 上に残り続ける問題を防ぐ。
 * エラーは best-effort（本体の DB 更新は止めない）。
 */
async function deleteCalendarEvent(env: Env, calendarEventId: string): Promise<boolean> {
  if (!env.GOOGLE_REFRESH_TOKEN || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return false
  try {
    // access token を取得
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
    if (!tokenData.access_token) return false

    const calendarId = env.GOOGLE_CALENDAR_ID || 'spomeal20260323@gmail.com'
    const delRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(calendarEventId)}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    )
    // 410 Gone（既に削除済み）も成功扱い
    return delRes.ok || delRes.status === 410 || delRes.status === 404
  } catch {
    return false
  }
}

// PATCH: 指定IDの予約を更新（status, meet_link, calendar_event_id等）
export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context
  const cors = corsHeaders(request)
  const id = params.id

  if (!id) {
    return new Response(JSON.stringify({ error: 'id is required' }), { status: 400, headers: cors })
  }

  // 認証: 管理者トークン優先、次に本人のSupabase JWT
  const adminCheck = await verifyAdmin(request, env)
  const isAdmin = adminCheck.ok

  let requesterUserId: string | null = null
  if (!isAdmin) {
    const auth = await verifyUser(request, env)
    if (!auth.ok) return authErrorResponse(auth, request)
    requesterUserId = auth.user.id
  }

  try {
    // まず予約の所有者と calendar_event_id を確認
    const checkRes = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/reservations?id=eq.${encodeURIComponent(id)}&select=user_id,calendar_event_id,status`,
      {
        headers: {
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    )
    const existingRows = (await checkRes.json()) as Array<{ user_id?: string; calendar_event_id?: string; status?: string }>
    if (!existingRows[0]) {
      return new Response(JSON.stringify({ error: 'reservation not found' }), { status: 404, headers: cors })
    }
    const existing = existingRows[0]

    // 所有者でも管理者でもない場合は拒否
    if (!isAdmin) {
      const isOwner = existing.user_id === requesterUserId
      if (!isOwner) {
        return authErrorResponse({ ok: false, status: 403, error: 'この予約を変更する権限がありません' }, request)
      }
    }

    const body = await request.json() as Record<string, unknown>

    // 更新可能なフィールドをスネークケースに変換
    const patch: Record<string, unknown> = {}
    if (body.status !== undefined) patch.status = body.status
    if (body.notes !== undefined) patch.notes = body.notes

    // meet_link/calendar_event_id は管理者のみ更新可能
    if (isAdmin) {
      if (body.meetLink !== undefined) patch.meet_link = body.meetLink
      if (body.meet_link !== undefined) patch.meet_link = body.meet_link
      if (body.calendarEventId !== undefined) patch.calendar_event_id = body.calendarEventId
      if (body.calendar_event_id !== undefined) patch.calendar_event_id = body.calendar_event_id
    }

    if (Object.keys(patch).length === 0) {
      return new Response(JSON.stringify({ error: 'No updatable fields provided' }), { status: 400, headers: cors })
    }

    // ★修正★ status が 'cancelled' に変わる場合、Google Calendar のイベントも削除する
    // 以前は status だけ更新して、カレンダー上には予約イベントが残り続けていた
    const transitioningToCancelled =
      patch.status === 'cancelled' && existing.status !== 'cancelled' && !!existing.calendar_event_id

    const supaHeaders = {
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    }

    const res = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/reservations?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: supaHeaders,
        body: JSON.stringify(patch),
      }
    )

    if (!res.ok) {
      const errText = await res.text()
      return new Response(JSON.stringify({ error: `Supabase error: ${errText}` }), { status: res.status, headers: cors })
    }

    // DB 更新後に Google Calendar のイベントも消す（best-effort）
    if (transitioningToCancelled && existing.calendar_event_id) {
      await deleteCalendarEvent(env, existing.calendar_event_id)
    }

    const rows = await res.json() as Record<string, unknown>[]
    const updated = rows[0] ? {
      id: rows[0].id,
      userId: rows[0].user_id,
      userEmail: rows[0].user_email,
      memberName: rows[0].member_name,
      date: rows[0].date,
      time: rows[0].time,
      staffId: rows[0].staff_id,
      staffName: rows[0].staff_name,
      notes: rows[0].notes,
      status: rows[0].status,
      meetLink: rows[0].meet_link,
      calendarEventId: rows[0].calendar_event_id,
      createdAt: rows[0].created_at,
    } : { id, ...patch }

    return new Response(JSON.stringify(updated), { status: 200, headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors })
  }
}

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)
