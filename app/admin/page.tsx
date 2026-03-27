'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

interface Stats {
  totalMembers: number
  trialing: number
  active: number
  cancelled30d: number
  planCount: { light: number; standard: number; premium: number }
  newThisMonth: number
  monthlyRevenue: number
  churnRate: number
  retentionRate: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((data: Stats) => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const fmt = (v: number | undefined) => loading ? '…' : (v ?? 0).toLocaleString()
  const now = new Date()
  const monthLabel = `${now.getMonth() + 1}月`

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

  const card = (icon: string, label: string, value: string, color: string) => (
    <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <div style={{ fontSize: '24px', fontWeight: 900, color, lineHeight: 1.3, marginTop: '4px' }}>{value}</div>
      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{label}</div>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif", color: '#1a1a1a' }}>
      {/* ヘッダー */}
      <div style={{ background: '#2563eb', color: 'white', padding: '20px 20px 16px', marginBottom: '20px', borderRadius: '16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 900, margin: '0 0 4px', color: 'white' }}>管理者ダッシュボード</h1>
        <p style={{ fontSize: '12px', margin: 0, color: 'rgba(255,255,255,0.7)' }}>
          {loading ? '読み込み中...' : `${now.getFullYear()}年${monthLabel} データ`}
        </p>
      </div>

      {/* 会員数サマリー */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
        {card('👥', '総会員数', fmt(stats?.totalMembers), '#2563eb')}
        {card('🆓', '無料トライアル', fmt(stats?.trialing), '#f59e0b')}
        {card('✅', 'アクティブ会員', fmt(stats?.active), '#16a34a')}
        {card('📅', `${monthLabel}新規契約`, fmt(stats?.newThisMonth), '#8b5cf6')}
      </div>

      {/* プラン別内訳 */}
      <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px', padding: '16px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>📋 プラン別契約数</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {[
            { label: 'ライト', value: fmt(stats?.planCount?.light), color: '#22c55e', bg: '#f0fdf4' },
            { label: 'スタンダード', value: fmt(stats?.planCount?.standard), color: '#2563eb', bg: '#eff6ff' },
            { label: 'プレミアム', value: fmt(stats?.planCount?.premium), color: '#7c3aed', bg: '#f5f3ff' },
          ].map((p) => (
            <div key={p.label} style={{ background: p.bg, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 900, color: p.color }}>{p.value}</div>
              <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>{p.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 売上・解約率 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
        <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>💰 {monthLabel}売上</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#16a34a' }}>
            {loading ? '…' : `¥${(stats?.monthlyRevenue ?? 0).toLocaleString()}`}
          </div>
        </div>
        <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>📈 継続率</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#2563eb' }}>
            {loading ? '…' : `${stats?.retentionRate ?? 0}%`}
          </div>
        </div>
        <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>📉 解約率</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#ef4444' }}>
            {loading ? '…' : `${stats?.churnRate ?? 0}%`}
          </div>
        </div>
      </div>

      {/* クイックアクション */}
      <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
        <div style={{ padding: '14px 16px 0' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>⚡ クイックアクション</span>
        </div>
        <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {quickLinks.map((link) => (
            <Link key={link.label} href={link.href} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '10px', background: link.bg, color: link.color, fontWeight: 700, fontSize: '12px', textDecoration: 'none', border: `1px solid ${link.color}22` }}>
              <span style={{ fontSize: '16px' }}>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
