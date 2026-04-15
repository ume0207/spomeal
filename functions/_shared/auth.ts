/**
 * 共通認証ヘルパー
 * - Supabase JWTトークン検証（会員向け）
 * - HMAC署名付きトークン検証（管理者共通ログイン向け）
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

// =============================================================================
// HMAC 管理者トークン
// =============================================================================

const ADMIN_TOKEN_VERSION = 'v1'
const ADMIN_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30日

/**
 * HMAC-SHA256 署名を16進文字列で返す
 */
async function hmacSign(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * 定数時間で2つの文字列を比較（タイミング攻撃対策）
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

/**
 * 管理者用HMAC署名付きトークンを生成
 * トークン形式: admin.v1.{timestamp}.{signature}
 * 署名 = HMAC-SHA256(ADMIN_PASSWORD, "admin.v1.{timestamp}")
 */
export async function createAdminToken(
  env: { ADMIN_PASSWORD?: string }
): Promise<string | null> {
  const secret = env.ADMIN_PASSWORD
  if (!secret) return null

  const timestamp = Date.now().toString()
  const payload = `admin.${ADMIN_TOKEN_VERSION}.${timestamp}`
  const signature = await hmacSign(secret, payload)
  return `${payload}.${signature}`
}

/**
 * 管理者トークンを検証（HMAC署名+有効期限）
 */
export async function verifyAdminToken(
  token: string,
  env: { ADMIN_PASSWORD?: string }
): Promise<boolean> {
  const secret = env.ADMIN_PASSWORD
  if (!secret) return false

  if (!token.startsWith(`admin.${ADMIN_TOKEN_VERSION}.`)) return false

  const parts = token.split('.')
  if (parts.length !== 4) return false
  const [, version, timestampStr, signature] = parts

  if (version !== ADMIN_TOKEN_VERSION) return false

  // 有効期限チェック
  const timestamp = parseInt(timestampStr, 10)
  if (isNaN(timestamp)) return false
  const age = Date.now() - timestamp
  if (age < 0 || age > ADMIN_TOKEN_TTL_MS) return false

  // 署名検証
  const expected = await hmacSign(secret, `admin.${ADMIN_TOKEN_VERSION}.${timestampStr}`)
  return timingSafeEqual(signature, expected)
}

// =============================================================================
// Supabase JWT 検証（会員向け）
// =============================================================================

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

  // 管理者HMACトークンはSupabaseでは検証できないので即座にスキップ
  if (token.startsWith('admin.')) {
    return { ok: false, status: 401, error: 'このエンドポイントは会員認証が必要です' }
  }

  try {
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

// =============================================================================
// 管理者検証（HMAC優先、フォールバックでSupabase admin role）
// =============================================================================

export async function verifyAdmin(
  request: Request,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: string
    SUPABASE_SERVICE_ROLE_KEY: string
    ADMIN_PASSWORD?: string
    ADMIN_LOGIN_ID?: string
    ADMIN_EMAILS?: string
  }
): Promise<AuthResult | AuthError> {
  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  // 1. 管理者HMACトークンを検証
  if (token.startsWith('admin.')) {
    const valid = await verifyAdminToken(token, env)
    if (valid) {
      return {
        ok: true,
        user: {
          id: 'admin',
          email: env.ADMIN_LOGIN_ID || 'spomeal',
          app_metadata: { role: 'admin' },
        },
      }
    }
    return { ok: false, status: 401, error: '管理者トークンが無効または期限切れです' }
  }

  // 2. Supabase JWT経由のadminロール（backward compat用）
  const userResult = await verifyUser(request, env)
  if (!userResult.ok) {
    return { ok: false, status: 401, error: '管理者認証が必要です' }
  }

  const { user } = userResult

  if (user.app_metadata?.role === 'admin') return userResult
  if (user.user_metadata?.role === 'admin') return userResult

  const adminEmails = (env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  if (user.email && adminEmails.includes(user.email.toLowerCase())) return userResult

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
