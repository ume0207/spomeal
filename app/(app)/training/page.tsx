'use client'

import { useState } from 'react'

interface Exercise {
  name: string
  sets: number
  reps: number
  weight: number
  unit: string
}

interface WorkoutRecord {
  id: string
  date: string
  title: string
  category: string
  duration: number
  calories: number
  exercises: Exercise[]
}

const demoWorkouts: WorkoutRecord[] = [
  {
    id: '1',
    date: '今日',
    title: '胸・三頭筋',
    category: '筋トレ',
    duration: 65,
    calories: 320,
    exercises: [
      { name: 'ベンチプレス', sets: 4, reps: 8, weight: 80, unit: 'kg' },
      { name: 'インクラインDB', sets: 3, reps: 10, weight: 30, unit: 'kg' },
      { name: 'ケーブルクロス', sets: 3, reps: 12, weight: 20, unit: 'kg' },
      { name: 'トライセプス', sets: 3, reps: 12, weight: 30, unit: 'kg' },
    ],
  },
  {
    id: '2',
    date: '3月23日',
    title: '背中・二頭筋',
    category: '筋トレ',
    duration: 70,
    calories: 380,
    exercises: [
      { name: 'デッドリフト', sets: 4, reps: 6, weight: 120, unit: 'kg' },
      { name: '懸垂', sets: 4, reps: 8, weight: 0, unit: 'BW' },
      { name: 'ロープロウ', sets: 3, reps: 10, weight: 60, unit: 'kg' },
    ],
  },
  {
    id: '3',
    date: '3月21日',
    title: '朝ランニング',
    category: '有酸素',
    duration: 30,
    calories: 250,
    exercises: [
      { name: 'ランニング 5km', sets: 1, reps: 1, weight: 0, unit: '5km' },
    ],
  },
]

const categoryFilters = ['すべて', '筋トレ', '有酸素', 'ストレッチ', 'チーム練習']

const catColors: Record<string, { bg: string; color: string }> = {
  筋トレ: { bg: '#ede9fe', color: '#7c3aed' },
  有酸素: { bg: '#fce7f3', color: '#db2777' },
  ストレッチ: { bg: '#d1fae5', color: '#059669' },
  チーム練習: { bg: '#dbeafe', color: '#2563eb' },
}

export default function TrainingPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeFilter, setActiveFilter] = useState('すべて')
  const [expanded, setExpanded] = useState<string | null>('1')
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 25))

  const filtered = activeFilter === 'すべて'
    ? demoWorkouts
    : demoWorkouts.filter((w) => w.category === activeFilter)

  const prevDay = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() - 1)
    setCurrentDate(d)
  }
  const nextDay = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + 1)
    setCurrentDate(d)
  }
  const dateLabel = `${currentDate.getFullYear()}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${String(currentDate.getDate()).padStart(2, '0')}`

  return (
    <div style={{ fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif", color: '#1a1a1a' }}>

      {/* 日付ナビゲーション */}
      <div
        style={{
          background: '#22C55E',
          color: 'white',
          padding: '10px 16px',
          position: 'sticky',
          top: '60px',
          zIndex: 90,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '40px' }}>
          <button
            onClick={prevDay}
            style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ◄
          </button>
          <span style={{ fontSize: '13px', fontWeight: 700, minWidth: '130px', textAlign: 'center' }}>
            {dateLabel}
          </span>
          <button
            onClick={nextDay}
            style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ►
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px 12px 100px' }}>

        {/* 週間サマリー */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          {[
            { label: '今週のトレ', value: '3', unit: '回' },
            { label: '総時間', value: '195', unit: '分' },
            { label: '消費カロリー', value: '1,050', unit: 'kcal' },
          ].map((stat) => (
            <div key={stat.label} style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '14px', padding: '12px 8px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#22c55e' }}>{stat.value}</div>
              <div style={{ fontSize: '10px', color: '#9ca3af' }}>{stat.unit}</div>
            </div>
          ))}
        </div>

        {/* カテゴリフィルター */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '12px' }}>
          {categoryFilters.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                background: activeFilter === cat ? '#22c55e' : 'white',
                color: activeFilter === cat ? 'white' : '#6b7280',
                border: activeFilter === cat ? 'none' : '1px solid #e5e7eb',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* トレーニングリスト */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map((workout) => {
            const catStyle = catColors[workout.category] || { bg: '#f3f4f6', color: '#374151' }
            return (
              <div key={workout.id} style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <button
                  style={{ width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                  onClick={() => setExpanded(expanded === workout.id ? null : workout.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', background: '#f0fdf4', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                      💪
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>{workout.title}</span>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: catStyle.bg, color: catStyle.color }}>{workout.category}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                        {workout.date} · {workout.duration}分 · {workout.calories} kcal
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '16px', color: '#9ca3af', transform: expanded === workout.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>
                    ▼
                  </span>
                </button>

                {expanded === workout.id && (
                  <div style={{ padding: '0 16px 14px', borderTop: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', fontSize: '10px', fontWeight: 700, color: '#9ca3af', padding: '8px 0 4px', borderBottom: '1px solid #f3f4f6' }}>
                      <span>種目</span>
                      <span style={{ textAlign: 'center' }}>セット×回数</span>
                      <span style={{ textAlign: 'right' }}>重量</span>
                    </div>
                    {workout.exercises.map((ex, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', padding: '7px 0', borderBottom: i < workout.exercises.length - 1 ? '1px solid #f8f8f8' : 'none' }}>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#111827' }}>{ex.name}</span>
                        <span style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>{ex.sets}×{ex.reps}</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>
                          {ex.weight > 0 ? `${ex.weight}${ex.unit}` : ex.unit}
                        </span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button style={{ flex: 1, padding: '7px', fontSize: '12px', color: '#22c55e', fontWeight: 600, background: '#f0fdf4', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                        編集
                      </button>
                      <button style={{ flex: 1, padding: '7px', fontSize: '12px', color: '#ef4444', fontWeight: 600, background: '#fef2f2', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                        削除
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </div>

      {/* FABボタン */}
      <button
        onClick={() => setShowAddModal(true)}
        style={{
          position: 'fixed',
          bottom: '90px',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          color: 'white',
          fontSize: '28px',
          fontWeight: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(34,197,94,0.45)',
          zIndex: 50,
          fontFamily: 'inherit',
        }}
      >
        +
      </button>

      {/* 追加モーダル */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowAddModal(false)} />
          <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '640px', background: 'white', borderRadius: '24px 24px 0 0', padding: '24px' }}>
            <div style={{ width: '48px', height: '4px', background: '#e5e7eb', borderRadius: '2px', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>トレーニングを記録</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>本日のワークアウトを記録します</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              {['胸・三頭筋', '背中・二頭筋', '肩', '脚・臀部', '腕', 'カスタム'].map((t) => (
                <button
                  key={t}
                  style={{
                    padding: '12px 16px',
                    background: '#f9fafb',
                    borderRadius: '12px',
                    border: '1px solid #f0f0f0',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#374151',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f0fdf4'
                    e.currentTarget.style.borderColor = '#bbf7d0'
                    e.currentTarget.style.color = '#22c55e'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f9fafb'
                    e.currentTarget.style.borderColor = '#f0f0f0'
                    e.currentTarget.style.color = '#374151'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <button onClick={() => setShowAddModal(false)} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#f3f4f6', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#6b7280', fontFamily: 'inherit' }}>
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
