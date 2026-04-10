// Google OAuth動作テスト用エンドポイント（デバッグ用）
type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env; params: Record<string, string> }) => Promise<Response> | Response

interface Env {
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  GOOGLE_REFRESH_TOKEN: string
  GOOGLE_CALENDAR_ID: string
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context

  const result: Record<string, unknown> = {
    hasClientId: !!env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!env.GOOGLE_CLIENT_SECRET,
    hasRefreshToken: !!env.GOOGLE_REFRESH_TOKEN,
    clientIdPrefix: env.GOOGLE_CLIENT_ID ? env.GOOGLE_CLIENT_ID.substring(0, 20) + '...' : null,
    refreshTokenPrefix: env.GOOGLE_REFRESH_TOKEN ? env.GOOGLE_REFRESH_TOKEN.substring(0, 10) + '...' : null,
  }

  // トークン交換テスト
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN) {
    try {
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
      const tokenData = await tokenRes.json() as { access_token?: string; error?: string; error_description?: string }
      result.tokenStatus = tokenRes.status
      result.tokenSuccess = !!tokenData.access_token
      result.tokenError = tokenData.error || null
      result.tokenErrorDesc = tokenData.error_description || null

      // カレンダー作成テスト（トークン取得成功時）
      if (tokenData.access_token) {
        const calendarId = env.GOOGLE_CALENDAR_ID || 'spomeal20260323@gmail.com'
        const event = {
          summary: '【テスト】スポミル Meet テスト',
          start: { dateTime: '2026-04-15T10:00:00+09:00', timeZone: 'Asia/Tokyo' },
          end: { dateTime: '2026-04-15T10:30:00+09:00', timeZone: 'Asia/Tokyo' },
          conferenceData: {
            createRequest: {
              requestId: `spomeal-test-${Date.now()}`,
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
          error?: { code: number; message: string; status: string }
        }
        result.calendarStatus = calRes.status
        result.calendarEventId = calData.id || null
        result.calendarError = calData.error || null
        result.meetLink = calData.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri || null
      }
    } catch (err) {
      result.fetchError = String(err)
    }
  }

  return new Response(JSON.stringify(result, null, 2), { status: 200, headers: cors })
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { headers: cors })
