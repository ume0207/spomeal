import {
  createAdminToken,
  verifyAdminToken,
  corsHeaders,
  handleOptions,
} from '../../_shared/auth'

type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  ADMIN_LOGIN_ID?: string
  ADMIN_PASSWORD?: string
}

/**
 * POST /api/admin/auth
 * ID/パスワードで管理者認証し、HMAC署名付きトークンを発行する
 * Body: { loginId, password }
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const cors = corsHeaders(request)

  // 環境変数未設定時のガード
  if (!env.ADMIN_LOGIN_ID || !env.ADMIN_PASSWORD) {
    return new Response(
      JSON.stringify({
        success: false,
        error: '管理者認証が未設定です。Cloudflare環境変数 ADMIN_LOGIN_ID / ADMIN_PASSWORD を設定してください。',
      }),
      { status: 500, headers: cors }
    )
  }

  try {
    const body = await request.json() as { loginId?: string; password?: string }
    const { loginId, password } = body

    if (!loginId || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'ログインIDとパスワードを入力してください' }),
        { status: 400, headers: cors }
      )
    }

    if (loginId !== env.ADMIN_LOGIN_ID || password !== env.ADMIN_PASSWORD) {
      return new Response(
        JSON.stringify({ success: false, error: 'ログインIDまたはパスワードが正しくありません' }),
        { status: 401, headers: cors }
      )
    }

    // HMAC署名付きトークンを発行
    const token = await createAdminToken(env)
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'トークン発行に失敗しました' }),
        { status: 500, headers: cors }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        token,
        admin: { loginId },
      }),
      { status: 200, headers: cors }
    )
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: '認証エラーが発生しました' }),
      { status: 500, headers: cors }
    )
  }
}

/**
 * GET /api/admin/auth
 * Authorizationヘッダーの管理者トークンを検証
 * 管理者layoutから毎回呼ばれ、サーバー側で有効性を確認する
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const cors = corsHeaders(request)

  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (!token) {
    return new Response(
      JSON.stringify({ success: false, error: '認証トークンがありません' }),
      { status: 401, headers: cors }
    )
  }

  const valid = await verifyAdminToken(token, env)
  if (!valid) {
    return new Response(
      JSON.stringify({ success: false, error: 'トークンが無効または期限切れです' }),
      { status: 401, headers: cors }
    )
  }

  return new Response(
    JSON.stringify({
      success: true,
      admin: { loginId: env.ADMIN_LOGIN_ID || 'spomeal' },
    }),
    { status: 200, headers: cors }
  )
}

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)
