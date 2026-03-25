'use client'

import { useState } from 'react'

const demoTodaySupps = [
  { id: '1', name: 'ホエイプロテイン', timing: 'トレーニング後', dose: '30g', taken: true },
  { id: '2', name: 'クレアチン', timing: 'トレーニング前', dose: '5g', taken: true },
  { id: '3', name: 'BCAA', timing: 'トレーニング中', dose: '10g', taken: false },
  { id: '4', name: 'マルチビタミン', timing: '起床後', dose: '1粒', taken: true },
]

const demoMySupps = [
  { id: '1', name: 'ホエイプロテイン', catLabel: 'プロテイン', catBg: '#dbeafe', catColor: '#1d4ed8', timing: 'トレーニング後', dose: '30g', brand: 'ザバス' },
  { id: '2', name: 'クレアチン', catLabel: 'クレアチン', catBg: '#d1fae5', catColor: '#065f46', timing: 'トレーニング前', dose: '5g', brand: 'マイプロ' },
  { id: '3', name: 'BCAA', catLabel: 'BCAA / EAA', catBg: '#fce7f3', catColor: '#9d174d', timing: 'トレーニング中', dose: '10g', brand: '' },
  { id: '4', name: 'マルチビタミン', catLabel: 'ビタミン・ミネラル', catBg: '#fef3c7', catColor: '#92400e', timing: '起床後', dose: '1粒', brand: '' },
  { id: '5', name: 'オメガ3', catLabel: 'オメガ3', catBg: '#e0e7ff', catColor: '#3730a3', timing: '就寝前', dose: '2粒', brand: '' },
]

const timingItems = [
  '☀️ 起床後 — マルチビタミン・プロテイン',
  '🏋️ トレ前 — クレアチン・BCAA・カフェイン',
  '⚡ トレ後 — プロテイン・クレアチン・グルタミン',
  '🌙 就寝前 — カゼインプロテイン・ZMA',
]

