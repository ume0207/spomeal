// Google OAuth認証URL生成エンドポイント（リフレッシュトークン再取得用）
type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env; params: Record<string, string> }) => Promise<Response> | Response

interface Env {
  GOOGLE_CLIENT_ID: string
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context

  if (!env.GOOGLE_CLIENT_ID) {
    return new Response(JSON.stringify({ error: 'GOOGLE_CLIENT_ID not set' }), { status: 500, headers: cors })
  }

  // redirect_uriはGoogleコンソールに登録済みのものと一致させる
  const redirectUri = 'https://spomeal.jp/api/gcal/callback'

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar',
    access_type: 'offline',
    prompt: 'consent',
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

  // 直接 Google 認証ページへリダイレクト
  return new Response(null, {
    status: 302,
    headers: { 'Location': authUrl },
  })
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { headers: cors })
