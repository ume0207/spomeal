'use client'

import { useState, useEffect } from 'react'

interface BodyRecord {
  date: string
  weight: number
  bodyFat: number
  muscle: number
  bmi: number
}

const height = 175 // cm

function calcBmi(weight: number) {
  return parseFloat((weight / ((height / 100) ** 2)).toFixed(1))
}

const demoRecords: BodyRecord[] = [
  { date: '3月25日', weight: 72.4, bodyFat: 18.5, muscle: 59.0, bmi: calcBmi(72.4) },
  { date: '3月24日', weight: 72.7, bodyFat: 18.7, muscle: 58.9, bmi: calcBmi(72.7) },
  { date: '3月23日', weight: 72.9, bodyFat: 18.9, muscle: 58.8, bmi: calcBmi(72.9) },
  { date: '3月22日', weight: 73.1, bodyFat: 19.0, muscle: 58.7, bmi: calcBmi(73.1) },
  { date: '3月21日', weight: 73.0, bodyFat: 19.1, muscle: 58.6, bmi: calcBmi(73.0) },
  { date: '3月20日', weight: 73.4, bodyFat: 19.2, muscle: 58.5, bmi: calcBmi(73.4) },
  { date: '3月19日', weight: 73.6, bodyFat: 19.4, muscle: 58.4, bmi: calcBmi(73.6) },
]

const weekWeights = demoRecords.map((r) => r.weight).reverse()
const minW = Math.min(...weekWeights) - 0.5
const maxW = Math.max(...weekWeights) + 0.5

const CUPS_GOAL = 8 // 1日の目標コップ数（1600ml）

