'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/admin', label: 'ダッシュボード' },
  { href: '/admin/members', label: 'メンバー' },
  { href: '/admin/calendar', label: '予約カレンダー' },
  { href: '/admin/schedule', label: 'スケジュール' },
  { href: '/admin/staff', label: 'スタッフ' },
  { href: '/admin/shift', label: 'シフト' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif" }}>
      {/* Admin top nav */}
      <nav style={{ background: '#1a1a1a', color: 'white', padding: '0 16px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '52px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            <Link
              href="/admin"
              style={{ fontSize: '15px', fontWeight: 900, color: 'white', textDecoration: 'none', whiteSpace: 'nowrap', marginRight: '8px', flexShrink: 0 }}
            >
              スポ<span style={{ color: '#22c55e' }}>ミル</span>
              <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '6px', fontWeight: 400 }}>Admin</span>
            </Link>
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: isActive ? 700 : 400,
                    color: isActive ? 'white' : '#9ca3af',
                    background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'all 0.12s',
                  }}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
          <Link
            href="/dashboard"
            style={{ fontSize: '11px', color: '#9ca3af', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            アプリに戻る
          </Link>
        </div>
      </nav>
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
        {children}
      </main>
    </div>
  )
}
