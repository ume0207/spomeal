// Google OAuth コールバック (/admin/gcal-setup/)
type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env; params: Record<string, string> }) => Promise<Response> | Response

interface Env {
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error) {
    return new Response(`<html><body style="font-family:sans-serif;padding:40px">
      <h2>❌ エラー: ${error}</h2>
      <a href="/api/gcal/auth-url">もう一度試す</a>
    </body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  if (!code) {
    return new Response(`<html><body style="font-family:sans-serif;padding:40px">
      <h2>Google Calendar 連携セットアップ</h2>
      <a href="/api/gcal/auth-url" style="padding:12px 24px;background:#4ade80;border-radius:8px;color:white;text-decoration:none;font-weight:bold">Googleで認証する</a>
    </body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  try {
    const redirectUri = 'https://spomeal.jp/admin/gcal-setup/'
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const tokenData = await tokenRes.json() as {
      access_token?: string
      refresh_token?: string
      error?: string
      error_description?: string
    }

    if (!tokenData.refresh_token) {
      return new Response(`<html><body style="font-family:sans-serif;padding:40px">
        <h2>⚠️ refresh_token が取得できませんでした</h2>
        <p>${tokenData.error || ''}: ${tokenData.error_description || ''}</p>
        <a href="/api/gcal/auth-url">もう一度試す</a>
      </body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    }

    const refreshToken = tokenData.refresh_token

    return new Response(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;max-width:700px;margin:auto">
      <h2>✅ 新しい Refresh Token を取得しました！</h2>
      <p>以下の値を <strong>Cloudflare Pages → spomeal0323 → Settings → Variables and Secrets → GOOGLE_REFRESH_TOKEN</strong> に設定してください：</p>
      <textarea id="token" style="width:100%;height:100px;font-family:monospace;font-size:12px;padding:10px;border:2px solid #4ade80;border-radius:8px">${refreshToken}</textarea>
      <br><br>
      <button onclick="navigator.clipboard.writeText(document.getElementById('token').value).then(()=>this.textContent='✅ コピーしました！')"
        style="padding:12px 24px;background:#22c55e;border:none;border-radius:8px;font-size:16px;cursor:pointer;color:white;font-weight:bold">
        📋 クリップボードにコピー
      </button>
      <p style="margin-top:20px;color:#666;font-size:13px">コピー後、Cloudflare で値を更新して「Save and deploy」を押してください。</p>
    </body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })

  } catch (err) {
    return new Response(`<html><body style="font-family:sans-serif;padding:40px">
      <h2>❌ エラー</h2><p>${String(err)}</p>
    </body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }
}
