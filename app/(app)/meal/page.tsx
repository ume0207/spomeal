'use client'

import { useState } from 'react'

interface MealEntry {
  id: string
  name: string
  time: string
  category: string
  calories: number
  protein: number
  fat: number
  carbs: number
}

const demoMeals: MealEntry[] = [
  { id: '1', name: 'オートミール', time: '07:30', category: '朝食', calories: 150, protein: 5, fat: 3, carbs: 27 },
  { id: '2', name: 'プロテインシェイク', time: '07:30', category: '朝食', calories: 130, protein: 25, fat: 2, carbs: 5 },
  { id: '3', name: '鶏胸肉（ソテー）', time: '12:15', category: '昼食', calories: 200, protein: 40, fat: 5, carbs: 0 },
  { id: '4', name: '白米', time: '12:15', category: '昼食', calories: 250, protein: 4, fat: 0, carbs: 55 },
  { id: '5', name: 'サラダ', time: '12:15', category: '昼食', calories: 50, protein: 2, fat: 2, carbs: 8 },
  { id: '6', name: 'プロテインバー', time: '15:00', category: '間食', calories: 210, protein: 20, fat: 8, carbs: 20 },
]

const categories = ['朝食', '昼食', '夕食', '間食']

const catIcons: Record<string, string> = {
  朝食: '🌅',
  昼食: '☀️',
  夕食: '🌙',
  間食: '🍎',
}

export default function MealPage() {
  const [meals] = useState<MealEntry[]>(demoMeals)
  const [showAddModal, setShowAddModal] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 25))

  const totals = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      fat: acc.fat + meal.fat,
      carbs: acc.carbs + meal.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  )

  const groupedMeals = categories.reduce((acc, cat) => {
    acc[cat] = meals.filter((m) => m.category === cat)
    return acc
  }, {} as Record<string, MealEntry[]>)

  const calPct = Math.min((totals.calories / 2000) * 100, 100)
  const isOver = totals.calories > 2000

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

      {/* 緑ヘッダー（日付ナビゲーション） */}
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
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ◄
          </button>
          <button
            style={{
              fontSize: '13px',
              fontWeight: 700,
              minWidth: '130px',
              textAlign: 'center',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '4px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {dateLabel}
          </button>
          <button
            onClick={nextDay}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ►
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '12px 8px 100px' }}>

        {/* サマリーカード */}
        <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>本日の合計</span>
            <span style={{ fontSize: '11px', color: '#22C55E', fontWeight: 500 }}>目標 2,000 kcal</span>
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>摂取カロリー</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '36px', fontWeight: 900, color: '#111827', lineHeight: 1 }}>
              {totals.calories.toLocaleString()}
            </span>
            <span style={{ fontSize: '13px', color: '#9ca3af' }}>kcal</span>
          </div>
          <div style={{ width: '100%', height: '12px', background: '#f3f4f6', borderRadius: '20px', overflow: 'hidden', margin: '8px 0 4px' }}>
            <div
              style={{
                height: '100%',
                borderRadius: '20px',
                width: `${calPct}%`,
                background: isOver
                  ? 'linear-gradient(90deg, #22C55E 0%, #F59E0B 60%, #EF4444 100%)'
                  : 'linear-gradient(90deg, #22C55E 0%, #86efac 100%)',
                transition: 'width 0.5s',
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', marginTop: '12px' }}>
            {[
              { label: 'たんぱく質', value: totals.protein, target: 160, unit: 'g', color: '#3B82F6' },
              { label: '脂質', value: totals.fat, target: 60, unit: 'g', color: '#F59E0B' },
              { label: '炭水化物', value: totals.carbs, target: 250, unit: 'g', color: '#10B981' },
            ].map((item) => (
              <div key={item.label}>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>{item.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 900, color: '#111827' }}>{item.value}</span>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>/{item.target}{item.unit}</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#f3f4f6', borderRadius: '20px', overflow: 'hidden', marginTop: '4px' }}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: '20px',
                      width: `${Math.min((item.value / item.target) * 100, 100)}%`,
                      background: item.color,
                      transition: 'width 0.5s',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 食事リスト */}
        {categories.map((cat) => {
          const catMeals = groupedMeals[cat]
          const catTotal = catMeals.reduce((s, m) => s + m.calories, 0)
          return (
            <div key={cat} style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '12px' }}>
              {/* セクションヘッダー */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>{catIcons[cat]}</span>
                <span style={{ fontSize: '14px', fontWeight: 700, flex: 1 }}>{cat}</span>
                {catTotal > 0 && (
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                    {catTotal} kcal
                  </span>
                )}
                <button
                  onClick={() => setShowAddModal(true)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f0fdf4',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '18px',
                    color: '#22c55e',
                    fontFamily: 'inherit',
                    fontWeight: 300,
                  }}
                >
                  +
                </button>
              </div>

              {catMeals.length === 0 ? (
                <div style={{ padding: '20px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
                  まだ記録がありません
                </div>
              ) : (
                <div>
                  {catMeals.map((meal) => (
                    <div
                      key={meal.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 16px',
                        borderBottom: '1px solid #f8f8f8',
                        gap: '8px',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {meal.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                          P:{meal.protein}g · F:{meal.fat}g · C:{meal.carbs}g
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: '#f0fdf4',
                          color: '#16a34a',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {meal.calories} kcal
                      </span>
                      <button
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#d1d5db',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '14px',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
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
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setShowAddModal(false)}
          />
          <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '640px', background: 'white', borderRadius: '24px 24px 0 0', padding: '24px' }}>
            <div style={{ width: '48px', height: '4px', background: '#e5e7eb', borderRadius: '2px', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', marginBottom: '16px' }}>食事を追加</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              {[
                { icon: '📷', label: '写真から解析', sublabel: 'AI自動認識', premium: true },
                { icon: '🔍', label: '食品検索', sublabel: 'データベース検索' },
                { icon: '✏️', label: '手入力', sublabel: '自分で入力' },
                { icon: '📋', label: 'よく食べる', sublabel: 'お気に入り' },
              ].map((item) => (
                <button
                  key={item.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: '#f9fafb',
                    borderRadius: '12px',
                    border: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#1f2937', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {item.label}
                      {item.premium && (
                        <span style={{ fontSize: '9px', background: '#fef3c7', color: '#d97706', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>PRO</span>
                      )}
                    </div>
                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>{item.sublabel}</div>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                background: '#f3f4f6',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                color: '#6b7280',
                fontFamily: 'inherit',
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