export default function BodyPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [newWeight, setNewWeight] = useState('')
  const [newBodyFat, setNewBodyFat] = useState('')
  const [newMuscle, setNewMuscle] = useState('')
  const [targetWeight, setTargetWeight] = useState<number | null>(null)
  const [waterCups, setWaterCups] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 目標体重の読み込み
      try {
        const raw = localStorage.getItem('goals_v1')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed['__default__']?.targetWeight != null) {
            setTargetWeight(parsed['__default__'].targetWeight)
          }
        }
      } catch {
        // ignore
      }

      // 水分摂取量の読み込み
      try {
        const today = new Date().toISOString().slice(0, 10)
        const raw = localStorage.getItem('waterLog_v1')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed[today] != null) {
            setWaterCups(parsed[today])
          }
        }
      } catch {
        // ignore
      }
    }
  }, [])

  const updateWaterCups = (newCount: number) => {
    if (newCount < 0) return
    setWaterCups(newCount)
    if (typeof window !== 'undefined') {
      try {
        const today = new Date().toISOString().slice(0, 10)
        const raw = localStorage.getItem('waterLog_v1')
        const parsed = raw ? JSON.parse(raw) : {}
        parsed[today] = newCount
        localStorage.setItem('waterLog_v1', JSON.stringify(parsed))
      } catch {
        // ignore
      }
    }
  }

  const latest = demoRecords[0]
  const prev = demoRecords[1]
  const weightChange = (latest.weight - prev.weight).toFixed(1)
  const fatChange = (latest.bodyFat - prev.bodyFat).toFixed(1)
  const muscleChange = (latest.muscle - prev.muscle).toFixed(1)

  const bmi = latest.bmi
  const bmiLabel = bmi < 18.5 ? '低体重' : bmi < 25 ? '普通体重' : bmi < 30 ? '肥満(1度)' : '肥満(2度以上)'
  const bmiColor = bmi < 18.5 ? '#3b82f6' : bmi < 25 ? '#22c55e' : bmi < 30 ? '#f59e0b' : '#ef4444'
  const bmiPct = Math.min(Math.max(((bmi - 15) / (35 - 15)) * 100, 0), 100)

  const diffToTarget = targetWeight != null ? (latest.weight - targetWeight).toFixed(1) : null

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#f9fafb',
    border: '1.5px solid #e5e7eb',
    borderRadius: '10px',
    padding: '11px 14px',
    color: '#111827',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif", color: '#1a1a1a' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 16px 40px' }}>

        {/* ===== ページヘッダー ===== */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px' }}>📊</span>
            <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#111827', margin: 0 }}>体組成データ管理</h1>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: '#dc2626', color: 'white', fontWeight: 700,
              padding: '10px 20px', borderRadius: '10px', fontSize: '14px',
              transition: 'all 0.2s', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <span>＋</span> データ記録
          </button>
        </div>

        {/* ===== 目標体重バナー ===== */}
        {targetWeight != null && diffToTarget != null && (
          <div
            style={{
              background: '#f0fdf4', border: '1px solid #22c55e', borderRadius: '14px',
              padding: '12px 16px', marginBottom: '16px',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}
          >
            <span style={{ fontSize: '24px' }}>🎯</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#15803d' }}>
                目標体重: {targetWeight} kg
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                {parseFloat(diffToTarget) > 0
                  ? `あと ${diffToTarget} kg 減量`
                  : parseFloat(diffToTarget) < 0
                    ? `目標まで ${Math.abs(parseFloat(diffToTarget))} kg 増量`
                    : '目標達成！'}
              </div>
            </div>
          </div>
        )}

        {/* ===== 統計グリッド（4列）===== */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}
          className="stats-grid-body">

          {[
            { label: '体重', value: latest.weight, unit: 'kg', change: `${parseFloat(weightChange) <= 0 ? '' : '+'}${weightChange}`, isGood: parseFloat(weightChange) <= 0 },
            { label: '体脂肪率', value: latest.bodyFat, unit: '%', change: `${parseFloat(fatChange) < 0 ? '' : '+'}${fatChange}`, isGood: parseFloat(fatChange) < 0 },
            { label: '筋肉量', value: latest.muscle, unit: 'kg', change: `${parseFloat(muscleChange) >= 0 ? '+' : ''}${muscleChange}`, isGood: parseFloat(muscleChange) > 0 },
            { label: 'BMI', value: bmi, unit: '', change: bmiLabel, isGood: bmi < 25 },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: 'white', border: '1px solid #f0f0f0', borderRadius: '14px',
                padding: '12px 8px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#111827' }}>{stat.value}</div>
              <div style={{ fontSize: '10px', color: '#9ca3af' }}>{stat.unit}</div>
              <div
                style={{
                  marginTop: '4px', fontSize: '10px', fontWeight: 600,
                  color: stat.isGood ? '#22c55e' : '#ef4444',
                }}
              >
                {stat.change}
              </div>
            </div>
          ))}
        </div>

        {/* ===== グラフエリア（体重・体脂肪率・筋肉量）===== */}
        <div
          style={{
            background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '16px',
          }}
        >
          <div style={{ padding: '16px 16px 0' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827', display: 'block', marginBottom: '12px' }}>体重・体脂肪率・筋肉量の推移</span>
          </div>
          <div style={{ padding: '0 16px 16px' }}>
          <div style={{ position: 'relative', height: '112px' }}>
            <svg width="100%" height="100%" viewBox="0 0 300 80" preserveAspectRatio="none">
              {[0, 25, 50, 75].map((y) => (
                <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="#f3f4f6" strokeWidth="1" />
              ))}
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={weekWeights.map((w, i) => {
                  const x = (i / (weekWeights.length - 1)) * 300
                  const y = 75 - ((w - minW) / (maxW - minW)) * 65
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                }).join(' ') + ' L 300 80 L 0 80 Z'}
                fill="url(#areaGrad)"
              />
              <path
                d={weekWeights.map((w, i) => {
                  const x = (i / (weekWeights.length - 1)) * 300
                  const y = 75 - ((w - minW) / (maxW - minW)) * 65
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                }).join(' ')}
                fill="none"
                stroke="#22c55e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {weekWeights.map((w, i) => {
                const x = (i / (weekWeights.length - 1)) * 300
                const y = 75 - ((w - minW) / (maxW - minW)) * 65
                return (
                  <circle
                    key={i}
                    cx={x} cy={y}
                    r={i === weekWeights.length - 1 ? 4 : 3}
                    fill={i === weekWeights.length - 1 ? '#22c55e' : 'white'}
                    stroke="#22c55e"
                    strokeWidth="2"
                  />
                )
              })}
            </svg>
          </div>
          {/* 凡例 */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
            {[
              { color: '#3b82f6', label: '体重(kg)' },
              { color: '#f97316', label: '体脂肪率(%)' },
              { color: '#22c55e', label: '筋肉量(kg)' },
            ].map((leg) => (
              <div key={leg.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#4b5563' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: leg.color }} />
                {leg.label}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            {['19日', '20日', '21日', '22日', '23日', '24日', '今日'].map((d) => (
              <span key={d} style={{ fontSize: '9px', color: '#9ca3af' }}>{d}</span>
            ))}
          </div>
          </div>
        </div>

        {/* ===== 水分摂取量カード ===== */}
        <div
          style={{
            background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '16px',
          }}
        >
          <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>💧 今日の水分摂取</span>
            <span style={{ fontSize: '12px', color: '#06b6d4', fontWeight: 700 }}>
              {waterCups * 200} ml / {CUPS_GOAL * 200} ml
            </span>
          </div>
          <div style={{ padding: '12px 16px 16px' }}>
            {/* コップのアイコン表示 */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {Array.from({ length: CUPS_GOAL }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => updateWaterCups(i < waterCups ? i : i + 1)}
                  style={{
                    width: '36px', height: '44px', borderRadius: '6px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '22px', background: 'none', border: 'none', cursor: 'pointer',
                    opacity: i < waterCups ? 1 : 0.25,
                    transition: 'opacity 0.2s',
                  }}
                  title={`${(i + 1) * 200} ml`}
                >
                  🥤
                </button>
              ))}
            </div>
            {/* プログレスバー */}
            <div style={{ width: '100%', height: '8px', background: '#e0f7fa', borderRadius: '20px', overflow: 'hidden', marginBottom: '8px' }}>
              <div
                style={{
                  height: '100%', borderRadius: '20px',
                  width: `${Math.min((waterCups / CUPS_GOAL) * 100, 100)}%`,
                  background: 'linear-gradient(90deg, #06b6d4, #0ea5e9)',
                  transition: 'width 0.4s',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => updateWaterCups(waterCups - 1)}
                disabled={waterCups === 0}
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px',
                  border: '1px solid #e5e7eb', background: 'white', color: '#374151',
                  fontWeight: 600, fontSize: '13px', cursor: waterCups === 0 ? 'not-allowed' : 'pointer',
                  opacity: waterCups === 0 ? 0.4 : 1, fontFamily: 'inherit',
                }}
              >
                − 1杯
              </button>
              <button
                onClick={() => updateWaterCups(waterCups + 1)}
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px',
                  border: '1px solid #06b6d4', background: '#ecfeff', color: '#0e7490',
                  fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                ＋ 1杯 (200ml)
              </button>
            </div>
          </div>
        </div>

        {/* ===== 水分摂取量の推移 ===== */}
        <div
          style={{
            background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '16px',
          }}
        >
          <div style={{ padding: '16px 16px 0' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827', display: 'block', marginBottom: '12px' }}>水分摂取量の推移</span>
          </div>
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{ height: '112px' }}>
              <svg width="100%" height="100%" viewBox="0 0 300 80" preserveAspectRatio="none">
                {[0, 25, 50, 75].map((y) => (
                  <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="#f3f4f6" strokeWidth="1" />
                ))}
                <path
                  d="M 0 60 L 50 55 L 100 50 L 150 45 L 200 35 L 250 40 L 300 30"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#4b5563' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#06b6d4' }} />
                水分摂取量(ml)
              </div>
            </div>
          </div>
        </div>

        {/* ===== 測定記録一覧 ===== */}
        <div
          style={{
            background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '12px',
          }}
        >
          <div style={{ padding: '16px 16px 0' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827', display: 'block', marginBottom: '12px' }}>
              測定記録一覧
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', color: '#9ca3af', fontWeight: 600, whiteSpace: 'nowrap' }}>測定日</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '11px', color: '#9ca3af', fontWeight: 600, whiteSpace: 'nowrap' }}>体重</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '11px', color: '#9ca3af', fontWeight: 600, whiteSpace: 'nowrap' }}>体脂肪率</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '11px', color: '#9ca3af', fontWeight: 600, whiteSpace: 'nowrap' }}>筋肉量</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '11px', color: '#9ca3af', fontWeight: 600, whiteSpace: 'nowrap' }}>BMI</th>
                  <th style={{ padding: '8px 12px' }}></th>
                </tr>
              </thead>
              <tbody>
                {demoRecords.map((record, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{record.date}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{record.weight}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{record.bodyFat}%</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{record.muscle}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{record.bmi}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <button
                        style={{
                          padding: '4px 8px', borderRadius: '6px', fontSize: '16px',
                          color: '#d1d5db', background: 'none', border: 'none', cursor: 'pointer',
                        }}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ===== データ記録モーダル ===== */}
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
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                position: 'sticky', top: 0, background: 'white',
                borderBottom: '1px solid #f0f0f0', padding: '16px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderRadius: '24px 24px 0 0',
              }}
            >
              <p style={{ fontWeight: 700, color: '#111827', fontSize: '15px' }}>体組成を記録</p>
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
              {[
                { label: '体重 (kg)', placeholder: '72.5', value: newWeight, onChange: setNewWeight },
                { label: '体脂肪率 (%)', placeholder: '18.5', value: newBodyFat, onChange: setNewBodyFat },
                { label: '筋肉量 (kg)', placeholder: '59.0', value: newMuscle, onChange: setNewMuscle },
              ].map((f) => (
                <div key={f.label} style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>
                    {f.label}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder={f.placeholder}
                    value={f.value}
                    onChange={(e) => f.onChange(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              ))}
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  width: '100%', background: '#dc2626', color: 'white',
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
