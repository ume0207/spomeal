/**
 * シンプルな stale-while-revalidate キャッシュ
 * - localStorage に { ts, data } で保存
 * - readCache() でキャッシュを取得（TTL越えなら null）
 * - writeCache() で書き込み
 * 用途: ダッシュボードや食事ページの「再訪時に瞬時に表示」用。
 *      古い場合でも返してその後 fetch で更新する swr パターンに使う。
 */

interface Cached<T> {
  ts: number
  data: T
}

export function readCache<T>(key: string, maxAgeMs: number = Infinity): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Cached<T>
    if (!parsed || typeof parsed.ts !== 'number') return null
    if (Date.now() - parsed.ts > maxAgeMs) return null
    return parsed.data
  } catch {
    return null
  }
}

export function readStaleCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Cached<T>
    return parsed?.data ?? null
  } catch {
    return null
  }
}

export function writeCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }))
  } catch {
    // クォータ超過時など
  }
}
