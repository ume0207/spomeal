'use client'

import { useState } from 'react'

interface MySuppItem {
  id: string
  name: string
  catLabel: string
  catBg: string
  catColor: string
  timing: string
  dose: string
  brand: string
}

const demoTodaySupps = [
  { id: '1', name: 'ホエイプロテイン', timing: 'トレーニング後', dose: '30g', taken: true },
  { id: '2', name: 'クレアチン', timing: 'トレーニング前', dose: '5g', taken: true },
  { id: '3', name: 'BCAA', timing: 'トレーニング中', dose: '10g', taken: false },
  { id: '4', name: 'マルチビタミン', timing: '起床後', dose: '1粒', taken: true },
]

const demoMySupps: MySuppItem[] = [
  { id: '1', name: 'ホエイプロテイン', catLabel: 'プロテイン', catBg: '#dbeafe', catColor: '#1d4ed8', timing: 'トレーニング後', dose: '30g', brand: 'ザバス' },
  { id: '2', name: 'クレアチン', catLabel: 'クレアチン', catBg: '#d1fae5', catColor: '#065f46', timing: 'トレーニング前', dose: '5g', brand: 'マイプロ' },
  { id: '3', name: 'BCAA', catLabel: 'BCAA / EAA', catBg: '#fce7f3', catColor: '#9d174d', timing: 'トレーニング中', dose: '10g', brand: '' },
  { id: '4', name: 'マルチビタミン', catLabel: 'ビタミン・ミネラル', catBg: '#fef3c7', catColor: '#92400e', timing: '起床後', dose: '1粒', brand: '' },
  { id: '5', name: 'オメガ3', catLabel: 'オメガ3', catBg: '#e0e7ff', catColor: '#3730a3', timing: '就寝前', dose: '2粒', brand: '' },
]

const timingGuides = [
  {
    key: 'morning',
    icon: '☀️',
    label: '起床後',
    color: '#f59e0b',
    bg: '#fffbeb',
    border: '#fde68a',
    supps: ['マルチビタミン', '鉄・カルシウム', 'ビタミンD'],
    desc: '空腹時に吸収率が高いビタミン・ミネラル類を摂取するのに最適な時間帯です。',
  },
  {
    key: 'pre',
    icon: '🏋️',
    label: 'トレ前',
    color: '#8b5cf6',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    supps: ['クレアチン', 'BCAA / EAA', 'カフェイン', 'β-アラニン'],
    desc: 'トレーニング30〜60分前に摂取することでパフォーマンス向上が期待できます。',
  },
  {
    key: 'post',
    icon: '⚡',
    label: 'トレ後',
    color: '#f97316',
    bg: '#fff7ed',
    border: '#fed7aa',
    supps: ['ホエイプロテイン', 'クレアチン', 'グルタミン', 'マルトデキストリン'],
    desc: 'トレーニング直後はゴールデンタイム。素早く吸収されるホエイプロテインが最適です。',
  },
  {
    key: 'sleep',
    icon: '🌙',
    label: '就寝前',
    color: '#6366f1',
    bg: '#eef2ff',
    border: '#c7d2fe',
    supps: ['カゼインプロテイン', 'ZMA（亜鉛・マグネシウム）', 'グルタミン', 'オメガ3'],
    desc: '睡眠中の成長ホルモン分泌を活かすため、ゆっくり消化されるカゼインが効果的です。',
  },
]

const catOptions = [
  { label: 'プロテイン', bg: '#dbeafe', color: '#1d4ed8' },
  { label: 'クレアチン', bg: '#d1fae5', color: '#065f46' },
  { label: 'BCAA / EAA', bg: '#fce7f3', color: '#9d174d' },
  { label: 'ビタミン・ミネラル', bg: '#fef3c7', color: '#92400e' },
  { label: 'オメガ3', bg: '#e0e7ff', color: '#3730a3' },
  { label: 'その他', bg: '#f3f4f6', color: '#4b5563' },
]

const timingOptions = ['🌅 朝食時', '☀️ 起床後', '🏋️ トレーニング前', '⚡ トレーニング後', '🍽 夕食時', '🌙 就寝前']

