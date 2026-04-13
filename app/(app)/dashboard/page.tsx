'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getPointsData, getTodayPoints, doLottery, getAvailableLotteries, getLotteryHistory, getRarityColor, getRarityLabel } from '@/lib/points'
import { toJSTDateStr } from '@/lib/date-utils'
import type { LotteryResult } from '@/lib/points'
import { SpotlightTutorial, UsageGuide } from '@/components/Tutorial'

// 食事記録の型定義
interface MealRecord {
  id: string
  mealDate: string
  mealType: string
  foodName: string
  caloriesKcal: number
  proteinG: number
  fatG: number
  carbsG: number
  fiberG: number
  saltG: number
  items: { name: string; grams: number; kcal: number; protein: number; fat: number; carbs: number }[]
  photoUrl?: string
  advice?: string
}

// 体組成の型定義
interface BodyRecord {
  id: string
  date: string
  weight?: number
  bodyFat?: number
  muscleMass?: number
  [key: string]: unknown
}


interface GoalData {
  cal: number
  protein: number
  fat: number
  carbs: number
  targetWeight?: number
  startDate?: string
  endDate?: string
  goalType?: string
}

interface Reservation {
  id: string
  memberName: string
  date: string
  time: string
  staffName: string
  notes?: string
  status: 'confirmed' | 'cancelled' | 'completed'
  meetLink?: string
  createdAt: string
}

