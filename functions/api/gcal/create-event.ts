// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env; params: Record<string, string>; next: () => Promise<Response> }) => Promise<Response> | Response

interface Env {
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  GOOGLE_REFRESH_TOKEN: string
  GOOGLE_CALENDAR_ID: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

async function getAccessToken(env: Env, refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json() as { access_token?: string; error?: string }
  if (!data.access_token) throw new Error(`Token error: ${data.error}`)
  return data.access_token
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await request.json() as {
      date: string        // YYYY-MM-DD
      time: string        // HH:MM
      memberName: string
      notes: string
      refreshToken?: string  // クライアント側のlocalStorageから送信
    }
    const { date, time, memberName, notes, refreshToken } = body

    // リフレッシュトークン: リクエスト body > 環境変数 の優先順位
    const effectiveRefreshToken = refreshToken || env.GOOGLE_REFRESH_TOKEN
    if (!effectiveRefreshToken) {
      return new Response(JSON.stringify({ meetLink: null, eventId: null, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 開始・終了時刻（15分単位）
    const [hour, min] = time.split(':').map(Number)
    const endTotalMin = hour * 60 + min + 15
    const endHour = Math.floor(endTotalMin / 60)
    const endMin = endTotalMin % 60
    const pad = (n: number) => String(n).padStart(2, '0')
    const startDateTime = `${date}T${pad(hour)}:${pad(min)}:00+09:00`
    const endDateTime = `${date}T${pad(endHour)}:${pad(endMin)}:00+09:00`

    const accessToken = await getAccessToken(env, effectiveRefreshToken)
    const calendarId = env.GOOGLE_CALENDAR_ID || 'spomeal20260323@gmail.com'

    const event = {
      summary: `【スポミル】栄養相談 - ${memberName}`,
      description: notes ? `相談内容: ${notes}` : '管理栄養士との栄養相談',
      start: { dateTime: startDateTime, timeZone: 'Asia/Tokyo' },
      end: { dateTime: endDateTime, timeZone: 'Asia/Tokyo' },
      conferenceData: {
        createRequest: {
          requestId: `spomeal-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    }

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    )

    const data = await res.json() as {
      id?: string
      htmlLink?: string
      conferenceData?: { entryPoints?: Array<{ entryPointType: string; uri: string }> }
      error?: { message: string }
    }

    if (!data.id) {
      console.error('Google Calendar error:', data.error?.message)
      return new Response(JSON.stringify({ meetLink: null, eventId: null, error: data.error?.message }), {
        status: 200, // 予約自体は成功させる
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const meetLink = data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri ?? null

    return new Response(JSON.stringify({
      eventId: data.id,
      calendarLink: data.htmlLink,
      meetLink,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('gcal error:', err)
    return new Response(JSON.stringify({ meetLink: null, eventId: null, error: String(err) }), {
      status: 200, // 予約自体は成功させる
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}
