import { verifyAdmin, corsHeaders, handleOptions, authErrorResponse } from '../../_shared/auth'

type PagesFunction<Env = Record<string, unknown>> = (context: {
  request: Request
  env: Env
  waitUntil?: (p: Promise<unknown>) => void
}) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  ADMIN_EMAILS?: string
}

// Edge Cache: 会員一覧は全管理者で共有可能なため固定キー。TTL 30秒。
// 会員登録直後の反映タイムラグを気にするなら短めに。
const CACHE_KEY_URL = 'https://cache.internal/admin/members/v1'
const CACHE_TTL_SECONDS = 30

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request, waitUntil } = context

  // 管理者認証
  const auth = await verifyAdmin(request, env)
  if (!auth.ok) return authErrorResponse(auth, request)

  const cors = corsHeaders(request)

  // Edge Cache をチェック
  const cache = (globalThis as unknown as { caches: { default: Cache } }).caches?.default
  const cacheKey = new Request(CACHE_KEY_URL)
  if (cache) {
    try {
      const cached = await cache.match(cacheKey)
      if (cached) {
        const body = await cached.text()
        return new Response(body, { status: 200, headers: { ...cors, 'X-Cache': 'HIT' } })
      }
    } catch {
      // キャッシュ読み出し失敗時は通常処理
    }
  }

  try {
    const res = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=100`,
      {
        headers: {
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    )

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch users' }), { status: 500, headers: cors })
    }

    const data = await res.json() as { users: Array<{
      id: string
      email: string
      created_at: string
      user_metadata: Record<string, string>
      last_sign_in_at?: string
    }> }

    const members = (data.users || []).map((u) => ({
      id: u.id,
      email: u.email,
      name: u.user_metadata?.full_name || u.email,
      furigana: u.user_metadata?.furigana || '',
      phone: u.user_metadata?.phone || '',
      team: u.user_metadata?.team || '',
      gender: u.user_metadata?.gender || '',
      address: u.user_metadata?.address || '',
      memo: u.user_metadata?.memo || '',
      createdAt: u.created_at?.slice(0, 10) || '',
      lastSignIn: u.last_sign_in_at?.slice(0, 10) || '',
    }))

    const body = JSON.stringify({ members })

    // Edge Cache に保存（30秒）
    if (cache) {
      try {
        const cacheResp = new Response(body, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
          },
        })
        const putPromise = cache.put(cacheKey, cacheResp)
        if (waitUntil) {
          waitUntil(putPromise)
        } else {
          putPromise.catch(() => {})
        }
      } catch {
        // キャッシュ書き込み失敗は無視
      }
    }

    return new Response(body, { status: 200, headers: { ...cors, 'X-Cache': 'MISS' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors })
  }
}

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)
