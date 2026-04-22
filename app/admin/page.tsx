'use client'

import Link from 'next/link'
import { apiFetch } from '@/lib/api'
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
  targetMember: string       // 会員ID or '__all__' (全員向け)
  targetMemberName?: string  // 会員名 (表示用)
  category: string           // 食事 / 体組成 / トレーニング / 全般
  comment: string
}

interface StaffMember {
  id: string
  name: string
  role: string
  active?: boolean
}

interface MealEntry {
  mealType: string
  items: { name: string; kcal: number; protein: number; fat: number; carbs: number }[]
  totalKcal: number
  totalProtein: number
  totalFat: number
  totalCarbs: number
  time: string
  updatedAt: string
}

interface FeedItem {
  id: string
  memberId: string
  memberName: string
  memberEmail: string
  date: string
  meals: MealEntry[]
  dayTotalKcal: number
  dayTotalProtein: number
  dayTotalFat: number
  dayTotalCarbs: number
  latestUpdatedAt: string
  mealCount: number
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

interface BodyFeedItem {
  id: string
  memberId: string
  memberName: string
  memberEmail: string
  date: string
  weight: number
  bodyFat: number
  muscle: number
  bmi: number
  updatedAt: string
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
  const [staffList, setStaffList] = useState<StaffMember[]>([])
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

  // 体組成フィード
  const [bodyFeedRange, setBodyFeedRange] = useState<FeedRange>('week')
  const [bodyFeed, setBodyFeed] = useState<BodyFeedItem[]>([])
  const [bodyFeedLoading, setBodyFeedLoading] = useState(true)
  const [bodyFeedDropdownOpen, setBodyFeedDropdownOpen] = useState(false)

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

  // ガチャテスト
  const [members, setMembers] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [isSpinning, setIsSpinning] = useState(false)
  const [gachaResult, setGachaResult] = useState<{ prize: string; rarity: string; icon: string } | null>(null)
  const [gachaError, setGachaError] = useState('')
  const [selectedPoints, setSelectedPoints] = useState<number | null>(null)
  const [addingPoints, setAddingPoints] = useState(false)
  const [pointsMessage, setPointsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showGachaModal, setShowGachaModal] = useState(false)

  useEffect(() => {
    apiFetch('/api/admin/stats')
      .then((r) => r.json())
      .then((data: Stats) => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))

    setComments(loadComments())
    setMeetingNotes(loadMeetingNotes())

    // スタッフ一覧を読み込み（Supabase API）
    apiFetch('/api/staff')
      .then(r => r.ok ? r.json() : [])
      .then((parsed: StaffMember[]) => {
        const activeStaff = parsed.filter(s => s.active !== false)
        setStaffList(activeStaff)
        if (activeStaff.length > 0) {
          setCommentStaff(activeStaff[0].name)
          setMeetingStaff(activeStaff[0].name)
        }
      })
      .catch(() => {})

    // 会員リストを取得（ガチャテスト・ポイント付与の対象選択用）
    apiFetch('/api/admin/members')
      .then(r => r.ok ? r.json() : { members: [] })
      .then((d: { members: Array<{ id: string; name: string; email: string }> }) => {
        const list = d.members || []
        setMembers(list)
        // 梅さん(masayuki.umehara0207@gmail.com)を優先選択、なければ先頭
        const ume = list.find(m => m.email?.toLowerCase() === 'masayuki.umehara0207@gmail.com')
        if (ume) setSelectedMemberId(ume.id)
        else if (list.length > 0) setSelectedMemberId(list[0].id)
      })
      .catch(() => {})
  }, [])

