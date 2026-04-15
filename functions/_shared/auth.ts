/**
 * 共通認証ヘルパー
 * Supabase JWTトークンを検証し、ユーザー情報を返す
 */

interface SupabaseUser {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
    role?: string
  }
  app_metadata?: {
    role?: string
  }
}

interface AuthResult {
  ok: true
  user: SupabaseUser
}

interface AuthError {
  ok: false
  status: number
  error: string
}

/**
 * 許可されたオリジンのリスト
 */
const ALLOWED_ORIGINS = [
  'https://spomeal.jp',
  'https://www.spomeal.jp',
  'https://spomeal0323.pages.dev',
  'http://localhost:3000',
  'http://localhost:8788',
]

/**
 * リクエストのOriginに応じてCORSヘッダーを返す
 */
export function corsHeaders(request: Request, extra: Record<string, string> = {}): Record<string, string> {
  const origin = request.headers.get('Origin') || ''
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : 'https://spomeal.jp'

  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
    ...extra,
  }
}

/**
 * OPTIONS preflight 用
 */
export function handleOptions(request: Request): Response {
  return new Response(null, { headers: corsHeaders(request) })
}

/**
 * リクエストからBearerトークンを取得してSupabaseで検証
 */
export async function verifyUser(
  request: Request,
  env: { NEXT_PUBLIC_SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string }
): Promise<AuthResult | AuthError> {
  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (!token) {
    return { ok: false, status: 401, error: '認証トークンがありません' }
  }

  try {
    // Supabase Auth API でトークン検証
    const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      },
    })

    if (!res.ok) {
      return { ok: false, status: 401, error: '無効な認証トークンです' }
    }

    const user: SupabaseUser = await res.json()
    if (!user?.id) {
      return { ok: false, status: 401, error: 'ユーザー情報を取得できません' }
    }

    return { ok: true, user }
  } catch {
    return { ok: false, status: 500, error: '認証処理に失敗しました' }
  }
}

/**
 * 管理者権限を検証（app_metadata.role === 'admin' または環境変数のメールアドレス一致）
 */
export async function verifyAdmin(
  request: Request,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: string
    SUPABASE_SERVICE_ROLE_KEY: string
    ADMIN_EMAILS?: string
  }
): Promise<AuthResult | AuthError> {
  const result = await verifyUser(request, env)
  if (!result.ok) return result

  const { user } = result

  // 1. app_metadata.role === 'admin' をチェック
  if (user.app_metadata?.role === 'admin') return result

  // 2. user_metadata.role === 'admin' をチェック（フォールバック）
  if (user.user_metadata?.role === 'admin') return result

  // 3. 環境変数の ADMIN_EMAILS にメールアドレスが含まれているかチェック
  const adminEmails = (env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  if (user.email && adminEmails.includes(user.email.toLowerCase())) return result

  return { ok: false, status: 403, error: '管理者権限がありません' }
}

/**
 * 認証エラー用のレスポンス生成ヘルパー
 */
export function authErrorResponse(err: AuthError, request: Request): Response {
  return new Response(
    JSON.stringify({ success: false, error: err.error }),
    { status: err.status, headers: corsHeaders(request) }
  )
}
