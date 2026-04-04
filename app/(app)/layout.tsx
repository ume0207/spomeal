'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard', icon: '🏠', label: 'ホーム' },
  { href: '/meal', icon: '🍽', label: '食事' },
  { href: '/body', icon: '📊', label: '体組成' },
  { href: '/reserve', icon: '📅', label: '予約' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState('選手')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const name = data.user.user_metadata?.full_name || data.user.email || '選手'
        setUserName(name)
        // アバター読み込み: user_metadata → localStorage fallback
        const metaAvatar = data.user.user_metadata?.avatar_url
        if (metaAvatar) {
          setAvatarUrl(metaAvatar)
          localStorage.setItem('spomeal_avatar', metaAvatar)
        } else {
          const saved = localStorage.getItem('spomeal_avatar')
          if (saved) setAvatarUrl(saved)
        }
      }
    })
  }, [])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      // 画像をリサイズしてbase64に変換（最大120px）
      const bitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      const MAX = 120
      let w = bitmap.width, h = bitmap.height
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX }
        else { w = Math.round(w * MAX / h); h = MAX }
      }
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(bitmap, 0, 0, w, h)
      bitmap.close()
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7)

      setAvatarUrl(dataUrl)
      localStorage.setItem('spomeal_avatar', dataUrl)

      // Supabase user_metadataにも保存
      const supabase = createClient()
      await supabase.auth.updateUser({ data: { avatar_url: dataUrl } })
    } catch { /* ignore */ }
    // input をリセット（同じファイルを再選択可能にする）
    e.target.value = ''
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f3f4f6',
        fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",
        color: '#1a1a1a',
        fontSize: '14px',
      }}
    >
      {/* ===== 共通アプリヘッダー（ユーザー情報行）===== */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 110,
          background: '#22c55e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px 8px',
          minHeight: '60px',
        }}
      >
        {/* 左: アバター + Welcome */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              cursor: 'pointer',
              overflow: 'hidden',
              border: '2px solid rgba(255,255,255,0.5)',
              position: 'relative',
            }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            )}
            {/* カメラアイコンオーバーレイ */}
            <div style={{
              position: 'absolute', bottom: '-1px', right: '-1px',
              width: '16px', height: '16px', borderRadius: '50%',
              background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)', fontWeight: 500, marginBottom: '1px' }}>
              Welcome
            </div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>
              {userName} 様
            </div>
          </div>
        </div>

        {/* 右: ログアウト */}
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: 'rgba(255,255,255,0.15)',
            color: 'white',
            border: '1.5px solid rgba(255,255,255,0.45)',
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
            fontFamily: 'inherit',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          ログアウト
        </button>
      </div>

      {/* ===== Shared Nav（タブバー）===== */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: '#22c55e',
          padding: '6px 8px 10px',
          position: 'sticky',
          top: '60px',
          zIndex: 100,
          overflowX: 'auto',
          scrollbarWidth: 'none' as const,
        }}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                flexDirection: 'column' as const,
                alignItems: 'center',
                gap: '2px',
                padding: isActive ? '10px 12px' : '7px 10px 6px',
                color: isActive ? '#22c55e' : 'rgba(255,255,255,0.85)',
                fontWeight: 600,
                whiteSpace: 'nowrap' as const,
                flexShrink: 0,
                textDecoration: 'none',
                minWidth: '52px',
                flex: 1,
                transition: 'background 0.12s',
                background: isActive ? 'white' : 'transparent',
                borderRadius: isActive ? '14px' : '0',
                boxShadow: isActive ? '0 4px 16px rgba(0,0,0,0.20)' : 'none',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: isActive ? '20px' : '18px', lineHeight: 1.2 }}>
                {item.icon}
              </span>
              <span
                style={{
                  fontSize: isActive ? '10px' : '9px',
                  fontWeight: isActive ? 800 : 700,
                  color: isActive ? '#22c55e' : 'rgba(255,255,255,0.85)',
                }}
              >
                {item.label}
              </span>
            </a>
          )
        })}
      </nav>

      {/* ページコンテンツ */}
      {children}
    </div>
  )
}
