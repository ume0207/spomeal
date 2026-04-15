import { createClient } from '@/lib/supabase/client'

/**
 * 認証トークンを含めてAPIを呼ぶヘルパー
 *
 * トークン選択ロジック:
 * - 管理者ページ(/admin配下)からの呼び出し → 管理者HMACトークン優先、Supabase JWTフォールバック
 * - それ以外（会員ページ）からの呼び出し → Supabase JWTのみ使用
 *
 * この分離により、管理者として別タブでログインしていても
 * 会員ページでは Supabase JWT が正しく使われる
 */
function isAdminContext(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.pathname.startsWith('/admin')
}

async function getAdminToken(): Promise<string | null> {
  try {
    return typeof window !== 'undefined'
      ? window.localStorage.getItem('spomeal_admin_token')
      : null
  } catch {
    return null
  }
}

async function getSupabaseToken(): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  } catch {
    return null
  }
}

export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  let token: string | null = null

  if (isAdminContext()) {
    // 管理者ページ: 管理者トークン優先 → Supabase JWTフォールバック
    token = await getAdminToken()
    if (!token) token = await getSupabaseToken()
  } else {
    // 会員ページ: Supabase JWTのみ（管理者トークンは使わない）
    token = await getSupabaseToken()
  }

  const headers = new Headers(init.headers || {})
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  return fetch(url, { ...init, headers })
}

/**
 * JSONを返すAPIヘルパー
 */
export async function apiJson<T = unknown>(url: string, init: RequestInit = {}): Promise<T | null> {
  try {
    const res = await apiFetch(url, init)
    if (!res.ok) return null
    return await res.json() as T
  } catch {
    return null
  }
}
