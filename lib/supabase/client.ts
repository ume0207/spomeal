import { createBrowserClient } from '@supabase/ssr'

// プレビュー環境（フィーチャーブランチの *.pages.dev）では NEXT_PUBLIC_* env vars が
// ビルド時に伝播せず undefined になるため、公開済みの値（ブラウザに元々送られる
// 公開鍵）にフォールバックする。本番ビルドでは引き続き env vars が優先される。
const FALLBACK_SUPABASE_URL = 'https://bcnqszocmyonmkjjtvuu.supabase.co'
const FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjbnFzem9jbXlvbm1ramp0dnV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MDIzNDYsImV4cCI6MjA4OTk3ODM0Nn0.Ha6qIC_GDrMWJfzWXcBF5SeMLav_TiXrLybbLvLETWc'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY
  )
}
