'use client'

import { useState, useEffect, useCallback } from 'react'
import { toJSTDateStr } from '@/lib/date-utils'
import { addBodyPoint } from '@/lib/points'
import { createClient } from '@/lib/supabase/client'

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

// チャート用のデモデータ（実データがあれば上書きされる）
const demoWeekWeights = demoRecords.map((r) => r.weight).reverse()
const demoMinW = Math.min(...demoWeekWeights) - 0.5
const demoMaxW = Math.max(...demoWeekWeights) + 0.5

export default function BodyPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [newWeight, setNewWeight] = useState('')
  const [newBodyFat, setNewBodyFat] = useState('')
  const [newMuscle, setNewMuscle] = useState('')
  const [targetWeight, setTargetWeight] = useState<number | null>(null)
  const [savedRecords, setSavedRecords] = useState<BodyRecord[]>([])
  const [pointMessage, setPointMessage] = useState('')

  // localStorageから体組成記録を読み込み
  const loadRecords = useCallback(() => {
    try {
      const raw = localStorage.getItem('bodyRecords_v1')
      if (raw) {
        const parsed = JSON.parse(raw)
        setSavedRecords(Array.isArray(parsed) ? parsed.sort((a: BodyRecord, b: BodyRecord) => b.date.localeCompare(a.date)) : [])
      }
    } catch { /* ignore */ }
  }, [])

  // 体組成を保存
  const handleSaveBody = async () => {
    const w = parseFloat(newWeight)
    if (!w || w <= 0) return
    const bf = parseFloat(newBodyFat) || 0
    const m = parseFloat(newMuscle) || 0
    const bmi = calcBmi(w)
    const dateStr = toJSTDateStr()

    const newRecord: BodyRecord = { date: dateStr, weight: w, bodyFat: bf, muscle: m, bmi }

    const existing = savedRecords.filter(r => r.date !== dateStr)
    const updated = [newRecord, ...existing].sort((a, b) => b.date.localeCompare(a.date))

    localStorage.setItem('bodyRecords_v1', JSON.stringify(updated))
    setSavedRecords(updated)

    // Supabaseにも同期
    try {
      const supabase = createClient()
      const { data: authData } = await supabase.auth.getUser()
      if (authData?.user?.id) {
        fetch('/api/body-activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: authData.user.id,
            date: dateStr,
            weight: w,
            bodyFat: bf,
            muscle: m,
            bmi,
          }),
        }).catch(() => {})
      }
    } catch {}

    // ポイント付与（1日1回）
    const result = addBodyPoint(dateStr)
    if (result.pointsAdded > 0) {
      setPointMessage(`🎉 体組成記録で +${result.pointsAdded}pt！ (累計: ${result.totalPoints}pt)`)
      setTimeout(() => setPointMessage(''), 3000)
    }

    setNewWeight('')
    setNewBodyFat('')
    setNewMuscle('')
    setShowAddModal(false)
  }

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

      // 体組成記録の読み込み
      loadRecords()
    }
  }, [loadRecords])

  // 実データがあればそれを使用、なければデモデータ
  const displayRecords = savedRecords.length > 0 ? savedRecords : demoRecords
  const latest = displayRecords[0]
  const prev = displayRecords.length > 1 ? displayRecords[1] : latest
  const weightChange = (latest.weight - prev.weight).toFixed(1)
  const fatChange = (latest.bodyFat - prev.bodyFat).toFixed(1)
  const muscleChange = (latest.muscle - prev.muscle).toFixed(1)

  const bmi = latest.bmi
  const bmiLabel = bmi < 18.5 ? '低体重' : bmi < 25 ? '普通体重' : bmi < 30 ? '肥満(1度)' : '肥満(2度以上)'
  const bmiColor = bmi < 18.5 ? '#3b82f6' : bmi < 25 ? '#22c55e' : bmi < 30 ? '#f59e0b' : '#ef4444'
  const bmiPct = Math.min(Math.max(((bmi - 15) / (35 - 15)) * 100, 0), 100)

  const diffToTarget = targetWeight != null ? (latest.weight - targetWeight).toFixed(1) : null

  // チャート用データ（実データまたはデモ）
  const weekWeights = displayRecords.slice(0, 7).map(r => r.weight).reverse()
  const minW = weekWeights.length > 0 ? Math.min(...weekWeights) - 0.5 : demoMinW
  const maxW = weekWeights.length > 0 ? Math.max(...weekWeights) + 0.5 : demoMaxW

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

        {/* ポイント獲得メッセージ */}
        {pointMessage && (
          <div style={{
            position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white',
            padding: '12px 24px', borderRadius: '12px', fontWeight: 700, fontSize: '14px',
            zIndex: 9999, boxShadow: '0 4px 15px rgba(34,197,94,0.4)',
            animation: 'fadeIn 0.3s ease-out',
          }}>
            {pointMessage}
          </div>
        )}

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

        {/* ===== 体重グラフ ===== */}
        {(() => {
          const chartData = displayRecords.slice(0, 14).reverse()
          const weights = chartData.map(r => r.weight)
          const fats = chartData.map(r => r.bodyFat)
          const muscles = chartData.map(r => r.muscle)
          const dates = chartData.map(r => {
            const d = r.date
            if (d.includes('月')) return d.replace(/.*?(\d+)日.*/, '$1日')
            const parts = d.split('-')
            return parts.length >= 3 ? `${parseInt(parts[1])}/${parseInt(parts[2])}` : d
          })
          const n = chartData.length

          const wMin = Math.min(...weights) - 0.5
          const wMax = Math.max(...weights) + 0.5

          const fMin = Math.min(...fats, ...muscles) - 1
          const fMax = Math.max(...fats, ...muscles) + 1

          const W = 320
          const H = 160
          const padL = 36
          const padR = 10
          const padT = 20
          const padB = 28
          const plotW = W - padL - padR
          const plotH = H - padT - padB

          const toX = (i: number) => padL + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2)
          const toYW = (v: number) => padT + plotH - ((v - wMin) / (wMax - wMin)) * plotH
          const toYF = (v: number) => padT + plotH - ((v - fMin) / (fMax - fMin)) * plotH

          const makePath = (vals: number[], toY: (v: number) => number) =>
            vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`).join(' ')

          // Y軸目盛り（体重）
          const wStep = (wMax - wMin) > 3 ? 1 : 0.5
          const wTicks: number[] = []
          for (let v = Math.ceil(wMin / wStep) * wStep; v <= wMax; v += wStep) wTicks.push(parseFloat(v.toFixed(1)))

          return (
            <>
            {/* 体重の推移 */}
            <div style={{
              background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '16px', padding: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>📈 体重の推移</span>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>直近{n}回</span>
              </div>
              <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
                {/* グリッド線 + Y軸ラベル */}
                {wTicks.map((v) => {
                  const y = toYW(v)
                  return (
                    <g key={v}>
                      <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#f3f4f6" strokeWidth="1" />
                      <text x={padL - 4} y={y + 3} textAnchor="end" fontSize="9" fill="#9ca3af">{v}</text>
                    </g>
                  )
                })}
                {/* 塗りつぶし */}
                <defs>
                  <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d={makePath(weights, toYW) + ` L ${toX(n - 1).toFixed(1)} ${padT + plotH} L ${toX(0).toFixed(1)} ${padT + plotH} Z`}
                  fill="url(#wGrad)"
                />
                {/* ライン */}
                <path d={makePath(weights, toYW)} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {/* ドット＋数値 */}
                {weights.map((w, i) => {
                  const x = toX(i)
                  const y = toYW(w)
                  const isLast = i === n - 1
                  return (
                    <g key={i}>
                      <circle cx={x} cy={y} r={isLast ? 5 : 3.5} fill={isLast ? '#3b82f6' : 'white'} stroke="#3b82f6" strokeWidth="2" />
                      {(isLast || i === 0 || i % Math.max(1, Math.floor(n / 5)) === 0) && (
                        <text x={x} y={y - 8} textAnchor="middle" fontSize="9" fontWeight="700" fill="#3b82f6">{w}</text>
                      )}
                    </g>
                  )
                })}
                {/* X軸日付ラベル */}
                {dates.map((d, i) => {
                  if (n > 7 && i % 2 !== 0 && i !== n - 1) return null
                  return (
                    <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="#9ca3af">{d}</text>
                  )
                })}
              </svg>
              <div style={{ textAlign: 'center', marginTop: '4px' }}>
                <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 600 }}>● 体重 (kg)</span>
              </div>
            </div>

            {/* 体脂肪率・筋肉量の推移 */}
            <div style={{
              background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '16px', padding: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>📊 体脂肪率・筋肉量の推移</span>
              </div>
              <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
                {/* グリッド */}
                {(() => {
                  const step = (fMax - fMin) > 6 ? 2 : 1
                  const ticks: number[] = []
                  for (let v = Math.ceil(fMin / step) * step; v <= fMax; v += step) ticks.push(parseFloat(v.toFixed(1)))
                  return ticks.map((v) => {
                    const y = toYF(v)
                    return (
                      <g key={v}>
                        <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#f3f4f6" strokeWidth="1" />
                        <text x={padL - 4} y={y + 3} textAnchor="end" fontSize="9" fill="#9ca3af">{v}</text>
                      </g>
                    )
                  })
                })()}
                {/* 体脂肪率ライン */}
                <path d={makePath(fats, toYF)} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {fats.map((v, i) => {
                  const x = toX(i)
                  const y = toYF(v)
                  const isLast = i === n - 1
                  return (
                    <g key={`f${i}`}>
                      <circle cx={x} cy={y} r={isLast ? 5 : 3.5} fill={isLast ? '#f97316' : 'white'} stroke="#f97316" strokeWidth="2" />
                      {(isLast || i === 0) && (
                        <text x={x} y={y - 8} textAnchor="middle" fontSize="9" fontWeight="700" fill="#f97316">{v}%</text>
                      )}
                    </g>
                  )
                })}
                {/* 筋肉量ライン */}
                <path d={makePath(muscles, toYF)} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {muscles.map((v, i) => {
                  const x = toX(i)
                  const y = toYF(v)
                  const isLast = i === n - 1
                  return (
                    <g key={`m${i}`}>
                      <circle cx={x} cy={y} r={isLast ? 5 : 3.5} fill={isLast ? '#22c55e' : 'white'} stroke="#22c55e" strokeWidth="2" />
                      {(isLast || i === 0) && (
                        <text x={x} y={y + 14} textAnchor="middle" fontSize="9" fontWeight="700" fill="#22c55e">{v}</text>
                      )}
                    </g>
                  )
                })}
                {/* X軸日付 */}
                {dates.map((d, i) => {
                  if (n > 7 && i % 2 !== 0 && i !== n - 1) return null
                  return (
                    <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="#9ca3af">{d}</text>
                  )
                })}
              </svg>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '6px' }}>
                <span style={{ fontSize: '11px', color: '#f97316', fontWeight: 600 }}>● 体脂肪率 (%)</span>
                <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600 }}>● 筋肉量 (kg)</span>
              </div>
            </div>
            </>
          )
        })()}

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
                {displayRecords.map((record, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{record.date}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{record.weight}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{record.bodyFat}%</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{record.muscle}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{record.bmi}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {savedRecords.length > 0 && (
                        <button
                          onClick={() => {
                            if (!confirm('この記録を削除しますか？')) return
                            const updated = savedRecords.filter((_, idx) => idx !== i)
                            localStorage.setItem('bodyRecords_v1', JSON.stringify(updated))
                            setSavedRecords(updated)
                          }}
                          style={{
                            padding: '4px 8px', borderRadius: '6px', fontSize: '16px',
                            color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer',
                          }}
                        >
                          🗑
                        </button>
                      )}
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
                onClick={handleSaveBody}
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