export default function DashboardPage() {
  const [goal, setGoal] = useState<GoalData | null>(null)
  const [nextReservation, setNextReservation] = useState<Reservation | null>(null)
  const [todayNutrition, setTodayNutrition] = useState({ calories: 0, protein: 0, fat: 0, carbs: 0 })
  const [todayMealRecords, setTodayMealRecords] = useState<MealRecord[]>([])
  const [latestBody, setLatestBody] = useState<{ weight: string; bodyFat: string; muscle: string; weightChange: string; fatChange: string; muscleChange: string } | null>(null)

  // 管理栄養士コメント
  const [nutritionistComments, setNutritionistComments] = useState<{ id: string; date: string; staffName: string; category: string; comment: string }[]>([])
  const [selectedCommentIndex, setSelectedCommentIndex] = useState(0)

  // ポイントシステム
  const [totalPoints, setTotalPoints] = useState(0)
  const [todayEarned, setTodayEarned] = useState(0)
  const [todayMeals, setTodayMeals] = useState({ breakfast: false, lunch: false, dinner: false, snack: false, bonus: false })
  const [availableLotteries, setAvailableLotteries] = useState(0)
  const [showLotteryModal, setShowLotteryModal] = useState(false)
  const [lotteryResult, setLotteryResult] = useState<LotteryResult | null>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [lotteryHistory, setLotteryHistory] = useState<LotteryResult[]>([])

  // サブスクリプション情報
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>('free')
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('none')

  // チュートリアル＆ガイド
  const [showTutorial, setShowTutorial] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  // 初回ログイン判定 → チュートリアル表示
  useEffect(() => {
    if (typeof window === 'undefined') return
    const done = localStorage.getItem('spomeal_tutorial_done')
    if (!done) {
      // 少し遅延させてページが安定してから開始
      const t = setTimeout(() => setShowTutorial(true), 800)
      return () => clearTimeout(t)
    }
  }, [])

  const handleTutorialComplete = () => {
    setShowTutorial(false)
    localStorage.setItem('spomeal_tutorial_done', '1')
  }

  // データ読み込み関数（初回＋ページ復帰時に実行）
  const loadAllData = useCallback(async () => {
    if (typeof window === 'undefined') return

    // 管理栄養士コメントの読み込み
    try {
      const commentsRaw = localStorage.getItem('nutritionist_comments_v1')
      if (commentsRaw) {
        const parsed = JSON.parse(commentsRaw)
        setNutritionistComments(Array.isArray(parsed) ? parsed : [])
      }
    } catch { /* ignore */ }

    try {
      const raw = localStorage.getItem('goals_v1')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed['__default__']) {
          setGoal(parsed['__default__'])
        }
      }
    } catch { /* ignore */ }

    // 食事記録データ読み込み
    try {
      const mealRaw = localStorage.getItem('mealRecords_v1')
      if (mealRaw) {
        const allRecords: MealRecord[] = JSON.parse(mealRaw)
        const today = toJSTDateStr()
        const todayRecs = allRecords.filter(r => r.mealDate === today)
        setTodayMealRecords(todayRecs)
        const totals = todayRecs.reduce((acc, r) => ({
          calories: acc.calories + (r.caloriesKcal || 0),
          protein: acc.protein + (r.proteinG || 0),
          fat: acc.fat + (r.fatG || 0),
          carbs: acc.carbs + (r.carbsG || 0),
        }), { calories: 0, protein: 0, fat: 0, carbs: 0 })
        setTodayNutrition(totals)
      } else {
        setTodayMealRecords([])
        setTodayNutrition({ calories: 0, protein: 0, fat: 0, carbs: 0 })
      }
    } catch { /* ignore */ }

    // 体組成データ読み込み
    try {
      const bodyRaw = localStorage.getItem('bodyRecords_v1')
      if (bodyRaw) {
        const allBody: BodyRecord[] = JSON.parse(bodyRaw)
        const sorted = [...allBody].sort((a, b) => b.date.localeCompare(a.date))
        if (sorted.length > 0) {
          const latest = sorted[0]
          const prev = sorted.length > 1 ? sorted[1] : null
          const wChange = prev && latest.weight != null && prev.weight != null
            ? (latest.weight - prev.weight).toFixed(1) : '—'
          const fChange = prev && latest.bodyFat != null && prev.bodyFat != null
            ? (latest.bodyFat - prev.bodyFat).toFixed(1) : '—'
          const mChange = prev && latest.muscleMass != null && prev.muscleMass != null
            ? (latest.muscleMass - prev.muscleMass).toFixed(1) : '—'
          setLatestBody({
            weight: latest.weight != null ? latest.weight.toFixed(1) : '—',
            bodyFat: latest.bodyFat != null ? latest.bodyFat.toFixed(1) : '—',
            muscle: latest.muscleMass != null ? latest.muscleMass.toFixed(1) : '—',
            weightChange: wChange !== '—' ? (Number(wChange) >= 0 ? '+' + wChange : wChange) : '—',
            fatChange: fChange !== '—' ? (Number(fChange) >= 0 ? '+' + fChange : fChange) : '—',
            muscleChange: mChange !== '—' ? (Number(mChange) >= 0 ? '+' + mChange : mChange) : '—',
          })
        }
      }
    } catch { /* ignore */ }

    // ポイントデータ読み込み
    const ptData = getPointsData()
    setTotalPoints(ptData.totalPoints)
    setAvailableLotteries(getAvailableLotteries())
    const today = toJSTDateStr()
    const todayPt = getTodayPoints(today)
    setTodayEarned(todayPt.earned)
    if (todayPt.record) {
      setTodayMeals({
        breakfast: todayPt.record.breakfast,
        lunch: todayPt.record.lunch,
        dinner: todayPt.record.dinner,
        snack: todayPt.record.snack,
        bonus: todayPt.record.bonus,
      })
    }
    setLotteryHistory(getLotteryHistory().results.slice(0, 10))

    // 予約データをAPI優先で読み込む
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const todayStr = toJSTDateStr()

      if (session?.user?.id) {
        // サブスクリプション情報を取得
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_plan, subscription_status')
            .eq('id', session.user.id)
            .single()
          if (profile) {
            setSubscriptionPlan(profile.subscription_plan || 'free')
            setSubscriptionStatus(profile.subscription_status || 'none')
          }
        } catch { /* ignore */ }

        // APIから取得を試みる
        try {
          const res = await fetch(`/api/reservations?userId=${session.user.id}`)
          if (res.ok) {
            const apiData: Reservation[] = await res.json()
            const upcoming = apiData
              .filter(r => r.status === 'confirmed' && r.date >= todayStr)
              .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
            setNextReservation(upcoming[0] ?? null)
            return
          }
        } catch { /* ignore */ }
      }

      // APIが失敗した場合はlocalStorageにフォールバック
      const raw = localStorage.getItem('reservations_v1')
      if (raw) {
        const all: Reservation[] = JSON.parse(raw)
        const todayStr2 = toJSTDateStr()
        const upcoming = all
          .filter(r => r.status === 'confirmed' && r.date >= todayStr2)
          .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        setNextReservation(upcoming[0] ?? null)
      }
    } catch { /* ignore */ }
  }, [])

  // 初回読み込み
  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // ページに戻ったとき（食事記録ページから戻る等）にデータを再読み込み
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadAllData()
      }
    }
    const handleFocus = () => loadAllData()
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('storage', loadAllData)
    window.addEventListener('mealRecordsUpdated', loadAllData)
    window.addEventListener('popstate', loadAllData)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('storage', loadAllData)
      window.removeEventListener('mealRecordsUpdated', loadAllData)
      window.removeEventListener('popstate', loadAllData)
    }
  }, [loadAllData])

  const calcRemainingDays = (endDate?: string) => {
    if (!endDate) return null
    const end = new Date(endDate)
    const now = new Date()
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div
      style={{
        fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",
        color: '#1a1a1a',
      }}
    >
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px 12px 40px' }}>

        {/* ===== 現在のプラン（コンパクト） ===== */}
        {(() => {
          const planInfo: Record<string, { name: string; color: string; bg: string; border: string; icon: string }> = {
            light:    { name: 'ライト',       color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', icon: '🌱' },
            standard: { name: 'スタンダード', color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: '⭐' },
            premium:  { name: 'プレミアム',   color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', icon: '👑' },
          }
          const statusLabel: Record<string, string> = { trialing: '無料トライアル中', active: '利用中', cancelling: '解約予定', cancelled: '解約済み' }
          const plan = planInfo[subscriptionPlan] || planInfo['light']
          const statusText = statusLabel[subscriptionStatus] || ''
          const isPremium = subscriptionPlan === 'premium'
          return (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: plan.bg, border: `1px solid ${plan.border}`,
              borderRadius: '12px', padding: '9px 14px', marginBottom: '12px',
              gap: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>{plan.icon}</span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: plan.color }}>{plan.name}</span>
                {statusText && (
                  <span style={{
                    fontSize: '10px', fontWeight: 600, color: '#6b7280',
                    background: 'rgba(255,255,255,0.8)', padding: '2px 8px',
                    borderRadius: '20px', border: '1px solid rgba(0,0,0,0.06)',
                  }}>{statusText}</span>
                )}
              </div>
              {!isPremium && (
                <Link href="/upgrade" style={{
                  fontSize: '11px', fontWeight: 800, color: '#7c3aed',
                  textDecoration: 'none', whiteSpace: 'nowrap',
                  background: 'rgba(124,58,237,0.08)', padding: '4px 10px',
                  borderRadius: '8px', border: '1px solid rgba(124,58,237,0.2)',
                }}>
                  ↑ アップグレード
                </Link>
              )}
            </div>
          )
        })()}

        {/* ===== 管理栄養士からのコメント ===== */}
        {nutritionistComments.length > 0 && (() => {
          const current = nutritionistComments[selectedCommentIndex] || nutritionistComments[0]
          const catStyles: Record<string, { color: string; bg: string; border: string; icon: string }> = {
            '食事': { color: '#16a34a', bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '#bbf7d0', icon: '🍽️' },
            '体組成': { color: '#dc2626', bg: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)', border: '#fca5a5', icon: '📊' },
            'トレーニング': { color: '#7c3aed', bg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', border: '#c4b5fd', icon: '💪' },
            '全般': { color: '#2563eb', bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '#93c5fd', icon: '💬' },
          }
          const cat = catStyles[current.category] || catStyles['全般']
          return (
            <div style={{
              background: cat.bg,
              borderRadius: '16px', border: `1px solid ${cat.border}`,
              marginBottom: '12px', overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: cat.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {cat.icon} 管理栄養士からのコメント
                </span>
                {nutritionistComments.length > 1 ? (
                  <select
                    value={selectedCommentIndex}
                    onChange={(e) => setSelectedCommentIndex(Number(e.target.value))}
                    style={{
                      fontSize: '11px', color: '#374151', background: 'rgba(255,255,255,0.85)',
                      border: `1px solid ${cat.border}`, borderRadius: '6px',
                      padding: '2px 6px', fontWeight: 600, cursor: 'pointer', outline: 'none',
                    }}
                  >
                    {nutritionistComments.map((c, i) => (
                      <option key={c.id} value={i}>
                        {c.date}{i === 0 ? '（最新）' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span style={{ fontSize: '10px', color: '#9ca3af', background: 'rgba(255,255,255,0.7)', padding: '2px 8px', borderRadius: '6px' }}>
                    {current.date}
                  </span>
                )}
              </div>
              <div style={{ padding: '10px 16px 14px' }}>
                <p style={{ fontSize: '14px', color: '#1f2937', margin: 0, lineHeight: 1.7, fontWeight: 500 }}>
                  {current.comment}
                </p>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ background: 'rgba(255,255,255,0.7)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                    {current.staffName}
                  </span>
                  <span style={{
                    background: 'rgba(255,255,255,0.7)', padding: '2px 8px', borderRadius: '6px',
                    fontWeight: 600, color: cat.color,
                  }}>
                    {current.category}
                  </span>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ===== 次回の栄養相談 ===== */}
        {nextReservation && (
          <div
            style={{
              background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
              borderRadius: '16px',
              boxShadow: '0 2px 8px rgba(14,165,233,0.3)',
              marginBottom: '12px',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📅 次回の栄養相談
              </span>
              <Link href="/reserve" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', fontWeight: 600, textDecoration: 'none' }}>
                予約管理 ›
              </Link>
            </div>
            <div style={{ padding: '0 16px 16px' }}>
              <div style={{ fontSize: '22px', fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>
                {nextReservation.date.replace(/-/g, '/')} {nextReservation.time}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', marginTop: '4px' }}>
                担当: {nextReservation.staffName}
                {nextReservation.notes && <span style={{ marginLeft: '8px' }}>/ {nextReservation.notes}</span>}
              </div>
              {nextReservation.meetLink ? (
                <a
                  href={nextReservation.meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    marginTop: '10px', padding: '8px 16px', borderRadius: '10px',
                    background: 'white', color: '#0284c7', fontSize: '13px',
                    fontWeight: 800, textDecoration: 'none',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                  }}
                >
                  🎥 Google Meet に参加する
                </a>
              ) : (
                <div style={{ marginTop: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                  ※ Meet リンクは Google カレンダー連携後に表示されます
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== クイック記録 ===== */}
        <div
          data-tutorial="quick-record"
          style={{
            background: 'white',
            border: '1px solid #f0f0f0',
            borderRadius: '16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            marginBottom: '12px',
          }}
        >
          <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⚡ クイック記録
            </span>
          </div>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <Link
                href="/meal"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '6px', padding: '16px 8px', borderRadius: '14px',
                  border: '1.5px solid #22c55e', color: '#16a34a',
                  fontWeight: 700, fontSize: '12px', transition: 'all 0.2s',
                  textAlign: 'center', background: 'white', cursor: 'pointer', textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: '24px' }}>🍽</span>
                食事を記録
              </Link>
              <Link
                href="/body"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '6px', padding: '16px 8px', borderRadius: '14px',
                  border: '1.5px solid #ef4444', color: '#dc2626',
                  fontWeight: 700, fontSize: '12px', transition: 'all 0.2s',
                  textAlign: 'center', background: 'white', cursor: 'pointer', textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: '24px' }}>📊</span>
                体組成を測定
              </Link>
              <Link
                href="/reserve"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '6px', padding: '16px 8px', borderRadius: '14px',
                  border: '1.5px solid #0ea5e9', color: '#0284c7',
                  fontWeight: 700, fontSize: '12px', transition: 'all 0.2s',
                  textAlign: 'center', background: 'white', cursor: 'pointer', textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: '24px' }}>📅</span>
                相談を予約
              </Link>
            </div>
          </div>
        </div>

        {/* ===== 🎯 目標と進捗 ===== */}
        {goal && (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #22c55e',
              borderRadius: '16px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              marginBottom: '12px',
            }}
          >
            <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🎯 目標と進捗
              </span>
              <Link href="/meal" style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600, textDecoration: 'none' }}>
                設定 ›
              </Link>
            </div>
            <div style={{ padding: '12px 16px 14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {goal.targetWeight != null && (
                  <div
                    style={{
                      background: 'white', borderRadius: '12px', padding: '10px 12px',
                      border: '1px solid #bbf7d0',
                    }}
                  >
                    <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>目標体重</div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#15803d' }}>
                      {goal.targetWeight} <span style={{ fontSize: '12px', fontWeight: 400, color: '#9ca3af' }}>kg</span>
                    </div>
                  </div>
                )}
                {goal.endDate && calcRemainingDays(goal.endDate) != null && (
                  <div
                    style={{
                      background: 'white', borderRadius: '12px', padding: '10px 12px',
                      border: '1px solid #bbf7d0',
                    }}
                  >
                    <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>残り日数</div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#15803d' }}>
                      {calcRemainingDays(goal.endDate)} <span style={{ fontSize: '12px', fontWeight: 400, color: '#9ca3af' }}>日</span>
                    </div>
                  </div>
                )}
                <div
                  style={{
                    background: 'white', borderRadius: '12px', padding: '10px 12px',
                    border: '1px solid #bbf7d0',
                  }}
                >
                  <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>カロリー目標</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#15803d' }}>
                    {goal.cal.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 400, color: '#9ca3af' }}>kcal</span>
                  </div>
                </div>
                {goal.goalType && (
                  <div
                    style={{
                      background: 'white', borderRadius: '12px', padding: '10px 12px',
                      border: '1px solid #bbf7d0',
                    }}
                  >
                    <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>目標タイプ</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#15803d', marginTop: '4px' }}>
                      {goal.goalType}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== 今日の栄養 ===== */}
        {(() => {
          const calTarget = goal?.cal || 2000
          const pTarget = goal?.protein || 160
          const fTarget = goal?.fat || 60
          const cTarget = goal?.carbs || 250
          const calPct = Math.min((todayNutrition.calories / calTarget) * 100, 100)
          const isOver = todayNutrition.calories > calTarget
          return (
            <div
              style={{
                background: 'white',
                border: '1px solid #f0f0f0',
                borderRadius: '16px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                marginBottom: '12px',
              }}
            >
              <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🍽 今日の栄養
                </span>
                <Link href="/meal" style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>
                  詳細 ›
                </Link>
              </div>
              <div style={{ padding: '14px 16px' }}>
                <p style={{ fontSize: '11px', color: '#6b7280' }}>カロリー</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '2px 0' }}>
                  <span style={{ fontSize: '32px', fontWeight: 900, color: '#111827', lineHeight: 1 }}>
                    {Math.round(todayNutrition.calories).toLocaleString()}
                  </span>
                  <span style={{ fontSize: '13px', color: '#9ca3af' }}>
                    / {calTarget.toLocaleString()} kcal
                  </span>
                </div>
                {/* プログレスバー */}
                <div style={{ width: '100%', height: '10px', background: '#f3f4f6', borderRadius: '20px', overflow: 'hidden', margin: '8px 0' }}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: '20px',
                      width: `${calPct}%`,
                      background: isOver
                        ? 'linear-gradient(90deg, #22c55e, #f59e0b, #ef4444)'
                        : 'linear-gradient(90deg, #22c55e, #4ade80)',
                      transition: 'width 0.6s',
                    }}
                  />
                </div>
                {/* PFCグリッド */}
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'たんぱく質', value: Math.round(todayNutrition.protein * 10) / 10, target: pTarget, unit: 'g', color: '#3B82F6' },
                    { label: '脂質', value: Math.round(todayNutrition.fat * 10) / 10, target: fTarget, unit: 'g', color: '#F59E0B' },
                    { label: '炭水化物', value: Math.round(todayNutrition.carbs * 10) / 10, target: cTarget, unit: 'g', color: '#10B981' },
                  ].map((pfc) => (
                    <div key={pfc.label} style={{ minWidth: '70px' }}>
                      <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '1px' }}>{pfc.label}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: pfc.color }}>{pfc.value}</span>
                        <span style={{ fontSize: '10px', color: '#9ca3af' }}>{pfc.unit}</span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#9ca3af' }}>目標 {pfc.target}{pfc.unit}</div>
                    </div>
                  ))}
                </div>
                {/* 今日の食事一覧 */}
                {todayMealRecords.length > 0 && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '6px' }}>記録済み</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {todayMealRecords.map((rec) => (
                        <div key={rec.id} style={{ background: '#f9fafb', borderRadius: '10px', padding: '8px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                            {rec.photoUrl && (
                              <img src={rec.photoUrl} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
                            )}
                            <span style={{ fontSize: '13px' }}>
                              {rec.mealType === '朝食' ? '🌅' : rec.mealType === '昼食' ? '☀️' : rec.mealType === '夕食' ? '🌙' : '🍪'}
                            </span>
                            <span style={{ flex: 1, fontWeight: 700, color: '#374151', fontSize: '12px' }}>{rec.mealType}</span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>{Math.round(rec.caloriesKcal)}kcal</span>
                          </div>
                          {/* 各食材の詳細 */}
                          {rec.items && rec.items.length > 0 && (
                            <div style={{ marginTop: '4px', paddingLeft: '4px' }}>
                              {rec.items.map((item: any, i: number) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#6b7280', padding: '2px 0' }}>
                                  <span style={{ color: '#374151', fontWeight: 500, flex: 1 }}>{item.foodName || item.name}</span>
                                  {(item.grams || item.g) && <span>{item.grams || item.g}g</span>}
                                  <span style={{ color: '#16a34a', fontWeight: 600 }}>{Math.round(item.caloriesKcal || item.kcal || 0)}kcal</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '3px' }}>
                            P:{(rec.proteinG || 0).toFixed(1)}g · F:{(rec.fatG || 0).toFixed(1)}g · C:{(rec.carbsG || 0).toFixed(1)}g
                          </div>
                          {rec.advice && (
                            <div style={{ marginTop: '4px', padding: '6px 8px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #dcfce7' }}>
                              <p style={{ fontSize: '10px', color: '#374151', margin: 0, lineHeight: 1.5 }}>
                                💡 {rec.advice}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {todayMealRecords.length === 0 && (
                  <div style={{ marginTop: '12px', textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', color: '#9ca3af' }}>まだ食事が記録されていません</p>
                    <Link href="/meal" style={{ fontSize: '12px', color: '#22c55e', fontWeight: 700, textDecoration: 'none' }}>
                      食事を記録する →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* ===== 体組成（最新値）===== */}
        <div
          style={{
            background: 'white',
            border: '1px solid #f0f0f0',
            borderRadius: '16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            marginBottom: '12px',
          }}
        >
          <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📊 体組成（最新値）
            </span>
            <Link href="/body" style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600, textDecoration: 'none' }}>詳細 ›</Link>
          </div>
          <div style={{ padding: '14px 16px' }}>
            {latestBody ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[
                  { label: '体重', value: latestBody.weight, unit: 'kg', change: latestBody.weightChange, isGood: latestBody.weightChange.startsWith('-') },
                  { label: '体脂肪率', value: latestBody.bodyFat, unit: '%', change: latestBody.fatChange, isGood: latestBody.fatChange.startsWith('-') },
                  { label: '筋肉量', value: latestBody.muscle, unit: 'kg', change: latestBody.muscleChange, isGood: latestBody.muscleChange.startsWith('+') },
                ].map((stat) => (
                  <div key={stat.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>{stat.label}</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, marginTop: '2px' }}>{stat.value}</div>
                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>{stat.unit}</div>
                    <div style={{ marginTop: '2px', fontSize: '10px', fontWeight: 600, color: stat.change === '—' ? '#9ca3af' : stat.isGood ? '#22c55e' : '#ef4444' }}>
                      {stat.change}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <p style={{ fontSize: '12px', color: '#9ca3af' }}>まだ体組成が記録されていません</p>
                <Link href="/body" style={{ fontSize: '12px', color: '#22c55e', fontWeight: 700, textDecoration: 'none' }}>
                  体組成を記録する →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ===== LINEで管理者に相談 ===== */}
        <a
          href="https://lin.ee/yIdLnsI"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            width: '100%', background: '#06C755', color: 'white', fontWeight: 800,
            fontSize: '15px', padding: '16px', borderRadius: '14px', textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(6,199,85,0.35)', marginBottom: '8px', boxSizing: 'border-box',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
          </svg>
          LINEで管理者に相談する
        </a>
        <p style={{ textAlign: 'center', fontSize: '11px', color: '#9ca3af', margin: '0 0 12px' }}>
          ミーティングの日程が合わない場合などにご利用ください
        </p>

        {/* ===== ポイント & 抽選 ===== */}
        <div
          style={{
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: '1.5px solid #f59e0b',
            borderRadius: '16px',
            boxShadow: '0 2px 8px rgba(245,158,11,0.2)',
            marginBottom: '12px',
          }}
        >
          <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🎯 ポイント＆抽選
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#92400e' }}>
              今日 {todayEarned}/5pt
            </span>
          </div>
          <div style={{ padding: '12px 16px' }}>
            {/* 累計ポイント */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' }}>
              <span style={{ fontSize: '36px', fontWeight: 900, color: '#92400e', lineHeight: 1 }}>{totalPoints}</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#b45309' }}>pt</span>
              {availableLotteries > 0 && (
                <span style={{ fontSize: '11px', fontWeight: 800, background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '20px', marginLeft: '8px' }}>
                  抽選{availableLotteries}回可能!
                </span>
              )}
            </div>
            {/* 100ptプログレスバー */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#92400e', marginBottom: '3px' }}>
                <span>次の抽選まで</span>
                <span>{totalPoints % 100}/100pt</span>
              </div>
              <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.5)', borderRadius: '20px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '20px', width: `${(totalPoints % 100)}%`,
                  background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
                  transition: 'width 0.5s',
                }} />
              </div>
            </div>
            {/* 今日の獲得状況 */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
              {[
                { label: '朝食', done: todayMeals.breakfast, icon: '🌅' },
                { label: '昼食', done: todayMeals.lunch, icon: '☀️' },
                { label: '夕食', done: todayMeals.dinner, icon: '🌙' },
                { label: '間食', done: todayMeals.snack, icon: '🍪' },
                { label: 'ボーナス', done: todayMeals.bonus, icon: '⭐' },
              ].map(m => (
                <div key={m.label} style={{
                  flex: 1, textAlign: 'center', padding: '6px 2px', borderRadius: '8px',
                  background: m.done ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.4)',
                  border: m.done ? '1px solid #22c55e' : '1px solid rgba(0,0,0,0.05)',
                }}>
                  <div style={{ fontSize: '14px' }}>{m.icon}</div>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: m.done ? '#16a34a' : '#9ca3af' }}>
                    {m.done ? '+1' : '—'}
                  </div>
                </div>
              ))}
            </div>
            {/* 抽選ボタン */}
            <button
              onClick={() => { setLotteryResult(null); setShowLotteryModal(true) }}
              disabled={availableLotteries === 0}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px', fontSize: '14px',
                fontWeight: 800, border: 'none', cursor: availableLotteries > 0 ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit', transition: 'all 0.2s',
                background: availableLotteries > 0 ? 'linear-gradient(90deg, #ef4444, #f59e0b)' : '#d1d5db',
                color: 'white',
                boxShadow: availableLotteries > 0 ? '0 4px 12px rgba(239,68,68,0.3)' : 'none',
              }}
            >
              {availableLotteries > 0 ? `🎰 抽選する（${availableLotteries}回）` : '🎰 100pt で抽選（あと' + (100 - totalPoints % 100) + 'pt）'}
            </button>
          </div>
        </div>


      </div>

      {/* ===== 抽選モーダル ===== */}
      {showLotteryModal && (
        <div
          style={{
            display: 'flex', position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.6)', zIndex: 300,
            alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowLotteryModal(false)}
        >
          <div
            style={{
              background: 'white', width: '90%', maxWidth: '380px',
              borderRadius: '24px', overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
              padding: '24px 20px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>🎰</div>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'white', margin: 0 }}>スポミル抽選</h2>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', margin: '4px 0 0' }}>100pt で1回抽選できます</p>
            </div>
            <div style={{ padding: '20px' }}>
              {!lotteryResult ? (
                <>
                  <p style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center', marginBottom: '12px' }}>
                    残りポイント: <strong>{totalPoints}pt</strong>（{availableLotteries}回抽選可能）
                  </p>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '16px' }}>
                    <p style={{ fontWeight: 700, marginBottom: '6px' }}>景品一覧:</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {[
                        { icon: '💳', name: 'クオカード500円', rarity: 'スーパーレア' },
                        { icon: '🏆', name: 'リカバリープロ', rarity: 'ウルトラレア' },
                        { icon: '👕', name: 'スポミルTシャツ', rarity: 'レア' },
                        { icon: '💪', name: 'プロテイン1kg', rarity: 'レア' },
                        { icon: '🎫', name: 'スポミルステッカー', rarity: 'コモン' },
                      ].map(p => (
                        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                          <span style={{ fontSize: '16px' }}>{p.icon}</span>
                          <span style={{ flex: 1, fontSize: '12px' }}>{p.name}</span>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#f59e0b' }}>{p.rarity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsSpinning(true)
                      setTimeout(() => {
                        const result = doLottery()
                        if (result) {
                          setLotteryResult(result)
                          const ptData = getPointsData()
                          setTotalPoints(ptData.totalPoints)
                          setAvailableLotteries(getAvailableLotteries())
                          setLotteryHistory(getLotteryHistory().results.slice(0, 10))
                        }
                        setIsSpinning(false)
                      }, 1500)
                    }}
                    disabled={availableLotteries === 0 || isSpinning}
                    style={{
                      width: '100%', padding: '14px', borderRadius: '12px', fontSize: '15px',
                      fontWeight: 800, border: 'none', fontFamily: 'inherit',
                      cursor: (availableLotteries > 0 && !isSpinning) ? 'pointer' : 'not-allowed',
                      background: (availableLotteries > 0 && !isSpinning) ? 'linear-gradient(90deg, #ef4444, #f59e0b)' : '#d1d5db',
                      color: 'white',
                      animation: isSpinning ? 'pulse 0.5s infinite' : 'none',
                    }}
                  >
                    {isSpinning ? '🎰 抽選中...' : '100pt 使って抽選する！'}
                  </button>
                </>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '64px', marginBottom: '12px',
                    animation: 'bounce 0.5s',
                  }}>
                    {lotteryResult.icon}
                  </div>
                  {lotteryResult.rarity !== 'miss' && (
                    <div style={{
                      fontSize: '12px', fontWeight: 800,
                      color: getRarityColor(lotteryResult.rarity),
                      marginBottom: '4px',
                    }}>
                      {getRarityLabel(lotteryResult.rarity)}
                    </div>
                  )}
                  <h3 style={{
                    fontSize: '20px', fontWeight: 900, color: '#111827', margin: '0 0 8px',
                  }}>
                    {lotteryResult.prize}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
                    残りポイント: {totalPoints}pt
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setShowLotteryModal(false)}
                      style={{
                        flex: 1, padding: '11px', borderRadius: '10px', fontSize: '13px',
                        fontWeight: 600, border: '1px solid #e5e7eb', background: 'white',
                        color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      閉じる
                    </button>
                    {availableLotteries > 0 && (
                      <button
                        onClick={() => setLotteryResult(null)}
                        style={{
                          flex: 1, padding: '11px', borderRadius: '10px', fontSize: '13px',
                          fontWeight: 700, border: 'none',
                          background: 'linear-gradient(90deg, #ef4444, #f59e0b)',
                          color: 'white', cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        もう1回！
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 抽選履歴 */}
              {lotteryHistory.length > 0 && (
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '6px' }}>最近の抽選結果</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {lotteryHistory.slice(0, 5).map((r, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#6b7280' }}>
                        <span>{r.icon}</span>
                        <span style={{ flex: 1, fontWeight: 600, color: getRarityColor(r.rarity) }}>{r.prize}</span>
                        <span style={{ fontSize: '10px' }}>{new Date(r.date).toLocaleDateString('ja-JP')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

        {/* ===== アップグレードCTA ===== */}
        {subscriptionPlan !== 'premium' && (
          <Link href="/upgrade" style={{ display: 'block', textDecoration: 'none', marginBottom: '12px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
              borderRadius: '18px',
              padding: '20px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(109,40,217,0.35)',
            }}>
              {/* 背景装飾 */}
              <div style={{
                position: 'absolute', top: '-20px', right: '-20px',
                width: '120px', height: '120px', borderRadius: '50%',
                background: 'rgba(139,92,246,0.25)',
                pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute', bottom: '-30px', left: '30%',
                width: '80px', height: '80px', borderRadius: '50%',
                background: 'rgba(167,139,250,0.15)',
                pointerEvents: 'none',
              }} />
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: '11px', color: 'rgba(167,139,250,0.9)', fontWeight: 700, marginBottom: '6px', letterSpacing: '0.5px' }}>
                  👑 UPGRADE
                </div>
                <div style={{ fontSize: '17px', fontWeight: 900, color: 'white', marginBottom: '6px', lineHeight: 1.3 }}>
                  プランをアップグレードして<br />もっと活用しよう
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '14px', lineHeight: 1.6 }}>
                  {subscriptionPlan === 'light'
                    ? 'ミーティング・フィードバックコメントが使えるようになります'
                    : 'ミーティング月2回・週1フィードバックで最大限サポート'}
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: 'linear-gradient(90deg,#a78bfa,#7c3aed)',
                  color: 'white', padding: '10px 20px', borderRadius: '12px',
                  fontSize: '13px', fontWeight: 800,
                  boxShadow: '0 2px 12px rgba(124,58,237,0.5)',
                }}>
                  プランを見る →
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* ===== 使い方を見るボタン ===== */}
        <div style={{ padding: '8px 0 20px' }}>
          <button
            onClick={() => setShowGuide(true)}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '14px 20px',
              background: 'white',
              border: '1.5px solid #e5e7eb',
              borderRadius: '14px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#6b7280',
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'all 0.2s',
            }}
          >
            <span style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px',
            }}>📖</span>
            アプリの使い方を見る
          </button>
        </div>


      {/* チュートリアル（初回のみ） */}
      {showTutorial && (
        <SpotlightTutorial onComplete={handleTutorialComplete} />
      )}

      {/* 使い方ガイド（いつでも見れる） */}
      {showGuide && (
        <UsageGuide onClose={() => setShowGuide(false)} />
      )}
    </div>
  )
}
