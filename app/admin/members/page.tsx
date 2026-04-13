'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Member {
  id: string
  name: string
  nameKana: string
  email: string
  phone: string
  address: string
  team: string
  gender: string
  status: 'active' | 'inactive'
  memo: string
  createdAt: string
}

const demoMembers: Member[] = [
  {
    id: '1', name: '山田 太郎', nameKana: 'ヤマダ タロウ',
    email: 'yamada@example.com', phone: '090-1111-2222',
    address: '東京都渋谷区', team: '○○高校サッカー部',
    gender: 'male', status: 'active', memo: 'アレルギーなし',
    createdAt: '2026-01-15',
  },
  {
    id: '2', name: '佐藤 花子', nameKana: 'サトウ ハナコ',
    email: 'sato@example.com', phone: '080-3333-4444',
    address: '東京都新宿区', team: '△△バスケ部',
    gender: 'female', status: 'active', memo: '',
    createdAt: '2026-02-01',
  },
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#f9fafb',
  border: '1.5px solid #e5e7eb',
  borderRadius: '10px',
  padding: '10px 14px',
  color: '#111827',
  fontSize: '13px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>(demoMembers)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    fetch('/api/admin/members')
      .then((r) => r.json())
      .then((data: { members?: Member[] }) => {
        if (data.members && data.members.length > 0) {
          setMembers(data.members.map((m) => ({ ...m, status: 'active' as const })))
        }
      })
      .catch(() => {})
  }, [])
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState<Member | null>(null)

  // パネル内コメント送信
  const [panelCommentText, setPanelCommentText] = useState('')
  const [panelCommentCategory, setPanelCommentCategory] = useState('全般')
  const [panelCommentSending, setPanelCommentSending] = useState(false)
  const [panelCommentSaved, setPanelCommentSaved] = useState(false)
  const [panelCommentError, setPanelCommentError] = useState('')
  const [showPanelComment, setShowPanelComment] = useState(false)

  const handleSendComment = async (memberId: string) => {
    if (!panelCommentText.trim()) return
    setPanelCommentSending(true)
    setPanelCommentError('')
    try {
      const res = await fetch('/api/admin/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, staffName: '管理栄養士', category: panelCommentCategory, comment: panelCommentText.trim() }),
      })
      if (res.ok) {
        setPanelCommentSaved(true)
        setPanelCommentText('')
        setTimeout(() => { setPanelCommentSaved(false); setShowPanelComment(false) }, 2000)
      } else {
        const err = await res.json().catch(() => ({})) as any
        setPanelCommentError(`送信失敗 (${res.status}): ${err?.error || '不明'}`)
      }
    } catch (e) {
      setPanelCommentError(`通信エラー: ${(e as Error).message}`)
    } finally {
      setPanelCommentSending(false)
    }
  }

  // フォーム
  const [fName, setFName] = useState('')
  const [fKana, setFKana] = useState('')
  const [fPhone, setFPhone] = useState('')
  const [fEmail, setFEmail] = useState('')
  const [fAddress, setFAddress] = useState('')
  const [fTeam, setFTeam] = useState('')
  const [fGender, setFGender] = useState('')
  const [fStatus, setFStatus] = useState<'active' | 'inactive'>('active')
  const [fMemo, setFMemo] = useState('')

  const filtered = members.filter((m) => {
    const q = search.toLowerCase()
    const matchSearch =
      m.name.includes(q) ||
      m.nameKana.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.phone.includes(q)
    const matchStatus = statusFilter === 'all' || m.status === statusFilter
    return matchSearch && matchStatus
  })

  const openAdd = () => {
    setEditingId(null)
    setFName(''); setFKana(''); setFPhone(''); setFEmail('')
    setFAddress(''); setFTeam(''); setFGender(''); setFStatus('active'); setFMemo('')
    setShowModal(true)
  }

  const openEdit = (m: Member) => {
    setEditingId(m.id)
    setFName(m.name); setFKana(m.nameKana); setFPhone(m.phone); setFEmail(m.email)
    setFAddress(m.address); setFTeam(m.team); setFGender(m.gender); setFStatus(m.status); setFMemo(m.memo)
    setShowModal(true)
    setShowDetail(null)
  }

  const handleSave = () => {
    if (!fName || !fPhone || !fAddress) {
      alert('氏名・電話番号・住所は必須です')
      return
    }
    if (editingId) {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === editingId
            ? { ...m, name: fName, nameKana: fKana, phone: fPhone, email: fEmail, address: fAddress, team: fTeam, gender: fGender, status: fStatus, memo: fMemo }
            : m
        )
      )
    } else {
      const newMember: Member = {
        id: Date.now().toString(),
        name: fName, nameKana: fKana, phone: fPhone, email: fEmail,
        address: fAddress, team: fTeam, gender: fGender, status: fStatus,
        memo: fMemo, createdAt: new Date().toISOString().slice(0, 10),
      }
      setMembers((prev) => [...prev, newMember])
    }
    setShowModal(false)
  }

  const handleDelete = async (id: string) => {
    const target = members.find((m) => m.id === id)
    const name = target?.name || 'この会員'
    if (!confirm(`【退会処理】\n${name} の退会処理を行います。\n\n・Stripeサブスクは現在の期間終了時に自動キャンセル\n・期間中はアプリ利用可能（支払い済みのため）\n・期間終了時にアカウントと全データを自動削除\n\n進めてよろしいですか？`)) return
    if (!confirm('最終確認: 退会処理を実行します。よろしいですか？')) return

    try {
      const res = await fetch('/api/admin/delete-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id }),
      })
      const data = await res.json() as { success?: boolean; error?: string; scheduled?: boolean; scheduledDeletionAt?: string; message?: string }
      if (!data.success) {
        alert(`処理に失敗しました: ${data.error || '不明なエラー'}`)
        return
      }
      setShowDetail(null)
      if (data.scheduled && data.scheduledDeletionAt) {
        const dt = new Date(data.scheduledDeletionAt).toLocaleString('ja-JP')
        alert(`退会予約完了\n\n${dt} にアカウント＆全データが自動削除されます。\nそれまではアプリの利用が可能です。`)
      } else {
        setMembers((prev) => prev.filter((m) => m.id !== id))
        alert('会員を即時削除しました（サブスクリプションなし）')
      }
    } catch (err) {
      alert(`通信エラー: ${String(err)}`)
    }
  }

  const exportCSV = () => {
    const headers = ['氏名', 'フリガナ', '電話番号', 'メール', '住所', 'チーム', '性別', 'ステータス', 'メモ', '登録日']
    const rows = members.map((m) => [
      m.name, m.nameKana, m.phone, m.email, m.address, m.team,
      m.gender === 'male' ? '男性' : m.gender === 'female' ? '女性' : 'その他',
      m.status === 'active' ? 'アクティブ' : '非アクティブ',
      m.memo, m.createdAt,
    ])
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'members.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif", color: '#1a1a1a' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 900, margin: 0, color: '#111827' }}>会員管理</h1>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0' }}>
            会員情報の登録・編集・管理 <strong style={{ color: '#111827' }}>{filtered.length}名</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={exportCSV}
            style={{
              padding: '8px 14px', borderRadius: '10px', border: '1.5px solid #e5e7eb',
              background: 'white', color: '#374151', fontSize: '12px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            ⬇ CSV出力
          </button>
          <button
            onClick={openAdd}
            style={{
              padding: '8px 14px', borderRadius: '10px', border: 'none',
              background: '#2563eb', color: 'white', fontSize: '12px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            ＋ 会員登録
          </button>
        </div>
      </div>

      {/* フィルター */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '4px', background: '#f3f4f6', borderRadius: '10px', padding: '3px' }}>
          {(['all', 'active', 'inactive'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '5px 12px', borderRadius: '8px', border: 'none',
                background: statusFilter === s ? '#2563eb' : 'transparent',
                color: statusFilter === s ? 'white' : '#6b7280',
                fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {s === 'all' ? '全員' : s === 'active' ? 'アクティブ' : '非アクティブ'}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '14px' }}>🔍</span>
          <input
            type="text"
            placeholder="No・名前・フリガナ・電話・メールで検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: '32px', fontSize: '12px' }}
          />
        </div>
      </div>

      {/* 会員リスト */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '13px', background: 'white', borderRadius: '16px', border: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.3 }}>👥</div>
            会員が見つかりません
          </div>
        ) : (
          filtered.map((m, i) => (
            <div
              key={m.id}
              onClick={() => setShowDetail(m)}
              style={{
                background: 'white', border: '1px solid #f0f0f0', borderRadius: '14px',
                padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
                transition: 'box-shadow 0.15s',
              }}
            >
              <div
                style={{
                  width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                  background: m.status === 'active' ? '#dcfce7' : '#f3f4f6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', fontWeight: 800, color: m.status === 'active' ? '#16a34a' : '#9ca3af',
                }}
              >
                {m.name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>{m.name}</span>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>{m.nameKana}</span>
                  <span
                    style={{
                      fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                      background: m.status === 'active' ? '#dcfce7' : '#f3f4f6',
                      color: m.status === 'active' ? '#16a34a' : '#6b7280',
                    }}
                  >
                    {m.status === 'active' ? 'アクティブ' : '非アクティブ'}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.team && <span style={{ marginRight: '12px' }}>⚽ {m.team}</span>}
                  {m.phone && <span style={{ marginRight: '12px' }}>📞 {m.phone}</span>}
                  {m.email && <span>✉ {m.email}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <a
                  href={`/admin/members/detail?id=${m.id}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    fontSize: '11px', padding: '5px 10px', borderRadius: '7px',
                    border: '1px solid #22c55e', color: '#16a34a', fontWeight: 600,
                    cursor: 'pointer', background: '#f0fdf4', fontFamily: 'inherit',
                    textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
                  }}
                >
                  詳細
                </a>
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(m) }}
                  style={{
                    fontSize: '11px', padding: '5px 10px', borderRadius: '7px',
                    border: '1px solid #e5e7eb', color: '#374151', fontWeight: 600,
                    cursor: 'pointer', background: 'white', fontFamily: 'inherit',
                  }}
                >
                  編集
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(m.id) }}
                  style={{
                    fontSize: '11px', padding: '5px 10px', borderRadius: '7px',
                    border: '1px solid #fca5a5', color: '#ef4444', fontWeight: 600,
                    cursor: 'pointer', background: 'white', fontFamily: 'inherit',
                  }}
                >
                  削除
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 詳細パネル */}
      {showDetail && (
        <div
          onClick={() => setShowDetail(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white', width: '100%', maxWidth: '640px',
              borderRadius: '20px 20px 0 0', padding: '20px', maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: '#111827' }}>{showDetail.name}</h2>
              <button onClick={() => setShowDetail(null)} style={{ fontSize: '20px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>✕</button>
            </div>
            {[
              { label: '氏名', value: showDetail.name },
              { label: 'フリガナ', value: showDetail.nameKana },
              { label: '電話番号', value: showDetail.phone },
              { label: 'メール', value: showDetail.email },
              { label: '住所', value: showDetail.address },
              { label: 'チーム', value: showDetail.team },
              { label: '性別', value: showDetail.gender === 'male' ? '男性' : showDetail.gender === 'female' ? '女性' : 'その他' },
              { label: 'ステータス', value: showDetail.status === 'active' ? 'アクティブ' : '非アクティブ' },
              { label: 'メモ', value: showDetail.memo },
              { label: '登録日', value: showDetail.createdAt },
            ].filter((r) => r.value).map((row) => (
              <div key={row.label} style={{ display: 'flex', gap: '12px', padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: '13px' }}>
                <span style={{ color: '#6b7280', width: '80px', flexShrink: 0 }}>{row.label}</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>{row.value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <a
                href={`/admin/members/detail?id=${showDetail.id}`}
                style={{
                  flex: 2, padding: '10px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: 'white', fontWeight: 700, fontSize: '13px',
                  cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', textAlign: 'center',
                }}
              >
                🍽 食事・体組成を確認
              </a>
              <button
                onClick={() => openEdit(showDetail)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                  background: '#2563eb', color: 'white', fontWeight: 700, fontSize: '13px',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                編集
              </button>
              <button
                onClick={() => handleDelete(showDetail.id)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px', border: '1.5px solid #fca5a5',
                  background: 'white', color: '#ef4444', fontWeight: 700, fontSize: '13px',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                削除
              </button>
            </div>

            {/* ===== コメント送信 ===== */}
            <div style={{ marginTop: '16px', borderTop: '1px solid #f0f0f0', paddingTop: '16px' }}>
              {!showPanelComment ? (
                <button
                  onClick={() => { setShowPanelComment(true); setPanelCommentText(''); setPanelCommentSaved(false); setPanelCommentError('') }}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color: 'white', fontWeight: 800, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  💬 {showDetail.name}さんにコメントを送る
                </button>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 800, fontSize: '13px', color: '#111827' }}>💬 コメント送信</span>
                    <button onClick={() => setShowPanelComment(false)} style={{ fontSize: '18px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                  </div>
                  {/* カテゴリ */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    {['食事', '体組成', 'トレーニング', '全般'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setPanelCommentCategory(cat)}
                        style={{
                          padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                          border: panelCommentCategory === cat ? '2px solid #16a34a' : '2px solid #e5e7eb',
                          background: panelCommentCategory === cat ? '#f0fdf4' : 'white',
                          color: panelCommentCategory === cat ? '#16a34a' : '#6b7280',
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >{cat}</button>
                    ))}
                  </div>
                  {/* テキストエリア */}
                  <textarea
                    value={panelCommentText}
                    onChange={(e) => setPanelCommentText(e.target.value)}
                    placeholder={`${showDetail.name}さんへのコメント...`}
                    rows={3}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '10px',
                      border: '1.5px solid #e5e7eb', fontSize: '13px', outline: 'none',
                      fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6,
                    }}
                  />
                  <button
                    onClick={() => handleSendComment(showDetail.id)}
                    disabled={!panelCommentText.trim() || panelCommentSending}
                    style={{
                      width: '100%', marginTop: '8px', padding: '12px', borderRadius: '10px', border: 'none',
                      background: panelCommentSaved ? '#22c55e' : (!panelCommentText.trim() || panelCommentSending ? '#d1d5db' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'),
                      color: 'white', fontWeight: 800, fontSize: '14px',
                      cursor: (!panelCommentText.trim() || panelCommentSending) ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {panelCommentSaved ? '✅ 送信完了！' : panelCommentSending ? '送信中...' : '送信する'}
                  </button>
                  {panelCommentError && (
                    <div style={{ marginTop: '8px', padding: '10px', background: '#fee2e2', borderRadius: '8px', fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                      ❌ {panelCommentError}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 登録・編集モーダル */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white', width: '100%', maxWidth: '640px',
              borderRadius: '20px 20px 0 0', maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 900, margin: 0, color: '#111827' }}>
                {editingId ? '会員を編集' : '会員を登録'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ fontSize: '20px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>✕</button>
            </div>
            <div style={{ padding: '16px 20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                    氏名 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="山田 太郎" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: '4px' }}>フリガナ</label>
                  <input value={fKana} onChange={(e) => setFKana(e.target.value)} placeholder="ヤマダ タロウ" style={inputStyle} />
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                  電話番号 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input value={fPhone} onChange={(e) => setFPhone(e.target.value)} type="tel" placeholder="090-0000-0000" style={inputStyle} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: '4px' }}>メールアドレス</label>
                <input value={fEmail} onChange={(e) => setFEmail(e.target.value)} type="email" placeholder="example@email.com" style={inputStyle} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                  住所 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input value={fAddress} onChange={(e) => setFAddress(e.target.value)} placeholder="東京都渋谷区..." style={inputStyle} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: '4px' }}>所属チーム名</label>
                <input value={fTeam} onChange={(e) => setFTeam(e.target.value)} placeholder="○○高校サッカー部" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: '4px' }}>性別</label>
                  <select value={fGender} onChange={(e) => setFGender(e.target.value)} style={inputStyle}>
                    <option value="">選択</option>
                    <option value="male">男性</option>
                    <option value="female">女性</option>
                    <option value="other">その他</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: '4px' }}>ステータス</label>
                  <select value={fStatus} onChange={(e) => setFStatus(e.target.value as 'active' | 'inactive')} style={inputStyle}>
                    <option value="active">アクティブ</option>
                    <option value="inactive">非アクティブ</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: '4px' }}>メモ</label>
                <textarea
                  value={fMemo}
                  onChange={(e) => setFMemo(e.target.value)}
                  placeholder="備考・メモ"
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid #e5e7eb',
                    background: 'white', color: '#374151', fontWeight: 700, fontSize: '13px',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  style={{
                    flex: 2, padding: '12px', borderRadius: '10px', border: 'none',
                    background: '#2563eb', color: 'white', fontWeight: 700, fontSize: '13px',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {editingId ? '更新する' : '登録する'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
