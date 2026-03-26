'use client'

import Link from 'next/link'

export default function AdminDashboardPage() {
  const stats = [
    { label: '総会員数', value: '—', icon: '👥', color: '#2563eb' },
    { label: 'アクティブ会員', value: '—', icon: '✅', color: '#16a34a' },
    { label: '今日の食事記録', value: '—', icon: '🍽', color: '#22c55e' },
    { label: '今日の体組成測定', value: '—', icon: '📊', color: '#f97316' },
  ]

  const quickLinks = [
    { label: '会員を登録', icon: '👥', color: '#2563eb', bg: '#eff6ff', href: '/admin/members' },
    { label: '食事記録を確認', icon: '🍽', color: '#16a34a', bg: '#f0fdf4', href: '/admin/members' },
    { label: '体組成を確認', icon: '📊', color: '#dc2626', bg: '#fef2f2', href: '/admin/members' },
    { label: 'トレーニング確認', icon: '💪', color: '#7c3aed', bg: '#f5f3ff', href: '/admin/members' },
    { label: 'サプリ確認', icon: '💊', color: '#ea580c', bg: '#fff7ed', href: '/admin/members' },
    { label: 'CSV出力', icon: '📥', color: '#2563eb', bg: '#eff6ff', href: '/admin/members' },
    { label: '予約カレンダー', icon: '📅', color: '#0ea5e9', bg: '#f0f9ff', href: '/admin/calendar' },
    { label: 'タイムスケジュール', icon: '🕐', color: '#0ea5e9', bg: '#f0f9ff', href: '/admin/schedule' },
    { label: 'スタッフ管理', icon: '👤', color: '#2563eb', bg: '#eff6ff', href: '/admin/staff' },
    { label: 'シフト管理', icon: '📋', color: '#4f46e5', bg: '#eef2ff', href: '/admin/shift' },
  ]

  return (
    <div style={{ fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif", color: '#1a1a1a' }}>
      {/* ページヘッダー */}
      <div
        style={{
          background: '#2563eb',
          color: 'white',
          padding: '20px 20px 16px',
          marginBottom: '20px',
          borderRadius: '16px',
        }}
      >
        <h1 style={{ fontSize: '20px', fontWeight: 900, margin: '0 0 4px', color: 'white' }}>
          管理者ダッシュボード
        </h1>
        <p style={{ fontSize: '12px', margin: 0, color: 'rgba(255,255,255,0.7)' }}>
          読み込み中...
        </p>
      </div>

      {/* 統計グリッド */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '10px',
          marginBottom: '16px',
        }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              background: 'white',
              border: '1px solid #f0f0f0',
              borderRadius: '14px',
              padding: '14px 16px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span style={{ fontSize: '22px' }}>{stat.icon}</span>
            <span style={{ fontSize: '24px', fontWeight: 900, color: stat.color, lineHeight: 1.2 }}>
              {stat.value}
            </span>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>{stat.label}</span>
          </div>
        ))}
      </div>

      {/* クイックアクション */}
      <div
        style={{
          background: 'white',
          border: '1px solid #f0f0f0',
          borderRadius: '16px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          marginBottom: '16px',
        }}
      >
        <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>⚡ クイックアクション</span>
        </div>
        <div
          style={{
            padding: '14px 16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
          }}
        >
          {quickLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: link.bg,
                color: link.color,
                fontWeight: 700,
                fontSize: '12px',
                textDecoration: 'none',
                border: `1px solid ${link.color}22`,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '16px' }}>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* 会員一覧 */}
      <div
        style={{
          background: 'white',
          border: '1px solid #f0f0f0',
          borderRadius: '16px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          marginBottom: '16px',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>👥 会員一覧・活動状況</span>
          <Link href="/admin/members" style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
            会員管理へ ›
          </Link>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f0f0f0' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#6b7280' }}>会員</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#6b7280' }}>ステータス</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#6b7280' }}>最終食事記録</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#6b7280' }}>アクション</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.3 }}>👥</div>
                  会員が登録されていません
                  <div style={{ marginTop: '12px' }}>
                    <Link
                      href="/admin/members"
                      style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        background: '#2563eb',
                        color: 'white',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      最初の会員を登録する
                    </Link>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 最近のアクティビティ */}
      <div
        style={{
          background: 'white',
          border: '1px solid #f0f0f0',
          borderRadius: '16px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ padding: '14px 16px 0' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>🕐 最近のアクティビティ</span>
        </div>
        <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
          記録がありません
        </div>
      </div>
    </div>
  )
}
