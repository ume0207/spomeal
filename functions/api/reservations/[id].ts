import { verifyUser, verifyAdmin, corsHeaders, handleOptions, authErrorResponse } from '../../_shared/auth'

type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env; params: Record<string, string> }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  ADMIN_EMAILS?: string
}

// PATCH: 指定IDの予約を更新（status, meet_link, calendar_event_id等）
export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context
  const cors = corsHeaders(request)
  const id = params.id

  if (!id) {
    return new Response(JSON.stringify({ error: 'id is required' }), { status: 400, headers: cors })
  }

  // 認証: ログイン中ユーザー必須
  const auth = await verifyUser(request, env)
  if (!auth.ok) return authErrorResponse(auth, request)

  try {
    // まず予約の所有者を確認
    const checkRes = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/reservations?id=eq.${encodeURIComponent(id)}&select=user_id`,
      {
        headers: {
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    )
    const existingRows = (await checkRes.json()) as Array<{ user_id?: string }>
    if (!existingRows[0]) {
      return new Response(JSON.stringify({ error: 'reservation not found' }), { status: 404, headers: cors })
    }

    // 所有者でも管理者でもない場合は拒否
    const isOwner = existingRows[0].user_id === auth.user.id
    if (!isOwner) {
      const admin = await verifyAdmin(request, env)
      if (!admin.ok) return authErrorResponse({ ok: false, status: 403, error: 'この予約を変更する権限がありません' }, request)
    }

    const body = await request.json() as Record<string, unknown>

    // 更新可能なフィールドをスネークケースに変換
    const patch: Record<string, unknown> = {}
    if (body.status !== undefined) patch.status = body.status
    if (body.notes !== undefined) patch.notes = body.notes

    // meet_link/calendar_event_id は管理者のみ更新可能
    const adminCheck = await verifyAdmin(request, env)
    if (adminCheck.ok) {
      if (body.meetLink !== undefined) patch.meet_link = body.meetLink
      if (body.meet_link !== undefined) patch.meet_link = body.meet_link
      if (body.calendarEventId !== undefined) patch.calendar_event_id = body.calendarEventId
      if (body.calendar_event_id !== undefined) patch.calendar_event_id = body.calendar_event_id
    }

    if (Object.keys(patch).length === 0) {
      return new Response(JSON.stringify({ error: 'No updatable fields provided' }), { status: 400, headers: cors })
    }

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
