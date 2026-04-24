/**
 * 管理者画面向け Edge Cache の無効化ヘルパー
 *
 * 会員側の書き込み（POST/PATCH/DELETE）時に呼び出して、
 * 対応する管理者フィードのキャッシュを即座に削除する。
 * これにより「会員が保存した直後に管理者が古いデータを見続ける」問題を防ぐ。
 *
 * 対象キー：
 * - meal-feed（range: today / yesterday / 3days / week）
 * - body-feed（range: today / yesterday / 3days / week）
 * - stats
 * - members
 */

const FEED_RANGES = ['today', 'yesterday', '3days', 'week'] as const

export function invalidateMealFeedCache(waitUntil?: (p: Promise<unknown>) => void) {
  invalidate(FEED_RANGES.map(r => `https://cache.internal/admin/meal-feed/v1?range=${r}`), waitUntil)
}

export function invalidateBodyFeedCache(waitUntil?: (p: Promise<unknown>) => void) {
  invalidate(FEED_RANGES.map(r => `https://cache.internal/admin/body-feed/v1?range=${r}`), waitUntil)
}

export function invalidateStatsCache(waitUntil?: (p: Promise<unknown>) => void) {
  invalidate(['https://cache.internal/admin/stats/v2'], waitUntil)
}

export function invalidateMembersCache(waitUntil?: (p: Promise<unknown>) => void) {
  invalidate(['https://cache.internal/admin/members/v1'], waitUntil)
}

function invalidate(urls: string[], waitUntil?: (p: Promise<unknown>) => void) {
  try {
    const cache = (globalThis as unknown as { caches?: { default: Cache } }).caches?.default
    if (!cache) return
    const p = Promise.all(urls.map(u => cache.delete(new Request(u)).catch(() => false)))
    if (waitUntil) waitUntil(p); else p.catch(() => {})
  } catch {
    // best-effort: cache が使えなくても本体処理は成功させる
  }
}
