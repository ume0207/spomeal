'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { getPointsData, getTodayPoints, doLottery, getAvailableLotteries, getLotteryHistory, getRarityColor, getRarityLabel } from '@/lib/points'
import type { LotteryResult } from '@/lib/points'

const nutrition = {
  calories: { current: 1420, target: 2000 },
  protein: { current: 98, target: 160 },
  fat: { current: 42, target: 60 },
  carbs: { current: 165, target: 250 },
}

const supplements = [
  { name: 'ホエイプロテイン', timing: 'トレーニング後', done: true },
  { name: 'クレアチン', timing: 'トレーニング前', done: true },
  { name: 'BCAA', timing: 'トレーニング中', done: false },
  { name: 'マルチビタミン', timing: '朝食後', done: true },
]

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
  const calPct = Math.min((nutrition.calories.current / nutrition.calories.target) * 100, 100)
  const isOver = nutrition.calories.current > nutrition.calories.target
  const [suppState, setSuppState] = useState(supplements.map(s => s.done))
  const [goal, setGoal] = useState<GoalData | null>(null)
  const [nextReservation, setNextReservation] = useState<Reservation | null>(null)

  // ポイントシステム
  const [totalPoints, setTotalPoints] = useState(0)
  const [todayEarned, setTodayEarned] = useState(0)
  const [todayMeals, setTodayMeals] = useState({ breakfast: false, lunch: false, dinner: false, snack: false, bonus: false })
  const [availableLotteries, setAvailableLotteries] = useState(0)
  const [showLotteryModal, setShowLotteryModal] = useState(false)
  const [lotteryResult, setLotteryResult] = useState<LotteryResult | null>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [lotteryHistory, setLotteryHistory] = useState<LotteryResult[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('goals_v1')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed['__default__']) {
            setGoal(parsed['__default__'])
          }
        }
      } catch {
        // ignore
      }

      // ポイントデータ読み込み
      const ptData = getPointsData()
      setTotalPoints(ptData.totalPoints)
      setAvailableLotteries(getAvailableLotteries())
      const today = new Date().toISOString().slice(0, 10)
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

      try {
        const raw = localStorage.getItem('reservations_v1')
        if (raw) {
          const all: Reservation[] = JSON.parse(raw)
          const today = new Date().toISOString().slice(0, 10)
          const upcoming = all
            .filter(r => r.status === 'confirmed' && r.date >= today)
            .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
          setNextReservation(upcoming[0] ?? null)
        }
      } catch {
        // ignore
      }
    }
  }, [])

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
                href="/supplement"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '6px', padding: '16px 8px', borderRadius: '14px',
                  border: '1.5px solid #f97316', color: '#ea580c',
                  fontWeight: 700, fontSize: '12px', transition: 'all 0.2s',
                  textAlign: 'center', background: 'white', cursor: 'pointer', textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: '24px' }}>💊</span>
                サプリを記録
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
                {nutrition.calories.current.toLocaleString()}
              </span>
              <span style={{ fontSize: '13px', color: '#9ca3af' }}>
                / {nutrition.calories.target.toLocaleString()} kcal
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
                { label: 'たんぱく質', value: nutrition.protein.current, target: nutrition.protein.target, unit: 'g', color: '#3B82F6' },
                { label: '脂質', value: nutrition.fat.current, target: nutrition.fat.target, unit: 'g', color: '#F59E0B' },
                { label: '炭水化物', value: nutrition.carbs.current, target: nutrition.carbs.target, unit: 'g', color: '#10B981' },
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
          </div>
        </div>

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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {[
                { label: '体重', value: '72.4', unit: 'kg', change: '-0.3', isGood: true },
                { label: '体脂肪率', value: '18.5', unit: '%', change: '-0.2', isGood: true },
                { label: '筋肉量', value: '59.0', unit: 'kg', change: '+0.1', isGood: true },
              ].map((stat) => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#9ca3af' }}>{stat.label}</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, marginTop: '2px' }}>{stat.value}</div>
                  <div style={{ fontSize: '10px', color: '#9ca3af' }}>{stat.unit}</div>
                  <div style={{ marginTop: '2px', fontSize: '10px', fontWeight: 600, color: stat.isGood ? '#22c55e' : '#ef4444' }}>
                    {stat.change}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

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

        {/* ===== 今日のサプリ ===== */}
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
              💊 今日のサプリ
            </span>
            <Link href="/supplement" style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600, textDecoration: 'none' }}>詳細 ›</Link>
          </div>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {supplements.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 10px', borderRadius: '10px', background: '#fafafa',
                  }}
                >
                  <div
                    onClick={() => setSuppState(prev => prev.map((v, idx) => idx === i ? !v : v))}
                    style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      border: suppState[i] ? 'none' : '2px solid #d1d5db',
                      background: suppState[i] ? '#22c55e' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', flexShrink: 0, cursor: 'pointer',
                      color: suppState[i] ? 'white' : '#9ca3af',
                      transition: 'all 0.2s',
                    }}
                  >
                    {suppState[i] ? '✓' : ''}
                  </div>
                  <span style={{ flex: 1, fontSize: '13px', fontWeight: 600 }}>{s.name}</span>
                  <span style={{ fontSize: '10px', color: '#9ca3af' }}>{s.timing}</span>
                </div>
              ))}
            </div>
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
    </div>
  )
}