  // 選択中メンバーのポイント取得
  useEffect(() => {
    if (!selectedMemberId) { setSelectedPoints(null); return }
    apiFetch(`/api/user-points?userId=${selectedMemberId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setSelectedPoints(d.total_points ?? 0) })
      .catch(() => {})
  }, [selectedMemberId])

  // 選択中メンバーに100ポイント追加（テスト用）
  const add100Points = async () => {
    if (!selectedMemberId || addingPoints) return
    setAddingPoints(true)
    setPointsMessage(null)
    try {
      const getRes = await apiFetch(`/api/user-points?userId=${selectedMemberId}`)
      if (!getRes.ok) {
        const errText = await getRes.text().catch(() => '')
        setPointsMessage({ type: 'error', text: `取得失敗: ${getRes.status} ${errText.slice(0, 80)}` })
        return
      }
      const cur = await getRes.json()
      const newTotal = (cur.total_points ?? 0) + 100
      const res = await apiFetch('/api/user-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedMemberId,
          action: 'save',
          totalPoints: newTotal,
          lotteryCount: cur.lottery_count ?? 0,
          records: cur.records ?? [],
          lotteryHistory: cur.lottery_history ?? [],
        }),
      })
      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        setPointsMessage({ type: 'error', text: `保存失敗: ${res.status} ${errText.slice(0, 80)}` })
        return
      }
      const data = await res.json()
      const finalPoints = data.total_points ?? newTotal
      setSelectedPoints(finalPoints)
      setPointsMessage({ type: 'success', text: `✅ 100pt追加しました（合計 ${finalPoints}pt）` })
      setTimeout(() => setPointsMessage(null), 4000)
    } catch (e) {
      setPointsMessage({ type: 'error', text: `エラー: ${String(e).slice(0, 80)}` })
    } finally {
      setAddingPoints(false)
    }
  }

  // ガチャを回す（テスト用・ポイント消費なし）
  const spinTestGacha = async () => {
    if (!selectedMemberId || isSpinning) return
    setIsSpinning(true)
    setGachaError('')
    setGachaResult(null)
    setShowGachaModal(true) // 先にモーダルを開いて演出開始
    try {
      const [res] = await Promise.all([
        apiFetch('/api/user-points', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: selectedMemberId, action: 'testLottery' }),
        }),
        new Promise(r => setTimeout(r, 2000)), // 抽選演出（2秒）
      ])
      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        setGachaError(`抽選に失敗しました: ${res.status} ${errText.slice(0, 100)}`)
      } else {
        const data = await res.json()
        if (data.lotteryResult) {
          setGachaResult({
            prize: data.lotteryResult.prize,
            rarity: data.lotteryResult.rarity,
            icon: data.lotteryResult.icon,
          })
        } else {
          setGachaError('抽選結果が返ってきませんでした')
        }
      }
    } catch (e) {
      setGachaError(`エラーが発生しました: ${String(e).slice(0, 100)}`)
    } finally {
      setIsSpinning(false)
    }
  }

  const closeGachaModal = () => {
    setShowGachaModal(false)
    setTimeout(() => {
      setGachaResult(null)
      setGachaError('')
    }, 300)
  }

  // 食事フィード取得
  useEffect(() => {
    setFeedLoading(true)
    apiFetch(`/api/admin/meal-feed?range=${feedRange}`)
      .then((r) => r.json())
      .then((data: { feed: FeedItem[] }) => {
        setFeed(data.feed || [])
        setFeedLoading(false)
      })
      .catch(() => {
        setFeed([])
        setFeedLoading(false)
      })
  }, [feedRange])

  // 体組成フィード取得
  useEffect(() => {
    setBodyFeedLoading(true)
    apiFetch(`/api/admin/body-feed?range=${bodyFeedRange}`)
      .then((r) => r.json())
      .then((data: { feed: BodyFeedItem[] }) => {
        setBodyFeed(data.feed || [])
        setBodyFeedLoading(false)
      })
      .catch(() => {
        setBodyFeed([])
        setBodyFeedLoading(false)
      })
  }, [bodyFeedRange])

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
      targetMemberName: commentTarget === '__all__' ? '全員' : (commentTargetName || commentTarget),
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
    { label: '会員管理', icon: '🗂', color: '#16a34a', bg: '#f0fdf4', href: '/admin/members' },
    { label: '予約カレンダー', icon: '📅', color: '#0ea5e9', bg: '#f0f9ff', href: '/admin/calendar' },
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
          <a
            href="https://lin.ee/yIdLnsI"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '10px', background: '#e8faf0', color: '#06C755', fontWeight: 700, fontSize: '12px', textDecoration: 'none', border: '1px solid #06C75522', gridColumn: '1 / -1' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#06C755"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
            LINEを開く（会員からの相談確認）
          </a>
        </div>
      </div>

      {/* ========== ガチャテスト ========== */}
      <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span style={{ fontSize: '18px' }}>🎰</span>
          <span style={{ fontWeight: 800, color: 'white', fontSize: '14px' }}>ガチャテスト</span>
          {selectedPoints !== null && (
            <span style={{
              marginLeft: 'auto',
              background: 'rgba(255,255,255,0.25)', color: 'white',
              fontSize: '12px', fontWeight: 800, padding: '3px 10px', borderRadius: '10px',
            }}>
              💰 {selectedPoints}pt
            </span>
          )}
        </div>

        {/* 対象メンバー選択 */}
        <div style={{ padding: '12px 16px 0' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '4px', display: 'block' }}>
            対象メンバー
          </label>
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            style={{
              width: '100%', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '10px',
              padding: '8px 12px', fontSize: '13px', outline: 'none', fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          >
            {members.length === 0 && <option value="">読み込み中...</option>}
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name}（{m.email}）</option>
            ))}
          </select>
        </div>

        {/* ポイント追加ボタン */}
        <div style={{ padding: '12px 16px 0', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={add100Points}
            disabled={!selectedMemberId || addingPoints}
            style={{
              background: addingPoints ? '#d1d5db' : '#fef3c7',
              color: '#d97706', fontWeight: 700, padding: '8px 14px', borderRadius: '8px',
              fontSize: '12px', border: '1px solid #f59e0b44',
              cursor: (!selectedMemberId || addingPoints) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {addingPoints ? '追加中...' : '➕ 100ポイント追加'}
          </button>
          {pointsMessage && (
            <span style={{
              fontSize: '12px', fontWeight: 700,
              color: pointsMessage.type === 'success' ? '#16a34a' : '#ef4444',
              background: pointsMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
              padding: '6px 10px', borderRadius: '8px',
              border: `1px solid ${pointsMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            }}>
              {pointsMessage.text}
            </span>
          )}
        </div>
        <div style={{ padding: '20px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '12px', opacity: 0.3 }}>🎁</div>
          <button
            onClick={spinTestGacha}
            disabled={!selectedMemberId || isSpinning}
            style={{
              background: isSpinning ? '#d1d5db' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white', fontWeight: 800, padding: '14px 28px', borderRadius: '12px',
              fontSize: '15px', border: 'none',
              cursor: (!selectedMemberId || isSpinning) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {isSpinning ? '🎰 抽選中...' : '🎰 ガチャを回す'}
          </button>
          <p style={{ fontSize: '10px', color: '#9ca3af', marginTop: '8px' }}>
            ※ テスト用ボタン。ポイントは消費されませんが、選択中メンバーの抽選履歴には記録されます。
          </p>
        </div>
      </div>

      {/* ========== ガチャ結果モーダル（全画面） ========== */}
      {showGachaModal && (() => {
        const isWin = gachaResult && gachaResult.rarity !== 'miss'
        const isMiss = gachaResult && gachaResult.rarity === 'miss'
        const rarityLabel =
          gachaResult?.rarity === 'common' ? 'COMMON'
          : gachaResult?.rarity === 'rare' ? 'RARE'
          : gachaResult?.rarity === 'super_rare' ? 'SUPER RARE'
          : gachaResult?.rarity === 'ultra_rare' ? 'ULTRA RARE'
          : ''
        const rarityColor =
          gachaResult?.rarity === 'common' ? '#f59e0b'
          : gachaResult?.rarity === 'rare' ? '#3b82f6'
          : gachaResult?.rarity === 'super_rare' ? '#ec4899'
          : gachaResult?.rarity === 'ultra_rare' ? '#a855f7'
          : '#9ca3af'
        const bgGradient =
          isSpinning ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
          : isMiss ? 'linear-gradient(135deg, #4b5563 0%, #1f2937 100%)'
          : gachaResult?.rarity === 'common' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
          : gachaResult?.rarity === 'rare' ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
          : gachaResult?.rarity === 'super_rare' ? 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)'
          : gachaResult?.rarity === 'ultra_rare' ? 'linear-gradient(135deg, #a855f7 0%, #6b21a8 100%)'
          : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'

        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: bgGradient,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '20px',
            animation: 'gachaFadeIn 0.3s ease-out',
          }}>
            <style>{`
              @keyframes gachaFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes gachaSpin {
                0% { transform: rotate(0deg) scale(1); }
                50% { transform: rotate(180deg) scale(1.1); }
                100% { transform: rotate(360deg) scale(1); }
              }
              @keyframes gachaPop {
                0% { transform: scale(0.3); opacity: 0; }
                60% { transform: scale(1.2); opacity: 1; }
                100% { transform: scale(1); opacity: 1; }
              }
              @keyframes gachaShake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-8px); }
                75% { transform: translateX(8px); }
              }
              @keyframes gachaPulse {
                0%, 100% { transform: scale(1); opacity: 0.8; }
                50% { transform: scale(1.05); opacity: 1; }
              }
              @keyframes sparkle {
                0%, 100% { transform: scale(0) rotate(0deg); opacity: 0; }
                50% { transform: scale(1) rotate(180deg); opacity: 1; }
              }
            `}</style>

            {isSpinning && (
              <>
                <div style={{
                  fontSize: '140px',
                  animation: 'gachaSpin 0.8s ease-in-out infinite',
                  marginBottom: '24px',
                }}>🎰</div>
                <div style={{
                  color: 'white', fontSize: '24px', fontWeight: 900,
                  letterSpacing: '4px',
                  animation: 'gachaPulse 1s ease-in-out infinite',
                }}>
                  抽選中...
                </div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginTop: '16px' }}>
                  結果が出るまでしばらくお待ちください
                </div>
              </>
            )}

            {!isSpinning && gachaError && (
              <>
                <div style={{ fontSize: '80px', marginBottom: '16px' }}>⚠️</div>
                <div style={{ color: 'white', fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>
                  エラーが発生しました
                </div>
                <div style={{
                  color: 'rgba(255,255,255,0.8)', fontSize: '13px',
                  background: 'rgba(0,0,0,0.3)', padding: '12px 20px', borderRadius: '10px',
                  maxWidth: '400px', textAlign: 'center', marginBottom: '24px',
                }}>
                  {gachaError}
                </div>
                <button onClick={closeGachaModal} style={{
                  background: 'white', color: '#1f2937', fontWeight: 800,
                  padding: '12px 32px', borderRadius: '12px', border: 'none',
                  fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  閉じる
                </button>
              </>
            )}

            {!isSpinning && !gachaError && gachaResult && (
              <>
                {/* 判定バナー */}
                <div style={{
                  fontSize: isWin ? '72px' : '56px',
                  fontWeight: 900,
                  color: 'white',
                  letterSpacing: isWin ? '8px' : '6px',
                  textShadow: isWin
                    ? '0 0 40px rgba(255,255,255,0.8), 0 4px 12px rgba(0,0,0,0.3)'
                    : '0 4px 12px rgba(0,0,0,0.3)',
                  marginBottom: '32px',
                  animation: isWin ? 'gachaPop 0.6s ease-out' : 'gachaShake 0.4s ease-in-out',
                }}>
                  {isWin ? '🎉 当たり 🎉' : '外れ'}
                </div>

                {/* 景品カード */}
                <div style={{
                  background: 'white',
                  borderRadius: '24px',
                  padding: '32px 40px',
                  minWidth: '280px',
                  maxWidth: '400px',
                  textAlign: 'center',
                  boxShadow: isWin
                    ? `0 0 60px ${rarityColor}88, 0 10px 40px rgba(0,0,0,0.3)`
                    : '0 10px 40px rgba(0,0,0,0.3)',
                  animation: 'gachaPop 0.6s ease-out 0.1s both',
                  position: 'relative',
                }}>
                  {/* レアリティバッジ */}
                  {isWin && rarityLabel && (
                    <div style={{
                      position: 'absolute', top: '-14px', left: '50%',
                      transform: 'translateX(-50%)',
                      background: rarityColor, color: 'white',
                      fontSize: '12px', fontWeight: 900,
                      padding: '6px 16px', borderRadius: '20px',
                      letterSpacing: '2px',
                      boxShadow: `0 4px 12px ${rarityColor}88`,
                    }}>
                      ★ {rarityLabel} ★
                    </div>
                  )}

                  <div style={{ fontSize: '100px', marginBottom: '12px', lineHeight: 1 }}>
                    {gachaResult.icon}
                  </div>

                  <div style={{
                    fontSize: '11px', fontWeight: 700, color: '#6b7280',
                    letterSpacing: '2px', marginBottom: '4px',
                  }}>
                    {isWin ? 'GET!' : 'SORRY'}
                  </div>

                  <div style={{
                    fontSize: '24px', fontWeight: 900,
                    color: isWin ? '#1f2937' : '#6b7280',
                    lineHeight: 1.3,
                  }}>
                    {gachaResult.prize}
                  </div>

                  {isMiss && (
                    <div style={{
                      fontSize: '12px', color: '#9ca3af', marginTop: '12px',
                    }}>
                      また挑戦してください 🙏
                    </div>
                  )}
                </div>

                {/* アクションボタン */}
                <div style={{
                  display: 'flex', gap: '12px', marginTop: '32px',
                  animation: 'gachaPop 0.6s ease-out 0.4s both',
                }}>
                  <button onClick={closeGachaModal} style={{
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white', fontWeight: 800,
                    padding: '12px 24px', borderRadius: '12px',
                    border: '1.5px solid rgba(255,255,255,0.4)',
                    fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
                    backdropFilter: 'blur(8px)',
                  }}>
                    閉じる
                  </button>
                  <button onClick={() => { closeGachaModal(); setTimeout(() => spinTestGacha(), 350) }} style={{
                    background: 'white', color: '#1f2937', fontWeight: 800,
                    padding: '12px 28px', borderRadius: '12px', border: 'none',
                    fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  }}>
                    🔄 もう一度回す
                  </button>
                </div>
              </>
            )}
          </div>
        )
      })()}

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
                  }}>{groupedFeed[dateStr].length}名</span>
                </div>

