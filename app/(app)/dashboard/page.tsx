'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api'
import { getRarityColor, getRarityLabel } from '@/lib/points'
import { toJSTDateStr } from '@/lib/date-utils'
import type { LotteryResult } from '@/lib/points'

// Tutorial は使う時だけ読み込む（初期バンドルから除外）
const SpotlightTutorial = dynamic(() => import('@/components/Tutorial').then(m => ({ default: m.SpotlightTutorial })), { ssr: false })
const UsageGuide = dynamic(() => import('@/components/Tutorial').then(m => ({ default: m.UsageGuide })), { ssr: false })
import {
  MICRONUTRIENT_KEYS, MICRONUTRIENT_LABELS, MICRO_RDA, MICRO_PRIMARY,
  getMicroBarColor, sumMicros,
  type MicronutrientKey, type Micronutrients,
} from '@/lib/micronutrients'
import { readStaleCache, writeCache } from '@/lib/swr-cache'

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
  const [userId, setUserId] = useState<string | null>(null)
  const [goal, setGoal] = useState<GoalData | null>(null)
  const [nextReservation, setNextReservation] = useState<Reservation | null>(null)
  const [todayNutrition, setTodayNutrition] = useState({ calories: 0, protein: 0, fat: 0, carbs: 0 })
  const [todayMealRecords, setTodayMealRecords] = useState<MealRecord[]>([])
  const [showAllMicrosDash, setShowAllMicrosDash] = useState(false)
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

  // プラン使用量
  const [planUsage, setPlanUsage] = useState<{
    planId: string
    meetings: { used: number; limit: number; unlimited: boolean; period: string }
    aiAnalysis: { used: number; limit: number; unlimited: boolean; period: string }
  } | null>(null)

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
  const loadAllData = useCallback(async (uid?: string) => {
    if (typeof window === 'undefined') return

    // Supabaseからuserを取得（未取得の場合）
    let currentUserId = uid || userId
    if (!currentUserId) {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        currentUserId = session?.user?.id ?? null
        if (currentUserId) setUserId(currentUserId)
      } catch { /* ignore */ }
    }

    if (currentUserId) {
      // ★ stale-while-revalidate: localStorageキャッシュを先に表示してから fetch で更新
      const today = toJSTDateStr()

      // --- 管理栄養士コメント ---
      const cmKey = `dash_comments_${currentUserId}`
      const cachedComments = readStaleCache<any[]>(cmKey)
      if (cachedComments) {
        setNutritionistComments(cachedComments)
      }
      apiFetch(`/api/admin/comments?memberId=${currentUserId}`)
        .then(r => r.ok ? r.json() : [])
        .then((data: any[]) => {
          const mapped = (data || []).map(c => ({
            id: c.id,
            date: new Date(c.created_at).toLocaleString('sv-SE', { timeZone: 'Asia/Tokyo' }).slice(0, 16),
            staffName: c.staff_name,
            category: c.category,
            comment: c.comment,
          }))
          setNutritionistComments(mapped)
          writeCache(cmKey, mapped)
        })
        .catch(() => {})

      // --- 目標データ ---
      const gKey = `dash_goal_${currentUserId}`
      const cachedGoal = readStaleCache<{ cal: number; protein: number; fat: number; carbs: number }>(gKey)
      if (cachedGoal) {
        setGoal(cachedGoal)
      }
      apiFetch(`/api/user-goals?userId=${currentUserId}`)
        .then(r => r.ok ? r.json() : null)
        .then(gData => {
          if (gData) {
            const g = {
              cal: gData.cal || 2000,
              protein: gData.protein || 150,
              fat: gData.fat || 55,
              carbs: gData.carbs || 220,
            }
            setGoal(g)
            writeCache(gKey, g)
          }
        }).catch(() => {})

      // --- 食事記録（今日分） ---
      const mKey = `dash_meals_${currentUserId}_${today}`
      const cachedMeals = readStaleCache<MealRecord[]>(mKey)
      if (cachedMeals) {
        setTodayMealRecords(cachedMeals)
        const totals = cachedMeals.reduce((acc, r) => ({
          calories: acc.calories + (r.caloriesKcal || 0),
          protein: acc.protein + (r.proteinG || 0),
          fat: acc.fat + (r.fatG || 0),
          carbs: acc.carbs + (r.carbsG || 0),
        }), { calories: 0, protein: 0, fat: 0, carbs: 0 })
        setTodayNutrition(totals)
      }
      apiFetch(`/api/meals?userId=${currentUserId}&from=${today}&to=${today}`)
        .then(r => r.ok ? r.json() : [])
        .then((data: any[]) => {
          const todayRecs: MealRecord[] = (data || []).map((r: any) => ({
            id: r.id,
            mealDate: r.meal_date,
            mealType: r.meal_type,
            foodName: r.food_name || '',
            caloriesKcal: Number(r.calories_kcal) || 0,
            proteinG: Number(r.protein_g) || 0,
            fatG: Number(r.fat_g) || 0,
            carbsG: Number(r.carbs_g) || 0,
            fiberG: 0, saltG: 0,
            items: Array.isArray(r.items) ? r.items : [],
          }))
          setTodayMealRecords(todayRecs)
          const totals = todayRecs.reduce((acc, r) => ({
            calories: acc.calories + (r.caloriesKcal || 0),
            protein: acc.protein + (r.proteinG || 0),
            fat: acc.fat + (r.fatG || 0),
            carbs: acc.carbs + (r.carbsG || 0),
          }), { calories: 0, protein: 0, fat: 0, carbs: 0 })
          setTodayNutrition(totals)
          writeCache(mKey, todayRecs)
        }).catch(() => {
          if (!cachedMeals) {
            setTodayMealRecords([])
            setTodayNutrition({ calories: 0, protein: 0, fat: 0, carbs: 0 })
          }
        })

      // --- 体組成データ ---
      const bKey = `dash_body_${currentUserId}`
      type BodyState = { weight: string; bodyFat: string; muscle: string; weightChange: string; fatChange: string; muscleChange: string } | null
      const cachedBody = readStaleCache<BodyState>(bKey)
      if (cachedBody) {
        setLatestBody(cachedBody)
      }
      apiFetch(`/api/body-records?userId=${currentUserId}`)
        .then(r => r.ok ? r.json() : [])
        .then((data: any[]) => {
          const sorted = (data || []).sort((a: any, b: any) => b.date.localeCompare(a.date))
          let bodyState: BodyState = null
          if (sorted.length > 0) {
            const latest = sorted[0]
            const prev = sorted.length > 1 ? sorted[1] : null
            const wChange = prev ? (latest.weight - prev.weight).toFixed(1) : '—'
            const fChange = prev ? (latest.body_fat - prev.body_fat).toFixed(1) : '—'
            const mChange = prev ? (latest.muscle - prev.muscle).toFixed(1) : '—'
            bodyState = {
              weight: latest.weight != null ? String(Number(latest.weight).toFixed(1)) : '—',
              bodyFat: latest.body_fat != null ? String(Number(latest.body_fat).toFixed(1)) : '—',
              muscle: latest.muscle != null ? String(Number(latest.muscle).toFixed(1)) : '—',
              weightChange: wChange !== '—' ? (Number(wChange) >= 0 ? '+' + wChange : wChange) : '—',
              fatChange: fChange !== '—' ? (Number(fChange) >= 0 ? '+' + fChange : fChange) : '—',
              muscleChange: mChange !== '—' ? (Number(mChange) >= 0 ? '+' + mChange : mChange) : '—',
            }
          }
          setLatestBody(bodyState)
          writeCache(bKey, bodyState)
        }).catch(() => { if (!cachedBody) setLatestBody(null) })

      // ポイントデータをAPIから取得
      apiFetch(`/api/user-points?userId=${currentUserId}`)
        .then(r => r.ok ? r.json() : null)
        .then(ptData => {
          if (ptData) {
            setTotalPoints(ptData.total_points ?? 0)
            setAvailableLotteries(Math.floor((ptData.total_points ?? 0) / 100))
            const todayStr = toJSTDateStr()
            const todayRec = (ptData.records || []).find((r: any) => r.date === todayStr)
            if (todayRec) {
              const earned = [todayRec.breakfast, todayRec.lunch, todayRec.dinner, todayRec.snack, todayRec.bonus, todayRec.body].filter(Boolean).length
              setTodayEarned(earned)
              setTodayMeals({
                breakfast: todayRec.breakfast || false,
                lunch: todayRec.lunch || false,
                dinner: todayRec.dinner || false,
                snack: todayRec.snack || false,
                bonus: todayRec.bonus || false,
              })
            } else {
              setTodayEarned(0)
            }
            setLotteryHistory((ptData.lottery_history || []).slice(0, 10))
          }
        }).catch(() => {})

      // プラン使用量を取得
      apiFetch('/api/plan-usage')
        .then(r => r.ok ? r.json() : null)
        .then((usage) => {
          if (usage) setPlanUsage(usage)
        }).catch(() => {})
    }

    // 予約データをAPI優先で読み込む
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const todayStr = toJSTDateStr()

      if (session?.user?.id) {
        const uid = session.user.id
        setUserId(uid)

        // サブスクリプション情報を取得
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_plan, subscription_status')
            .eq('id', uid)
            .single()
          if (profile) {
            setSubscriptionPlan(profile.subscription_plan || 'free')
            setSubscriptionStatus(profile.subscription_status || 'none')
          }
        } catch { /* ignore */ }

        // APIから取得を試みる
        try {
          const res = await apiFetch(`/api/reservations?userId=${uid}`)
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

  // 初回読み込み（userId取得後に再ロード）
  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // userId確定後にデータ再ロード
  useEffect(() => {
    if (userId) loadAllData(userId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // ページに戻ったとき（食事記録ページから戻る等）にデータを再読み込み
  useEffect(() => {
    const reload = () => loadAllData()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadAllData()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', reload)
    window.addEventListener('storage', reload)
    window.addEventListener('mealRecordsUpdated', reload)
    window.addEventListener('popstate', reload)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', reload)
      window.removeEventListener('storage', reload)
      window.removeEventListener('mealRecordsUpdated', reload)
      window.removeEventListener('popstate', reload)
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
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px 12px 40px', overflowX: 'hidden' }}>

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
                {/* ビタミン・ミネラル（1日合計） */}
                {(() => {
                  const allItems = todayMealRecords.flatMap(r => (r.items || []) as Array<Micronutrients & Record<string, unknown>>)
                  const microTotals = sumMicros(allItems)
                  const hasAny = Object.keys(microTotals).length > 0
                  return (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280' }}>ビタミン・ミネラル</span>
                        {hasAny && (
                          <button
                            type="button"
                            onClick={() => setShowAllMicrosDash(s => !s)}
                            style={{
                              fontSize: '10px', fontWeight: 700, color: '#7C3AED',
                              background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 4px',
                            }}
                          >
                            {showAllMicrosDash ? '主要だけ ▲' : '全17項目 ▼'}
                          </button>
                        )}
                      </div>
                      {!hasAny ? (
                        <p style={{ fontSize: '10px', color: '#9ca3af', margin: 0 }}>
                          AIで食事を記録するとビタミン・ミネラルも表示されます
                        </p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                          {(showAllMicrosDash ? MICRONUTRIENT_KEYS : MICRO_PRIMARY).map((k) => {
                            const meta = MICRONUTRIENT_LABELS[k as MicronutrientKey]
                            const value = (microTotals as Record<string, number>)[k] || 0
                            const target = MICRO_RDA[k as MicronutrientKey] || 1
                            const pct = Math.min((value / target) * 100, 100)
                            const color = getMicroBarColor(k as MicronutrientKey)
                            const display = value < 10 ? value.toFixed(1) : Math.round(value).toString()
                            return (
                              <div key={k} style={{ background: '#f9fafb', borderRadius: '6px', padding: '6px' }}>
                                <p style={{ fontSize: '9px', color: '#9ca3af', marginBottom: '1px' }}>{meta.name}</p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>{display}</span>
                                  <span style={{ fontSize: '9px', color: '#9ca3af' }}>{meta.unit}</span>
                                </div>
                                <div style={{ width: '100%', height: '3px', background: '#e5e7eb', borderRadius: '4px', marginTop: '3px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', borderRadius: '4px', width: `${pct}%`, background: color, transition: 'width 0.5s' }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })()}
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

        {/* ===== 現在のプラン（コンパクト） ===== */}
        {(() => {
          const planInfo: Record<string, { name: string; color: string; bg: string; border: string; icon: string }> = {
            light:    { name: 'ライト',       color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', icon: '🌱' },
            standard: { name: 'スタンダード', color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: '⭐' },
            premium:  { name: 'プレミアム',   color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', icon: '👑' },
            none:     { name: 'プラン未選択', color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', icon: '❓' },
          }
          // プランIDを正規化: null/undefined/''/'free' は 'none' 扱い
          const normalizedPlan = (subscriptionPlan && ['light','standard','premium'].includes(subscriptionPlan))
            ? subscriptionPlan
            : 'none'
          const plan = planInfo[normalizedPlan]

          // ステータスラベル（トライアル中と利用中を区別して強調表示）
          const isTrialing = subscriptionStatus === 'trialing' || subscriptionStatus === 'trial'
          const isActive = subscriptionStatus === 'active'
          const isCancelling = subscriptionStatus === 'cancelling'
          const isCancelled = subscriptionStatus === 'cancelled'

          let statusText = ''
          let statusBg = ''
          let statusColor = ''
          if (isTrialing) {
            statusText = '🎁 無料トライアル中'
            statusBg = '#dcfce7'
            statusColor = '#16a34a'
          } else if (isActive) {
            statusText = '✓ 利用中'
            statusBg = 'rgba(255,255,255,0.8)'
            statusColor = '#6b7280'
          } else if (isCancelling) {
            statusText = '⚠️ 解約予定'
            statusBg = '#fef3c7'
            statusColor = '#92400e'
          } else if (isCancelled) {
            statusText = '❌ 解約済み'
            statusBg = '#fee2e2'
            statusColor = '#dc2626'
          }

          const showUpgrade = normalizedPlan !== 'premium'
          // プラン未選択時は「プランを選ぶ」ボタンに変更
          const upgradeLabel = normalizedPlan === 'none' ? '📝 プランを選ぶ' : '↑ アップグレード'

          return (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: plan.bg, border: `1px solid ${plan.border}`,
              borderRadius: '12px', padding: '10px 14px', marginBottom: '12px',
              gap: '8px', flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '16px' }}>{plan.icon}</span>
                <span style={{ fontSize: '14px', fontWeight: 900, color: plan.color }}>{plan.name}</span>
                {statusText && (
                  <span style={{
                    fontSize: '10px', fontWeight: 800,
                    color: statusColor,
                    background: statusBg,
                    padding: '3px 10px',
                    borderRadius: '20px',
                    border: `1px solid ${statusColor}33`,
                  }}>{statusText}</span>
                )}
              </div>
              {showUpgrade && (
                <Link href="/upgrade" style={{
                  fontSize: '11px', fontWeight: 800, color: '#7c3aed',
                  textDecoration: 'none', whiteSpace: 'nowrap',
                  background: 'rgba(124,58,237,0.08)', padding: '5px 12px',
                  borderRadius: '8px', border: '1px solid rgba(124,58,237,0.2)',
                }}>
                  {upgradeLabel}
                </Link>
              )}
            </div>
          )
        })()}

        {/* ===== 今月の使用状況 ===== */}
        {planUsage && (
          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '14px',
            padding: '12px 14px',
            marginBottom: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{
              fontSize: '11px', fontWeight: 700, color: '#6b7280',
              marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              📊 利用状況
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {/* ミーティング */}
              <div style={{
                background: planUsage.meetings.limit === 0 ? '#f9fafb' : '#eff6ff',
                border: `1px solid ${planUsage.meetings.limit === 0 ? '#e5e7eb' : '#bfdbfe'}`,
                borderRadius: '10px',
                padding: '10px 12px',
              }}>
                <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 600, marginBottom: '4px' }}>
                  📅 ミーティング
                </div>
                {planUsage.meetings.unlimited ? (
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#2563eb' }}>無制限</div>
                ) : planUsage.meetings.limit === 0 ? (
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af' }}>プラン対象外</div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 900, color: '#2563eb' }}>{planUsage.meetings.used}</span>
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>/ {planUsage.meetings.limit}回</span>
                    </div>
                    <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '2px' }}>
                      {planUsage.meetings.period === 'total' ? 'トライアル合計' : '今月'}
                    </div>
                  </>
                )}
              </div>
              {/* AI食事解析 */}
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '10px',
                padding: '10px 12px',
              }}>
                <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 600, marginBottom: '4px' }}>
                  🤖 AI食事解析
                </div>
                {planUsage.aiAnalysis.unlimited ? (
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#16a34a' }}>無制限</div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 900, color: '#16a34a' }}>{planUsage.aiAnalysis.used}</span>
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>/ {planUsage.aiAnalysis.limit}回</span>
                    </div>
                    <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '2px' }}>今日</div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

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
              {availableLotteries > 0 ? `抽選する（${availableLotteries}回）` : `100pt で抽選（あと ${100 - totalPoints % 100} pt）`}
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
            {(() => {
              const isWinResult = !!lotteryResult && lotteryResult.rarity !== 'miss'
              const isMissResult = !!lotteryResult && lotteryResult.rarity === 'miss'
              const isLegendaryResult = lotteryResult?.rarity === 'legendary'
              const isUltra = lotteryResult?.rarity === 'ultra_rare'
              const accentSolid = isLegendaryResult ? '#a855f7' : isUltra ? '#fbbf24' : '#e879f9'
              const accentDeep = isLegendaryResult ? '#6d28d9' : isUltra ? '#b45309' : '#be185d'
              const accentGold = isLegendaryResult
                ? 'linear-gradient(135deg, #60a5fa 0%, #a855f7 25%, #ec4899 50%, #f59e0b 75%, #60a5fa 100%)'
                : isUltra
                ? 'linear-gradient(180deg, #fef3c7 0%, #fbbf24 40%, #b45309 100%)'
                : 'linear-gradient(180deg, #fde68a 0%, #e879f9 45%, #be185d 100%)'
              return (
                <>
                  <style>{`
                    @keyframes dashLuxuryEntrance {
                      0%   { opacity: 0; transform: scale(0.5); filter: blur(8px); }
                      60%  { opacity: 1; transform: scale(1.08); filter: blur(0); }
                      100% { opacity: 1; transform: scale(1); filter: blur(0); }
                    }
                    @keyframes dashShimmer {
                      0%, 100% { filter: brightness(1) drop-shadow(0 0 10px rgba(251,191,36,0.5)); }
                      50%      { filter: brightness(1.25) drop-shadow(0 0 20px rgba(251,191,36,0.9)); }
                    }
                    @keyframes dashShimmerIridescent {
                      0%, 100% { filter: brightness(1) drop-shadow(0 0 12px rgba(168,85,247,0.6)) hue-rotate(0deg); }
                      50%      { filter: brightness(1.4) drop-shadow(0 0 30px rgba(236,72,153,0.9)) hue-rotate(30deg); }
                    }
                    @keyframes dashIridescentShift {
                      0%   { background-position: 0% 50%; }
                      50%  { background-position: 100% 50%; }
                      100% { background-position: 0% 50%; }
                    }
                    @keyframes dashSadEntrance {
                      0%   { opacity: 0; letter-spacing: 32px; filter: blur(6px); }
                      100% { opacity: 1; letter-spacing: 10px; filter: blur(0); }
                    }
                    @keyframes dashFade {
                      from { opacity: 0; transform: translateY(8px); }
                      to   { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes dashRingSpin { to { transform: rotate(360deg); } }
                    @keyframes dashConfetti {
                      0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
                      100% { transform: translateY(400px) rotate(540deg); opacity: 0.7; }
                    }
                    @keyframes dashRain {
                      0%   { transform: translateY(-20px); opacity: 0; }
                      20%  { opacity: 0.6; }
                      100% { transform: translateY(380px); opacity: 0; }
                    }
                  `}</style>

                  {/* ========== ヘッダー（結果に応じて変化） ========== */}
                  <div style={{
                    background: isWinResult
                      ? (isLegendaryResult
                          ? 'linear-gradient(135deg, #0a0418 0%, #2a0f3d 50%, #0a0418 100%)'
                          : isUltra
                          ? 'linear-gradient(135deg, #1a0f07 0%, #3b2412 100%)'
                          : 'linear-gradient(135deg, #150810 0%, #3a1430 100%)')
                      : isMissResult ? 'linear-gradient(135deg, #1f2937 0%, #0f172a 100%)'
                      : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    padding: '28px 20px 22px', textAlign: 'center',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{
                      fontFamily: '"Noto Serif JP", "Hiragino Mincho ProN", serif',
                      fontSize: '26px', fontWeight: 900,
                      letterSpacing: '12px', paddingLeft: '12px',
                      color: '#fde68a', margin: 0,
                      background: 'linear-gradient(180deg, #fef3c7 0%, #fbbf24 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}>
                      賞品抽選
                    </div>
                    <p style={{
                      fontSize: '11px', color: 'rgba(253,230,138,0.7)',
                      letterSpacing: '4px', margin: '8px 0 0',
                      fontFamily: 'serif', fontStyle: 'italic',
                    }}>
                      100 POINTS × 1 DRAW
                    </p>
                  </div>

                  <div style={{ padding: '22px 20px', background: '#fffefb' }}>
                    {!lotteryResult ? (
                      <>
                        {/* 状況 */}
                        <p style={{ fontSize: '13px', color: '#57493b', textAlign: 'center', marginBottom: '14px', fontFamily: 'serif' }}>
                          保有ポイント <strong style={{ color: '#b45309', fontSize: '18px' }}>{totalPoints}</strong> pt
                          <span style={{ color: '#9ca3af', marginLeft: '8px', fontSize: '11px' }}>（{availableLotteries} 回抽選可能）</span>
                        </p>

                        {/* 景品一覧 */}
                        <div style={{
                          marginBottom: '20px',
                          border: '1px solid #f3e8d0',
                          borderRadius: '10px',
                          background: 'linear-gradient(180deg, #fffbeb 0%, #ffffff 100%)',
                          padding: '12px 14px',
                        }}>
                          <div style={{
                            fontFamily: 'serif', fontSize: '11px', fontWeight: 700,
                            color: '#b45309', letterSpacing: '6px', textAlign: 'center',
                            paddingBottom: '8px', marginBottom: '8px',
                            borderBottom: '1px dashed #f3e8d0',
                          }}>
                            PRIZE LIST
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {[
                              { name: 'リカバリープロ', prob: '1 / 300', tier: '超最上位' },
                              { name: 'Amazonギフト券 1,000円', prob: '1 / 100', tier: '最上位' },
                              { name: 'スタバギフト券 1,000円', prob: '1 / 100', tier: '最上位' },
                            ].map(p => (
                              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
                                <span style={{ flex: 1, fontFamily: 'serif', fontWeight: 700, color: '#1f2937' }}>{p.name}</span>
                                <span style={{
                                  fontSize: '10px', fontWeight: 800, color: '#b45309',
                                  background: '#fef3c7', padding: '2px 8px', borderRadius: '6px',
                                  fontFamily: 'serif', letterSpacing: '1px',
                                }}>{p.prob}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            if (!userId) return
                            setIsSpinning(true)
                            setTimeout(async () => {
                              try {
                                const res = await apiFetch('/api/user-points', {
                                  method: 'POST',
                                  body: JSON.stringify({ userId, action: 'lottery' }),
                                })
                                if (res.ok) {
                                  const data = await res.json()
                                  if (data.lotteryResult) {
                                    setLotteryResult(data.lotteryResult)
                                    setTotalPoints(data.total_points ?? 0)
                                    setAvailableLotteries(Math.floor((data.total_points ?? 0) / 100))
                                    setLotteryHistory((data.lottery_history || []).slice(0, 10))
                                  }
                                }
                              } catch { /* ignore */ }
                              setIsSpinning(false)
                            }, 1800)
                          }}
                          disabled={availableLotteries === 0 || isSpinning}
                          style={{
                            width: '100%', padding: '15px', borderRadius: '10px', fontSize: '14px',
                            fontWeight: 900, border: 'none', fontFamily: 'inherit',
                            letterSpacing: '4px',
                            cursor: (availableLotteries > 0 && !isSpinning) ? 'pointer' : 'not-allowed',
                            background: (availableLotteries > 0 && !isSpinning)
                              ? 'linear-gradient(135deg, #fbbf24 0%, #b45309 100%)' : '#d1d5db',
                            color: (availableLotteries > 0 && !isSpinning) ? '#1a0f07' : 'white',
                            boxShadow: (availableLotteries > 0 && !isSpinning) ? '0 6px 20px rgba(180,83,9,0.4)' : 'none',
                          }}
                        >
                          {isSpinning ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{
                                width: '14px', height: '14px',
                                border: '2px solid rgba(26,15,7,0.3)',
                                borderTopColor: '#1a0f07',
                                borderRadius: '50%',
                                animation: 'dashRingSpin 0.7s linear infinite',
                                display: 'inline-block',
                              }} />
                              抽選中...
                            </span>
                          ) : '100pt で抽選する'}
                        </button>
                      </>
                    ) : isWinResult ? (
                      <>
                        {/* 当選：豪華表示 */}
                        <div style={{ position: 'relative', textAlign: 'center', overflow: 'hidden', borderRadius: '12px' }}>
                          {/* 紙吹雪 */}
                          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
                            {Array.from({ length: isLegendaryResult ? 50 : 30 }).map((_, i) => {
                              const gold = ['#fde68a', '#fbbf24', '#f59e0b', '#fef3c7', '#d97706']
                              const rose = ['#fbcfe8', '#f472b6', '#e879f9', '#fef3c7', '#be185d']
                              const iridescent = ['#60a5fa', '#a855f7', '#ec4899', '#f59e0b', '#34d399', '#fde68a', '#ffffff']
                              const palette = isLegendaryResult ? iridescent : isUltra ? gold : rose
                              const left = (i * 3.3) % 100
                              const delay = (i * 0.08) % 2
                              const duration = 2.5 + (i % 4) * 0.4
                              return (
                                <div key={i} style={{
                                  position: 'absolute', left: `${left}%`, top: '-10px',
                                  width: '7px', height: `${7 + (i % 3) * 5}px`,
                                  background: palette[i % palette.length],
                                  borderRadius: i % 2 === 0 ? '50%' : '1px',
                                  animation: `dashConfetti ${duration}s ease-in ${delay}s infinite`,
                                  opacity: 0.9,
                                }} />
                              )
                            })}
                          </div>

                          {/* 中央ゴールドグロー */}
                          <div style={{
                            position: 'absolute', top: '30%', left: '50%',
                            width: '280px', height: '280px',
                            transform: 'translate(-50%, -50%)',
                            background: isLegendaryResult
                              ? 'radial-gradient(circle, rgba(168,85,247,0.45) 0%, rgba(236,72,153,0.2) 40%, rgba(96,165,250,0) 70%)'
                              : isUltra
                              ? 'radial-gradient(circle, rgba(251,191,36,0.35) 0%, rgba(251,191,36,0) 60%)'
                              : 'radial-gradient(circle, rgba(232,121,249,0.35) 0%, rgba(232,121,249,0) 60%)',
                            pointerEvents: 'none', zIndex: 0,
                          }} />

                          <div style={{ position: 'relative', zIndex: 1, padding: '12px 0 4px' }}>
                            {/* 大当選 */}
                            <div style={{
                              fontFamily: '"Noto Serif JP", serif',
                              fontSize: isLegendaryResult ? '48px' : '44px', fontWeight: 900,
                              letterSpacing: '14px', paddingLeft: '14px',
                              background: accentGold,
                              backgroundSize: isLegendaryResult ? '300% 300%' : '100% 100%',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              margin: '8px 0 4px',
                              animation: isLegendaryResult
                                ? 'dashLuxuryEntrance 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) both, dashShimmerIridescent 2.5s ease-in-out 0.9s infinite, dashIridescentShift 4s ease-in-out 0.9s infinite'
                                : 'dashLuxuryEntrance 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) both, dashShimmer 2.5s ease-in-out 0.9s infinite',
                              lineHeight: 1,
                            }}>
                              {isLegendaryResult ? '神引き' : '大当選'}
                            </div>
                            <div style={{
                              fontFamily: 'serif', fontStyle: 'italic',
                              fontSize: '11px', color: accentDeep, letterSpacing: '8px',
                              paddingLeft: '8px', marginBottom: '18px',
                              animation: 'dashFade 0.6s ease-out 0.7s both',
                            }}>
                              {isLegendaryResult ? 'LEGENDARY DRAW' : 'CONGRATULATIONS'}
                            </div>

                            {/* 景品カード */}
                            <div style={{
                              position: 'relative',
                              background: 'linear-gradient(180deg, #fffbeb 0%, #ffffff 50%, #fef3c7 100%)',
                              border: `2px solid ${accentSolid}`,
                              borderRadius: '14px',
                              padding: '22px 18px 18px',
                              margin: '0 auto 14px',
                              animation: 'dashLuxuryEntrance 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both',
                              boxShadow: `0 0 40px ${accentSolid}66, 0 8px 20px rgba(0,0,0,0.15)`,
                            }}>
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center',
                                marginBottom: '10px',
                              }}>
                                <div style={{ flex: 1, height: '1px', background: `linear-gradient(90deg, transparent, ${accentDeep})` }} />
                                <div style={{
                                  fontFamily: 'serif', fontSize: '10px', fontWeight: 700,
                                  color: accentDeep, letterSpacing: '5px', fontStyle: 'italic',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {isLegendaryResult ? 'LEGENDARY' : isUltra ? 'ULTRA RARE' : 'SUPER RARE'} PRIZE
                                </div>
                                <div style={{ flex: 1, height: '1px', background: `linear-gradient(90deg, ${accentDeep}, transparent)` }} />
                              </div>
                              <div style={{
                                fontFamily: '"Noto Serif JP", serif',
                                fontSize: '22px', fontWeight: 900,
                                color: '#1a0f07', lineHeight: 1.25,
                                letterSpacing: '1px',
                                margin: '0 0 8px',
                              }}>
                                {lotteryResult.prize}
                              </div>
                              <div style={{
                                fontSize: '11px', color: accentDeep, fontWeight: 700,
                                letterSpacing: '1px', fontFamily: 'serif',
                              }}>
                                {isLegendaryResult
                                  ? '当選確率 1 / 300　— 超最上位賞 LEGENDARY —'
                                  : '当選確率 1 / 100　— 最上位賞 —'}
                              </div>
                              {lotteryResult.prize === 'リカバリープロ' && (
                                <div style={{
                                  marginTop: '10px', paddingTop: '8px',
                                  borderTop: `1px dashed ${accentSolid}66`,
                                  fontSize: '11px', color: '#57493b',
                                  fontFamily: 'serif', fontStyle: 'italic',
                                  lineHeight: 1.6,
                                }}>
                                  リカバリーマシン1回無料券
                                </div>
                              )}
                              {(lotteryResult.prize === 'Amazonギフト券1000円'
                                || lotteryResult.prize === 'スタバギフト券1000円') && (
                                <div style={{
                                  marginTop: '10px', paddingTop: '8px',
                                  borderTop: `1px dashed ${accentSolid}66`,
                                  fontSize: '10px', color: '#78644c',
                                  lineHeight: 1.6, letterSpacing: '0.3px',
                                }}>
                                  ※ コードをお伝えします。<br />
                                  公式LINEまでご連絡ください。
                                </div>
                              )}
                            </div>

                            <p style={{ fontSize: '11px', color: '#78644c', margin: '0 0 14px', fontStyle: 'italic' }}>
                              賞品のお受取り方法は後日スタッフよりご案内いたします
                            </p>
                            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
                              残りポイント: <strong>{totalPoints}</strong> pt
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => setShowLotteryModal(false)}
                            style={{
                              flex: 1, padding: '11px', borderRadius: '10px', fontSize: '12px',
                              fontWeight: 700, letterSpacing: '3px',
                              border: `1px solid ${accentSolid}55`, background: 'white',
                              color: accentDeep, cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            閉じる
                          </button>
                          {availableLotteries > 0 && (
                            <button
                              onClick={() => setLotteryResult(null)}
                              style={{
                                flex: 1, padding: '11px', borderRadius: '10px', fontSize: '12px',
                                fontWeight: 900, letterSpacing: '3px', border: 'none',
                                background: accentGold,
                                color: '#1a0f07', cursor: 'pointer', fontFamily: 'inherit',
                                boxShadow: `0 6px 16px ${accentSolid}66`,
                              }}
                            >
                              もう一度回す
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        {/* 外れ：残念表示 */}
                        <div style={{ position: 'relative', textAlign: 'center', overflow: 'hidden', borderRadius: '12px', padding: '16px 0 8px' }}>
                          {/* 雨 */}
                          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
                            {Array.from({ length: 28 }).map((_, i) => {
                              const left = (i * 3.6) % 100
                              const delay = (i * 0.1) % 2
                              const duration = 1.1 + (i % 4) * 0.25
                              return (
                                <div key={i} style={{
                                  position: 'absolute', left: `${left}%`, top: '-20px',
                                  width: '1px', height: `${28 + (i % 3) * 14}px`,
                                  background: 'linear-gradient(180deg, rgba(148,163,184,0) 0%, rgba(148,163,184,0.5) 100%)',
                                  animation: `dashRain ${duration}s linear ${delay}s infinite`,
                                }} />
                              )
                            })}
                          </div>

                          <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{
                              fontFamily: '"Noto Serif JP", serif',
                              fontSize: '42px', fontWeight: 900,
                              color: '#64748b',
                              letterSpacing: '10px', paddingLeft: '10px',
                              animation: 'dashSadEntrance 1.3s ease-out both',
                              textShadow: '0 2px 10px rgba(0,0,0,0.15)',
                              margin: '4px 0',
                            }}>
                              残念...
                            </div>
                            <div style={{
                              fontFamily: 'serif', fontStyle: 'italic',
                              fontSize: '11px', color: '#94a3b8', letterSpacing: '8px',
                              paddingLeft: '8px', marginBottom: '18px',
                              animation: 'dashFade 1s ease-out 0.8s both',
                            }}>
                              NOT A WINNER
                            </div>

                            <div style={{
                              background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                              border: '1px solid #e2e8f0',
                              borderRadius: '12px',
                              padding: '20px 18px',
                              margin: '0 auto 14px',
                              animation: 'dashFade 1s ease-out 1s both',
                            }}>
                              <div style={{
                                fontFamily: '"Noto Serif JP", serif',
                                fontSize: '22px', fontWeight: 900, color: '#94a3b8',
                                letterSpacing: '8px', paddingLeft: '8px',
                                marginBottom: '8px',
                              }}>
                                外　れ
                              </div>
                              <div style={{
                                width: '40%', margin: '10px auto',
                                height: '1px',
                                background: 'linear-gradient(90deg, transparent, #cbd5e1, transparent)',
                              }} />
                              <div style={{
                                color: '#64748b', fontSize: '12px', lineHeight: 1.8,
                                fontFamily: 'serif', letterSpacing: '1px',
                              }}>
                                今回は当選されませんでした。<br />
                                次の挑戦をお待ちしています。
                              </div>
                            </div>

                            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '14px' }}>
                              残りポイント: <strong>{totalPoints}</strong> pt
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => setShowLotteryModal(false)}
                            style={{
                              flex: 1, padding: '11px', borderRadius: '10px', fontSize: '12px',
                              fontWeight: 700, letterSpacing: '3px',
                              border: '1px solid #e2e8f0', background: 'white',
                              color: '#64748b', cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            閉じる
                          </button>
                          {availableLotteries > 0 && (
                            <button
                              onClick={() => setLotteryResult(null)}
                              style={{
                                flex: 1, padding: '11px', borderRadius: '10px', fontSize: '12px',
                                fontWeight: 800, letterSpacing: '3px', border: 'none',
                                background: 'linear-gradient(135deg, #475569, #334155)',
                                color: '#e2e8f0', cursor: 'pointer', fontFamily: 'inherit',
                                boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
                              }}
                            >
                              もう一度挑戦する
                            </button>
                          )}
                        </div>
                      </>
                    )}

                    {/* 抽選履歴 */}
                    {lotteryHistory.length > 0 && (
                      <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #f3e8d0' }}>
                        <p style={{
                          fontSize: '10px', fontWeight: 700, color: '#b45309',
                          marginBottom: '8px', letterSpacing: '4px', fontFamily: 'serif',
                          textAlign: 'center',
                        }}>RECENT RESULTS</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {lotteryHistory.slice(0, 5).map((r, i) => {
                            const isWin = r.rarity !== 'miss'
                            return (
                              <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                fontSize: '11px',
                                padding: '6px 10px',
                                background: isWin ? '#fffbeb' : '#f8fafc',
                                border: `1px solid ${isWin ? '#fde68a' : '#e2e8f0'}`,
                                borderRadius: '6px',
                              }}>
                                <span style={{
                                  flex: 1, fontWeight: 700, fontFamily: 'serif',
                                  color: isWin ? '#b45309' : '#94a3b8',
                                }}>{r.prize}</span>
                                <span style={{ fontSize: '10px', color: '#9ca3af' }}>{new Date(r.date).toLocaleDateString('ja-JP')}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

        {/* ===== アップグレードCTA ===== */}
        {subscriptionPlan !== 'premium' && (
          <Link href="/upgrade" style={{ display: 'block', textDecoration: 'none', marginBottom: '12px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
              borderRadius: '14px',
              padding: '14px 16px',
              boxShadow: '0 4px 16px rgba(109,40,217,0.3)',
              boxSizing: 'border-box',
              width: '100%',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '10px', color: 'rgba(167,139,250,0.9)', fontWeight: 700, marginBottom: '3px', letterSpacing: '0.5px' }}>
                    👑 UPGRADE
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'white', marginBottom: '3px', lineHeight: 1.3 }}>
                    プランをアップグレード
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                    {subscriptionPlan === 'light'
                      ? 'ミーティング・フィードバックが使えます'
                      : 'ミーティング月2回・週1フィードバック'}
                  </div>
                </div>
                <div style={{
                  flexShrink: 0,
                  background: 'linear-gradient(90deg,#a78bfa,#7c3aed)',
                  color: 'white', padding: '8px 14px', borderRadius: '10px',
                  fontSize: '12px', fontWeight: 800,
                  boxShadow: '0 2px 8px rgba(124,58,237,0.5)',
                  whiteSpace: 'nowrap',
                }}>
                  見る →
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
