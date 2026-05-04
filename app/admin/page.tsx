'use client'

import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import { useState, useEffect } from 'react'

interface Stats {
  totalMembers: number
  trialing: number
  active: number
  pastDue?: number
  unsubscribed?: number
  freeAccount?: number
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

const MEETING_NOTES_KEY = 'meeting_notes_v1'

// ★修正: コメントは localStorage ではなく /api/admin/comments（DB）を真実源にする。
// 以前は localStorage にしか保存されず、会員ダッシュボードに届かないバグがあった。

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

  // 課金中ユーザー一覧（Stripe）
  interface BillingItem {
    subscriptionId: string
    status: string
    cancelAtPeriodEnd: boolean
    currentPeriodEnd: string | null
    createdAt: string | null
    amount: number
    currency: string
    interval: string
    customer: { id: string; email: string; stripeName: string; appName: string; appUserId: string | null; appPlanId: string | null }
  }
  const [billing, setBilling] = useState<BillingItem[] | null>(null)
  const [billingTotal, setBillingTotal] = useState(0)
  const [billingError, setBillingError] = useState('')

  // 返金 + 即時削除（危険操作）
  const [dangerEmail, setDangerEmail] = useState('')
  const [dangerPassword, setDangerPassword] = useState('')
  const [dangerRunning, setDangerRunning] = useState(false)
  const [dangerResult, setDangerResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleRefundAndDelete = async () => {
    const email = dangerEmail.trim()
    if (!email) {
      setDangerResult({ type: 'error', text: 'メールアドレスを入力してください' })
      return
    }
    if (!dangerPassword) {
      setDangerResult({ type: 'error', text: '追加パスワードを入力してください' })
      return
    }
    const confirmed = window.confirm(
      `【警告】${email} のアカウントを以下の通り処理します。\n\n` +
      '・Stripe: 最新の支払いを全額返金\n' +
      '・Stripe: サブスクを即時キャンセル\n' +
      '・Stripe: Customer を削除\n' +
      '・Supabase: 食事 / 体組成 / 予約 / ポイント / 目標 / コメント / プロフィール / Auth を削除\n\n' +
      'この操作は取り消せません。本当に実行しますか？'
    )
    if (!confirmed) return

    setDangerRunning(true)
    setDangerResult(null)
    try {
      const res = await apiFetch('/api/admin/refund-and-delete', {
        method: 'POST',
        body: JSON.stringify({ email, password: dangerPassword }),
      })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        const msg = data?.error || (data?.errors && data.errors.join(' / ')) || `HTTP ${res.status}`
        setDangerResult({ type: 'error', text: `失敗: ${msg}` })
      } else {
        const amt = data?.steps?.refund?.amount ?? 0
        const cnt = data?.steps?.refund?.count ?? 0
        setDangerResult({
          type: 'success',
          text: `完了: 返金 ¥${amt.toLocaleString()} (${cnt}件) / サブスク解約=${data?.steps?.subscriptionCancelled ? 'OK' : '-'} / Customer削除=${data?.steps?.customerDeleted ? 'OK' : '-'} / Auth削除=${data?.steps?.authDeleted ? 'OK' : '-'}`,
        })
        setDangerEmail('')
        setDangerPassword('')
      }
    } catch (e) {
      setDangerResult({ type: 'error', text: `通信エラー: ${String(e)}` })
    } finally {
      setDangerRunning(false)
    }
  }

