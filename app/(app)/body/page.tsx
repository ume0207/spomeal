'use client'

import { useState } from 'react'

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

export default function BodyPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [newWeight, setNewWeight] = useState('')
  const [newBodyFat, setNewBodyFat] = useState('')
  const [newMuscle, setNewMuscle] = useState('')

  const latest = demoRecords[0]
  const prev = demoRecords[1]
  const weightChange = (latest.weight - prev.weight).toFixed(1)
  const fatChange = (latest.bodyFat - prev.bodyFat).toFixed(1)
  const muscleChange = (latest.muscle - prev.muscle).toFixed(1)

  const bmi = latest.bmi
  const bmiLabel = bmi < 18.5 ? '低体重' : bmi < 25 ? '普通体重' : bmi < 30 ? '肥満(1度)' : '肥満(2度以上)'
  const bmiColor = bmi < 18.5 ? '#3b82f6' : bmi < 25 ? '#22c55e' : bmi < 30 ? '#f59e0b' : '#ef4444'
  const bmiPct = Math.min(Math.max(((bmi - 15) / (35 - 15)) * 100, 0), 100)

  const inputStyle = {
    width: '100%',
    background: '#f9fafb',
    border: '1.5px solid #e5e7eb',
    borderRadius: '10px',
    padding: '11px 14px',
    color: '#111827',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif", color: '#1a1a1a' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px 12px 100px' }}>

        {/* 統計グリッド（3列） */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          {[
            { label: '体重', value: latest.weight, unit: 'kg', change: `${parseFloat(weightChange) <= 0 ? '' : '+'}${weightChange}`, isGood: parseFloat(weightChange) <= 0 },
            { label: '体脂肪率', value: latest.bodyFat, unit: '%', change: `${parseFloat(fatChange) < 0 ? '' : '+'}${fatChange}`, isGood: parseFloat(fatChange) < 0 },
            { label: '筋肉量', value: latest.muscle, unit: 'kg', change: `${parseFloat(muscleChange) >= 0 ? '+' : ''}${muscleChange}`, isGood: parseFloat(muscleChange) > 0 },
            { label: 'BMI', value: bmi, unit: '', change: bmiLabel, isGood: bmi < 25 },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: 'white',
                border: '1px solid #f0f0f0',
                borderRadius: '14px',
                padding: '12px 8px',
                textAlign: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#111827' }}>{stat.value}</div>
              <div style={{ fontSize: '10px', color: '#9ca3af' }}>{stat.unit}</div>
              <div style={{ marginTop: '4px', fontSize: '10px', fontWeight: 600, color: stat.isGood ? '#22c55e' : '#ef4444' }}>
                {stat.change}
              </div>
            </div>
          ))}
        </div>

        {/* グラフエリア */}
        <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>体重推移（7日間）</span>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>kg</span>
          </div>
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
                    cx={x}
                    cy={y}
                    r={i === weekWeights.length - 1 ? 4 : 3}
                    fill={i === weekWeights.length - 1 ? '#22c55e' : 'white'}
                    stroke="#22c55e"
                    strokeWidth="2"
                  />
                )
              })}
            </svg>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            {['19日', '20日', '21日', '22日', '23日', '24日', '今日'].map((d) => (
              <span key={d} style={{ fontSize: '9px', color: '#9ca3af' }}>{d}</span>
            ))}
          </div>
        </div>

        {/* BMIカード */}
        <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '12px', padding: '16px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>BMI</span>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', margin: '10px 0' }}>
            <span style={{ fontSize: '32px', fontWeight: 900, color: '#111827' }}>{bmi}</span>
            <span style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: bmiColor }}>{bmiLabel}</span>
          </div>
          <div style={{ position: 'relative', height: '16px', background: '#f3f4f6', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
              {[
                { width: 18, color: '#93c5fd' },
                { width: 30, color: '#86efac' },
                { width: 20, color: '#fde68a' },
                { width: 32, color: '#fca5a5' },
              ].map((seg, i) => (
                <div key={i} style={{ width: `${seg.width}%`, backgroundColor: seg.color }} />
              ))}
            </div>
            <div
              style={{
                position: 'absolute',
                top: 0,
                width: '4px',
                height: '100%',
                background: '#374151',
                borderRadius: '2px',
                left: `calc(${bmiPct}% - 2px)`,
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#9ca3af', marginTop: '4px' }}>
            <span>低体重 &lt;18.5</span>
            <span>標準 18.5-24.9</span>
            <span>肥満 25+</span>
          </div>
        </div>

        {/* 記録テーブル */}
        <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '12px', padding: '16px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '12px' }}>記録履歴</span>
          <div>
            {/* ヘッダー */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '4px', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: '10px', fontWeight: 700, color: '#9ca3af' }}>
              <span>測定日</span>
              <span style={{ textAlign: 'center' }}>体重</span>
              <span style={{ textAlign: 'center' }}>体脂肪率</span>
              <span style={{ textAlign: 'center' }}>筋肉量</span>
              <span style={{ textAlign: 'center' }}>BMI</span>
            </div>
            {demoRecords.map((record, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                  gap: '4px',
                  padding: '8px 0',
                  borderBottom: i < demoRecords.length - 1 ? '1px solid #f3f4f6' : 'none',
                  fontSize: '12px',
                }}
              >
                <span style={{ color: '#6b7280' }}>{record.date}</span>
                <span style={{ textAlign: 'center', fontWeight: 700, color: '#111827' }}>{record.weight}</span>
                <span style={{ textAlign: 'center', fontWeight: 700, color: '#111827' }}>{record.bodyFat}</span>
                <span style={{ textAlign: 'center', fontWeight: 700, color: '#111827' }}>{record.muscle}</span>
                <span style={{ textAlign: 'center', fontWeight: 700, color: '#111827' }}>{record.bmi}</span>
              </div>
            ))}
          </div>
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
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', marginBottom: '16px' }}>体組成を記録</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {[
                { label: '体重 (kg)', placeholder: '72.5', value: newWeight, onChange: setNewWeight },
                { label: '体脂肪率 (%)', placeholder: '18.5', value: newBodyFat, onChange: setNewBodyFat },
                { label: '筋肉量 (kg)', placeholder: '59.0', value: newMuscle, onChange: setNewMuscle },
              ].map((f) => (
                <div key={f.label}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>{f.label}</label>
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
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#f3f4f6', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#6b7280', fontFamily: 'inherit' }}
              >
                キャンセル
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: 'white', fontFamily: 'inherit' }}
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
