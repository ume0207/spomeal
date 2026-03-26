'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

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

const trainingItems = [
  { name: '胸・三頭筋', cat: '筋トレ', detail: '65分 · 320kcal', catColor: '#7c3aed', catBg: '#ede9fe' },
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

export default function DashboardPage() {
  const calPct = Math.min((nutrition.calories.current / nutrition.calories.target) * 100, 100)
  const isOver = nutrition.calories.current > nutrition.calories.target
  const [suppState, setSuppState] = useState(supplements.map(s => s.done))
  const [goal, setGoal] = useState<GoalData | null>(null)

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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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
                href="/training"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '6px', padding: '16px 8px', borderRadius: '14px',
                  border: '1.5px solid #a855f7', color: '#9333ea',
                  fontWeight: 700, fontSize: '12px', transition: 'all 0.2s',
                  textAlign: 'center', background: 'white', cursor: 'pointer', textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: '24px' }}>💪</span>
                トレーニング
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

        {/* ===== 今日のトレーニング ===== */}
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
              💪 今日のトレーニング
            </span>
            <Link href="/training" style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600, textDecoration: 'none' }}>詳細 ›</Link>
          </div>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {trainingItems.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 0', borderBottom: '1px solid #f3f4f6',
                  }}
                >
                  <span
                    style={{
                      fontSize: '10px', fontWeight: 700, padding: '2px 8px',
                      borderRadius: '20px', background: item.catBg, color: item.catColor,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.cat}
                  </span>
                  <span style={{ flex: 1, fontSize: '13px', fontWeight: 600 }}>{item.name}</span>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>{item.detail}</span>
                </div>
              ))}
            </div>
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
    </div>
  )
}