export default function SupplementPage() {
  const [todaySupps, setTodaySupps] = useState(demoTodaySupps)
  const [showAddModal, setShowAddModal] = useState(false)

  const toggleTaken = (id: string) => {
    setTodaySupps(prev => prev.map(s => s.id === id ? { ...s, taken: !s.taken } : s))
  }

  const takenCount = todaySupps.filter(s => s.taken).length
  const today = new Date()
  const headerDate = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`

  return (
    <div style={{ fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif", color: '#1a1a1a' }}>

      {/* ===== トップヘッダー（オレンジグラデーション）===== */}
      <div
        style={{
          background: 'linear-gradient(135deg, #c2410c 0%, #f97316 60%, #fb923c 100%)',
          color: 'white',
          padding: '16px 16px 18px',
          position: 'sticky',
          top: '126px',
          zIndex: 90,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div>
            <p style={{ fontSize: '13px', opacity: 0.85, marginBottom: '2px' }}>サプリメント管理</p>
            <p style={{ fontSize: '11px', opacity: 0.7 }}>{headerDate}</p>
          </div>
        </div>
      </div>

      {/* ===== メインコンテンツ ===== */}
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px 12px 60px' }}>

        {/* 今日のサプリ服用 */}
        <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '14px' }}>
          <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
                💊 今日のサプリ服用
              </p>
              <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>タップして服用済みをマーク</p>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#f97316' }}>
              {takenCount}/{todaySupps.length}
            </span>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {todaySupps.map((supp) => (
              <div
                key={supp.id}
                onClick={() => toggleTaken(supp.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 14px', borderRadius: '12px',
                  border: `1.5px solid ${supp.taken ? '#f97316' : '#e5e7eb'}`,
                  background: supp.taken ? '#fff7ed' : 'white',
                  transition: 'all 0.2s', cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    border: `2px solid ${supp.taken ? '#f97316' : '#d1d5db'}`,
                    background: supp.taken ? '#f97316' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', flexShrink: 0, transition: 'all 0.2s',
                    color: supp.taken ? 'white' : 'transparent',
                  }}
                >
                  ✓
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{supp.name}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                    {supp.timing} · {supp.dose}
                  </div>
                </div>
                {supp.taken && (
                  <span style={{ fontSize: '10px', color: '#f97316', fontWeight: 600 }}>服用済み</span>
                )}
              </div>
            ))}
            {todaySupps.length === 0 && (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
                サプリが登録されていません
              </div>
            )}
          </div>
        </div>

        {/* マイサプリ一覧 */}
        <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '14px' }}>
          <div style={{ padding: '14px 16px 0' }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📋 マイサプリ一覧
            </p>
          </div>
          <div style={{ height: '12px' }} />
          <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {demoMySupps.map((supp) => (
              <div
                key={supp.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '10px',
                  background: '#fafafa', border: '1px solid #f0f0f0',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{supp.name}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '1px' }}>
                    {supp.timing} · {supp.dose}{supp.brand ? ` · ${supp.brand}` : ''}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '10px', fontWeight: 700,
                    padding: '2px 7px', borderRadius: '20px', whiteSpace: 'nowrap' as const,
                    flexShrink: 0,
                    background: supp.catBg, color: supp.catColor,
                  }}
                >
                  {supp.catLabel}
                </span>
                <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                  <button style={{ width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>✏️</button>
                  <button style={{ width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '0 16px 14px' }}>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
                padding: '12px 14px', borderRadius: '10px',
                border: '1.5px dashed #d1d5db', color: '#9ca3af',
                fontSize: '13px', fontWeight: 600, transition: 'all 0.2s',
                justifyContent: 'center', background: 'none', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: '18px' }}>＋</span>サプリを追加
            </button>
          </div>
        </div>

        {/* タイミングガイド */}
        <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '14px' }}>
          <div style={{ padding: '14px 16px 0' }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⏰ タイミングガイド
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px', padding: '12px 16px' }}>
            {timingItems.map((item, i) => (
              <span
                key={i}
                style={{
                  fontSize: '11px', color: '#6b7280',
                  padding: '4px 10px', background: '#f3f4f6', borderRadius: '20px',
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* サプリ追加モーダル */}
      {showAddModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{ background: 'white', width: '100%', maxWidth: '500px', borderRadius: '24px 24px 0 0', maxHeight: '92vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ position: 'sticky', top: 0, background: 'white', borderBottom: '1px solid #f0f0f0', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '24px 24px 0 0', zIndex: 10 }}>
              <span style={{ fontWeight: 700, color: '#111827', fontSize: '15px' }}>💊 サプリを追加</span>
              <button onClick={() => setShowAddModal(false)} style={{ fontSize: '20px', color: '#9ca3af', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>サプリ名 *</label>
                <input placeholder="例：ホエイプロテイン、クレアチン" style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '10px 12px', fontSize: '14px', outline: 'none', color: '#1a1a1a', background: 'white', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>カテゴリ</label>
                  <select style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '10px 12px', fontSize: '14px', outline: 'none', color: '#1a1a1a', background: 'white', fontFamily: 'inherit', boxSizing: 'border-box' as const }}>
                    <option>プロテイン</option>
                    <option>クレアチン</option>
                    <option>BCAA / EAA</option>
                    <option>ビタミン・ミネラル</option>
                    <option>オメガ3</option>
                    <option>その他</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>タイミング</label>
                  <select style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '10px 12px', fontSize: '14px', outline: 'none', color: '#1a1a1a', background: 'white', fontFamily: 'inherit', boxSizing: 'border-box' as const }}>
                    <option>🌅 朝食時</option>
                    <option>☀️ 起床後</option>
                    <option>🏋️ トレーニング前</option>
                    <option>⚡ トレーニング後</option>
                    <option>🍽 夕食時</option>
                    <option>🌙 就寝前</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>1回の量</label>
                  <input placeholder="例：30g, 5mg" style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '10px 12px', fontSize: '14px', outline: 'none', color: '#1a1a1a', background: 'white', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>ブランド</label>
                  <input placeholder="例：ザバス、マイプロ" style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '10px 12px', fontSize: '14px', outline: 'none', color: '#1a1a1a', background: 'white', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>メモ</label>
                <textarea placeholder="目的・注意事項など" style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '10px 12px', fontSize: '14px', outline: 'none', color: '#1a1a1a', resize: 'vertical', minHeight: '72px', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ width: '100%', background: '#f97316', color: 'white', fontWeight: 700, padding: '12px', borderRadius: '12px', fontSize: '15px', marginTop: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                登録する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
