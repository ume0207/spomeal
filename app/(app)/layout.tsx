'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard', icon: '🏠', label: 'ホーム' },
  { href: '/meal', icon: '🍽', label: '食事' },
  { href: '/body', icon: '📊', label: '体組成' },
  { href: '/training', icon: '💪', label: 'トレーニング' },
  { href: '/supplement', icon: '💊', label: 'サプリ' },
  { href: '/reserve', icon: '📅', label: '予約' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState('選手')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const name = data.user.user_metadata?.full_name || data.user.email || '選手'
        setUserName(name)
      }
    })
  }, [])

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
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
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
