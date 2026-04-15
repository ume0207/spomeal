import { createClient } from '@/lib/supabase/client'

/**
 * 認証トークンを含めてAPIを呼ぶヘルパー
 *
 * 優先順位:
 * 1. 管理者HMACトークン (`spomeal_admin_token` が localStorage にある場合)
 *    → `/admin` 配下の管理者ページから呼ばれた時に使う
 * 2. Supabase JWT (会員セッション)
 *    → 会員ページから呼ばれた時に使う
 */
export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  let token: string | null = null

  // 1. 管理者トークンを優先
  try {
    token = typeof window !== 'undefined' ? window.localStorage.getItem('spomeal_admin_token') : null
  } catch {
    token = null
  }

  // 2. 管理者トークンがなければSupabase JWTにフォールバック
  if (!token) {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      token = session?.access_token ?? null
    } catch {
      token = null
    }
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