  useEffect(() => {
    apiFetch('/api/admin/stats')
      .then((r) => r.json())
      .then((data: Stats) => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))

    // Stripe 課金中ユーザー
    apiFetch('/api/admin/billing-list')
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((d: { list: BillingItem[]; totalMonthlyJpy: number }) => {
        setBilling(d.list || [])
        setBillingTotal(d.totalMonthlyJpy || 0)
      })
      .catch((e) => { setBilling([]); setBillingError(String(e)) })

    // 管理栄養士コメントを DB から取得（管理者は全件）
    apiFetch('/api/admin/comments')
      .then(r => r.ok ? r.json() : [])
      .then((rows: any[]) => {
        const mapped: NutritionistComment[] = (rows || []).map(r => ({
          id: String(r.id),
          date: r.created_at
            ? new Date(r.created_at).toLocaleString('sv-SE', { timeZone: 'Asia/Tokyo' }).slice(0, 16)
            : '',
          staffName: r.staff_name || '管理栄養士',
          targetMember: r.target_member_id || '',
          targetMemberName: '',
          category: r.category || '全般',
          comment: r.comment || '',
        }))
        setComments(mapped)
      })
      .catch(() => setComments([]))

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
      // atomic な加算API（records/lottery_historyには一切触らない）
      const res = await apiFetch('/api/user-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedMemberId,
          action: 'adminAddPoints',
          amount: 100,
        }),
      })
      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        setPointsMessage({ type: 'error', text: `保存失敗: ${res.status} ${errText.slice(0, 80)}` })
        return
      }
      const data = await res.json()
      const finalPoints = data.total_points ?? 0
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

  const handleSendComment = async () => {
    if (!commentText.trim()) return

    // 送信対象の会員IDリストを決める
    const targetIds: string[] = commentTarget === '__all__'
      ? members.map(m => m.id)
      : [commentTarget]

    if (targetIds.length === 0 || targetIds.some(id => !id)) {
      alert('送信対象が見つかりません')
      return
    }

    const staffName = commentStaff || '管理栄養士'
    const category = commentCategory
    const commentBody = commentText.trim()

    try {
      // 各会員分の POST を並列実行（DB に実際に保存される）
      const results = await Promise.all(
        targetIds.map(memberId =>
          apiFetch('/api/admin/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ memberId, staffName, category, comment: commentBody }),
          }).then(r => r.ok ? r.json() : null).catch(() => null)
        )
      )

      // 新規分を state に反映（サーバの id / created_at を優先）
      const newRows: NutritionistComment[] = results
        .filter((r): r is any => r && r.id)
        .map(r => ({
          id: String(r.id),
          date: r.created_at
            ? new Date(r.created_at).toLocaleString('sv-SE', { timeZone: 'Asia/Tokyo' }).slice(0, 16)
            : '',
          staffName: r.staff_name || staffName,
          targetMember: r.target_member_id || '',
          targetMemberName: '',
          category: r.category || category,
          comment: r.comment || commentBody,
        }))

      setComments([...newRows, ...comments])
      setCommentText('')
      setCommentSaved(true)
      setTimeout(() => { setCommentSaved(false); setShowCommentModal(false) }, 1500)
    } catch {
      alert('コメントの送信に失敗しました')
    }
  }

  const deleteComment = async (id: string) => {
    if (!confirm('このコメントを削除しますか？')) return
    try {
      const res = await apiFetch(`/api/admin/comments?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) {
        alert('コメントの削除に失敗しました')
        return
      }
      setComments(comments.filter(c => c.id !== id))
    } catch {
      alert('コメントの削除に失敗しました')
    }
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

      {/* 会員数サマリー（profilesベースの実数） */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '10px' }}>
        {card('👥', '総会員数', fmt(stats?.totalMembers), '#2563eb')}
        {card('📅', `${monthLabel}新規登録`, fmt(stats?.newThisMonth), '#8b5cf6')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '10px' }}>
        {card('🆓', 'トライアル中', fmt(stats?.trialing), '#f59e0b')}
        {card('✅', 'アクティブ会員', fmt(stats?.active), '#16a34a')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
        {card('⚠️', '決済失敗中', fmt(stats?.pastDue), '#ef4444')}
        {card('🚫', '未契約', fmt(stats?.unsubscribed), '#9ca3af')}
        {card('🎟️', '無料アカウント', fmt(stats?.freeAccount), '#a855f7')}
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
          <span style={{
            fontFamily: 'serif', fontSize: '11px', fontWeight: 800,
            color: 'rgba(255,255,255,0.85)', letterSpacing: '4px',
            paddingLeft: '4px',
          }}>PRIZE DRAW TEST</span>
          <span style={{ fontWeight: 900, color: 'white', fontSize: '14px', letterSpacing: '3px' }}>ガチャテスト</span>
          {selectedPoints !== null && (
            <span style={{
              marginLeft: 'auto',
              background: 'rgba(255,255,255,0.25)', color: 'white',
              fontSize: '12px', fontWeight: 800, padding: '3px 10px', borderRadius: '10px',
              letterSpacing: '1px',
            }}>
              {selectedPoints} pt
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
            {addingPoints ? '追加中...' : '100ポイント追加'}
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
          <div style={{
            fontFamily: '"Noto Serif JP", "Hiragino Mincho ProN", "游明朝", serif',
            fontSize: '34px', fontWeight: 900, color: '#111827',
            letterSpacing: '10px', marginBottom: '14px',
            background: 'linear-gradient(180deg, #fef3c7 0%, #d97706 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            opacity: 0.7,
          }}>
            賞品抽選
          </div>
          <button
            onClick={spinTestGacha}
            disabled={!selectedMemberId || isSpinning}
            style={{
              background: isSpinning ? '#d1d5db' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white', fontWeight: 800, padding: '14px 28px', borderRadius: '12px',
              fontSize: '15px', border: 'none', letterSpacing: '2px',
              cursor: (!selectedMemberId || isSpinning) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {isSpinning ? '抽選中...' : 'ガチャを回す'}
          </button>
          <p style={{ fontSize: '10px', color: '#9ca3af', marginTop: '8px' }}>
            ※ テスト用ボタン。ポイント消費なし＆抽選履歴にも残りません（DB未書き込み）。
          </p>
        </div>
      </div>

      {/* ========== ガチャ結果モーダル（全画面） ========== */}
      {showGachaModal && (() => {
        const isWin = !!gachaResult && gachaResult.rarity !== 'miss'
        const isMiss = !!gachaResult && gachaResult.rarity === 'miss'
        const isLegendary = gachaResult?.rarity === 'legendary'
        const isUltra = gachaResult?.rarity === 'ultra_rare'
        const isSuper = gachaResult?.rarity === 'super_rare'
        const rarityLabel =
          isLegendary ? 'LEGENDARY'
          : isUltra ? 'ULTRA RARE'
          : isSuper ? 'SUPER RARE'
          : ''
        // 当たり背景：漆黒ベースに rarity 別のアクセント光
        const winBg = isLegendary
          ? 'radial-gradient(ellipse at center, #2a0f3d 0%, #0a0418 55%, #000 100%)'
          : isUltra
          ? 'radial-gradient(ellipse at center, #3b2412 0%, #1a0f07 55%, #000 100%)'
          : 'radial-gradient(ellipse at center, #3a1430 0%, #150810 55%, #000 100%)'
        const loseBg = 'linear-gradient(180deg, #1f2937 0%, #0f172a 60%, #0b1018 100%)'
        const spinBg = 'radial-gradient(ellipse at center, #1e293b 0%, #0a0f1a 100%)'
        const accentGold = isLegendary
          ? 'linear-gradient(135deg, #60a5fa 0%, #a855f7 25%, #ec4899 50%, #f59e0b 75%, #60a5fa 100%)'
          : isSuper
          ? 'linear-gradient(180deg, #fde68a 0%, #e879f9 45%, #be185d 100%)'
          : 'linear-gradient(180deg, #fef3c7 0%, #fbbf24 40%, #b45309 100%)'
        const accentSolid = isLegendary ? '#a855f7' : isSuper ? '#e879f9' : '#fbbf24'
        const accentDeep = isLegendary ? '#6d28d9' : isSuper ? '#be185d' : '#b45309'
        const bgGradient = isSpinning ? spinBg : isWin ? winBg : isMiss ? loseBg : spinBg

        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: bgGradient,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '20px', overflow: 'hidden',
            animation: 'gachaFadeIn 0.4s ease-out',
          }}>
            <style>{`
              @keyframes gachaFadeIn { from { opacity: 0; } to { opacity: 1; } }
              @keyframes ringSpin { to { transform: rotate(360deg); } }
              @keyframes luxuryEntrance {
                0%   { opacity: 0; transform: scale(0.5) translateY(30px); filter: blur(12px); }
                60%  { opacity: 1; transform: scale(1.08) translateY(0); filter: blur(0); }
                100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
              }
              @keyframes shimmerGold {
                0%, 100% { filter: brightness(1) drop-shadow(0 0 30px rgba(251,191,36,0.4)); }
                50%      { filter: brightness(1.3) drop-shadow(0 0 60px rgba(251,191,36,0.9)); }
              }
              @keyframes shimmerRose {
                0%, 100% { filter: brightness(1) drop-shadow(0 0 30px rgba(232,121,249,0.4)); }
                50%      { filter: brightness(1.3) drop-shadow(0 0 60px rgba(232,121,249,0.9)); }
              }
              @keyframes shimmerIridescent {
                0%, 100% { filter: brightness(1) drop-shadow(0 0 30px rgba(168,85,247,0.5)) hue-rotate(0deg); }
                50%      { filter: brightness(1.4) drop-shadow(0 0 80px rgba(236,72,153,0.9)) hue-rotate(30deg); }
              }
              @keyframes iridescentShift {
                0%   { background-position: 0% 50%; }
                50%  { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
              }
              @keyframes raysRotate {
                from { transform: translate(-50%, -50%) rotate(0deg); }
                to   { transform: translate(-50%, -50%) rotate(360deg); }
              }
              @keyframes cardReveal {
                0%   { opacity: 0; transform: scale(0.7) translateY(40px); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
              }
              @keyframes sadEntrance {
                0%   { opacity: 0; transform: translateY(-20px) scale(1.2); letter-spacing: 40px; filter: blur(8px); }
                100% { opacity: 1; transform: translateY(0) scale(1); letter-spacing: 16px; filter: blur(0); }
              }
              @keyframes heavyFade {
                0%   { opacity: 0; transform: translateY(12px); }
                100% { opacity: 1; transform: translateY(0); }
              }
              @keyframes rainFall {
                0%   { transform: translateY(-10vh); opacity: 0; }
                15%  { opacity: 0.6; }
                100% { transform: translateY(110vh); opacity: 0; }
              }
              @keyframes confettiFall {
                0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
                100% { transform: translateY(110vh) rotate(720deg); opacity: 0.7; }
              }
              @keyframes pulseSoft {
                0%, 100% { opacity: 0.6; }
                50%      { opacity: 1; }
              }
              @keyframes borderShimmer {
                0%, 100% { opacity: 0.5; }
                50%      { opacity: 1; }
              }
            `}</style>

            {/* ========== 抽選中 ========== */}
            {isSpinning && (
              <>
                <div style={{
                  position: 'relative', width: '160px', height: '160px',
                  marginBottom: '32px',
                }}>
                  {/* 外側リング */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    borderRadius: '50%',
                    border: '3px solid rgba(251,191,36,0.2)',
                    borderTopColor: '#fbbf24',
                    borderRightColor: '#f59e0b',
                    animation: 'ringSpin 0.9s linear infinite',
                  }} />
                  {/* 内側リング（逆回転） */}
                  <div style={{
                    position: 'absolute', inset: '18px',
                    borderRadius: '50%',
                    border: '2px solid rgba(251,191,36,0.15)',
                    borderBottomColor: '#fde68a',
                    animation: 'ringSpin 1.4s linear infinite reverse',
                  }} />
                  {/* 中央テキスト */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: '"Noto Serif JP", serif',
                    fontSize: '13px', fontWeight: 800,
                    color: '#fde68a', letterSpacing: '6px',
                    animation: 'pulseSoft 1.2s ease-in-out infinite',
                  }}>
                    抽選中
                  </div>
                </div>
                <div style={{
                  color: 'rgba(253,230,138,0.9)',
                  fontSize: '12px', letterSpacing: '8px',
                  fontWeight: 600,
                }}>
                  DRAWING A PRIZE
                </div>
              </>
            )}

            {/* ========== エラー ========== */}
            {!isSpinning && gachaError && (
              <>
                <div style={{
                  fontFamily: '"Noto Serif JP", serif',
                  fontSize: '48px', fontWeight: 900,
                  color: '#fca5a5', letterSpacing: '12px',
                  marginBottom: '16px',
                }}>
                  エラー
                </div>
                <div style={{
                  color: 'rgba(255,255,255,0.85)', fontSize: '13px',
                  background: 'rgba(0,0,0,0.4)', padding: '14px 22px', borderRadius: '10px',
                  maxWidth: '420px', textAlign: 'center', marginBottom: '28px',
                  border: '1px solid rgba(252,165,165,0.3)',
                }}>
                  {gachaError}
                </div>
                <button onClick={closeGachaModal} style={{
                  background: 'white', color: '#1f2937', fontWeight: 800,
                  padding: '12px 32px', borderRadius: '10px', border: 'none',
                  fontSize: '14px', letterSpacing: '2px',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  閉じる
                </button>
              </>
            )}

            {/* ========== 結果：当たり（豪華） ========== */}
            {!isSpinning && !gachaError && gachaResult && isWin && (
              <>
                {/* 背景の放射状ゴールドレイ（ゆっくり回転） */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: '200vmax', height: '200vmax',
                  background: isLegendary
                    ? 'repeating-conic-gradient(from 0deg, rgba(168,85,247,0.14) 0deg, rgba(236,72,153,0.1) 5deg, rgba(96,165,250,0.08) 10deg, rgba(168,85,247,0) 16deg)'
                    : isSuper
                    ? 'repeating-conic-gradient(from 0deg, rgba(232,121,249,0.12) 0deg, rgba(232,121,249,0) 8deg, rgba(232,121,249,0) 16deg)'
                    : 'repeating-conic-gradient(from 0deg, rgba(251,191,36,0.15) 0deg, rgba(251,191,36,0) 8deg, rgba(251,191,36,0) 16deg)',
                  pointerEvents: 'none',
                  animation: isLegendary
                    ? 'raysRotate 18s linear infinite'
                    : 'raysRotate 30s linear infinite',
                  transformOrigin: 'center',
                }} />

                {/* 中心の光の爆発 */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: '600px', height: '600px',
                  transform: 'translate(-50%, -50%)',
                  background: isLegendary
                    ? 'radial-gradient(circle, rgba(168,85,247,0.45) 0%, rgba(236,72,153,0.2) 40%, rgba(96,165,250,0) 70%)'
                    : isSuper
                    ? 'radial-gradient(circle, rgba(232,121,249,0.35) 0%, rgba(232,121,249,0) 60%)'
                    : 'radial-gradient(circle, rgba(251,191,36,0.4) 0%, rgba(251,191,36,0) 60%)',
                  pointerEvents: 'none',
                }} />

                {/* 紙吹雪（倍量） */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                  {Array.from({ length: isLegendary ? 90 : 60 }).map((_, i) => {
                    const goldPalette = ['#fde68a', '#fbbf24', '#f59e0b', '#fef3c7', '#d97706', '#ffffff']
                    const rosePalette = ['#fbcfe8', '#f472b6', '#e879f9', '#fef3c7', '#be185d', '#ffffff']
                    const iridescentPalette = ['#60a5fa', '#a855f7', '#ec4899', '#f59e0b', '#34d399', '#fde68a', '#ffffff']
                    const palette = isLegendary ? iridescentPalette : isSuper ? rosePalette : goldPalette
                    const left = (i * 1.7 + (i % 5) * 3) % 100
                    const delay = (i * 0.06) % 2.5
                    const duration = 3 + (i % 5) * 0.5
                    const size = 6 + (i % 4) * 4
                    const shape = i % 3
                    return (
                      <div key={i} style={{
                        position: 'absolute',
                        left: `${left}%`, top: '-20px',
                        width: `${size}px`, height: `${size * (shape === 2 ? 1.8 : 1)}px`,
                        background: palette[i % palette.length],
                        borderRadius: shape === 0 ? '50%' : shape === 1 ? '2px' : '1px',
                        opacity: 0.9,
                        boxShadow: `0 0 8px ${palette[i % palette.length]}`,
                        animation: `confettiFall ${duration}s ease-in ${delay}s infinite`,
                      }} />
                    )
                  })}
                </div>

                {/* メインタイトル「大当選」 */}
                <h1 style={{
                  fontFamily: '"Noto Serif JP", "Hiragino Mincho ProN", "游明朝", serif',
                  fontSize: isLegendary ? 'clamp(90px, 18vw, 180px)' : 'clamp(80px, 16vw, 160px)',
                  fontWeight: 900,
                  letterSpacing: '24px',
                  paddingLeft: '24px', // letter-spacing 補正
                  margin: 0,
                  background: accentGold,
                  backgroundSize: isLegendary ? '300% 300%' : '100% 100%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: isLegendary
                    ? 'luxuryEntrance 1.1s cubic-bezier(0.34, 1.56, 0.64, 1) both, shimmerIridescent 2.5s ease-in-out 1.1s infinite, iridescentShift 4s ease-in-out 1.1s infinite'
                    : `luxuryEntrance 1.1s cubic-bezier(0.34, 1.56, 0.64, 1) both, ${isSuper ? 'shimmerRose' : 'shimmerGold'} 2.5s ease-in-out 1.1s infinite`,
                  position: 'relative', zIndex: 2,
                  textAlign: 'center',
                  lineHeight: 1,
                }}>
                  {isLegendary ? '神引き' : '大当選'}
                </h1>

                {/* サブタイトル */}
                <div style={{
                  fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
                  fontSize: '14px',
                  color: isLegendary
                    ? 'rgba(216,180,254,0.95)'
                    : isSuper ? 'rgba(251,207,232,0.9)' : 'rgba(253,230,138,0.9)',
                  letterSpacing: '14px',
                  paddingLeft: '14px',
                  marginTop: '16px',
                  marginBottom: '40px',
                  fontWeight: 500,
                  fontStyle: 'italic',
                  animation: 'heavyFade 0.8s ease-out 0.6s both',
                  position: 'relative', zIndex: 2,
                }}>
                  {isLegendary ? 'LEGENDARY DRAW' : 'CONGRATULATIONS'}
                </div>

                {/* 景品カード（豪華・金縁） */}
                <div style={{
                  position: 'relative', zIndex: 2,
                  minWidth: '340px', maxWidth: '460px',
                  animation: 'cardReveal 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) 0.8s both',
                }}>
                  {/* 金縁グラデーション枠 */}
                  <div style={{
                    position: 'absolute', inset: '-3px',
                    borderRadius: '22px',
                    background: accentGold,
                    filter: 'blur(0.5px)',
                    animation: 'borderShimmer 2.5s ease-in-out infinite',
                  }} />

                  <div style={{
                    position: 'relative',
                    background: 'linear-gradient(180deg, #fffbeb 0%, #ffffff 40%, #fef3c7 100%)',
                    borderRadius: '20px',
                    padding: '44px 40px 36px',
                    textAlign: 'center',
                    boxShadow: `0 0 80px ${accentSolid}66, 0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.9)`,
                  }}>
                    {/* 上部レアリティ表記 */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '14px', marginBottom: '18px',
                    }}>
                      <div style={{ flex: 1, height: '1px', background: `linear-gradient(90deg, transparent, ${accentDeep})` }} />
                      <div style={{
                        fontFamily: '"Cormorant Garamond", serif',
                        fontSize: '11px', fontWeight: 700, letterSpacing: '6px',
                        color: accentDeep, fontStyle: 'italic',
                        whiteSpace: 'nowrap',
                      }}>
                        {rarityLabel} PRIZE
                      </div>
                      <div style={{ flex: 1, height: '1px', background: `linear-gradient(90deg, ${accentDeep}, transparent)` }} />
                    </div>

                    {/* ラベル */}
                    <div style={{
                      fontFamily: '"Noto Serif JP", serif',
                      fontSize: '13px', fontWeight: 700,
                      color: accentDeep, letterSpacing: '10px',
                      marginBottom: '20px',
                    }}>
                      獲得賞品
                    </div>

                    {/* 景品名（超大） */}
                    <div style={{
                      fontFamily: '"Noto Serif JP", "Hiragino Mincho ProN", serif',
                      fontSize: 'clamp(30px, 5vw, 42px)',
                      fontWeight: 900,
                      color: '#1a0f07',
                      lineHeight: 1.2,
                      letterSpacing: '2px',
                      marginBottom: '18px',
                    }}>
                      {gachaResult.prize}
                    </div>

                    {/* 装飾罫線 */}
                    <div style={{
                      width: '60%', margin: '0 auto 22px',
                      height: '1px',
                      background: `linear-gradient(90deg, transparent, ${accentSolid}, transparent)`,
                    }} />

                    {/* 説明文 */}
                    <div style={{
                      fontSize: '13px', color: '#57493b',
                      lineHeight: 1.75, fontStyle: 'italic',
                      padding: '0 8px',
                    }}>
                      {gachaResult.prize === 'Amazonギフト券1000円' ? (
                        <>Amazonギフト券1,000円分を進呈いたします。<br />
                        <span style={{ fontSize: '11px', color: accentDeep, fontWeight: 700 }}>当選確率 1 / 100　— 最上位賞 —</span><br />
                        <span style={{ fontSize: '10px', color: '#78644c', fontStyle: 'normal', fontWeight: 500 }}>
                          ※ コードをお伝えします。公式LINEまでご連絡ください。
                        </span></>
                      ) : gachaResult.prize === 'スタバギフト券1000円' ? (
                        <>スターバックスギフト券1,000円分を進呈いたします。<br />
                        <span style={{ fontSize: '11px', color: accentDeep, fontWeight: 700 }}>当選確率 1 / 100　— 最上位賞 —</span><br />
                        <span style={{ fontSize: '10px', color: '#78644c', fontStyle: 'normal', fontWeight: 500 }}>
                          ※ コードをお伝えします。公式LINEまでご連絡ください。
                        </span></>
                      ) : gachaResult.prize === 'リカバリープロ' ? (
                        <>リカバリーマシン1回無料券を進呈いたします。<br />
                        <span style={{ fontSize: '11px', color: accentDeep, fontWeight: 700 }}>当選確率 1 / 300　— 超最上位賞 LEGENDARY —</span></>
                      ) : null}
                    </div>

                    {/* 受取り案内 */}
                    <div style={{
                      marginTop: '24px', paddingTop: '18px',
                      borderTop: `1px dashed ${accentSolid}66`,
                      fontSize: '11px', color: '#78644c',
                      letterSpacing: '1px',
                    }}>
                      賞品のお受取り方法は後日スタッフよりご案内いたします
                    </div>
                  </div>
                </div>

                {/* アクションボタン */}
                <div style={{
                  display: 'flex', gap: '14px', marginTop: '36px',
                  position: 'relative', zIndex: 2,
                  animation: 'heavyFade 0.6s ease-out 1.3s both',
                }}>
                  <button onClick={closeGachaModal} style={{
                    background: 'rgba(255,255,255,0.08)',
                    color: 'white', fontWeight: 700,
                    padding: '13px 26px', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.35)',
                    fontSize: '13px', letterSpacing: '4px',
                    cursor: 'pointer', fontFamily: 'inherit',
                    backdropFilter: 'blur(10px)',
                  }}>
                    閉じる
                  </button>
                  <button onClick={() => { closeGachaModal(); setTimeout(() => spinTestGacha(), 350) }} style={{
                    background: accentGold,
                    color: '#1a0f07', fontWeight: 900,
                    padding: '13px 30px', borderRadius: '10px', border: 'none',
                    fontSize: '13px', letterSpacing: '4px',
                    cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: `0 8px 24px ${accentSolid}88`,
                  }}>
                    もう一度回す
                  </button>
                </div>
              </>
            )}

            {/* ========== 結果：外れ（とても残念） ========== */}
            {!isSpinning && !gachaError && gachaResult && isMiss && (
              <>
                {/* 雨アニメーション */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                  {Array.from({ length: 60 }).map((_, i) => {
                    const left = (i * 1.7 + (i % 7) * 2.3) % 100
                    const delay = (i * 0.12) % 3
                    const duration = 1.2 + (i % 4) * 0.3
                    const height = 40 + (i % 3) * 20
                    return (
                      <div key={i} style={{
                        position: 'absolute',
                        left: `${left}%`, top: '-10vh',
                        width: '1px', height: `${height}px`,
                        background: 'linear-gradient(180deg, rgba(148,163,184,0) 0%, rgba(148,163,184,0.4) 100%)',
                        animation: `rainFall ${duration}s linear ${delay}s infinite`,
                      }} />
                    )
                  })}
                </div>

                {/* 暗い vignette */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)',
                  pointerEvents: 'none',
                }} />

                {/* 『残念...』タイトル */}
                <h1 style={{
                  fontFamily: '"Noto Serif JP", "Hiragino Mincho ProN", "游明朝", serif',
                  fontSize: 'clamp(64px, 13vw, 130px)',
                  fontWeight: 900,
                  color: '#64748b',
                  letterSpacing: '16px',
                  paddingLeft: '16px',
                  margin: 0,
                  textShadow: '0 4px 30px rgba(0,0,0,0.8)',
                  animation: 'sadEntrance 1.5s ease-out both',
                  position: 'relative', zIndex: 2,
                  textAlign: 'center',
                  lineHeight: 1,
                }}>
                  残念...
                </h1>

                <div style={{
                  fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
                  fontSize: '13px',
                  color: '#64748b',
                  letterSpacing: '10px',
                  paddingLeft: '10px',
                  marginTop: '20px',
                  marginBottom: '40px',
                  fontStyle: 'italic',
                  animation: 'heavyFade 1s ease-out 1s both',
                  position: 'relative', zIndex: 2,
                }}>
                  NOT A WINNER
                </div>

                {/* 外れカード（くすんだ） */}
                <div style={{
                  position: 'relative', zIndex: 2,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(148,163,184,0.2)',
                  borderRadius: '14px',
                  padding: '32px 40px',
                  minWidth: '320px', maxWidth: '440px',
                  textAlign: 'center',
                  backdropFilter: 'blur(8px)',
                  animation: 'heavyFade 1s ease-out 1.3s both',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 40px rgba(0,0,0,0.4)',
                }}>
                  <div style={{
                    fontFamily: '"Noto Serif JP", serif',
                    fontSize: '32px', fontWeight: 900,
                    color: '#94a3b8',
                    letterSpacing: '12px',
                    paddingLeft: '12px',
                    marginBottom: '8px',
                  }}>
                    外　れ
                  </div>

                  <div style={{
                    width: '40%', margin: '14px auto',
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent, rgba(148,163,184,0.5), transparent)',
                  }} />

                  <div style={{
                    color: '#94a3b8',
                    fontSize: '13px',
                    lineHeight: 2,
                    fontFamily: '"Noto Serif JP", serif',
                    letterSpacing: '2px',
                  }}>
                    今回は当選されませんでした。<br />
                    また挑戦していただければ幸いです。
                  </div>

                  <div style={{
                    marginTop: '20px', paddingTop: '16px',
                    borderTop: '1px dashed rgba(148,163,184,0.2)',
                    fontSize: '11px', color: '#64748b',
                    letterSpacing: '2px', fontStyle: 'italic',
                  }}>
                    次の挑戦をお待ちしています
                  </div>
                </div>

                {/* アクションボタン */}
                <div style={{
                  display: 'flex', gap: '14px', marginTop: '32px',
                  position: 'relative', zIndex: 2,
                  animation: 'heavyFade 1s ease-out 1.8s both',
                }}>
                  <button onClick={closeGachaModal} style={{
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.8)', fontWeight: 700,
                    padding: '13px 26px', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    fontSize: '13px', letterSpacing: '4px',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    閉じる
                  </button>
                  <button onClick={() => { closeGachaModal(); setTimeout(() => spinTestGacha(), 350) }} style={{
                    background: 'linear-gradient(135deg, #475569, #334155)',
                    color: '#e2e8f0', fontWeight: 800,
                    padding: '13px 30px', borderRadius: '10px', border: 'none',
                    fontSize: '13px', letterSpacing: '4px',
                    cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  }}>
                    もう一度挑戦する
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

      {/* ━━━━━━ Stripe 課金中ユーザー一覧 ━━━━━━ */}
      <div style={{ maxWidth: '1200px', margin: '32px auto 0', padding: '0 16px' }}>
        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '20px' }}>💳</span>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', margin: 0 }}>
              課金中の会員（Stripe）
            </h2>
            {billing && (
              <span style={{
                marginLeft: 'auto', fontSize: '13px', fontWeight: 700, color: '#059669',
                background: '#ecfdf5', padding: '4px 10px', borderRadius: '999px',
              }}>
                {billing.length}名 / 月額 ¥{billingTotal.toLocaleString()}
              </span>
            )}
          </div>
          <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 16px' }}>
            active / trialing / past_due のサブスクをStripeから直接取得
          </p>

          {billing === null && (
            <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>読み込み中…</div>
          )}
          {billing && billing.length === 0 && !billingError && (
            <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>課金中のユーザーはいません</div>
          )}
          {billingError && (
            <div style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', fontSize: '12px', color: '#991b1b' }}>
              取得失敗: {billingError}
            </div>
          )}

          {billing && billing.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {billing.map(b => {
                const statusColor =
                  b.status === 'active' ? { bg: '#ecfdf5', fg: '#065f46', label: 'アクティブ' } :
                  b.status === 'trialing' ? { bg: '#eff6ff', fg: '#1e40af', label: 'トライアル中' } :
                  b.status === 'past_due' ? { bg: '#fef3c7', fg: '#92400e', label: '支払い遅延' } :
                  { bg: '#f3f4f6', fg: '#6b7280', label: b.status }
                const displayName = b.customer.appName || b.customer.stripeName || b.customer.email || '(不明)'
                const periodEnd = b.currentPeriodEnd ? new Date(b.currentPeriodEnd).toLocaleDateString('ja-JP') : '-'
                return (
                  <div key={b.subscriptionId} style={{
                    display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center',
                    padding: '12px 14px', background: '#fafafa', borderRadius: '12px', border: '1px solid #f3f4f6',
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{displayName}</span>
                        <span style={{
                          fontSize: '10px', fontWeight: 700,
                          background: statusColor.bg, color: statusColor.fg,
                          padding: '2px 8px', borderRadius: '999px',
                        }}>{statusColor.label}</span>
                        {b.cancelAtPeriodEnd && (
                          <span style={{
                            fontSize: '10px', fontWeight: 700,
                            background: '#fef2f2', color: '#991b1b',
                            padding: '2px 8px', borderRadius: '999px',
                          }}>期間終了で解約予定</span>
                        )}
                        {b.customer.appPlanId && (
                          <span style={{
                            fontSize: '10px', fontWeight: 600,
                            background: '#f3f4f6', color: '#374151',
                            padding: '2px 8px', borderRadius: '999px',
                          }}>{b.customer.appPlanId}</span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.customer.email} ・ 次回更新 {periodEnd}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#059669' }}>
                        ¥{b.amount.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '10px', color: '#9ca3af' }}>/{b.interval === 'month' ? '月' : b.interval}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ━━━━━━ 危険ゾーン：返金 + 即時削除 ━━━━━━ */}
      <div style={{
        maxWidth: '1200px', margin: '32px auto 24px', padding: '0 16px',
      }}>
        <div style={{
          background: '#fff',
          border: '2px solid #fecaca',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#b91c1c', margin: 0 }}>
              危険ゾーン：返金 + 即時削除
            </h2>
          </div>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 16px', lineHeight: 1.6 }}>
            指定会員の<strong>最新の支払いを全額返金</strong>し、<strong>サブスクを即時キャンセル</strong>、
            <strong>Stripe Customer と Supabase のユーザーデータを完全削除</strong>します。<br />
            この操作は<strong style={{ color: '#b91c1c' }}>取り消しできません</strong>。追加パスワードが必要です。
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: 600 }}>
                対象会員のメールアドレス
              </label>
              <input
                type="email"
                value={dangerEmail}
                onChange={e => setDangerEmail(e.target.value)}
                placeholder="user@example.com"
                disabled={dangerRunning}
                style={{
                  width: '100%', padding: '10px 12px', fontSize: '13px',
                  border: '1px solid #e5e7eb', borderRadius: '10px',
                  fontFamily: 'inherit', background: dangerRunning ? '#f9fafb' : '#fff',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: 600 }}>
                追加パスワード
              </label>
              <input
                type="password"
                value={dangerPassword}
                onChange={e => setDangerPassword(e.target.value)}
                placeholder="••••••"
                disabled={dangerRunning}
                autoComplete="new-password"
                style={{
                  width: '100%', padding: '10px 12px', fontSize: '13px',
                  border: '1px solid #e5e7eb', borderRadius: '10px',
                  fontFamily: 'inherit', background: dangerRunning ? '#f9fafb' : '#fff',
                }}
              />
            </div>
          </div>

          <button
            onClick={handleRefundAndDelete}
            disabled={dangerRunning || !dangerEmail.trim() || !dangerPassword}
            style={{
              width: '100%', padding: '12px',
              background: dangerRunning || !dangerEmail.trim() || !dangerPassword
                ? '#fca5a5'
                : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
              color: 'white', fontWeight: 800, fontSize: '14px',
              border: 'none', borderRadius: '12px',
              cursor: dangerRunning || !dangerEmail.trim() || !dangerPassword ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {dangerRunning ? '処理中…' : '返金して即時削除する'}
          </button>

          {dangerResult && (
            <div style={{
              marginTop: '12px', padding: '12px',
              background: dangerResult.type === 'success' ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${dangerResult.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
              borderRadius: '10px',
              fontSize: '12px',
              color: dangerResult.type === 'success' ? '#065f46' : '#991b1b',
              lineHeight: 1.6,
              wordBreak: 'break-all',
            }}>
              {dangerResult.text}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