                {/* 会員カード（会員ごとにまとめ） */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {groupedFeed[dateStr].map((item) => {
                    const memberNotes = meetingNotes.filter(n => n.memberId === item.memberId)
                    return (
                      <div key={item.id} style={{
                        background: '#f9fafb', borderRadius: '12px', padding: '12px',
                        border: '1px solid #f3f4f6',
                      }}>
                        {/* ヘッダー: メンバー名 + 食数 + 最終更新時刻 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                          <span style={{
                            background: '#2563eb', color: 'white', fontSize: '11px',
                            fontWeight: 800, padding: '3px 10px', borderRadius: '6px',
                          }}>{item.memberName}</span>
                          <span style={{
                            background: '#f0fdf4', color: '#16a34a', fontSize: '10px',
                            fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                          }}>{item.mealCount}食記録</span>
                          <span style={{ fontSize: '10px', color: '#9ca3af', marginLeft: 'auto' }}>
                            最終更新 {item.latestUpdatedAt ? new Date(item.latestUpdatedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }) : ''}
                          </span>
                        </div>

                        {/* 各食事エントリ */}
                        {item.meals.map((meal, mealIdx) => {
                          const mt = mealTypeColors[meal.mealType] || mealTypeColors['間食']
                          return (
                            <div key={mealIdx} style={{
                              background: 'white', borderRadius: '8px', padding: '8px 10px',
                              marginBottom: '6px', border: '1px solid #f3f4f6',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <span style={{
                                  background: mt.bg, color: mt.color, fontSize: '10px',
                                  fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                                  border: `1px solid ${mt.color}22`,
                                }}>{mt.icon} {meal.mealType}</span>
                                <span style={{ fontSize: '10px', color: '#9ca3af' }}>{meal.time}</span>
                                <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: 700, marginLeft: 'auto' }}>{Math.round(meal.totalKcal)}kcal</span>
                                <span style={{ fontSize: '10px', color: '#2563eb', fontWeight: 700 }}>P{Math.round(meal.totalProtein)}g</span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                {meal.items.map(f => f.name).join('、')}
                              </div>
                            </div>
                          )
                        })}

                        {/* 日計合計 */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '8px 10px', background: '#eff6ff', borderRadius: '8px',
                          marginTop: '4px', marginBottom: '8px',
                        }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#1e40af' }}>1日合計</span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>{Math.round(item.dayTotalKcal)}kcal</span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb' }}>P{Math.round(item.dayTotalProtein)}g</span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#ea580c' }}>F{Math.round(item.dayTotalFat)}g</span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed' }}>C{Math.round(item.dayTotalCarbs)}g</span>
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
                            href={`/admin/members/detail?id=${item.memberId}&tab=meals`}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '4px',
                              padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                              background: '#fff7ed', color: '#ea580c', border: '1px solid #ea580c22',
                              textDecoration: 'none',
                            }}
                          >🍽️ 食事記録を見る</Link>

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

      {/* ========== 体組成更新フィード ========== */}
      <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {/* ヘッダー */}
        <div style={{
          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          padding: '14px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📊</span>
            <span style={{ fontWeight: 800, color: 'white', fontSize: '14px' }}>体組成フィード</span>
            <span style={{
              background: 'rgba(255,255,255,0.25)', color: 'white', fontSize: '11px',
              fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
            }}>{bodyFeed.length}件</span>
          </div>

          {/* フィルタードロップダウン */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setBodyFeedDropdownOpen(!bodyFeedDropdownOpen)}
              style={{
                background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
                color: 'white', fontWeight: 700, fontSize: '12px', padding: '6px 12px',
                borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              {rangeLabels[bodyFeedRange]}
              <span style={{ fontSize: '10px' }}>▼</span>
            </button>
            {bodyFeedDropdownOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                background: 'white', borderRadius: '10px', overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 100, minWidth: '140px',
              }}>
                {(Object.keys(rangeLabels) as FeedRange[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => { setBodyFeedRange(key); setBodyFeedDropdownOpen(false) }}
                    style={{
                      display: 'block', width: '100%', padding: '10px 14px', border: 'none',
                      background: bodyFeedRange === key ? '#fef2f2' : 'white',
                      color: bodyFeedRange === key ? '#dc2626' : '#374151',
                      fontWeight: bodyFeedRange === key ? 700 : 400,
                      fontSize: '13px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    }}
                  >{rangeLabels[key]}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* フィード本体 */}
        <div style={{ padding: '12px 16px', maxHeight: '500px', overflowY: 'auto' }}>
          {bodyFeedLoading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: '13px' }}>読み込み中...</div>
          ) : bodyFeed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: '13px' }}>この期間の体組成更新はありません</div>
          ) : (
            (() => {
              // 日付ごとにグループ化
              const bodyGrouped: Record<string, BodyFeedItem[]> = {}
              for (const item of bodyFeed) {
                if (!bodyGrouped[item.date]) bodyGrouped[item.date] = []
                bodyGrouped[item.date].push(item)
              }
              const bodySortedDates = Object.keys(bodyGrouped).sort((a, b) => b.localeCompare(a))

              return bodySortedDates.map((dateStr) => (
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
                    }}>{bodyGrouped[dateStr].length}名</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {bodyGrouped[dateStr].map((item) => (
                      <div key={item.id} style={{
                        background: '#f9fafb', borderRadius: '12px', padding: '12px',
                        border: '1px solid #f3f4f6',
                      }}>
                        {/* メンバー名 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                          <span style={{
                            background: '#dc2626', color: 'white', fontSize: '11px',
                            fontWeight: 800, padding: '3px 10px', borderRadius: '6px',
                          }}>{item.memberName}</span>
                          <span style={{ fontSize: '10px', color: '#9ca3af', marginLeft: 'auto' }}>
                            {item.updatedAt ? new Date(item.updatedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }) : ''}
                          </span>
                        </div>

                        {/* 体組成データ */}
                        <div style={{
                          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px',
                          marginBottom: '8px',
                        }}>
                          <div style={{ background: 'white', borderRadius: '8px', padding: '8px 10px', border: '1px solid #f3f4f6', textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>⚖️ 体重</div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#1e40af' }}>{item.weight}<span style={{ fontSize: '11px', fontWeight: 600 }}>kg</span></div>
                          </div>
                          <div style={{ background: 'white', borderRadius: '8px', padding: '8px 10px', border: '1px solid #f3f4f6', textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>📉 体脂肪率</div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#ea580c' }}>{item.bodyFat}<span style={{ fontSize: '11px', fontWeight: 600 }}>%</span></div>
                          </div>
                          <div style={{ background: 'white', borderRadius: '8px', padding: '8px 10px', border: '1px solid #f3f4f6', textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>💪 筋肉量</div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#16a34a' }}>{item.muscle}<span style={{ fontSize: '11px', fontWeight: 600 }}>kg</span></div>
                          </div>
                          <div style={{ background: 'white', borderRadius: '8px', padding: '8px 10px', border: '1px solid #f3f4f6', textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>📊 BMI</div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#7c3aed' }}>{item.bmi}</div>
                          </div>
                        </div>

                        {/* アクション */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => openCommentForMember(item.memberId, item.memberName)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '4px',
                              padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                              background: '#fef2f2', color: '#dc2626', border: '1px solid #dc262622',
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
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            })()
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
              const targetName = c.targetMember === '__all__'
                ? '全員'
                : (c.targetMemberName || c.targetMember)
              return (
                <div key={c.id} style={{ background: '#f9fafb', borderRadius: '10px', padding: '10px 12px', border: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, color: cat.color, background: cat.bg,
                      padding: '2px 8px', borderRadius: '6px',
                    }}>{cat.icon} {c.category}</span>
                    <span style={{ fontSize: '10px', color: '#9ca3af' }}>{c.date}</span>
                    <button
                      onClick={() => deleteComment(c.id)}
                      style={{ marginLeft: 'auto', fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
                    >🗑</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', padding: '2px 8px', borderRadius: '6px' }}>
                      👤 {c.staffName}
                    </span>
                    <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700 }}>→</span>
                    <span style={{
                      fontSize: '10px', fontWeight: 700,
                      color: c.targetMember === '__all__' ? '#a16207' : '#15803d',
                      background: c.targetMember === '__all__' ? '#fef9c3' : '#dcfce7',
                      padding: '2px 8px', borderRadius: '6px',
                    }}>
                      {c.targetMember === '__all__' ? '📢 全員' : `🎯 ${targetName}`}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#374151', margin: 0, lineHeight: 1.6 }}>{c.comment}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
              {/* 送信者（スタッフ） */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>送信者（担当者）</label>
                {staffList.length > 0 ? (
                  <select
                    value={commentStaff}
                    onChange={(e) => setCommentStaff(e.target.value)}
                    style={{
                      width: '100%', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '10px',
                      padding: '10px 14px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                      appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3e%3cpath fill=\'%236b7280\' d=\'M6 9L1 4h10z\'/%3e%3c/svg%3e")',
                      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: '36px',
                    }}
                  >
                    {staffList.map(s => (
                      <option key={s.id} value={s.name}>{s.name}（{s.role}）</option>
                    ))}
                  </select>
                ) : (
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
                )}
                {staffList.length === 0 && (
                  <p style={{ fontSize: '10px', color: '#9ca3af', margin: '4px 0 0' }}>※ スタッフ管理でスタッフを登録すると選択式になります</p>
                )}
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
                {staffList.length > 0 ? (
                  <select
                    value={meetingStaff}
                    onChange={(e) => setMeetingStaff(e.target.value)}
                    style={{
                      width: '100%', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '10px',
                      padding: '10px 14px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                      appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3e%3cpath fill=\'%236b7280\' d=\'M6 9L1 4h10z\'/%3e%3c/svg%3e")',
                      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: '36px',
                    }}
                  >
                    {staffList.map(s => (
                      <option key={s.id} value={s.name}>{s.name}（{s.role}）</option>
                    ))}
                  </select>
                ) : (
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
                )}
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
