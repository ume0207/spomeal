'use client'

import { useState, useEffect } from 'react'
import Script from 'next/script'
import {
  gcal_isConnected,
  gcal_initClient,
  gcal_signIn,
  gcal_signOut,
  gcal_createEvent,
} from '../../lib/googleCalendar'

interface Reservation {
  id: string
  date: string
  time: string
  staffName: string
  memberName?: string
  notes: string
  status: 'confirmed' | 'completed' | 'cancelled'
  createdAt: string
  meetLink?: string
  calendarEventId?: string
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']
const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  confirmed: { bg: '#dbeafe', color: '#1d4ed8', label: '確定' },
  completed: { bg: '#dcfce7', color: '#16a34a', label: '完了' },
  cancelled: { bg: '#f3f4f6', color: '#9ca3af', label: 'キャンセル' },
}

function toDateKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export default function AdminCalendarPage() {
  const today = new Date()
  const [curYear, setCurYear] = useState(today.getFullYear())
  const [curMonth, setCurMonth] = useState(today.getMonth())
  const [view, setView] = useState<'month' | 'week'>('month')
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'completed' | 'cancelled'>('all')
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [detail, setDetail] = useState<{ date: string; list: Reservation[] } | null>(null)
  const [gcalConnected, setGcalConnected] = useState(false)
  const [gcalClientId, setGcalClientId] = useState('')
  const [showGcalSettings, setShowGcalSettings] = useState(false)
  const [creatingMeet, setCreatingMeet] = useState<string | null>(null)
  const [meetInputId, setMeetInputId] = useState<string | null>(null)
  const [meetInputValue, setMeetInputValue] = useState('')

  useEffect(() => {
    // 予約をAPI + localStorageからマージして読み込む
    const loadReservations = async () => {
      let localData: Reservation[] = []
      try {
        const saved = localStorage.getItem('reservations_v1')
        if (saved) localData = JSON.parse(saved)
      } catch {}

      try {
        const res = await fetch('/api/reservations?admin=true')
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
      } catch {}

      // APIが失敗した場合はlocalStorageのみ
      setReservations(localData)
    }

    loadReservations()
    setGcalConnected(gcal_isConnected())
    const savedClientId = localStorage.getItem('google_client_id') || ''
    setGcalClientId(savedClientId)
  }, [])

  const saveAllReservations = (data: Reservation[]) => {
    setReservations(data)
    localStorage.setItem('reservations_v1', JSON.stringify(data))
  }

  const updateStatus = async (id: string, status: Reservation['status']) => {
    // Supabaseのステータスを更新（バックグラウンド）
    try {
      await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    } catch {}

    const updated = reservations.map((r) => r.id === id ? { ...r, status } : r)
    saveAllReservations(updated)
    if (detail) {
      setDetail({
        ...detail,
        list: detail.list.map((r) => r.id === id ? { ...r, status } : r),
      })
    }
  }

  const handleGcalSave = () => {
    if (!gcalClientId.trim()) return
    localStorage.setItem('google_client_id', gcalClientId.trim())
    if (typeof window !== 'undefined') {
      window.gcal_gisReady = true
    }
    gcal_initClient(() => {
      setGcalConnected(true)
    })
    alert('Client IDを保存しました。次に「Googleでログイン」を押してください。')
  }

  const handleGcalSignIn = () => {
    gcal_signIn(() => {
      setGcalConnected(true)
      alert('Google連携が完了しました ✅')
    })
  }

  const handleGcalSignOut = () => {
    gcal_signOut()
    setGcalConnected(false)
  }

  const handleSaveMeetLink = async (id: string, link: string) => {
    const trimmed = link.trim()
    if (!trimmed) return

    // Supabaseのmeet_linkを更新（バックグラウンド）
    try {
      await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetLink: trimmed }),
      })
    } catch {}

    const updated = reservations.map((res) =>
      res.id === id ? { ...res, meetLink: trimmed } : res
    )
    saveAllReservations(updated)
    if (detail) {
      setDetail({
        ...detail,
        list: detail.list.map((res) =>
          res.id === id ? { ...res, meetLink: trimmed } : res
        ),
      })
    }
    setMeetInputId(null)
    setMeetInputValue('')
  }

  const handleCreateMeet = async (r: Reservation) => {
    setCreatingMeet(r.id)
    await gcal_createEvent(
      r,
      async (meetLink, calEventId) => {
        // Supabaseのmeet_linkとcalendar_event_idを更新（バックグラウンド）
        try {
          await fetch(`/api/reservations/${r.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ meetLink, calendarEventId: calEventId }),
          })
        } catch {}

        const updated = reservations.map((res) =>
          res.id === r.id ? { ...res, meetLink, calendarEventId: calEventId } : res
        )
        saveAllReservations(updated)
        if (detail) {
          setDetail({
            ...detail,
            list: detail.list.map((res) =>
              res.id === r.id ? { ...res, meetLink, calendarEventId: calEventId } : res
            ),
          })
        }
        setCreatingMeet(null)
        alert('🎉 GoogleカレンダーとMeetリンクを作成しました！')
      },
      (msg) => {
        setCreatingMeet(null)
        alert(msg)
      }
    )
  }

  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate())
  const firstDay = new Date(curYear, curMonth, 1).getDay()
  const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate()

  const filtered = (dateKey: string) =>
    reservations.filter(
      (r) => r.date === dateKey && (filter === 'all' || r.status === filter)
    )

  const prevPeriod = () => {
    if (curMonth === 0) { setCurYear(curYear - 1); setCurMonth(11) }
    else setCurMonth(curMonth - 1)
  }
  const nextPeriod = () => {
    if (curMonth === 11) { setCurYear(curYear + 1); setCurMonth(0) }
    else setCurMonth(curMonth + 1)
  }

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(curYear, curMonth, 1 + i - new Date(curYear, curMonth, 1).getDay())
    return d
  })

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => {
          if (typeof window !== 'undefined') {
            window.gcal_gisReady = true
            gcal_initClient(() => setGcalConnected(true))
          }
        }}
      />
      <div style={{ fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif", color: '#1a1a1a' }}>

        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 900, margin: 0, color: '#111827' }}>📅 予約カレンダー</h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Google連携ステータス */}
            <button
              onClick={() => setShowGcalSettings(!showGcalSettings)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 12px', borderRadius: '20px', border: 'none',
                background: gcalConnected ? '#dcfce7' : '#f3f4f6',
                color: gcalConnected ? '#16a34a' : '#6b7280',
                fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {gcalConnected ? '✅ Google連携中' : '⚪ Google未連携'}
            </button>
            <div style={{ display: 'flex', gap: '6px', background: '#f3f4f6', borderRadius: '10px', padding: '3px' }}>
              {(['month', 'week'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    padding: '6px 14px', borderRadius: '8px', border: 'none',
                    background: view === v ? '#2563eb' : 'transparent',
                    color: view === v ? 'white' : '#6b7280',
                    fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {v === 'month' ? '月表示' : '週表示'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Google設定パネル */}
        {showGcalSettings && (
          <div
            style={{
              background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px',
              padding: '16px', marginBottom: '16px',
            }}
          >
            <p style={{ fontSize: '13px', fontWeight: 800, color: '#1d4ed8', margin: '0 0 4px' }}>
              🔗 Google カレンダー / Meet 連携設定
            </p>
            <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 12px' }}>
              予約確定時にGoogleカレンダーへ自動登録し、MeetリンクをURL発行します。
            </p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <input
                type="text"
                value={gcalClientId}
                onChange={(e) => setGcalClientId(e.target.value)}
                placeholder="xxxxxxxxxx.apps.googleusercontent.com"
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: '8px',
                  border: '1.5px solid #93c5fd', fontSize: '12px',
                  background: 'white', outline: 'none', fontFamily: 'inherit',
                }}
              />
              <button
                onClick={handleGcalSave}
                style={{
                  padding: '8px 14px', borderRadius: '8px', border: 'none',
                  background: '#2563eb', color: 'white', fontSize: '12px',
                  fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}
              >
                保存
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {!gcalConnected ? (
                <button
                  onClick={handleGcalSignIn}
                  style={{
                    padding: '8px 14px', borderRadius: '8px', border: 'none',
                    background: '#16a34a', color: 'white', fontSize: '12px',
                    fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  🔑 Googleでログイン
                </button>
              ) : (
                <button
                  onClick={handleGcalSignOut}
                  style={{
                    padding: '8px 14px', borderRadius: '8px', border: '1px solid #fca5a5',
                    background: 'white', color: '#ef4444', fontSize: '12px',
                    fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  連携解除
                </button>
              )}
            </div>
            <p style={{ fontSize: '10px', color: '#6b7280', margin: '10px 0 0' }}>
              ⚙️ Google Cloud Console → APIとサービス → OAuthの同意画面 → スコープ: calendar.events を追加
            </p>
          </div>
        )}

        {/* フィルター */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {(['all', 'confirmed', 'completed', 'cancelled'] as const).map((f) => {
            const count = f === 'all' ? reservations.length : reservations.filter((r) => r.status === f).length
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '5px 12px', borderRadius: '20px', border: 'none',
                  background: filter === f ? '#2563eb' : '#f3f4f6',
                  color: filter === f ? 'white' : '#6b7280',
                  fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}
              >
                {f === 'all' ? `すべて (${count})` : f === 'confirmed' ? `確定 (${count})` : f === 'completed' ? `完了 (${count})` : `キャンセル (${count})`}
              </button>
            )
          })}
        </div>

        {/* ナビゲーション */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <button
            onClick={prevPeriod}
            style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: '14px' }}
          >
            ◀
          </button>
          <span style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>
            {curYear}年{curMonth + 1}月
          </span>
          <button
            onClick={nextPeriod}
            style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: '14px' }}
          >
            ▶
          </button>
          <button
            onClick={() => { setCurYear(today.getFullYear()); setCurMonth(today.getMonth()) }}
            style={{
              padding: '5px 12px', borderRadius: '6px', border: '1px solid #e5e7eb',
              background: 'white', color: '#374151', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            今日
          </button>
        </div>

        {/* カレンダー本体 */}
        {view === 'month' ? (
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {DAY_LABELS.map((d, i) => (
                <div key={d} style={{ textAlign: 'center', padding: '8px 4px', fontSize: '11px', fontWeight: 700, color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#6b7280' }}>
                  {d}
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderTop: '1px solid #e5e7eb' }}>
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`e-${i}`} style={{ minHeight: '90px', background: '#f9fafb', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const d = i + 1
                const dateKey = toDateKey(curYear, curMonth, d)
                const isToday = dateKey === todayKey
                const dow = (firstDay + i) % 7
                const dayRes = filtered(dateKey)
                return (
                  <div
                    key={d}
                    onClick={() => dayRes.length > 0 && setDetail({ date: dateKey, list: dayRes })}
                    style={{
                      minHeight: '90px', padding: '5px',
                      background: isToday ? '#eff6ff' : 'white',
                      borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb',
                      cursor: dayRes.length > 0 ? 'pointer' : 'default',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '3px', color: isToday ? '#4f46e5' : dow === 0 ? '#ef4444' : dow === 6 ? '#3b82f6' : '#374151' }}>
                      {d}
                    </div>
                    {dayRes.slice(0, 3).map((r) => {
                      const sc = STATUS_COLORS[r.status]
                      return (
                        <div key={r.id} style={{ fontSize: '10px', padding: '2px 5px', borderRadius: '4px', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', background: sc.bg, color: sc.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.time} {r.staffName}</span>
                          {r.meetLink && (
                            <a
                              href={r.meetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{ flexShrink: 0, fontSize: '11px', textDecoration: 'none' }}
                              title="Google Meet に参加"
                            >
                              🎥
                            </a>
                          )}
                        </div>
                      )
                    })}
                    {dayRes.length > 3 && <div style={{ fontSize: '9px', color: '#9ca3af' }}>+{dayRes.length - 3}件</div>}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {weekDays.map((wd, i) => {
                const isToday = toDateKey(wd.getFullYear(), wd.getMonth(), wd.getDate()) === todayKey
                return (
                  <div key={i} style={{ textAlign: 'center', padding: '10px 4px' }}>
                    <div style={{ fontSize: '10px', color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#6b7280', fontWeight: 700 }}>{DAY_LABELS[i]}</div>
                    <div style={{ fontSize: '14px', fontWeight: 900, marginTop: '2px', color: isToday ? '#4f46e5' : '#111827' }}>{wd.getDate()}</div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderTop: '1px solid #e5e7eb' }}>
              {weekDays.map((wd, i) => {
                const dateKey = toDateKey(wd.getFullYear(), wd.getMonth(), wd.getDate())
                const dayRes = filtered(dateKey)
                return (
                  <div key={i} style={{ minHeight: '160px', padding: '6px', borderRight: i < 6 ? '1px solid #e5e7eb' : 'none' }}>
                    {dayRes.map((r) => {
                      const sc = STATUS_COLORS[r.status]
                      return (
                        <div key={r.id} onClick={() => setDetail({ date: dateKey, list: dayRes })} style={{ fontSize: '10px', padding: '4px 6px', borderRadius: '6px', marginBottom: '4px', background: sc.bg, color: sc.color, fontWeight: 600, cursor: 'pointer' }}>
                          <div>{r.time}</div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '3px' }}>
                            <span>{r.staffName}</span>
                            {r.meetLink && (
                              <a
                                href={r.meetLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{ textDecoration: 'none', fontSize: '12px' }}
                                title="Google Meet に参加"
                              >
                                🎥
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 詳細オーバーレイ */}
        {detail && (
          <div
            onClick={() => setDetail(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: 'white', width: '100%', maxWidth: '640px', borderRadius: '20px 20px 0 0', padding: '20px', maxHeight: '80vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 900, margin: 0, color: '#111827' }}>
                  {detail.date} の予約
                </h2>
                <button onClick={() => setDetail(null)} style={{ fontSize: '20px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
              </div>
              {detail.list.map((r) => {
                const sc = STATUS_COLORS[r.status]
                return (
                  <div key={r.id} style={{ padding: '12px 14px', borderRadius: '10px', background: '#f9fafb', border: '1px solid #f0f0f0', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#111827' }}>{r.time}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: sc.bg, color: sc.color }}>
                        {sc.label}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#374151' }}>
                      担当: {r.staffName}
                      {r.memberName && <span style={{ marginLeft: '12px' }}>会員: {r.memberName}</span>}
                    </div>
                    {r.notes && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{r.notes}</div>}

                    {/* ===== Meet セクション ===== */}
                    <div style={{ marginTop: '10px', borderTop: '1px solid #f0f0f0', paddingTop: '10px' }}>
                      {r.meetLink ? (
                        /* Meetリンクあり → 大きなボタンで表示 */
                        <a
                          href={r.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            padding: '10px 14px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, #1e88e5 0%, #1565c0 100%)',
                            color: 'white', fontSize: '13px', fontWeight: 800,
                            textDecoration: 'none', boxShadow: '0 2px 8px rgba(30,136,229,0.35)',
                          }}
                        >
                          🎥 Google Meet に参加する
                        </a>
                      ) : meetInputId === r.id ? (
                        /* リンク入力フォーム */
                        <div>
                          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>
                            meet.google.com/xxx のURLを貼り付けてください
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                              type="text"
                              value={meetInputValue}
                              onChange={(e) => setMeetInputValue(e.target.value)}
                              placeholder="https://meet.google.com/abc-defg-hij"
                              autoFocus
                              style={{
                                flex: 1, padding: '7px 10px', borderRadius: '8px',
                                border: '1.5px solid #93c5fd', fontSize: '11px',
                                outline: 'none', fontFamily: 'inherit',
                              }}
                            />
                            <button
                              onClick={() => handleSaveMeetLink(r.id, meetInputValue)}
                              style={{
                                padding: '7px 12px', borderRadius: '8px', border: 'none',
                                background: '#1e88e5', color: 'white', fontSize: '11px',
                                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                              }}
                            >
                              保存
                            </button>
                            <button
                              onClick={() => { setMeetInputId(null); setMeetInputValue('') }}
                              style={{
                                padding: '7px 10px', borderRadius: '8px', border: '1px solid #e5e7eb',
                                background: 'white', color: '#9ca3af', fontSize: '11px',
                                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Meetリンクなし → 作成/入力ボタン */
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {/* Google Meetを今すぐ新規作成して貼り付ける */}
                          <a
                            href="https://meet.google.com/new"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              setTimeout(() => {
                                setMeetInputId(r.id)
                                setMeetInputValue('')
                              }, 500)
                            }}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '7px 12px', borderRadius: '8px', border: 'none',
                              background: '#1e88e5', color: 'white', fontSize: '11px',
                              fontWeight: 700, textDecoration: 'none',
                            }}
                          >
                            🎥 Meet を新規作成
                          </a>
                          {/* URLを直接入力 */}
                          <button
                            onClick={() => { setMeetInputId(r.id); setMeetInputValue('') }}
                            style={{
                              padding: '7px 12px', borderRadius: '8px', border: '1.5px solid #93c5fd',
                              background: 'white', color: '#1e88e5', fontSize: '11px',
                              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            🔗 URLを貼り付け
                          </button>
                          {/* Google Calendar連携でMeet作成 */}
                          {gcalConnected && (
                            <button
                              onClick={() => handleCreateMeet(r)}
                              disabled={creatingMeet === r.id}
                              style={{
                                padding: '7px 12px', borderRadius: '8px', border: 'none',
                                background: creatingMeet === r.id ? '#9ca3af' : '#34a853',
                                color: 'white', fontSize: '11px', fontWeight: 700,
                                cursor: creatingMeet === r.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                              }}
                            >
                              {creatingMeet === r.id ? '作成中...' : '📅 Gcal連携で作成'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {r.status === 'confirmed' && (
                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => updateStatus(r.id, 'completed')}
                          style={{ padding: '5px 10px', borderRadius: '7px', border: 'none', background: '#16a34a', color: 'white', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          完了にする
                        </button>
                        <button
                          onClick={() => updateStatus(r.id, 'cancelled')}
                          style={{ padding: '5px 10px', borderRadius: '7px', border: '1px solid #fca5a5', background: 'white', color: '#ef4444', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          キャンセル
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
