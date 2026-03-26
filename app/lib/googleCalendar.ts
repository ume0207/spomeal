// Google Calendar / Meet integration utilities
// Uses Google Identity Services (GIS) for OAuth

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any
    gcal_tokenClient?: {
      requestAccessToken: (options?: { prompt?: string }) => void
    }
    gcal_gisReady?: boolean
  }
}

export interface GCalReservation {
  id: string
  date: string
  time: string
  staffName?: string
  memberName?: string
  notes?: string
}

export function gcal_getValidToken(): string | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('google_access_token')
  const expiry = parseInt(localStorage.getItem('google_token_expiry') || '0')
  if (!token || Date.now() > expiry - 60000) return null
  return token
}

export function gcal_isConnected(): boolean {
  return !!gcal_getValidToken()
}

export function gcal_initClient(onReady?: () => void): void {
  if (typeof window === 'undefined') return
  const clientId = localStorage.getItem('google_client_id') || ''
  if (!clientId || !window.gcal_gisReady || !window.google) return
  try {
    window.gcal_tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/calendar.events',
      callback: (tokenResponse: { access_token?: string; expires_in?: number; error?: string }) => {
        if (tokenResponse.error) return
        localStorage.setItem('google_access_token', tokenResponse.access_token || '')
        localStorage.setItem(
          'google_token_expiry',
          String(Date.now() + (tokenResponse.expires_in || 3600) * 1000)
        )
        onReady?.()
      },
    })
  } catch (e) {
    console.warn('gcal_initClient error:', e)
  }
}

export function gcal_signIn(onSuccess: () => void): void {
  if (typeof window === 'undefined') return
  if (!window.gcal_tokenClient) {
    gcal_initClient(() => {
      onSuccess()
    })
    setTimeout(() => {
      window.gcal_tokenClient?.requestAccessToken({ prompt: 'consent' })
    }, 300)
    return
  }
  const originalCallback = window.gcal_tokenClient
  // Re-init with success callback
  const clientId = localStorage.getItem('google_client_id') || ''
  if (!clientId || !window.google) return
  window.gcal_tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/calendar.events',
    callback: (tokenResponse: { access_token?: string; expires_in?: number; error?: string }) => {
      if (tokenResponse.error) return
      localStorage.setItem('google_access_token', tokenResponse.access_token || '')
      localStorage.setItem(
        'google_token_expiry',
        String(Date.now() + (tokenResponse.expires_in || 3600) * 1000)
      )
      onSuccess()
    },
  })
  void originalCallback
  window.gcal_tokenClient?.requestAccessToken({ prompt: 'consent' })
}

export function gcal_signOut(): void {
  if (typeof window === 'undefined') return
  const token = localStorage.getItem('google_access_token')
  if (token && window.google) {
    try {
      window.google.accounts.oauth2.revoke(token, () => {})
    } catch {}
  }
  localStorage.removeItem('google_access_token')
  localStorage.removeItem('google_token_expiry')
}

export async function gcal_createEvent(
  reservation: GCalReservation,
  onSuccess: (meetLink: string, calEventId: string) => void,
  onError: (msg: string) => void
): Promise<void> {
  const token = gcal_getValidToken()
  if (!token) {
    onError('Googleに未ログインです。管理者カレンダーでGoogle連携してください。')
    return
  }

  const [h, m] = reservation.time.split(':').map(Number)
  const endH = String((h + 1) % 24).padStart(2, '0')
  const endMM = String(m).padStart(2, '0')
  const startDT = `${reservation.date}T${reservation.time}:00`
  const endDT = `${reservation.date}T${endH}:${endMM}:00`

  const event = {
    summary: `【スポミル】栄養相談 - ${reservation.memberName || '会員'}`,
    description: `スポミル 管理栄養士オンライン相談\n担当: ${reservation.staffName || '管理栄養士'}${
      reservation.notes ? '\n相談内容: ' + reservation.notes : ''
    }`,
    start: { dateTime: startDT, timeZone: 'Asia/Tokyo' },
    end: { dateTime: endDT, timeZone: 'Asia/Tokyo' },
    conferenceData: {
      createRequest: {
        requestId: reservation.id,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  }

  try {
    const resp = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }
    )

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      if (resp.status === 401) {
        localStorage.removeItem('google_access_token')
        localStorage.removeItem('google_token_expiry')
        onError('Googleトークンが期限切れです。再ログインしてください。')
        return
      }
      throw new Error(err.error?.message || 'HTTP ' + resp.status)
    }

    const data = await resp.json()
    const meetLink =
      (data.conferenceData?.entryPoints || []).find(
        (e: { entryPointType: string; uri: string }) => e.entryPointType === 'video'
      )?.uri || ''
    const calEventId = data.id || ''
    onSuccess(meetLink, calEventId)
  } catch (err) {
    onError('カレンダー連携エラー: ' + String(err))
  }
}
