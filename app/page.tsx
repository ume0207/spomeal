'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    // パスワードリセットのリカバリートークンが含まれている場合は再設定ページへ
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    if (hash.includes('type=recovery')) {
      router.replace('/reset-password' + hash)
    } else {
      router.replace('/login')
    }
  }, [router])

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#6b7280', fontSize: '14px', fontFamily: 'sans-serif' }}>読み込み中...</div>
    </div>
  )
}
