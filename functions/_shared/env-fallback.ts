/**
 * Cloudflare Pages env vars のフォールバックヘルパー。
 *
 * 本番環境では Pages の env vars から読まれるが、フィーチャーブランチの
 * Preview デプロイでは env vars が未設定のため、公開済みの値
 * （NEXT_PUBLIC_* なので元々ブラウザに送信されている、秘密ではない）に
 * フォールバックする。
 *
 * SUPABASE_SERVICE_ROLE_KEY は秘密なのでフォールバックしない。
 * Service Role が必要な API は Preview 環境では機能しない可能性がある。
 */

// NEXT_PUBLIC_SUPABASE_URL は HTML/JS バンドルに既に含まれている公開値
const PUBLIC_SUPABASE_URL = 'https://bcnqszocmyonmkjjtvuu.supabase.co'
// NEXT_PUBLIC_SUPABASE_ANON_KEY も同上、ブラウザに公開済みの公開鍵
const PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjbnFzem9jbXlvbm1ramp0dnV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MDIzNDYsImV4cCI6MjA4OTk3ODM0Nn0.Ha6qIC_GDrMWJfzWXcBF5SeMLav_TiXrLybbLvLETWc'

export function getSupabaseUrl(env: Record<string, unknown>): string {
  const v = env.NEXT_PUBLIC_SUPABASE_URL
  return (typeof v === 'string' && v.length > 0) ? v : PUBLIC_SUPABASE_URL
}

export function getSupabaseAnonKey(env: Record<string, unknown>): string {
  const v = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return (typeof v === 'string' && v.length > 0) ? v : PUBLIC_SUPABASE_ANON_KEY
}
