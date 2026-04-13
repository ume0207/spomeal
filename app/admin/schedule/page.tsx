'use client'

import { useState, useEffect } from 'react'

interface TimeSlot {
  id: string
  time: string
  label: string
  maxClients: number
  available: boolean
  dayOfWeek: number[]
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

const DEFAULT_SLOTS: TimeSlot[] = [
  { id: '1', time: '09:00', label: '朝の栄養相談', maxClients: 1, available: true, dayOfWeek: [1,2,3,4,5] },
  { id: '2', time: '13:00', label: '昼の栄養相談', maxClients: 2, available: true, dayOfWeek: [1,2,3,4,5] },
  { id: '3', time: '17:00', label: '夕方の栄養相談', maxClients: 1, available: true, dayOfWeek: [1,2,3,4,5] },
]

export default function SchedulePage() {
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ time: '09:00', label: '', maxClients: 1, dayOfWeek: [1,2,3,4,5] as number[] })

  useEffect(() => {
    // スケジュールをAPIから取得（localStorage fallback付き）
    fetch('/api/schedule')
      .then(r => r.ok ? r.json() : [])
      .then((data: TimeSlot[]) => {
        if (data && data.length > 0) {
          setSlots(data)
        } else {
          // APIに無い場合はlocalStorageから復元
          try {
            const saved = localStorage.getItem('timeSlots_v1')
            const parsed = saved ? JSON.parse(saved) : DEFAULT_SLOTS
            setSlots(parsed)
            // APIにマイグレーション
            fetch('/api/schedule', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(parsed),
            }).catch(() => {})
          } catch {
            setSlots(DEFAULT_SLOTS)
          }
        }
      })
      .catch(() => {
        try {
          const saved = localStorage.getItem('timeSlots_v1')
          setSlots(saved ? JSON.parse(saved) : DEFAULT_SLOTS)
        } catch { setSlots(DEFAULT_SLOTS) }
      })
  }, [])

  const save = (data: TimeSlot[]) => {
    setSlots(data)
    localStorage.setItem('timeSlots_v1', JSON.stringify(data))
    // APIにも保存
    fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {})
  }

  const toggleSlot = (id: string, val: boolean) => {
    save(slots.map(s => s.id === id ? { ...s, available: val } : s))
  }

  const deleteSlot = (id: string) => {
    if (!confirm('このスロットを削除しますか？')) return
    save(slots.filter(s => s.id !== id))
  }

  const toggleDow = (dow: number) => {
    setForm(f => ({
      ...f,
      dayOfWeek: f.dayOfWeek.includes(dow)
        ? f.dayOfWeek.filter(d => d !== dow)
        : [...f.dayOfWeek, dow]
    }))
  }

  const addSlot = () => {
    if (!form.time) return
    const newSlot: TimeSlot = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      time: form.time,
      label: form.label.trim() || '栄養相談',
      maxClients: form.maxClients,
      available: true,
      dayOfWeek: form.dayOfWeek,
    }
    save([...slots, newSlot])
    setShowModal(false)
    setForm({ time: '09:00', label: '', maxClients: 1, dayOfWeek: [1,2,3,4,5] })
  }

  const sorted = [...slots].sort((a, b) => a.time.localeCompare(b.time))

  return (
    <div style={{ fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif", color: '#1a1a1a' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 900, margin: 0, color: '#111827' }}>🕐 タイムスケジュール設定</h1>
        <button
          onClick={() => setShowModal(true)}
          style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: '#2563eb', color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ＋ スロット追加
        </button>
      </div>

      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
            予約可能な時間スロットを管理します。スロットを有効にすると会員が予約できるようになります。
          </p>
        </div>

        {sorted.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
            スロットがありません。「スロット追加」から設定してください。
          </div>
        ) : (
          sorted.map(slot => (
            <div
              key={slot.id}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}
            >
              <span style={{ fontSize: '16px', fontWeight: 900, color: '#111827', minWidth: '50px' }}>{slot.time}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 3px', color: '#374151' }}>{slot.label}</p>
                <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 4px' }}>最大{slot.maxClients}名</p>
                <div style={{ display: 'flex', gap: '3px' }}>
                  {DAY_LABELS.map((d, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '10px', padding: '1px 5px', borderRadius: '4px', fontWeight: 600,
                        background: slot.dayOfWeek.includes(i) ? '#dbeafe' : '#f3f4f6',
                        color: slot.dayOfWeek.includes(i) ? '#1d4ed8' : '#9ca3af',
                      }}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
              {/* トグル */}
              <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={slot.available}
                  onChange={e => toggleSlot(slot.id, e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  onClick={() => toggleSlot(slot.id, !slot.available)}
                  style={{
                    position: 'absolute', inset: 0, borderRadius: '24px', cursor: 'pointer',
                    background: slot.available ? '#22c55e' : '#d1d5db', transition: 'background 0.2s',
                  }}
                />
                <span
                  onClick={() => toggleSlot(slot.id, !slot.available)}
                  style={{
                    position: 'absolute', top: '2px', left: slot.available ? '22px' : '2px',
                    width: '20px', height: '20px', borderRadius: '50%', background: 'white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s', cursor: 'pointer',
                  }}
                />
              </label>
              <button
                onClick={() => deleteSlot(slot.id)}
                style={{ fontSize: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px', flexShrink: 0 }}
              >
                🗑
              </button>
            </div>
          ))
        )}
      </div>

      {/* モーダル */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'white', width: '100%', maxWidth: '480px', borderRadius: '20px 20px 0 0', padding: '20px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 900, margin: 0 }}>時間スロット追加</h2>
              <button onClick={() => setShowModal(false)} style={{ fontSize: '20px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>時間 *</label>
              <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>ラベル</label>
              <input type="text" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="例：朝の栄養相談"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>最大予約人数</label>
              <input type="number" min={1} max={10} value={form.maxClients} onChange={e => setForm(f => ({ ...f, maxClients: parseInt(e.target.value) || 1 }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>対応曜日</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {DAY_LABELS.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => toggleDow(i)}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: '6px', border: 'none', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: '12px', fontWeight: 700,
                      background: form.dayOfWeek.includes(i) ? '#2563eb' : '#f3f4f6',
                      color: form.dayOfWeek.includes(i) ? 'white' : '#6b7280',
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={addSlot}
              style={{ width: '100%', padding: '13px', borderRadius: '12px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 800, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              追加する
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
