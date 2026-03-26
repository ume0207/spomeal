'use client'

import { useState, useEffect } from 'react'

interface Reservation {
  id: string
  date: string
  time: string
  staffName: string
  notes: string
  status: 'confirmed' | 'completed' | 'cancelled'
  createdAt: string
  meetLink?: string
  calendarEventId?: string
}

interface TimeSlot {
  id: string
  time: string
  label: string
  maxSlots: number
  daysOfWeek: number[]
  enabled: boolean
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function toDateKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export default function ReservePage() {
  const today = new Date(2026, 2, 25)
  const [curYear, setCurYear] = useState(today.getFullYear())
  const [curMonth, setCurMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmSlot, setConfirmSlot] = useState<{ date: string; time: string; staffName: string } | null>(null)
  const [confirmNotes, setConfirmNotes] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('reservations_v1')
      if (saved) setReservations(JSON.parse(saved))
    } catch {}
    try {
      const savedSlots = localStorage.getItem('timeSlots_v1')
      if (savedSlots) setTimeSlots(JSON.parse(savedSlots))
      else {
        // デフォルトスロット
        const defaults: TimeSlot[] = [
          { id: 'ts1', time: '09:00', label: '朝の栄養相談', maxSlots: 1, daysOfWeek: [1, 2, 3, 4, 5], enabled: true },
          { id: 'ts2', time: '10:00', label: '午前の栄養相談', maxSlots: 1, daysOfWeek: [1, 2, 3, 4, 5], enabled: true },
          { id: 'ts3', time: '11:00', label: '午前の栄養相談', maxSlots: 1, daysOfWeek: [1, 2, 3, 4, 5], enabled: true },
          { id: 'ts4', time: '13:00', label: '午後の栄養相談', maxSlots: 1, daysOfWeek: [1, 2, 3, 4, 5], enabled: true },
          { id: 'ts5', time: '14:00', label: '午後の栄養相談', maxSlots: 1, daysOfWeek: [1, 2, 3, 4, 5], enabled: true },
          { id: 'ts6', time: '15:00', label: '午後の栄養相談', maxSlots: 1, daysOfWeek: [1, 2, 3, 4, 5], enabled: true },
          { id: 'ts7', time: '16:00', label: '夕方の栄養相談', maxSlots: 1, daysOfWeek: [1, 2, 3, 4, 5], enabled: true },
          { id: 'ts8', time: '17:00', label: '夕方の栄養相談', maxSlots: 1, daysOfWeek: [1, 2, 3, 4, 5], enabled: true },
        ]
        setTimeSlots(defaults)
      }
    } catch {}
  }, [])

  const saveReservations = (data: Reservation[]) => {
    setReservations(data)
    localStorage.setItem('reservations_v1', JSON.stringify(data))
  }

  const prevMonth = () => {
    if (curMonth === 0) { setCurYear(curYear - 1); setCurMonth(11) }
    else setCurMonth(curMonth - 1)
  }
  const nextMonth = () => {
    if (curMonth === 11) { setCurYear(curYear + 1); setCurMonth(0) }
    else setCurMonth(curMonth + 1)
  }

  const firstDay = new Date(curYear, curMonth, 1).getDay()
  const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate()
  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate())

  const getReservationsForDate = (dateKey: string) => reservations.filter((r) => r.date === dateKey && r.status !== 'cancelled')

  const getSlotsForDate = (dateKey: string) => {
    const dow = new Date(dateKey).getDay()
    return timeSlots.filter((s) => s.enabled && s.daysOfWeek.includes(dow))
  }

  const isSlotBooked = (dateKey: string, time: string) => {
    return reservations.some((r) => r.date === dateKey && r.time === time && r.status !== 'cancelled')
  }

  const openConfirm = (date: string, time: string) => {
    setConfirmSlot({ date, time, staffName: '管理栄養士' })
    setConfirmNotes('')
    setShowConfirm(true)
  }

  const confirmBook = () => {
    if (!confirmSlot) return
    const newRes: Reservation = {
      id: Date.now().toString(),
      date: confirmSlot.date,
      time: confirmSlot.time,
      staffName: confirmSlot.staffName,
      notes: confirmNotes,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    }
    saveReservations([...reservations, newRes])
    setShowConfirm(false)
    alert('予約が完了しました！')
  }

  const cancelReservation = (id: string) => {
    if (!confirm('この予約をキャンセルしますか？')) return
    saveReservations(reservations.map((r) => r.id === id ? { ...r, status: 'cancelled' as const } : r))
  }

  const myReservations = reservations.filter((r) => r.status !== 'cancelled').sort((a, b) => {
    const da = new Date(a.date + ' ' + a.time)
    const db = new Date(b.date + ' ' + b.time)
    return da.getTime() - db.getTime()
  })

  const selectedSlots = selectedDate ? getSlotsForDate(selectedDate) : []

  return (
    <div
      style={{
        fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",
        color: '#1a1a1a',
      }}
    >
      {/* サブヘッダー */}
      <div
        style={{
          background: '#0ea5e9',
          color: 'white',
          padding: '12px 16px',
          position: 'sticky',
          top: '60px',
          zIndex: 90,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>📅 オンライン予約</p>
            <p style={{ fontSize: '11px', opacity: 0.8, margin: '2px 0 0' }}>管理栄養士とのオンラインミーティングを予約</p>
          </div>
          <p style={{ fontSize: '12px', opacity: 0.85 }}>選手 さん</p>
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px 12px 100px' }}>

        {/* カレンダー */}
        <div
          style={{
            background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px',
            padding: '16px', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <button
              onClick={prevMonth}
              style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ◀
            </button>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>
              {curYear}年{curMonth + 1}月
            </span>
            <button
              onClick={nextMonth}
              style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ▶
            </button>
          </div>

          {/* 曜日ヘッダー */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
            {DAY_LABELS.map((d, i) => (
              <div
                key={d}
                style={{
                  textAlign: 'center', fontSize: '11px', fontWeight: 700, padding: '4px',
                  color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#6b7280',
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* カレンダーグリッド */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1
              const dateKey = toDateKey(curYear, curMonth, d)
              const isToday = dateKey === todayKey
              const isSelected = dateKey === selectedDate
              const dow = new Date(dateKey).getDay()
              const hasSlots = timeSlots.some((s) => s.enabled && s.daysOfWeek.includes(dow))
              const resCount = getReservationsForDate(dateKey).length
              const isPast = new Date(dateKey) < new Date(todayKey)

              return (
                <button
                  key={d}
                  onClick={() => !isPast && hasSlots && setSelectedDate(dateKey)}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #0ea5e9' : isToday ? '2px solid #22c55e' : '1px solid transparent',
                    background: isSelected ? '#e0f2fe' : isToday ? '#f0fdf4' : 'white',
                    color: isPast ? '#d1d5db' : dow === 0 ? '#ef4444' : dow === 6 ? '#3b82f6' : '#111827',
                    fontSize: '12px',
                    fontWeight: isToday || isSelected ? 800 : 400,
                    cursor: !isPast && hasSlots ? 'pointer' : 'default',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                    padding: '4px 2px',
                    opacity: isPast ? 0.5 : 1,
                  }}
                >
                  <span>{d}</span>
                  {!isPast && hasSlots && (
                    <span
                      style={{
                        width: '5px', height: '5px', borderRadius: '50%',
                        background: resCount > 0 ? '#f97316' : '#0ea5e9',
                        display: 'block',
                      }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* 選択日のスロット */}
        {selectedDate && (() => {
          const d = new Date(selectedDate + 'T12:00:00')
          const dow = d.getDay()
          const dateLabel = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${DAY_LABELS[dow]}）`
          return (
            <div
              style={{
                background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px',
                padding: '16px', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              <p style={{ fontSize: '14px', fontWeight: 800, color: '#111827', margin: '0 0 12px' }}>
                {dateLabel} の空き時間
              </p>
              {selectedSlots.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '12px', padding: '16px 0' }}>
                  この日は予約できる時間がありません
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {selectedSlots.map((slot) => {
                    const booked = isSlotBooked(selectedDate, slot.time)
                    const isMyBooking = reservations.some(
                      r => r.date === selectedDate && r.time === slot.time && r.status !== 'cancelled'
                    )
                    const btnStyle = isMyBooking
                      ? { border: '1.5px solid #0ea5e9', background: '#0ea5e9', color: 'white', cursor: 'not-allowed' }
                      : booked
                      ? { border: '1px solid #f59e0b', background: '#fef3c7', color: '#d97706', cursor: 'not-allowed' }
                      : { border: '1.5px solid #0ea5e9', background: 'white', color: '#0284c7', cursor: 'pointer' }
                    return (
                      <button
                        key={slot.id}
                        disabled={booked}
                        onClick={() => !booked && openConfirm(selectedDate, slot.time)}
                        style={{
                          padding: '10px 8px', borderRadius: '8px',
                          fontSize: '12px', fontWeight: 700,
                          fontFamily: 'inherit',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                          ...btnStyle,
                        }}
                      >
                        <span style={{ fontSize: '14px' }}>{slot.time}</span>
                        <span style={{ fontSize: '10px', fontWeight: 600 }}>
                          {isMyBooking ? '予約済み' : booked ? '満席' : slot.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}

        {/* 予約一覧 */}
        <div
          style={{
            background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px',
            padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#374151', margin: 0 }}>📋 予約済み一覧</p>
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>{myReservations.length}件</span>
          </div>
          {myReservations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: '12px' }}>
              予約がありません
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {myReservations.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: '12px 14px', borderRadius: '10px', background: '#f0f9ff',
                    border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: '12px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0369a1' }}>
                      {r.date} {r.time}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                      担当: {r.staffName}
                      {r.notes && <span style={{ marginLeft: '8px' }}>/ {r.notes}</span>}
                    </div>
                    {r.meetLink && (
                      <a
                        href={r.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          marginTop: '6px', padding: '4px 10px', borderRadius: '6px',
                          background: '#1e88e5', color: 'white', fontSize: '11px',
                          fontWeight: 700, textDecoration: 'none',
                        }}
                      >
                        🎥 Meetに参加する
                      </a>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px',
                      background: r.status === 'confirmed' ? '#dbeafe' : r.status === 'completed' ? '#dcfce7' : '#f3f4f6',
                      color: r.status === 'confirmed' ? '#1d4ed8' : r.status === 'completed' ? '#16a34a' : '#9ca3af',
                    }}
                  >
                    {r.status === 'confirmed' ? '確定' : r.status === 'completed' ? '完了' : 'キャンセル'}
                  </span>
                  {r.status === 'confirmed' && (
                    <button
                      onClick={() => cancelReservation(r.id)}
                      style={{
                        padding: '5px 10px', borderRadius: '7px', border: '1px solid #fca5a5',
                        color: '#ef4444', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                        background: 'white', fontFamily: 'inherit',
                      }}
                    >
                      キャンセル
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 確認モーダル */}
      {showConfirm && confirmSlot && (
        <div
          onClick={() => setShowConfirm(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white', width: '100%', maxWidth: '640px',
              borderRadius: '20px 20px 0 0',
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 900, margin: '0 0 2px', color: '#111827' }}>📅 予約確認</h2>
                <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>内容を確認して予約してください</p>
              </div>
              <button onClick={() => setShowConfirm(false)} style={{ fontSize: '20px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>✕</button>
            </div>
            <div style={{ padding: '16px 20px 24px' }}>
              {[
                { label: '日付', value: (() => { const d = new Date(confirmSlot.date + 'T12:00:00'); return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${DAY_LABELS[d.getDay()]}）` })() },
                { label: '時間', value: confirmSlot.time },
                { label: '担当', value: confirmSlot.staffName },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{ display: 'flex', gap: '16px', padding: '10px 0', borderBottom: '1px solid #f3f4f6', fontSize: '13px' }}
                >
                  <span style={{ color: '#6b7280', width: '60px', flexShrink: 0 }}>{row.label}</span>
                  <span style={{ fontWeight: 700, color: '#111827' }}>{row.value}</span>
                </div>
              ))}
              <div style={{ marginTop: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
                  メモ・相談内容
                </label>
                <textarea
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
                  placeholder="相談したい内容など（任意）"
                  rows={3}
                  style={{
                    width: '100%', background: '#f9fafb', border: '1.5px solid #e5e7eb',
                    borderRadius: '10px', padding: '10px 14px', color: '#111827', fontSize: '13px',
                    outline: 'none', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div
                style={{
                  marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 12px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe',
                  fontSize: '12px',
                }}
              >
                <span style={{ fontSize: '18px' }}>📅</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#1d4ed8' }}>Google カレンダー &amp; Meet 自動連携</div>
                  <div style={{ color: '#374151', marginTop: '2px' }}>予約確定後、自動でカレンダーに登録しMeetリンクを発行します。</div>
                </div>
              </div>
              <button
                onClick={confirmBook}
                style={{
                  width: '100%', marginTop: '12px', padding: '14px', borderRadius: '12px', border: 'none',
                  background: '#0ea5e9', color: 'white', fontWeight: 800, fontSize: '14px',
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 4px 16px rgba(14,165,233,0.35)',
                }}
              >
                ✅ 予約を確定する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
