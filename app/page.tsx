'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RootPage() {
  const router = useRouter()
  const [message, setMessage] = useState('読み込み中...')

  useEffect(() => {
    (async () => {
      // パスワードリセットのリカバリートークンが含まれている場合は再設定ページへ
      const hash = typeof window !== 'undefined' ? window.location.hash : ''
      if (hash.includes('type=recovery')) {
        router.replace('/reset-password' + hash)
        return
      }

      // ★プレビュー環境（*.pages.dev）：ログインを自動で済ませてペット画面へ直行
      const isPreview = typeof window !== 'undefined'
        && window.location.hostname.endsWith('.pages.dev')

      if (isPreview) {
        try {
          setMessage('🍙 テストユーザーで自動ログイン中...')
          const supabase = createClient()
          // 既にセッションがあればそのまま /pet へ
          const { data: { session: existingSession } } = await supabase.auth.getSession()
          if (existingSession) {
            window.location.href = '/pet'
            return
          }

          // プロキシ経由でテストアカウントへログイン
          let sessionData: { access_token: string; refresh_token: string } | null = null
          try {
            const r = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: 'pet-test@spomeal.jp', password: 'PetTest2026!' }),
            })
            if (r.ok) {
              const data = await r.json() as { success?: boolean; session?: { access_token: string; refresh_token: string } }
              if (data.success && data.session?.access_token) {
                sessionData = data.session
              }
            }
          } catch { /* fallback */ }

          if (sessionData) {
            await supabase.auth.setSession({
              access_token: sessionData.access_token,
              refresh_token: sessionData.refresh_token,
            })
          } else {
            // 直接Supabaseフォールバック
            const { error } = await supabase.auth.signInWithPassword({
              email: 'pet-test@spomeal.jp',
              password: 'PetTest2026!',
            })
            if (error) {
              setMessage('ログイン失敗：' + error.message)
              return
            }
          }
          window.location.href = '/pet'
          return
        } catch (e) {
          setMessage('エラー：' + String(e))
          return
        }
      }

      router.replace('/login')
    })()
  }, [router])

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#6b7280', fontSize: '14px', fontFamily: 'sans-serif', textAlign: 'center', padding: '20px' }}>
        {message}
      </div>
    </div>
  )
}