export default function SupplementPage() {
  const [todaySupps, setTodaySupps] = useState<typeof demoTodaySupps>([])
  const [mySupps, setMySupps] = useState<MySuppItem[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editTarget, setEditTarget] = useState<MySuppItem | null>(null)

  // フォームの状態
  const [formName, setFormName] = useState('')
  const [formCat, setFormCat] = useState('プロテイン')
  const [formTiming, setFormTiming] = useState('⚡ トレーニング後')
  const [formDose, setFormDose] = useState('')
  const [formBrand, setFormBrand] = useState('')
  const [formMemo, setFormMemo] = useState('')

  const toggleTaken = (id: string) => {
    setTodaySupps(prev => prev.map(s => s.id === id ? { ...s, taken: !s.taken } : s))
  }

  const openAddModal = () => {
    setEditTarget(null)
    setFormName('')
    setFormCat('プロテイン')
    setFormTiming('⚡ トレーニング後')
    setFormDose('')
    setFormBrand('')
    setFormMemo('')
    setShowAddModal(true)
  }

  const openEditModal = (supp: MySuppItem) => {
    setEditTarget(supp)
    setFormName(supp.name)
    setFormCat(supp.catLabel)
    setFormTiming(supp.timing)
    setFormDose(supp.dose)
    setFormBrand(supp.brand)
    setFormMemo('')
    setShowAddModal(true)
  }

  const handleSave = () => {
    if (!formName.trim()) return
    const catInfo = catOptions.find(c => c.label === formCat) ?? catOptions[catOptions.length - 1]
    if (editTarget) {
      setMySupps(prev => prev.map(s =>
        s.id === editTarget.id
          ? { ...s, name: formName, catLabel: formCat, catBg: catInfo.bg, catColor: catInfo.color, timing: formTiming, dose: formDose, brand: formBrand }
          : s
      ))
    } else {
      const newItem: MySuppItem = {
        id: Date.now().toString(),
        name: formName,
        catLabel: formCat,
        catBg: catInfo.bg,
        catColor: catInfo.color,
        timing: formTiming,
        dose: formDose,
        brand: formBrand,
      }
      setMySupps(prev => [...prev, newItem])
    }
    setShowAddModal(false)
  }

  const handleDelete = (id: string) => {
    setMySupps(prev => prev.filter(s => s.id !== id))
  }

  const takenCount = todaySupps.filter(s => s.taken).length
  const today = new Date()
  const headerDate = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`

  const modalInputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '10px 12px',
    fontSize: '14px',
    outline: 'none',
    color: '#1a1a1a',
    background: 'white',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  }

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
            {mySupps.map((supp) => (
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
                  <button
                    onClick={() => openEditModal(supp)}
                    style={{ width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(supp.id)}
                    style={{ width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '0 16px 14px' }}>
            <button
              onClick={openAddModal}
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

        {/* タイミングガイド（4区分詳細版） */}
        <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '14px' }}>
          <div style={{ padding: '14px 16px 0' }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⏰ タイミングガイド
            </p>
          </div>
          <div style={{ padding: '12px 16px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {timingGuides.map((guide) => (
              <div
                key={guide.key}
                style={{
                  background: guide.bg, border: `1px solid ${guide.border}`,
                  borderRadius: '12px', padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '18px' }}>{guide.icon}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: guide.color }}>{guide.label}</span>
                </div>
                <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', lineHeight: 1.5 }}>
                  {guide.desc}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '4px' }}>
                  {guide.supps.map((s) => (
                    <span
                      key={s}
                      style={{
                        fontSize: '10px', padding: '2px 8px',
                        background: 'white', borderRadius: '20px',
                        border: `1px solid ${guide.border}`, color: guide.color,
                        fontWeight: 600,
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* サプリ追加・編集モーダル */}
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
              <span style={{ fontWeight: 700, color: '#111827', fontSize: '15px' }}>
                {editTarget ? '💊 サプリを編集' : '💊 サプリを追加'}
              </span>
              <button onClick={() => setShowAddModal(false)} style={{ fontSize: '20px', color: '#9ca3af', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>サプリ名 *</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="例：ホエイプロテイン、クレアチン"
                  style={modalInputStyle}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>カテゴリ</label>
                  <select
                    value={formCat}
                    onChange={(e) => setFormCat(e.target.value)}
                    style={modalInputStyle}
                  >
                    {catOptions.map(c => <option key={c.label}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>タイミング</label>
                  <select
                    value={formTiming}
                    onChange={(e) => setFormTiming(e.target.value)}
                    style={modalInputStyle}
                  >
                    {timingOptions.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>1回の量</label>
                  <input
                    value={formDose}
                    onChange={(e) => setFormDose(e.target.value)}
                    placeholder="例：30g, 5mg"
                    style={modalInputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>ブランド</label>
                  <input
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="例：ザバス、マイプロ"
                    style={modalInputStyle}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>メモ</label>
                <textarea
                  value={formMemo}
                  onChange={(e) => setFormMemo(e.target.value)}
                  placeholder="目的・注意事項など"
                  style={{ ...modalInputStyle, resize: 'vertical', minHeight: '72px' }}
                />
              </div>
              <button
                onClick={handleSave}
                style={{ width: '100%', background: '#f97316', color: 'white', fontWeight: 700, padding: '12px', borderRadius: '12px', fontSize: '15px', marginTop: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {editTarget ? '更新する' : '登録する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
