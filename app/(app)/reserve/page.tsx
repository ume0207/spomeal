'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Reservation {
  id: string
  date: string
  time: string
  staffId: string
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

interface Staff {
  id: string
  name: string
  color: string
  role: string
  title: string
  specialties: string
  photo: string
  active: boolean
}

// シフト型（複数時間帯対応）
interface ShiftTimeSlot {
  startTime: string
  endTime: string
}

interface Shift {
  id: string
  staffId: string
  staffName: string
  date: string
  slots?: ShiftTimeSlot[]
  startTime?: string
  endTime?: string
  notes: string
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function toDateKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// 9:00〜18:40 を20分刻みで生成
function generateDefaultTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = []
  let id = 1
  for (let h = 9; h <= 18; h++) {
    for (let m = 0; m < 60; m += 20) {
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      const label = h < 12 ? '午前の栄養相談' : h < 17 ? '午後の栄養相談' : '夕方の栄養相談'
      slots.push({ id: `ts${id++}`, time, label, maxSlots: 1, daysOfWeek: [1, 2, 3, 4, 5], enabled: true })
    }
  }
  return slots
}

// 指定時刻がシフトの時間帯に含まれるか判定（20分のミーティング枠として）
function isTimeInShiftSlots(time: string, shift: Shift): boolean {
  const shiftSlots: ShiftTimeSlot[] = shift.slots || (shift.startTime && shift.endTime ? [{ startTime: shift.startTime, endTime: shift.endTime }] : [])
  const [th, tm] = time.split(':').map(Number)
  const timeMin = th * 60 + tm
  const meetingEnd = timeMin + 20 // 20分枠

  return shiftSlots.some(slot => {
    const [sh, sm] = slot.startTime.split(':').map(Number)
    const [eh, em] = slot.endTime.split(':').map(Number)
    const slotStart = sh * 60 + sm
    const slotEnd = eh * 60 + em
    return timeMin >= slotStart && meetingEnd <= slotEnd
  })
}

