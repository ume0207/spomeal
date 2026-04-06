'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/login')
  }, [router])

  // JSが遅い場合のフォールバック（meta refreshで強制リダイレクト）
  return (
    <html>
      <head>
        <meta httpEquiv="refresh" content="0; url=/login/" />
      </head>
      <body style={{ margin: 0, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ color: '#6b7280', fontSize: '14px', fontFamily: 'sans-serif' }}>読み込み中...</div>
      </body>
    </html>
  )
}
