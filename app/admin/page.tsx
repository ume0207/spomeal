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

interface NutritionistComment {
  id: string
  date: string
  staffName: string
  targetMember: string  // 会員名 or '__all__' (全員向け)
  category: string      // 食事 / 体組成 / トレーニング / 全般
  comment: string
}

const COMMENTS_KEY = 'nutritionist_comments_v1'

function loadComments(): NutritionistComment[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(COMMENTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveComments(comments: NutritionistComment[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments))
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  // 管理栄養士コメント
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [comments, setComments] = useState<NutritionistComment[]>([])
  const [commentStaff, setCommentStaff] = useState('管理栄養士')
  const [commentTarget, setCommentTarget] = useState('__all__')
  const [commentCategory, setCommentCategory] = useState('食事')
  const [commentText, setCommentText] = useState('')
  const [commentSaved, setCommentSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((data: Stats) => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))

    // コメント読み込み
    setComments(loadComments())
  }, [])

  const handleSendComment = () => {
    if (!commentText.trim()) return
    const now = new Date()
    const dateStr = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
    const timeStr = now.toLocaleTimeString('sv-SE', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })

    const newComment: NutritionistComment = {
      id: Date.now().toString(),
      date: `${dateStr} ${timeStr}`,
      staffName: commentStaff || '管理栄養士',
      targetMember: commentTarget,
      category: commentCategory,
      comment: commentText.trim(),
    }

    const updated = [newComment, ...comments]
    saveComments(updated)
    setComments(updated)
    setCommentText('')
    setCommentSaved(true)
    setTimeout(() => { setCommentSaved(false); setShowCommentModal(false) }, 1500)
  }

  const deleteComment = (id: string) => {
    if (!confirm('このコメントを削除しますか？')) return
    const updated = comments.filter(c => c.id !== id)
    saveComments(updated)
    setComments(updated)
  }

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

  const categoryColors: Record<string, { color: string; bg: string; icon: string }> = {
    '食事': { color: '#16a34a', bg: '#f0fdf4', icon: '🍽️' },
    '体組成': { color: '#dc2626', bg: '#fef2f2', icon: '📊' },
    'トレーニング': { color: '#7c3aed', bg: '#f5f3ff', icon: '💪' },
    '全般': { color: '#2563eb', bg: '#eff6ff', icon: '💬' },
  }

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

      {/* 管理栄養士コメント送信ボタン */}
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={() => setShowCommentModal(true)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: 'white',
            fontWeight: 800, padding: '14px', borderRadius: '14px', fontSize: '15px',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 2px 8px rgba(22,163,74,0.3)',
          }}
        >
          <span style={{ fontSize: '18px' }}>📝</span>
          管理栄養士コメントを送信
        </button>
      </div>

      {/* 送信済みコメント一覧 */}
      {comments.length > 0 && (
        <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px', padding: '16px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>💬</span> 送信済みコメント（最新10件）
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {comments.slice(0, 10).map((c) => {
              const cat = categoryColors[c.category] || categoryColors['全般']
              return (
                <div key={c.id} style={{ background: '#f9fafb', borderRadius: '10px', padding: '10px 12px', border: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, color: cat.color, background: cat.bg,
                      padding: '2px 8px', borderRadius: '6px',
                    }}>{cat.icon} {c.category}</span>
                    <span style={{ fontSize: '10px', color: '#9ca3af' }}>{c.date}</span>
                    <span style={{ fontSize: '10px', color: '#6b7280' }}>by {c.staffName}</span>
                    <button
                      onClick={() => deleteComment(c.id)}
                      style={{ marginLeft: 'auto', fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
                    >🗑</button>
                  </div>
                  <p style={{ fontSize: '12px', color: '#374151', margin: 0, lineHeight: 1.6 }}>{c.comment}</p>
                  {c.targetMember !== '__all__' && (
                    <span style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px', display: 'block' }}>対象: {c.targetMember}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

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

      {/* コメント入力モーダル */}
      {showCommentModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }}
          onClick={() => setShowCommentModal(false)}
        >
          <div
            style={{
              background: 'white', width: '100%', maxWidth: '500px',
              borderRadius: '20px', overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div style={{
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>📝</span>
                <span style={{ fontWeight: 800, color: 'white', fontSize: '15px' }}>管理栄養士コメント</span>
              </div>
              <button
                onClick={() => setShowCommentModal(false)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: '18px', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >×</button>
            </div>

            <div style={{ padding: '20px' }}>
              {/* スタッフ名 */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>担当者名</label>
                <input
                  type="text"
                  value={commentStaff}
                  onChange={(e) => setCommentStaff(e.target.value)}
                  placeholder="管理栄養士"
                  style={{
                    width: '100%', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '10px',
                    padding: '10px 14px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* カテゴリ */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '6px', display: 'block' }}>カテゴリ</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['食事', '体組成', 'トレーニング', '全般'].map((cat) => {
                    const cc = categoryColors[cat]
                    return (
                      <button
                        key={cat}
                        onClick={() => setCommentCategory(cat)}
                        style={{
                          padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                          border: commentCategory === cat ? `2px solid ${cc.color}` : '2px solid #e5e7eb',
                          background: commentCategory === cat ? cc.bg : 'white',
                          color: commentCategory === cat ? cc.color : '#6b7280',
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >{cc.icon} {cat}</button>
                    )
                  })}
                </div>
              </div>

              {/* コメント本文 */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>コメント内容</label>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="例: 今週はタンパク質の摂取量が目標に達していますね！この調子で続けましょう。野菜をもう少し増やすとさらにバランスが良くなります。"
                  rows={4}
                  style={{
                    width: '100%', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '10px',
                    padding: '10px 14px', fontSize: '14px', outline: 'none', fontFamily: 'inherit',
                    boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6,
                  }}
                />
              </div>

              {/* 送信ボタン */}
              <button
                onClick={handleSendComment}
                disabled={!commentText.trim()}
                style={{
                  width: '100%',
                  background: commentSaved ? '#22c55e' : (!commentText.trim() ? '#d1d5db' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'),
                  color: 'white', fontWeight: 800, padding: '14px', borderRadius: '12px',
                  fontSize: '15px', border: 'none', cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', transition: 'all 0.2s',
                }}
              >
                {commentSaved ? '✅ 送信しました！' : '送信する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
