import { createClient } from '@/lib/supabase/client'

/**
 * 認証トークンを含めてAPIを呼ぶヘルパー
 * Supabaseのセッションからアクセストークンを取得し、Authorizationヘッダーに付与する
 */
export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  let token: string | null = null
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    token = session?.access_token ?? null
  } catch {
    token = null
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
