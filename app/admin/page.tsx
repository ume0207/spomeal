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

interface FeedItem {
  id: string
  memberId: string
  memberName: string
  memberEmail: string
  mealType: string
  items: { name: string; kcal: number; protein: number; fat: number; carbs: number }[]
  totalKcal: number
  totalProtein: number
  date: string
  time: string
  updatedAt: string
}

interface MeetingNote {
  id: string
  memberId: string
  memberName: string
  date: string
  title: string
  content: string
  staffName: string
}

const COMMENTS_KEY = 'nutritionist_comments_v1'
const MEETING_NOTES_KEY = 'meeting_notes_v1'

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

function loadMeetingNotes(): MeetingNote[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(MEETING_NOTES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveMeetingNotes(notes: MeetingNote[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(MEETING_NOTES_KEY, JSON.stringify(notes))
}

type FeedRange = 'today' | 'yesterday' | '3days' | 'week'

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
  const [commentTargetName, setCommentTargetName] = useState('')

  // 食事更新フィード
  const [feedRange, setFeedRange] = useState<FeedRange>('today')
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [feedDropdownOpen, setFeedDropdownOpen] = useState(false)

  // 議事録モーダル
  const [showMeetingModal, setShowMeetingModal] = useState(false)
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([])
  const [meetingMemberId, setMeetingMemberId] = useState('')
  const [meetingMemberName, setMeetingMemberName] = useState('')
  const [meetingTitle, setMeetingTitle] = useState('')
  const [meetingContent, setMeetingContent] = useState('')
  const [meetingStaff, setMeetingStaff] = useState('管理栄養士')
  const [meetingSaved, setMeetingSaved] = useState(false)

  // 議事録一覧モーダル
  const [showMeetingList, setShowMeetingList] = useState(false)
  const [meetingListMemberId, setMeetingListMemberId] = useState('')
  const [meetingListMemberName, setMeetingListMemberName] = useState('')

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((data: Stats) => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))

    setComments(loadComments())
    setMeetingNotes(loadMeetingNotes())
  }, [])

  // フィード取得
  useEffect(() => {
    setFeedLoading(true)
    fetch(`/api/admin/meal-feed?range=${feedRange}`)
      .then((r) => r.json())
      .then((data: { feed: FeedItem[] }) => {
        setFeed(data.feed || [])
        setFeedLoading(false)
      })
      .catch(() => {
        // APIが使えない場合のフォールバック（デモデータ）
        const now = new Date()
        const todayStr = now.toISOString().slice(0, 10)
        const demoFeed: FeedItem[] = [
          { id: 'f1', memberId: 'demo-1', memberName: '山田 太郎', memberEmail: 'yamada@example.com', mealType: '朝食', items: [{ name: '鶏むね肉のグリル', kcal: 230, protein: 38, fat: 5, carbs: 0 }, { name: '玄米ごはん', kcal: 264, protein: 5.6, fat: 1.8, carbs: 57 }], totalKcal: 494, totalProtein: 43.6, date: todayStr, time: '08:30', updatedAt: `${todayStr}T08:30:00+09:00` },
          { id: 'f2', memberId: 'demo-2', memberName: '佐藤 花子', memberEmail: 'sato@example.com', mealType: '昼食', items: [{ name: 'サーモンの刺身定食', kcal: 580, protein: 32, fat: 18, carbs: 65 }], totalKcal: 580, totalProtein: 32, date: todayStr, time: '12:15', updatedAt: `${todayStr}T12:15:00+09:00` },
          { id: 'f3', memberId: 'demo-3', memberName: '田中 健太', memberEmail: 'tanaka@example.com', mealType: '夕食', items: [{ name: 'ささみと野菜の炒め物', kcal: 320, protein: 35, fat: 8, carbs: 20 }, { name: '味噌汁', kcal: 45, protein: 3, fat: 1.5, carbs: 5 }], totalKcal: 365, totalProtein: 38, date: todayStr, time: '19:45', updatedAt: `${todayStr}T19:45:00+09:00` },
          { id: 'f4', memberId: 'demo-4', memberName: '鈴木 美咲', memberEmail: 'suzuki@example.com', mealType: '朝食', items: [{ name: 'ギリシャヨーグルト', kcal: 130, protein: 20, fat: 0, carbs: 10 }, { name: 'バナナ', kcal: 86, protein: 1.1, fat: 0.2, carbs: 22.5 }], totalKcal: 216, totalProtein: 21.1, date: todayStr, time: '07:20', updatedAt: `${todayStr}T07:20:00+09:00` },
          { id: 'f5', memberId: 'demo-5', memberName: '高橋 翔', memberEmail: 'takahashi@example.com', mealType: '間食', items: [{ name: 'プロテインバー', kcal: 190, protein: 15, fat: 8, carbs: 20 }], totalKcal: 190, totalProtein: 15, date: todayStr, time: '15:00', updatedAt: `${todayStr}T15:00:00+09:00` },
        ]
        setFeed(demoFeed)
        setFeedLoading(false)
      })
  }, [feedRange])

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

  // コメントモーダルを特定メンバー向けに開く
  const openCommentForMember = (memberId: string, memberName: string) => {
    setCommentTarget(memberId)
    setCommentTargetName(memberName)
    setCommentCategory('食事')
    setCommentText('')
    setCommentSaved(false)
    setShowCommentModal(true)
  }

  // 議事録を保存
  const handleSaveMeeting = () => {
    if (!meetingTitle.trim() || !meetingContent.trim()) return
    const now = new Date()
    const dateStr = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
    const timeStr = now.toLocaleTimeString('sv-SE', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })

    const note: MeetingNote = {
      id: Date.now().toString(),
      memberId: meetingMemberId,
      memberName: meetingMemberName,
      date: `${dateStr} ${timeStr}`,
      title: meetingTitle.trim(),
      content: meetingContent.trim(),
      staffName: meetingStaff || '管理栄養士',
    }

    const updated = [note, ...meetingNotes]
    saveMeetingNotes(updated)
    setMeetingNotes(updated)
    setMeetingTitle('')
    setMeetingContent('')
    setMeetingSaved(true)
    setTimeout(() => { setMeetingSaved(false); setShowMeetingModal(false) }, 1500)
  }

  const deleteMeetingNote = (id: string) => {
    if (!confirm('この議事録を削除しますか？')) return
    const updated = meetingNotes.filter(n => n.id !== id)
    saveMeetingNotes(updated)
    setMeetingNotes(updated)
  }

  // 議事録一覧を特定メンバーで開く
  const openMeetingListFor = (memberId: string, memberName: string) => {
    setMeetingListMemberId(memberId)
    setMeetingListMemberName(memberName)
    setShowMeetingList(true)
  }

  // 議事録登録モーダルを開く
  const openMeetingModal = (memberId: string, memberName: string) => {
    setMeetingMemberId(memberId)
    setMeetingMemberName(memberName)
    setMeetingTitle('')
    setMeetingContent('')
    setMeetingSaved(false)
    setShowMeetingModal(true)
  }

  const fmt = (v: number | undefined) => loading ? '…' : (v ?? 0).toLocaleString()
  const now = new Date()
  const monthLabel = `${now.getMonth() + 1}月`

  const quickLinks = [
    { label: '会員を登録', icon: '👥', color: '#2563eb', bg: '#eff6ff', href: '/admin/members' },
    { label: '食事記録を確認', icon: '🍽', color: '#16a34a', bg: '#f0fdf4', href: '/admin/members' },
    { label: '体組成を確認', icon: '📊', color: '#dc2626', bg: '#fef2f2', href: '/admin/members' },
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

  const mealTypeColors: Record<string, { color: string; bg: string; icon: string }> = {
    '朝食': { color: '#f59e0b', bg: '#fffbeb', icon: '🌅' },
    '昼食': { color: '#16a34a', bg: '#f0fdf4', icon: '☀️' },
    '夕食': { color: '#7c3aed', bg: '#f5f3ff', icon: '🌙' },
    '間食': { color: '#ea580c', bg: '#fff7ed', icon: '🍎' },
  }

  const rangeLabels: Record<FeedRange, string> = {
    'today': '今日の更新',
    'yesterday': '昨日以降',
    '3days': '3日以内',
    'week': '1週間以内',
  }

  const card = (icon: string, label: string, value: string, color: string) => (
    <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <div style={{ fontSize: '24px', fontWeight: 900, color, lineHeight: 1.3, marginTop: '4px' }}>{value}</div>
      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{label}</div>
    </div>
  )

  // フィードを日付ごとにグループ化
  const groupedFeed: Record<string, FeedItem[]> = {}
  for (const item of feed) {
    if (!groupedFeed[item.date]) groupedFeed[item.date] = []
    groupedFeed[item.date].push(item)
  }
  const sortedDates = Object.keys(groupedFeed).sort((a, b) => b.localeCompare(a))

  const formatDateLabel = (dateStr: string) => {
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })

    if (dateStr === todayStr) return '今日'
    if (dateStr === yesterdayStr) return '昨日'
    const d = new Date(dateStr + 'T00:00:00+09:00')
    return `${d.getMonth() + 1}/${d.getDate()}（${['日', '月', '火', '水', '木', '金', '土'][d.getDay()]}）`
  }

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

      {/* ========== 最近の食事更新フィード ========== */}
      <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {/* フィードヘッダー */}
        <div style={{
          background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
          padding: '14px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🍽️</span>
            <span style={{ fontWeight: 800, color: 'white', fontSize: '14px' }}>食事更新フィード</span>
            <span style={{
              background: 'rgba(255,255,255,0.25)', color: 'white', fontSize: '11px',
              fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
            }}>{feed.length}件</span>
          </div>

          {/* フィルタードロップダウン */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setFeedDropdownOpen(!feedDropdownOpen)}
              style={{
                background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
                color: 'white', fontWeight: 700, fontSize: '12px', padding: '6px 12px',
                borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              {rangeLabels[feedRange]}
              <span style={{ fontSize: '10px' }}>▼</span>
            </button>
            {feedDropdownOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                background: 'white', borderRadius: '10px', overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 100, minWidth: '140px',
              }}>
                {(Object.keys(rangeLabels) as FeedRange[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => { setFeedRange(key); setFeedDropdownOpen(false) }}
                    style={{
                      display: 'block', width: '100%', padding: '10px 14px', border: 'none',
                      background: feedRange === key ? '#f0fdf4' : 'white',
                      color: feedRange === key ? '#16a34a' : '#374151',
                      fontWeight: feedRange === key ? 700 : 400,
                      fontSize: '13px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    }}
                  >{rangeLabels[key]}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* フィード本体 */}
        <div style={{ padding: '12px 16px', maxHeight: '600px', overflowY: 'auto' }}>
          {feedLoading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: '13px' }}>読み込み中...</div>
          ) : feed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: '13px' }}>この期間の更新はありません</div>
          ) : (
            sortedDates.map((dateStr) => (
              <div key={dateStr} style={{ marginBottom: '12px' }}>
                {/* 日付ラベル */}
                <div style={{
                  fontSize: '11px', fontWeight: 700, color: '#6b7280',
                  padding: '4px 0', marginBottom: '8px',
                  borderBottom: '1px solid #f3f4f6',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <span style={{ fontSize: '14px' }}>📅</span>
                  {formatDateLabel(dateStr)}
                  <span style={{
                    background: '#f3f4f6', color: '#6b7280', fontSize: '10px',
                    fontWeight: 600, padding: '1px 6px', borderRadius: '6px',
                  }}>{groupedFeed[dateStr].length}件</span>
                </div>

                {/* 食事カード */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {groupedFeed[dateStr].map((item) => {
                    const mt = mealTypeColors[item.mealType] || mealTypeColors['間食']
                    const memberNotes = meetingNotes.filter(n => n.memberId === item.memberId)
                    return (
                      <div key={item.id} style={{
                        background: '#f9fafb', borderRadius: '12px', padding: '12px',
                        border: '1px solid #f3f4f6',
                      }}>
                        {/* 上段: メンバー名 + 食事タイプ + 時刻 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            background: '#2563eb', color: 'white', fontSize: '10px',
                            fontWeight: 800, padding: '2px 8px', borderRadius: '6px',
                          }}>{item.memberName}</span>
                          <span style={{
                            background: mt.bg, color: mt.color, fontSize: '10px',
                            fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                            border: `1px solid ${mt.color}22`,
                          }}>{mt.icon} {item.mealType}</span>
                          <span style={{ fontSize: '10px', color: '#9ca3af', marginLeft: 'auto' }}>{item.time}</span>
                        </div>

                        {/* 食事内容 */}
                        <div style={{ marginBottom: '8px' }}>
                          {item.items.map((food, idx) => (
                            <div key={idx} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '3px 0', fontSize: '12px',
                            }}>
                              <span style={{ color: '#374151' }}>{food.name}</span>
                              <span style={{ color: '#9ca3af', fontSize: '11px', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                                {food.kcal}kcal / P{food.protein}g
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* 合計 */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '6px 8px', background: 'white', borderRadius: '8px',
                          marginBottom: '8px',
                        }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a' }}>合計 {item.totalKcal}kcal</span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb' }}>P {item.totalProtein}g</span>
                        </div>

                        {/* アクションボタン */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => openCommentForMember(item.memberId, item.memberName)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '4px',
                              padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                              background: '#f0fdf4', color: '#16a34a', border: '1px solid #16a34a22',
                              cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >💬 コメント</button>

                          <Link
                            href={`/admin/members/detail?id=${item.memberId}`}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '4px',
                              padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                              background: '#eff6ff', color: '#2563eb', border: '1px solid #2563eb22',
                              textDecoration: 'none',
                            }}
                          >👤 プロフィール</Link>

                          <button
                            onClick={() => openMeetingModal(item.memberId, item.memberName)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '4px',
                              padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                              background: '#faf5ff', color: '#7c3aed', border: '1px solid #7c3aed22',
                              cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >📝 議事録</button>

                          {memberNotes.length > 0 && (
                            <button
                              onClick={() => openMeetingListFor(item.memberId, item.memberName)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                                background: '#fff7ed', color: '#ea580c', border: '1px solid #ea580c22',
                                cursor: 'pointer', fontFamily: 'inherit',
                              }}
                            >📋 議事録一覧({memberNotes.length})</button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
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

      {/* ========== コメント入力モーダル ========== */}
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
            <div style={{
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>📝</span>
                <div>
                  <span style={{ fontWeight: 800, color: 'white', fontSize: '15px', display: 'block' }}>コメント送信</span>
                  {commentTargetName && (
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>宛先: {commentTargetName}</span>
                  )}
                </div>
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
                  placeholder="例: 今週はタンパク質の摂取量が目標に達していますね！この調子で続けましょう。"
                  rows={4}
                  style={{
                    width: '100%', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '10px',
                    padding: '10px 14px', fontSize: '14px', outline: 'none', fontFamily: 'inherit',
                    boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6,
                  }}
                />
              </div>

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

      {/* ========== 議事録登録モーダル ========== */}
      {showMeetingModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }}
          onClick={() => setShowMeetingModal(false)}
        >
          <div
            style={{
              background: 'white', width: '100%', maxWidth: '500px',
              borderRadius: '20px', overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
              padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>📝</span>
                <div>
                  <span style={{ fontWeight: 800, color: 'white', fontSize: '15px', display: 'block' }}>ミーティング議事録</span>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>対象: {meetingMemberName}</span>
                </div>
              </div>
              <button
                onClick={() => setShowMeetingModal(false)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: '18px', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >×</button>
            </div>

            <div style={{ padding: '20px' }}>
              {/* 担当者 */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>担当者名</label>
                <input
                  type="text"
                  value={meetingStaff}
                  onChange={(e) => setMeetingStaff(e.target.value)}
                  placeholder="担当者名"
                  style={{
                    width: '100%', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '10px',
                    padding: '10px 14px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* タイトル */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>タイトル</label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="例: 初回カウンセリング / 月次振り返り"
                  style={{
                    width: '100%', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '10px',
                    padding: '10px 14px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* 内容 */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>議事録内容</label>
                <textarea
                  value={meetingContent}
                  onChange={(e) => setMeetingContent(e.target.value)}
                  placeholder="ミーティングの内容、決定事項、次回アクションなどを記録..."
                  rows={6}
                  style={{
                    width: '100%', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '10px',
                    padding: '10px 14px', fontSize: '14px', outline: 'none', fontFamily: 'inherit',
                    boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6,
                  }}
                />
              </div>

              <button
                onClick={handleSaveMeeting}
                disabled={!meetingTitle.trim() || !meetingContent.trim()}
                style={{
                  width: '100%',
                  background: meetingSaved ? '#7c3aed' : (!meetingTitle.trim() || !meetingContent.trim() ? '#d1d5db' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'),
                  color: 'white', fontWeight: 800, padding: '14px', borderRadius: '12px',
                  fontSize: '15px', border: 'none',
                  cursor: meetingTitle.trim() && meetingContent.trim() ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', transition: 'all 0.2s',
                }}
              >
                {meetingSaved ? '✅ 保存しました！' : '議事録を保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== 議事録一覧モーダル ========== */}
      {showMeetingList && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }}
          onClick={() => setShowMeetingList(false)}
        >
          <div
            style={{
              background: 'white', width: '100%', maxWidth: '500px', maxHeight: '80vh',
              borderRadius: '20px', overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              display: 'flex', flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
              padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>📋</span>
                <div>
                  <span style={{ fontWeight: 800, color: 'white', fontSize: '15px', display: 'block' }}>議事録一覧</span>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>{meetingListMemberName}</span>
                </div>
              </div>
              <button
                onClick={() => setShowMeetingList(false)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: '18px', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >×</button>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
              {meetingNotes.filter(n => n.memberId === meetingListMemberId).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: '13px' }}>議事録はまだありません</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {meetingNotes.filter(n => n.memberId === meetingListMemberId).map((note) => (
                    <div key={note.id} style={{
                      background: '#f9fafb', borderRadius: '12px', padding: '12px',
                      border: '1px solid #f3f4f6',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>{note.title}</span>
                        <button
                          onClick={() => deleteMeetingNote(note.id)}
                          style={{ marginLeft: 'auto', fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
                        >🗑</button>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '10px', color: '#9ca3af' }}>{note.date}</span>
                        <span style={{ fontSize: '10px', color: '#6b7280' }}>担当: {note.staffName}</span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#374151', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{note.content}</p>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => {
                  setShowMeetingList(false)
                  openMeetingModal(meetingListMemberId, meetingListMemberName)
                }}
                style={{
                  width: '100%', marginTop: '12px',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                  color: 'white', fontWeight: 800, padding: '12px', borderRadius: '12px',
                  fontSize: '14px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >📝 新しい議事録を追加</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
