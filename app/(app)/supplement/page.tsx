'use client'

import { useState } from 'react'

interface Supplement {
  id: string
  name: string
  type: string
  timing: string
  dose: string
  taken: boolean
  icon: string
}

const demoSupplements: Supplement[] = [
  { id: '1', name: 'ホエイプロテイン', type: 'プロテイン', timing: 'トレーニング後', dose: '30g', taken: true, icon: '🥛' },
  { id: '2', name: 'クレアチン', type: 'パフォーマンス', timing: 'トレーニング前', dose: '5g', taken: true, icon: '⚡' },
  { id: '3', name: 'BCAA', type: 'アミノ酸', timing: 'トレーニング中', dose: '10g', taken: false, icon: '💊' },
  { id: '4', name: 'マルチビタミン', type: 'ビタミン', timing: '起床後', dose: '1粒', taken: true, icon: '🌿' },
  { id: '5', name: 'オメガ3', type: '脂肪酸', timing: '就寝前', dose: '2粒', taken: false, icon: '🐟' },
  { id: '6', name: 'ZMA', type: 'ミネラル', timing: '就寝前', dose: '3粒', taken: false, icon: '🌙' },
]

const timingOrder = ['起床後', 'トレーニング前', 'トレーニング中', 'トレーニング後', '就寝前']

const timingGuide = [
  { timing: '起床後', icon: '🌅', color: '#f59e0b', bg: '#fffbeb', desc: 'マルチビタミン・ミネラル' },
  { timing: 'トレ前', icon: '⚡', color: '#3b82f6', bg: '#eff6ff', desc: 'クレアチン・カフェイン' },
  { timing: 'トレ後', icon: '💪', color: '#22c55e', bg: '#f0fdf4', desc: 'プロテイン・BCAA' },
  { timing: '就寝前', icon: '🌙', color: '#7c3aed', bg: '#f5f3ff', desc: 'ZMA・グルタミン' },
]

export default function SupplementPage() {
  const [supplements, setSupplements] = useState(demoSupplements)
  const [showAddModal, setShowAddModal] = useState(false)

  const toggleTaken = (id: string) => {
    setSupplements((prev) =>
      prev.map((s) => (s.id === id ? { ...s, taken: !s.taken } : s))
    )
  }

  const takenCount = supplements.filter((s) => s.taken).length
  const totalCount = supplements.length
  const pct = Math.round((takenCount / totalCount) * 100)

  return (
    <div style={{ fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif", color: '#1a1a1a' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px 12px 100px' }}>

        {/* 本日のサプリチェックリスト（プログレスカード） */}
        <div
          style={{
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            borderRadius: '18px',
            padding: '18px',
            marginBottom: '12px',
            color: 'white',
            boxShadow: '0 4px 20px rgba(34,197,94,0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700 }}>本日の服用状況</span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>{takenCount}/{totalCount}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '40px', fontWeight: 900, lineHeight: 1 }}>{pct}</span>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginBottom: '4px' }}>%</span>
          </div>
          <div style={{ height: '10px', background: 'rgba(255,255,255,0.2)', borderRadius: '20px', overflow: 'hidden', marginBottom: '10px' }}>
            <div
              style={{
                height: '100%',
                background: 'white',
                borderRadius: '20px',
                width: `${pct}%`,
                transition: 'width 0.7s',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {supplements.map((s) => (
              <div
                key={s.id}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  background: s.taken ? 'white' : 'rgba(255,255,255,0.2)',
                  color: s.taken ? '#16a34a' : 'white',
                  fontWeight: 700,
                }}
              >
                {s.taken ? '✓' : '·'}
              </div>
            ))}
          </div>
        </div>

        {/* タイミングガイドカード */}
        <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '12px', padding: '16px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '12px' }}>
            タイミングガイド
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {timingGuide.map((guide) => (
              <div
                key={guide.timing}
                style={{
                  background: guide.bg,
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '20px', flexShrink: 0 }}>{guide.icon}</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: guide.color, marginBottom: '2px' }}>{guide.timing}</div>
                  <div style={{ fontSize: '10px', color: '#6b7280', lineHeight: 1.4 }}>{guide.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* マイサプリ一覧（タイミング別） */}
        {timingOrder.map((timing) => {
          const timingSupps = supplements.filter((s) => s.timing === timing)
          if (timingSupps.length === 0) return null
          return (
            <div key={timing} style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '6px', paddingLeft: '4px' }}>
                {timing}
              </div>
              <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                {timingSupps.map((supp, i) => (
                  <div
                    key={supp.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderBottom: i < timingSupps.length - 1 ? '1px solid #f3f4f6' : 'none',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: supp.taken ? '#f0fdf4' : '#f9fafb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        flexShrink: 0,
                      }}
                    >
                      {supp.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{supp.name}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{supp.type} · {supp.dose}</div>
                    </div>
                    <button
                      onClick={() => toggleTaken(supp.id)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: supp.taken ? '#22c55e' : '#f3f4f6',
                        border: 'none',
                        cursor: 'pointer',
                        color: supp.taken ? 'white' : '#9ca3af',
                        fontSize: '14px',
                        boxShadow: supp.taken ? '0 2px 8px rgba(34,197,94,0.3)' : 'none',
                        transition: 'all 0.2s',
                        fontFamily: 'inherit',
                      }}
                    >
                      ✓
                    </button>
                  </div>
                ))}
              </div>
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
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowAddModal(false)} />
          <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '640px', background: 'white', borderRadius: '24px 24px 0 0', padding: '24px' }}>
            <div style={{ width: '48px', height: '4px', background: '#e5e7eb', borderRadius: '2px', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>サプリを追加</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>管理するサプリメントを追加します</p>
            <button
              onClick={() => setShowAddModal(false)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 700,
                color: 'white',
                fontFamily: 'inherit',
                marginBottom: '8px',
              }}
            >
              追加する
            </button>
            <button
              onClick={() => setShowAddModal(false)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#f3f4f6', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#6b7280', fontFamily: 'inherit' }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