export default function ReservePage() {
  const [today, setToday] = useState<Date | null>(null)
  const [curYear, setCurYear] = useState(2026)
  const [curMonth, setCurMonth] = useState(2)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [allStaff, setAllStaff] = useState<Staff[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])

  // 予約確認
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmSlot, setConfirmSlot] = useState<{ date: string; time: string; staffId: string; staffName: string } | null>(null)
  const [confirmNotes, setConfirmNotes] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [gcalStatus, setGcalStatus] = useState<'idle' | 'linked' | 'error'>('idle')

  // スタッフ選択
  const [selectedStaffId, setSelectedStaffId] = useState<string>('any')

  useEffect(() => {
    const now = new Date()
    setToday(now)
    setCurYear(now.getFullYear())
    setCurMonth(now.getMonth())

    // 予約をlocalStorage + APIからマージして読み込む
    const loadReservations = async () => {
      let localData: Reservation[] = []
      try {
        const saved = localStorage.getItem('reservations_v1')
        if (saved) localData = JSON.parse(saved)
      } catch {}

      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.id) {
          const res = await fetch(`/api/reservations?userId=${session.user.id}`)
          if (res.ok) {
            const apiData: Reservation[] = await res.json()
            // IDが被った場合はAPIデータを優先してマージ
            const merged = new Map<string, Reservation>()
            for (const r of localData) merged.set(r.id, r)
            for (const r of apiData) merged.set(r.id, r)
            const mergedArr = Array.from(merged.values())
            setReservations(mergedArr)
            localStorage.setItem('reservations_v1', JSON.stringify(mergedArr))
            return
          }
        }
      } catch {}

      // APIが失敗した場合はlocalStorageのみ
      setReservations(localData)
    }

    loadReservations()

    try {
      const savedSlots = localStorage.getItem('timeSlots_v1')
      const parsed: TimeSlot[] = savedSlots ? JSON.parse(savedSlots) : []
      if (parsed.length >= 40) setTimeSlots(parsed)
      else {
        const defaults = generateDefaultTimeSlots()
        setTimeSlots(defaults)
        localStorage.setItem('timeSlots_v1', JSON.stringify(defaults))
      }
    } catch {
      const defaults = generateDefaultTimeSlots()
      setTimeSlots(defaults)
    }
    try {
      const savedStaff = localStorage.getItem('staff_v1')
      if (savedStaff) setAllStaff(JSON.parse(savedStaff))
    } catch {}
    try {
      const savedShifts = localStorage.getItem('shifts_v1')
      if (savedShifts) setShifts(JSON.parse(savedShifts))
    } catch {}
  }, [])

  const saveReservations = (data: Reservation[]) => {
    setReservations(data)
    localStorage.setItem('reservations_v1', JSON.stringify(data))
  }

  const activeStaff = allStaff.filter(s => s.active !== false)

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
  const todayKey = today ? toDateKey(today.getFullYear(), today.getMonth(), today.getDate()) : ''

  const getReservationsForDate = (dateKey: string) =>
    reservations.filter((r) => r.date === dateKey && r.status !== 'cancelled')

  const getSlotsForDate = (dateKey: string) => {
    const dow = new Date(dateKey).getDay()
    return timeSlots.filter((s) => s.enabled && s.daysOfWeek.includes(dow))
  }

  // 指定日・指定時間にシフトが入っているスタッフ一覧を取得
  const getAvailableStaffForSlot = (dateKey: string, time: string): Staff[] => {
    const dayShifts = shifts.filter(s => s.date === dateKey)
    const availableIds = new Set<string>()

    for (const shift of dayShifts) {
      if (isTimeInShiftSlots(time, shift)) {
        // この時間帯に既に予約が入っていないか確認
        const hasBooking = reservations.some(
          r => r.date === dateKey && r.time === time && r.staffId === shift.staffId && r.status !== 'cancelled'
        )
        if (!hasBooking) {
          availableIds.add(shift.staffId)
        }
      }
    }

    return activeStaff.filter(s => availableIds.has(s.id))
  }

  // 指定日にシフトが入っているスタッフがいるか（カレンダーのドット表示用）
  const hasAnyStaffOnDate = (dateKey: string): boolean => {
    return shifts.some(s => s.date === dateKey)
  }

  // スロットが予約可能か判定
  const isSlotAvailable = (dateKey: string, time: string): boolean => {
    const available = getAvailableStaffForSlot(dateKey, time)
    if (selectedStaffId === 'any') return available.length > 0
    return available.some(s => s.id === selectedStaffId)
  }

  const isSlotBookedByMe = (dateKey: string, time: string) => {
    return reservations.some(r => r.date === dateKey && r.time === time && r.status !== 'cancelled')
  }

  const openConfirm = (date: string, time: string) => {
    const available = getAvailableStaffForSlot(date, time)
    let targetStaff: Staff | undefined

    if (selectedStaffId === 'any') {
      targetStaff = available[0]
    } else {
      targetStaff = available.find(s => s.id === selectedStaffId)
    }

    if (!targetStaff) {
      alert('この時間帯に対応可能なスタッフがいません')
      return
    }

    setConfirmSlot({
      date,
      time,
      staffId: targetStaff.id,
      staffName: targetStaff.name,
    })
    setConfirmNotes('')
    setShowConfirm(true)
  }

  const confirmBook = async () => {
    if (!confirmSlot) return
    setBookingLoading(true)
    try {
      // Supabaseセッションからuser_idとmember_nameを取得
      let userId: string | undefined
      let userEmail: string | undefined
      let memberName = '会員'
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          userId = session.user.id
          userEmail = session.user.email
          memberName = session.user.user_metadata?.full_name || session.user.email || '会員'
        }
      } catch {}

      // Supabaseに保存 + サーバー側でGoogle Meet自動作成
      let savedRes: Reservation | null = null
      try {
        const apiRes = await fetch('/api/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: Date.now().toString(),
            date: confirmSlot.date,
            time: confirmSlot.time,
            staffId: confirmSlot.staffId,
            staffName: confirmSlot.staffName,
            notes: confirmNotes,
            status: 'confirmed',
            createdAt: new Date().toISOString(),
            userId,
            userEmail,
            memberName,
          }),
        })
        if (apiRes.ok) {
          savedRes = await apiRes.json() as Reservation
          setGcalStatus(savedRes?.meetLink ? 'linked' : 'idle')
        }
      } catch {
        setGcalStatus('error')
      }

      const newRes: Reservation = savedRes ?? {
        id: Date.now().toString(),
        date: confirmSlot.date,
        time: confirmSlot.time,
        staffId: confirmSlot.staffId,
        staffName: confirmSlot.staffName,
        notes: confirmNotes,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      }

      // localStorageにも保存（オフライン対応・後方互換）
      saveReservations([...reservations, newRes])
      setShowConfirm(false)
      if (newRes.meetLink) {
        alert(`予約が完了しました！\n\n担当: ${confirmSlot.staffName}\nGoogle Meet リンク:\n${newRes.meetLink}`)
      } else {
        alert(`予約が完了しました！\n担当: ${confirmSlot.staffName}`)
      }
    } finally {
      setBookingLoading(false)
    }
  }

  const cancelReservation = async (id: string) => {
    if (!confirm('この予約をキャンセルしますか？')) return

    // Supabaseのステータスを更新（バックグラウンド・エラーは無視）
    try {
      await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
    } catch {}

    // localStorageも更新
    saveReservations(reservations.map((r) => r.id === id ? { ...r, status: 'cancelled' as const } : r))
  }

  const myReservations = reservations.filter((r) => r.status !== 'cancelled').sort((a, b) => {
    const da = new Date(a.date + ' ' + a.time)
    const db = new Date(b.date + ' ' + b.time)
    return da.getTime() - db.getTime()
  })

  const selectedSlots = selectedDate ? getSlotsForDate(selectedDate) : []

  // 選択日にシフトが入っているスタッフ一覧（スタッフ選択用）
  const staffOnSelectedDate = selectedDate
    ? activeStaff.filter(s => shifts.some(sh => sh.date === selectedDate && sh.staffId === s.id))
    : []

  return (
    <div style={{ fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif", color: '#1a1a1a' }}>
      {/* サブヘッダー */}
      <div style={{ background: '#0ea5e9', color: 'white', padding: '12px 16px', position: 'sticky', top: '60px', zIndex: 90, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>📅 オンライン予約</p>
            <p style={{ fontSize: '11px', opacity: 0.8, margin: '2px 0 0' }}>スタッフのシフト空きからミーティングを予約</p>
          </div>
          <p style={{ fontSize: '12px', opacity: 0.85 }}>選手 さん</p>
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px 12px 100px' }}>

        {/* カレンダー */}
        <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <button onClick={prevMonth} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>◀</button>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>{curYear}年{curMonth + 1}月</span>
            <button onClick={nextMonth} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▶</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
            {DAY_LABELS.map((d, i) => (
              <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, padding: '4px', color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#6b7280' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {Array.from({ length: firstDay }).map((_, i) => (<div key={`empty-${i}`} />))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1
              const dateKey = toDateKey(curYear, curMonth, d)
              const isToday = dateKey === todayKey
              const isSelected = dateKey === selectedDate
              const dow = new Date(dateKey).getDay()
              const hasStaff = hasAnyStaffOnDate(dateKey)
              const resCount = getReservationsForDate(dateKey).length
              const isPast = today ? new Date(dateKey) < new Date(todayKey) : false

              return (
                <button
                  key={d}
                  onClick={() => !isPast && hasStaff && setSelectedDate(dateKey)}
                  style={{
                    aspectRatio: '1', borderRadius: '8px',
                    border: isSelected ? '2px solid #0ea5e9' : isToday ? '2px solid #22c55e' : '1px solid transparent',
                    background: isSelected ? '#e0f2fe' : isToday ? '#f0fdf4' : 'white',
                    color: isPast ? '#d1d5db' : dow === 0 ? '#ef4444' : dow === 6 ? '#3b82f6' : '#111827',
                    fontSize: '12px', fontWeight: isToday || isSelected ? 800 : 400,
                    cursor: !isPast && hasStaff ? 'pointer' : 'default',
                    position: 'relative', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: '2px', padding: '4px 2px',
                    opacity: isPast ? 0.5 : !hasStaff ? 0.4 : 1,
                  }}
                >
                  <span>{d}</span>
                  {!isPast && hasStaff && (
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: resCount > 0 ? '#f97316' : '#0ea5e9', display: 'block' }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* 選択日のスタッフ選択＋スロット */}
        {selectedDate && (() => {
          const d = new Date(selectedDate + 'T12:00:00')
          const dow = d.getDay()
          const dateLabel = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${DAY_LABELS[dow]}）`
          return (
            <>
              {/* スタッフ選択 */}
              <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <p style={{ fontSize: '13px', fontWeight: 800, color: '#111827', margin: '0 0 10px' }}>👤 担当スタッフを選択</p>

                {staffOnSelectedDate.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '12px', padding: '8px 0' }}>この日にシフトが入っているスタッフがいません</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* 指名なし */}
                    <button
                      onClick={() => setSelectedStaffId('any')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                        borderRadius: '10px', border: selectedStaffId === 'any' ? '2px solid #0ea5e9' : '1.5px solid #e5e7eb',
                        background: selectedStaffId === 'any' ? '#e0f2fe' : 'white',
                        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                      }}
                    >
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>👥</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>指名なし（空いているスタッフ）</div>
                        <div style={{ fontSize: '10px', color: '#9ca3af' }}>自動で空いているスタッフが割り当てられます</div>
                      </div>
                      {selectedStaffId === 'any' && <span style={{ fontSize: '16px' }}>✅</span>}
                    </button>

                    {/* 各スタッフ */}
                    {staffOnSelectedDate.map(s => {
                      const isSelected = selectedStaffId === s.id
                      const staffShifts = shifts.filter(sh => sh.date === selectedDate && sh.staffId === s.id)
                      const shiftSlots = staffShifts.flatMap(sh =>
                        sh.slots || (sh.startTime && sh.endTime ? [{ startTime: sh.startTime, endTime: sh.endTime }] : [])
                      )
                      return (
                        <button
                          key={s.id}
                          onClick={() => setSelectedStaffId(s.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                            borderRadius: '10px', border: isSelected ? `2px solid ${s.color || '#0ea5e9'}` : '1.5px solid #e5e7eb',
                            background: isSelected ? '#f0f9ff' : 'white',
                            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                          }}
                        >
                          {s.photo ? (
                            <img src={s.photo} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: s.color || '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: 800, flexShrink: 0 }}>
                              {s.name.charAt(0)}
                            </div>
                          )}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{s.name}</div>
                            <div style={{ fontSize: '10px', color: '#6b7280' }}>
                              {s.role}{s.specialties ? ` / ${s.specialties}` : ''}
                            </div>
                            <div style={{ fontSize: '10px', color: '#0ea5e9', marginTop: '2px' }}>
                              {shiftSlots.map(sl => `${sl.startTime}〜${sl.endTime}`).join('、')}
                            </div>
                          </div>
                          {isSelected && <span style={{ fontSize: '16px' }}>✅</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 時間帯スロット */}
              <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <p style={{ fontSize: '14px', fontWeight: 800, color: '#111827', margin: '0 0 12px' }}>
                  {dateLabel} の空き時間
                </p>
                {selectedSlots.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '12px', padding: '16px 0' }}>この日は予約できる時間がありません</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {selectedSlots.map((slot) => {
                      const myBooking = isSlotBookedByMe(selectedDate, slot.time)
                      const available = isSlotAvailable(selectedDate, slot.time)
                      const availableStaff = getAvailableStaffForSlot(selectedDate, slot.time)
                      const filteredAvailable = selectedStaffId === 'any'
                        ? availableStaff
                        : availableStaff.filter(s => s.id === selectedStaffId)

                      const btnStyle = myBooking
                        ? { border: '1.5px solid #0ea5e9', background: '#0ea5e9', color: 'white', cursor: 'not-allowed' as const }
                        : !available || filteredAvailable.length === 0
                        ? { border: '1px solid #e5e7eb', background: '#f9fafb', color: '#d1d5db', cursor: 'not-allowed' as const }
                        : { border: '1.5px solid #0ea5e9', background: 'white', color: '#0284c7', cursor: 'pointer' as const }

                      const disabled = myBooking || !available || filteredAvailable.length === 0

                      return (
                        <button
                          key={slot.id}
                          disabled={disabled}
                          onClick={() => !disabled && openConfirm(selectedDate, slot.time)}
                          style={{
                            padding: '10px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                            fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                            ...btnStyle,
                          }}
                        >
                          <span style={{ fontSize: '14px' }}>{slot.time}</span>
                          <span style={{ fontSize: '10px', fontWeight: 600 }}>
                            {myBooking ? '予約済み' : disabled ? '−' : `${filteredAvailable.length}名対応可`}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )
        })()}

        {/* 予約一覧 */}
        <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#374151', margin: 0 }}>📋 予約済み一覧</p>
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>{myReservations.length}件</span>
          </div>
          {myReservations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: '12px' }}>予約がありません</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {myReservations.map((r) => {
                const staffObj = activeStaff.find(s => s.id === r.staffId)
                return (
                  <div key={r.id} style={{ padding: '12px 14px', borderRadius: '10px', background: '#f0f9ff', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {staffObj && (
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                        background: staffObj.color || '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '12px', fontWeight: 800,
                      }}>
                        {staffObj.photo ? (
                          <img src={staffObj.photo} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : staffObj.name.charAt(0)}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0369a1' }}>{r.date} {r.time}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        担当: {r.staffName}
                        {r.notes && <span style={{ marginLeft: '8px' }}>/ {r.notes}</span>}
                      </div>
                      {r.meetLink && (
                        <a href={r.meetLink} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', padding: '4px 10px', borderRadius: '6px', background: '#1e88e5', color: 'white', fontSize: '11px', fontWeight: 700, textDecoration: 'none' }}>
                          🎥 Meetに参加する
                        </a>
                      )}
                    </div>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px',
                      background: r.status === 'confirmed' ? '#dbeafe' : r.status === 'completed' ? '#dcfce7' : '#f3f4f6',
                      color: r.status === 'confirmed' ? '#1d4ed8' : r.status === 'completed' ? '#16a34a' : '#9ca3af',
                    }}>
                      {r.status === 'confirmed' ? '確定' : r.status === 'completed' ? '完了' : 'キャンセル'}
                    </span>
                    {r.status === 'confirmed' && (
                      <button onClick={() => cancelReservation(r.id)}
                        style={{ padding: '5px 10px', borderRadius: '7px', border: '1px solid #fca5a5', color: '#ef4444', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: 'white', fontFamily: 'inherit' }}>
                        キャンセル
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 確認モーダル */}
      {showConfirm && confirmSlot && (
        <div onClick={() => setShowConfirm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', width: '100%', maxWidth: '640px', borderRadius: '20px 20px 0 0' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 900, margin: '0 0 2px', color: '#111827' }}>📅 予約確認</h2>
                <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>内容を確認して予約してください</p>
              </div>
              <button onClick={() => setShowConfirm(false)} style={{ fontSize: '20px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>✕</button>
            </div>
            <div style={{ padding: '16px 20px 24px' }}>
              {/* スタッフ情報 */}
              {(() => {
                const staffObj = activeStaff.find(s => s.id === confirmSlot.staffId)
                return staffObj ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '10px', background: '#f0f9ff', border: '1px solid #bae6fd', marginBottom: '12px' }}>
                    {staffObj.photo ? (
                      <img src={staffObj.photo} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: staffObj.color || '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '16px', fontWeight: 800 }}>
                        {staffObj.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#111827' }}>{staffObj.name}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>{staffObj.role}{staffObj.specialties ? ` / ${staffObj.specialties}` : ''}</div>
                    </div>
                  </div>
                ) : null
              })()}

              {[
                { label: '日付', value: (() => { const d = new Date(confirmSlot.date + 'T12:00:00'); return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${DAY_LABELS[d.getDay()]}）` })() },
                { label: '時間', value: confirmSlot.time },
                { label: '担当', value: confirmSlot.staffName },
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', gap: '16px', padding: '10px 0', borderBottom: '1px solid #f3f4f6', fontSize: '13px' }}>
                  <span style={{ color: '#6b7280', width: '60px', flexShrink: 0 }}>{row.label}</span>
                  <span style={{ fontWeight: 700, color: '#111827' }}>{row.value}</span>
                </div>
              ))}
              <div style={{ marginTop: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>メモ・相談内容</label>
                <textarea
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
                  placeholder="相談したい内容など（任意）"
                  rows={3}
                  style={{ width: '100%', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '10px 14px', color: '#111827', fontSize: '13px', outline: 'none', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '12px' }}>
                <span style={{ fontSize: '18px' }}>📅</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#1d4ed8' }}>Google カレンダー &amp; Meet 自動連携</div>
                  <div style={{ color: '#374151', marginTop: '2px' }}>予約確定後、自動でカレンダーに登録しMeetリンクを発行します。</div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: gcalStatus === 'linked' ? '#dcfce7' : '#f3f4f6', color: gcalStatus === 'linked' ? '#16a34a' : '#9ca3af' }}>
                  {gcalStatus === 'linked' ? '✅ 連携済み' : '⚪ 設定待ち'}
                </span>
              </div>
              <button
                onClick={confirmBook}
                disabled={bookingLoading}
                style={{
                  width: '100%', marginTop: '12px', padding: '14px', borderRadius: '12px', border: 'none',
                  background: bookingLoading ? '#9ca3af' : '#0ea5e9', color: 'white', fontWeight: 800, fontSize: '14px',
                  cursor: bookingLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  boxShadow: bookingLoading ? 'none' : '0 4px 16px rgba(14,165,233,0.35)',
                }}
              >
                {bookingLoading ? '⏳ 処理中...' : '✅ 予約を確定する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
