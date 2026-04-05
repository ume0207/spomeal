type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
  ADMIN_LOGIN_ID?: string
  ADMIN_PASSWORD?: string
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  try {
    const body = await request.json() as { loginId?: string; password?: string }
    const { loginId, password } = body

    if (!loginId || !password) {
      return new Response(JSON.stringify({ success: false, error: 'ログインIDとパスワードを入力してください' }), { status: 400, headers: cors })
    }

    // 固定の共通認証情報（環境変数があればそちらを優先）
    const expectedId = env.ADMIN_LOGIN_ID || 'spomeal'
    const expectedPassword = env.ADMIN_PASSWORD || 'spomeal0323'

    if (loginId !== expectedId || password !== expectedPassword) {
      return new Response(JSON.stringify({ success: false, error: 'ログインIDまたはパスワードが正しくありません' }), { status: 401, headers: cors })
    }

    return new Response(JSON.stringify({
      success: true,
      admin: { loginId },
    }), { status: 200, headers: cors })

  } catch {
    return new Response(JSON.stringify({ success: false, error: '認証エラーが発生しました' }), { status: 500, headers: cors })
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { headers: cors })
