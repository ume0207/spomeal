'use client'

import { useState, useEffect, useCallback } from 'react'

interface Staff {
  id: string
  name: string
  color: string
  role: string
  active: boolean
}

// 1つの時間帯（10:00〜12:00 など）
interface TimeSlot {
  startTime: string
  endTime: string
}

interface Shift {
  id: string
  staffId: string
  staffName: string
  date: string
  slots: TimeSlot[]  // 複数時間帯に対応
  notes: string
}

// 旧フォーマットとの互換
interface LegacyShift {
  id: string
  staffId: string
  staffName: string
  date: string
  startTime?: string
  endTime?: string
  slots?: TimeSlot[]
  notes: string
}

function migrateLegacyShifts(raw: LegacyShift[]): Shift[] {
  return raw.map(s => ({
    ...s,
    slots: s.slots || (s.startTime && s.endTime ? [{ startTime: s.startTime, endTime: s.endTime }] : [{ startTime: '09:00', endTime: '18:00' }]),
  }))
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function toDateKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function formatSlots(slots: TimeSlot[]): string {
  return slots.map(s => `${s.startTime}〜${s.endTime}`).join('、')
}

export default function ShiftPage() {
  const today = new Date()
  const [curYear, setCurYear] = useState(today.getFullYear())
  const [curMonth, setCurMonth] = useState(today.getMonth())
  const [staff, setStaff] = useState<Staff[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [detail, setDetail] = useState<{ date: string } | null>(null)

  // シフト追加モーダル
  const [showAddModal, setShowAddModal] = useState(false)
  const [addStaffId, setAddStaffId] = useState('')
  const [addSlots, setAddSlots] = useState<TimeSlot[]>([{ startTime: '09:00', endTime: '18:00' }])
  const [addNotes, setAddNotes] = useState('')

  // 一括登録モーダル
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkStaffId, setBulkStaffId] = useState('')
  const [bulkSlots, setBulkSlots] = useState<TimeSlot[]>([{ startTime: '09:00', endTime: '18:00' }])
  const [bulkNotes, setBulkNotes] = useState('')
  const [bulkSelectedDays, setBulkSelectedDays] = useState<number[]>([]) // 0=日,1=月,...6=土
  const [bulkSelectedDates, setBulkSelectedDates] = useState<Set<string>>(new Set())
  const [bulkMode, setBulkMode] = useState<'weekday' | 'pick'>('weekday')

  useEffect(() => {
    // スタッフ一覧をAPIから取得
    fetch('/api/staff')
      .then(r => r.ok ? r.json() : [])
      .then(data => setStaff(data))
      .catch(() => {})
    try {
      const savedShifts = localStorage.getItem('shifts_v1')
      if (savedShifts) setShifts(migrateLegacyShifts(JSON.parse(savedShifts)))
    } catch {}
  }, [])

  const saveShifts = (data: Shift[]) => {
    setShifts(data)
    localStorage.setItem('shifts_v1', JSON.stringify(data))
  }

  const activeStaff = staff.filter(s => s.active !== false)

  // === 単日シフト追加 ===
  const addShift = () => {
    if (!addStaffId) { alert('スタッフを選択してください'); return }
    if (!detail) return
    const validSlots = addSlots.filter(s => s.startTime && s.endTime)
    if (validSlots.length === 0) { alert('時間帯を1つ以上設定してください'); return }
    const staffObj = activeStaff.find(s => s.id === addStaffId)
    const newShift: Shift = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      staffId: addStaffId,
      staffName: staffObj?.name || '',
      date: detail.date,
      slots: validSlots,
      notes: addNotes,
    }
    saveShifts([...shifts, newShift])
    setShowAddModal(false)
  }

  // === 一括登録 ===
  const addBulkShifts = () => {
    if (!bulkStaffId) { alert('スタッフを選択してください'); return }
    const validSlots = bulkSlots.filter(s => s.startTime && s.endTime)
    if (validSlots.length === 0) { alert('時間帯を1つ以上設定してください'); return }

    let targetDates: string[] = []

    if (bulkMode === 'weekday') {
      // 曜日指定 → 該当月の全日付を取得
      if (bulkSelectedDays.length === 0) { alert('曜日を選択してください'); return }
      const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate()
      for (let d = 1; d <= daysInMonth; d++) {
        const dow = new Date(curYear, curMonth, d).getDay()
        if (bulkSelectedDays.includes(dow)) {
          targetDates.push(toDateKey(curYear, curMonth, d))
        }
      }
    } else {
      // カレンダーから日付をピック
      targetDates = Array.from(bulkSelectedDates).sort()
      if (targetDates.length === 0) { alert('日付を1つ以上選択してください'); return }
    }

    const staffObj = activeStaff.find(s => s.id === bulkStaffId)
    const newShifts: Shift[] = targetDates.map(date => ({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2) + date,
      staffId: bulkStaffId,
      staffName: staffObj?.name || '',
      date,
      slots: validSlots,
      notes: bulkNotes,
    }))

    // 既存と重複するシフト（同スタッフ・同日）を除外
    const existingKeys = new Set(shifts.filter(s => s.staffId === bulkStaffId).map(s => s.date))
    const filtered = newShifts.filter(s => !existingKeys.has(s.date))

    if (filtered.length === 0) {
      alert('選択した日付にはすでにシフトが登録されています')
      return
    }

    saveShifts([...shifts, ...filtered])
    alert(`${filtered.length}日分のシフトを登録しました`)
    setShowBulkModal(false)
    setBulkSelectedDays([])
    setBulkSelectedDates(new Set())
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

  // 時間帯の追加・削除・更新ヘルパー
  const updateSlot = (slots: TimeSlot[], setSlots: (s: TimeSlot[]) => void, idx: number, field: 'startTime' | 'endTime', value: string) => {
    const updated = [...slots]
    updated[idx] = { ...updated[idx], [field]: value }
    setSlots(updated)
  }

  const addSlotRow = (slots: TimeSlot[], setSlots: (s: TimeSlot[]) => void) => {
    setSlots([...slots, { startTime: '', endTime: '' }])
  }

  const removeSlotRow = (slots: TimeSlot[], setSlots: (s: TimeSlot[]) => void, idx: number) => {
    if (slots.length <= 1) return
    setSlots(slots.filter((_, i) => i !== idx))
  }

  // 時間帯入力コンポーネント
  const renderSlotEditor = (slots: TimeSlot[], setSlots: (s: TimeSlot[]) => void) => (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
        勤務時間帯 <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 400 }}>（中抜けOK・複数設定可）</span>
      </label>
      {slots.map((slot, idx) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <span style={{
            fontSize: '10px', fontWeight: 700, color: '#6b7280',
            background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', minWidth: '16px', textAlign: 'center',
          }}>{idx + 1}</span>
          <input type="time" value={slot.startTime}
            onChange={e => updateSlot(slots, setSlots, idx, 'startTime', e.target.value)}
            style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' }} />
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>〜</span>
          <input type="time" value={slot.endTime}
            onChange={e => updateSlot(slots, setSlots, idx, 'endTime', e.target.value)}
            style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' }} />
          {slots.length > 1 && (
            <button onClick={() => removeSlotRow(slots, setSlots, idx)}
              style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
          )}
        </div>
      ))}
      <button onClick={() => addSlotRow(slots, setSlots)}
        style={{ width: '100%', padding: '7px', borderRadius: '8px', border: '1.5px dashed #d1d5db', background: 'white', color: '#6b7280', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginTop: '2px' }}>
        ＋ 時間帯を追加
      </button>
    </div>
  )

  // 一括登録用ミニカレンダー
  const renderBulkCalendar = () => {
    const firstDayBulk = new Date(curYear, curMonth, 1).getDay()
    const daysInMonthBulk = new Date(curYear, curMonth + 1, 0).getDate()
    return (
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>日付を選択（タップで切り替え）</label>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            {DAY_LABELS.map((d, i) => (
              <div key={d} style={{ textAlign: 'center', padding: '5px 2px', fontSize: '10px', fontWeight: 700, color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#6b7280' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {Array.from({ length: firstDayBulk }).map((_, i) => (
              <div key={`e-${i}`} style={{ minHeight: '36px' }} />
            ))}
            {Array.from({ length: daysInMonthBulk }).map((_, i) => {
              const d = i + 1
              const dateKey = toDateKey(curYear, curMonth, d)
              const selected = bulkSelectedDates.has(dateKey)
              const dow = (firstDayBulk + i) % 7
              return (
                <div
                  key={d}
                  onClick={() => {
                    const next = new Set(bulkSelectedDates)
                    if (next.has(dateKey)) next.delete(dateKey); else next.add(dateKey)
                    setBulkSelectedDates(next)
                  }}
                  style={{
                    minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: '12px', fontWeight: selected ? 800 : 400,
                    background: selected ? '#4f46e5' : 'white',
                    color: selected ? 'white' : dow === 0 ? '#ef4444' : dow === 6 ? '#3b82f6' : '#374151',
                    borderRadius: '0',
                  }}
                >{d}</div>
              )
            })}
          </div>
        </div>
        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
          {bulkSelectedDates.size}日選択中
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif", color: '#1a1a1a' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <button onClick={prevMonth} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: '14px' }}>◀</button>
        <h1 style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: '#111827' }}>📋 {curYear}年{curMonth + 1}月 シフト管理</h1>
        <button onClick={nextMonth} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: '14px' }}>▶</button>
        <button onClick={() => { setCurYear(today.getFullYear()); setCurMonth(today.getMonth()) }}
          style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>
          今月
        </button>
        <button
          onClick={() => {
            if (!confirm('全シフトデータを削除しますか？')) return
            localStorage.removeItem('shifts_v1')
            localStorage.removeItem('timeSlots_v1')
            setShifts([])
            alert('シフトデータを削除しました')
          }}
          style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #fca5a5', background: 'white', color: '#ef4444', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto' }}>
          🗑 シフトをリセット
        </button>
      </div>

      {/* 一括登録ボタン */}
      <button
        onClick={() => {
          setBulkStaffId(activeStaff[0]?.id || '')
          setBulkSlots([{ startTime: '09:00', endTime: '18:00' }])
          setBulkNotes('')
          setBulkSelectedDays([])
          setBulkSelectedDates(new Set())
          setBulkMode('weekday')
          setShowBulkModal(true)
        }}
        style={{
          width: '100%', marginBottom: '12px', padding: '12px', borderRadius: '12px', border: 'none',
          background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)', color: 'white',
          fontWeight: 800, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 2px 8px rgba(79,70,229,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        }}
      >
        📅 1ヶ月分まとめてシフト登録
      </button>

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
                      {sh.staffName} {sh.slots.length > 0 && <span style={{ opacity: 0.8 }}>{sh.slots[0].startTime}〜</span>}
                    </div>
                  )
                })}
                {dayShifts.length > 3 && <div style={{ fontSize: '9px', color: '#9ca3af' }}>+{dayShifts.length - 3}</div>}
              </div>
            )
          })}
        </div>
      </div>

      {/* ========== 日付詳細オーバーレイ ========== */}
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
                  <div key={sh.id} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: st?.color || '#9ca3af', flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', fontWeight: 700, flex: 1 }}>{sh.staffName}</span>
                      <button onClick={() => deleteShift(sh.id)} style={{ fontSize: '12px', color: '#ef4444', padding: '2px 6px', background: 'none', border: 'none', cursor: 'pointer' }}>削除</button>
                    </div>
                    {/* 複数時間帯を表示 */}
                    <div style={{ marginLeft: '18px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {sh.slots.map((slot, idx) => (
                        <span key={idx} style={{
                          fontSize: '12px', color: '#4f46e5', fontWeight: 600,
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                        }}>
                          <span style={{ fontSize: '10px', color: '#9ca3af' }}>{idx + 1}.</span>
                          {slot.startTime}〜{slot.endTime}
                        </span>
                      ))}
                    </div>
                    {sh.notes && <div style={{ marginLeft: '18px', fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{sh.notes}</div>}
                  </div>
                )
              })
            )}

            <button
              onClick={() => {
                setAddStaffId(activeStaff[0]?.id || '')
                setAddSlots([{ startTime: '09:00', endTime: '18:00' }])
                setAddNotes('')
                setShowAddModal(true)
              }}
              style={{ width: '100%', marginTop: '12px', padding: '10px', borderRadius: '10px', border: '1.5px dashed #d1d5db', background: 'white', color: '#6b7280', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ＋ シフトを追加
            </button>
          </div>
        </div>
      )}

      {/* ========== シフト追加モーダル（単日） ========== */}
      {showAddModal && (
        <div onClick={() => setShowAddModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', width: '100%', maxWidth: '480px', borderRadius: '20px 20px 0 0', padding: '20px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 900, margin: 0 }}>シフト追加 <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 400 }}>{detail?.date}</span></h2>
              <button onClick={() => setShowAddModal(false)} style={{ fontSize: '20px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>

            {/* スタッフ選択 */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>スタッフ *</label>
              <select value={addStaffId} onChange={e => setAddStaffId(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}>
                {activeStaff.length === 0
                  ? <option value="">スタッフが登録されていません</option>
                  : activeStaff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)
                }
              </select>
            </div>

            {/* 時間帯 */}
            {renderSlotEditor(addSlots, setAddSlots)}

            {/* メモ */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>メモ</label>
              <input type="text" value={addNotes} onChange={e => setAddNotes(e.target.value)} placeholder="備考など"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>

            <button onClick={addShift} style={{ width: '100%', padding: '13px', borderRadius: '12px', border: 'none', background: '#4f46e5', color: 'white', fontWeight: 800, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
              追加する
            </button>
          </div>
        </div>
      )}

      {/* ========== 一括登録モーダル ========== */}
      {showBulkModal && (
        <div onClick={() => setShowBulkModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'white', width: '100%', maxWidth: '500px', maxHeight: '85vh',
            borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            {/* ヘッダー */}
            <div style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
              padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>📅</span>
                <span style={{ fontWeight: 800, color: 'white', fontSize: '15px' }}>{curYear}年{curMonth + 1}月 一括シフト登録</span>
              </div>
              <button onClick={() => setShowBulkModal(false)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: '18px', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {/* スタッフ選択 */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>スタッフ *</label>
                <select value={bulkStaffId} onChange={e => setBulkStaffId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}>
                  {activeStaff.length === 0
                    ? <option value="">スタッフが登録されていません</option>
                    : activeStaff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)
                  }
                </select>
              </div>

              {/* 時間帯 */}
              {renderSlotEditor(bulkSlots, setBulkSlots)}

              {/* 日付選択モード */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>対象日の選び方</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {([['weekday', '曜日で選ぶ'], ['pick', 'カレンダーで選ぶ']] as const).map(([mode, label]) => (
                    <button key={mode} onClick={() => setBulkMode(mode)}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                        border: bulkMode === mode ? '2px solid #4f46e5' : '2px solid #e5e7eb',
                        background: bulkMode === mode ? '#eef2ff' : 'white',
                        color: bulkMode === mode ? '#4f46e5' : '#6b7280',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}>{label}</button>
                  ))}
                </div>
              </div>

              {/* 曜日選択 */}
              {bulkMode === 'weekday' ? (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>出勤曜日を選択</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {DAY_LABELS.map((label, idx) => {
                      const selected = bulkSelectedDays.includes(idx)
                      return (
                        <button key={idx}
                          onClick={() => {
                            if (selected) setBulkSelectedDays(d => d.filter(x => x !== idx))
                            else setBulkSelectedDays(d => [...d, idx])
                          }}
                          style={{
                            flex: 1, padding: '10px 0', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                            border: selected ? '2px solid #4f46e5' : '2px solid #e5e7eb',
                            background: selected ? '#4f46e5' : 'white',
                            color: selected ? 'white' : idx === 0 ? '#ef4444' : idx === 6 ? '#3b82f6' : '#374151',
                            cursor: 'pointer', fontFamily: 'inherit',
                          }}>{label}</button>
                      )
                    })}
                  </div>
                  {bulkSelectedDays.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                      {(() => {
                        const count = (() => {
                          let c = 0
                          const dim = new Date(curYear, curMonth + 1, 0).getDate()
                          for (let d = 1; d <= dim; d++) {
                            if (bulkSelectedDays.includes(new Date(curYear, curMonth, d).getDay())) c++
                          }
                          return c
                        })()
                        return `${count}日分が対象になります`
                      })()}
                    </div>
                  )}
                </div>
              ) : (
                renderBulkCalendar()
              )}

              {/* メモ */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>メモ</label>
                <input type="text" value={bulkNotes} onChange={e => setBulkNotes(e.target.value)} placeholder="備考など"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>

              <button onClick={addBulkShifts} style={{
                width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)', color: 'white',
                fontWeight: 800, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
              }}>
                一括登録する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
