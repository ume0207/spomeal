'use client'

import { useState, useEffect, useCallback } from 'react'

interface Staff {
  id: string
  name: string
  color: string
  role: string
  active: boolean
}

interface Shift {
  id: string
  staffId: string
  staffName: string
  date: string
  startTime: string
  endTime: string
  notes: string
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function toDateKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export default function ShiftPage() {
  const today = new Date()
  const [curYear, setCurYear] = useState(today.getFullYear())
  const [curMonth, setCurMonth] = useState(today.getMonth())
  const [staff, setStaff] = useState<Staff[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [detail, setDetail] = useState<{ date: string } | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ staffId: '', startTime: '09:00', endTime: '18:00', notes: '' })

  useEffect(() => {
    try {
      const savedStaff = localStorage.getItem('staff_v1')
      if (savedStaff) setStaff(JSON.parse(savedStaff))
    } catch {}
    try {
      const savedShifts = localStorage.getItem('shifts_v1')
      if (savedShifts) setShifts(JSON.parse(savedShifts))
    } catch {}
  }, [])

  const saveShifts = (data: Shift[]) => {
    setShifts(data)
    localStorage.setItem('shifts_v1', JSON.stringify(data))
  }

  const activeStaff = staff.filter(s => s.active !== false)

  const addShift = () => {
    if (!addForm.staffId) { alert('スタッフを選択してください'); return }
    if (!detail) return
    const staffObj = activeStaff.find(s => s.id === addForm.staffId)
    const newShift: Shift = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      staffId: addForm.staffId,
      staffName: staffObj?.name || '',
      date: detail.date,
      startTime: addForm.startTime,
      endTime: addForm.endTime,
      notes: addForm.notes,
    }
    saveShifts([...shifts, newShift])
    setShowAddModal(false)
    setAddForm({ staffId: activeStaff[0]?.id || '', startTime: '09:00', endTime: '18:00', notes: '' })
  }

  const deleteShift = (id: string) => {
    saveShifts(shifts.filter(s => s.id !== id))
  }

  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate())
  const firstDay = new Date(curYear, curMonth, 1).getDay()
  const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate()

  const prevMonth = useCallback(() => {
    if (curMonth === 0) { setCurYear(y => y - 1); setCurMonth(11) }
    else setCurMonth(m => m - 1)
  }, [curMonth])

  const nextMonth = useCallback(() => {
    if (curMonth === 11) { setCurYear(y => y + 1); setCurMonth(0) }
    else setCurMonth(m => m + 1)
  }, [curMonth])

  const detailShifts = detail ? shifts.filter(s => s.date === detail.date) : []

  return (
    <div style={{ fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif", color: '#1a1a1a' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <button onClick={prevMonth} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: '14px' }}>◀</button>
        <h1 style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: '#111827' }}>📋 {curYear}年{curMonth + 1}月 シフト管理</h1>
        <button onClick={nextMonth} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: '14px' }}>▶</button>
        <button onClick={() => { setCurYear(today.getFullYear()); setCurMonth(today.getMonth()) }}
          style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>
          今月
        </button>
      </div>

      {/* スタッフ凡例 */}
      {activeStaff.length > 0 && (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>スタッフカラー：</span>
          {activeStaff.map(s => (
            <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: s.color || '#2563eb' }} />
              {s.name}
            </span>
          ))}
        </div>
      )}

      {/* カレンダー */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          {DAY_LABELS.map((d, i) => (
            <div key={d} style={{ textAlign: 'center', padding: '8px 4px', fontSize: '11px', fontWeight: 700, color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#6b7280' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e-${i}`} style={{ minHeight: '80px', background: '#f9fafb', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1
            const dateKey = toDateKey(curYear, curMonth, d)
            const isToday = dateKey === todayKey
            const dow = (firstDay + i) % 7
            const dayShifts = shifts.filter(s => s.date === dateKey)
            return (
              <div
                key={d}
                onClick={() => setDetail({ date: dateKey })}
                style={{ minHeight: '80px', padding: '5px', background: isToday ? '#eff6ff' : 'white', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '3px', color: isToday ? '#4f46e5' : dow === 0 ? '#ef4444' : dow === 6 ? '#3b82f6' : '#374151' }}>{d}</div>
                {dayShifts.slice(0, 3).map(sh => {
                  const st = staff.find(s => s.id === sh.staffId)
                  return (
                    <div key={sh.id} style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '3px', marginBottom: '2px', background: st?.color || '#9ca3af', color: 'white', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sh.staffName}
                    </div>
                  )
                })}
                {dayShifts.length > 3 && <div style={{ fontSize: '9px', color: '#9ca3af' }}>+{dayShifts.length - 3}</div>}
              </div>
            )
          })}
        </div>
      </div>

      {/* 詳細オーバーレイ */}
      {detail && (
        <div onClick={() => setDetail(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', width: '100%', maxWidth: '480px', borderRadius: '20px 20px 0 0', padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 900, margin: 0 }}>{detail.date} のシフト</h2>
              <button onClick={() => setDetail(null)} style={{ fontSize: '20px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>

            {detailShifts.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '16px', color: '#9ca3af', fontSize: '12px' }}>シフトが登録されていません</p>
            ) : (
              detailShifts.map(sh => {
                const st = staff.find(s => s.id === sh.staffId)
                return (
                  <div key={sh.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: st?.color || '#9ca3af', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', fontWeight: 700, flex: 1 }}>{sh.staffName}</span>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>{sh.startTime}〜{sh.endTime}</span>
                    <button onClick={() => deleteShift(sh.id)} style={{ fontSize: '12px', color: '#ef4444', padding: '2px 6px', background: 'none', border: 'none', cursor: 'pointer' }}>削除</button>
                  </div>
                )
              })
            )}

            <button
              onClick={() => { setAddForm({ staffId: activeStaff[0]?.id || '', startTime: '09:00', endTime: '18:00', notes: '' }); setShowAddModal(true) }}
              style={{ width: '100%', marginTop: '12px', padding: '10px', borderRadius: '10px', border: '1.5px dashed #d1d5db', background: 'white', color: '#6b7280', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ＋ シフトを追加
            </button>
          </div>
        </div>
      )}

      {/* シフト追加モーダル */}
      {showAddModal && (
        <div onClick={() => setShowAddModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', width: '100%', maxWidth: '480px', borderRadius: '20px 20px 0 0', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 900, margin: 0 }}>シフト追加 <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 400 }}>{detail?.date}</span></h2>
              <button onClick={() => setShowAddModal(false)} style={{ fontSize: '20px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>スタッフ *</label>
              <select value={addForm.staffId} onChange={e => setAddForm(f => ({ ...f, staffId: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}>
                {activeStaff.length === 0
                  ? <option value="">スタッフが登録されていません</option>
                  : activeStaff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)
                }
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              {[{ label: '開始時間', key: 'startTime' }, { label: '終了時間', key: 'endTime' }].map(({ label, key }) => (
                <div key={key}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>{label}</label>
                  <input type="time" value={addForm[key as 'startTime' | 'endTime']} onChange={e => setAddForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>メモ</label>
              <input type="text" value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} placeholder="備考など"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>

            <button onClick={addShift} style={{ width: '100%', padding: '13px', borderRadius: '12px', border: 'none', background: '#4f46e5', color: 'white', fontWeight: 800, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
              追加する
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
