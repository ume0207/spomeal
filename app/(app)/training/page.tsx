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

const weekDays = ['月', '火', '水', '木', '金', '土', '日']
const weekHasTraining = [true, false, true, false, true, false, false] // 今週のトレーニング状況

export default function TrainingPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeFilter, setActiveFilter] = useState('すべて')
  const [expanded, setExpanded] = useState<string | null>('1')
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 25))
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('筋トレ')
  const [newDuration, setNewDuration] = useState('')
  const [newCalories, setNewCalories] = useState('')
  const [newIntensity, setNewIntensity] = useState('medium')

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

      {/* ===== 日付ナビゲーションヘッダー（紫グラデーション）===== */}
      <div
        style={{
          background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 60%, #a78bfa 100%)',
          color: 'white',
          padding: '12px 16px',
          position: 'sticky',
          top: '126px',
          zIndex: 90,
        }}
      >
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '8px', minHeight: '40px', position: 'relative',
          }}
        >
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={prevDay}
                  style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  ◄
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  style={{
                    fontSize: '13px', fontWeight: 700, minWidth: '120px',
                    textAlign: 'center', color: 'white', padding: '2px 8px',
                    borderRadius: '4px', background: 'none', border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {dateLabel}
                </button>
                <button
                  onClick={nextDay}
                  style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  ►
                </button>
              </div>
              <span
                style={{
                  fontSize: '10px', background: 'rgba(255,255,255,0.25)',
                  borderRadius: '20px', padding: '2px 8px', fontWeight: 600,
                }}
              >
                今日: 1件
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '12px 12px 100px' }}>

        {/* ===== トレーニングタイムライン ===== */}
        <div
          style={{
            background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '12px',
          }}
        >
          <div style={{ borderTop: '1px solid #f3f4f6' }}>
            {filtered.map((workout, idx) => {
              const catStyle = catColors[workout.category] || { bg: '#f3f4f6', color: '#374151' }
              const intensityMap: Record<string, { bg: string; color: string; label: string }> = {
                筋トレ: { bg: '#fef3c7', color: '#d97706', label: '中強度' },
                有酸素: { bg: '#d1fae5', color: '#059669', label: '軽強度' },
              }
              const intensity = intensityMap[workout.category] || { bg: '#f3f4f6', color: '#6b7280', label: '中強度' }
              return (
                <div
                  key={workout.id}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '10px 16px',
                    borderBottom: idx < filtered.length - 1 ? '1px solid #f8f8f8' : 'none',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      width: '22px', height: '22px', borderRadius: '50%',
                      background: '#ede9fe', color: '#7c3aed', fontSize: '11px',
                      fontWeight: 700, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>{workout.title}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                      {workout.date} · {workout.duration}分 · {workout.calories}kcal
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '10px', padding: '2px 6px', borderRadius: '20px',
                      whiteSpace: 'nowrap' as const, flexShrink: 0,
                      background: catStyle.bg, color: catStyle.color,
                    }}
                  >
                    {workout.category}
                  </span>
                  <span
                    style={{
                      fontSize: '10px', padding: '2px 6px', borderRadius: '20px',
                      whiteSpace: 'nowrap' as const, flexShrink: 0,
                      background: intensity.bg, color: intensity.color,
                    }}
                  >
                    {intensity.label}
                  </span>
                  <button
                    style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', color: '#d1d5db', flexShrink: 0,
                      background: 'none', border: 'none', cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div style={{ padding: '20px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
                トレーニング記録がありません
              </div>
            )}
          </div>
        </div>

        {/* ===== 今週のトレーニング ===== */}
        <div
          style={{
            background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '12px',
          }}
        >
          <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#374151' }}>📅 今週のトレーニング</p>
          </div>
          <div style={{ padding: '12px 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '12px' }}>
              {weekDays.map((day, i) => (
                <div key={day} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '4px' }}>{day}</div>
                  <div
                    style={{
                      width: '28px', height: '28px', borderRadius: '50%', margin: '0 auto',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: 700,
                      background: i === 4 ? '#ede9fe' : weekHasTraining[i] ? '#7c3aed' : '#f3f4f6',
                      color: i === 4 ? '#7c3aed' : weekHasTraining[i] ? 'white' : '#d1d5db',
                      border: i === 4 ? '2px solid #7c3aed' : 'none',
                    }}
                  >
                    {19 + i}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {[
                { label: '今週のトレ', value: '3', unit: '回', color: '#7c3aed' },
                { label: '総時間', value: '195', unit: '分', color: '#7c3aed' },
                { label: '消費カロリー', value: '1,050', unit: 'kcal', color: '#7c3aed' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div style={{ fontSize: '10px', color: '#9ca3af' }}>{stat.label}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: stat.color }}>{stat.value}</span>
                    <span style={{ fontSize: '10px', color: '#9ca3af' }}>{stat.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>


      </div>

      {/* ===== FAB（トレーニングを記録するボタン）===== */}
      <div
        style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 50,
        }}
      >
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: '#7c3aed', color: 'white', fontWeight: 700,
            padding: '14px 32px', borderRadius: '50px',
            boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
            fontSize: '15px', transition: 'all 0.2s',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <span style={{ fontSize: '20px', fontWeight: 300 }}>＋</span>
          トレーニングを記録
        </button>
      </div>

      {/* ===== 追加モーダル ===== */}
      {showAddModal && (
        <div
          style={{
            display: 'flex', position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 300,
            alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              background: 'white', width: '100%', maxWidth: '500px',
              borderRadius: '24px 24px 0 0', maxHeight: '92vh', overflowY: 'auto',
              display: 'flex', flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                position: 'sticky', top: 0, background: 'white',
                borderBottom: '1px solid #f0f0f0', padding: '16px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderRadius: '24px 24px 0 0', zIndex: 10,
              }}
            >
              <p style={{ fontWeight: 700, color: '#111827', fontSize: '15px' }}>トレーニングを記録</p>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  fontSize: '20px', color: '#9ca3af', width: '32px', height: '32px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              {/* 種目名 */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>
                  種目名
                </label>
                <input
                  type="text"
                  placeholder="例：ベンチプレス、ランニング"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    width: '100%', border: '1px solid #e5e7eb', borderRadius: '12px',
                    padding: '10px 12px', fontSize: '14px', outline: 'none', color: '#1a1a1a',
                    background: 'white', fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* カテゴリ */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>
                  カテゴリ
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {['筋トレ', '有酸素', 'ストレッチ', 'チーム練習', 'その他'].map((cat) => (
                    <label
                      key={cat}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        fontSize: '12px', color: newCategory === cat ? '#6d28d9' : '#374151',
                        cursor: 'pointer', padding: '6px 12px',
                        border: newCategory === cat ? '1px solid #7c3aed' : '1px solid #e5e7eb',
                        borderRadius: '8px', transition: 'all 0.2s',
                        background: newCategory === cat ? '#f5f3ff' : 'white',
                        fontWeight: newCategory === cat ? 600 : 400,
                      }}
                    >
                      <input
                        type="radio"
                        style={{ display: 'none' }}
                        checked={newCategory === cat}
                        onChange={() => setNewCategory(cat)}
                      />
                      {cat}
                    </label>
                  ))}
                </div>
              </div>

              {/* 時間・カロリー */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                {[
                  { label: '時間 (分)', placeholder: '65', value: newDuration, onChange: setNewDuration },
                  { label: 'カロリー (kcal)', placeholder: '320', value: newCalories, onChange: setNewCalories },
                ].map((f) => (
                  <div key={f.label}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>
                      {f.label}
                    </label>
                    <input
                      type="number"
                      placeholder={f.placeholder}
                      value={f.value}
                      onChange={(e) => f.onChange(e.target.value)}
                      style={{
                        width: '100%', border: '1px solid #e5e7eb', borderRadius: '12px',
                        padding: '10px 12px', fontSize: '14px', outline: 'none', color: '#1a1a1a',
                        background: 'white', fontFamily: 'inherit', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* 強度 */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>
                  強度
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {[
                    { key: 'light', label: '軽強度', bg: '#f0fdf4', color: '#16a34a' },
                    { key: 'medium', label: '中強度', bg: '#fef3c7', color: '#d97706' },
                    { key: 'heavy', label: '高強度', bg: '#fef2f2', color: '#dc2626' },
                    { key: 'max', label: '最大', bg: '#3f0c5c', color: '#f5d0fe' },
                  ].map((level) => (
                    <button
                      key={level.key}
                      onClick={() => setNewIntensity(level.key)}
                      style={{
                        fontSize: '10px', padding: '2px 6px', borderRadius: '20px',
                        background: newIntensity === level.key ? level.bg : '#f3f4f6',
                        color: newIntensity === level.key ? level.color : '#9ca3af',
                        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                        fontWeight: 600, transition: 'all 0.15s',
                      }}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  width: '100%', background: '#7c3aed', color: 'white',
                  fontWeight: 700, padding: '12px', borderRadius: '12px',
                  fontSize: '15px', marginTop: '8px', border: 'none',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                記録する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
