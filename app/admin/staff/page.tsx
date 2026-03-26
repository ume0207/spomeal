'use client'

import { useState, useEffect } from 'react'

interface Staff {
  id: string
  name: string
  nameKana: string
  role: string
  phone: string
  email: string
  notes: string
  color: string
  active: boolean
  createdAt: string
}

const COLORS = ['#2563eb','#16a34a','#dc2626','#7c3aed','#f97316','#0ea5e9','#ec4899','#14b8a6']
const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  '管理栄養士': { bg: '#dbeafe', color: '#1d4ed8' },
  'トレーナー':  { bg: '#dcfce7', color: '#16a34a' },
  '受付':        { bg: '#fef9c3', color: '#a16207' },
  'その他':      { bg: '#f3f4f6', color: '#6b7280' },
}

const emptyForm = { name: '', nameKana: '', role: '管理栄養士', phone: '', email: '', notes: '', color: '#2563eb' }

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('staff_v1')
      if (saved) setStaff(JSON.parse(saved))
    } catch {}
  }, [])

  const save = (data: Staff[]) => {
    setStaff(data)
    localStorage.setItem('staff_v1', JSON.stringify(data))
  }

  const openAdd = () => {
    setEditId(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (s: Staff) => {
    setEditId(s.id)
    setForm({ name: s.name, nameKana: s.nameKana, role: s.role, phone: s.phone, email: s.email, notes: s.notes, color: s.color })
    setShowModal(true)
  }

  const saveForm = () => {
    if (!form.name.trim()) { alert('氏名を入力してください'); return }
    if (editId) {
      save(staff.map(s => s.id === editId ? { ...s, ...form } : s))
    } else {
      const newStaff: Staff = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        ...form,
        active: true,
        createdAt: new Date().toISOString(),
      }
      save([...staff, newStaff])
    }
    setShowModal(false)
  }

  const deleteStaff = (id: string) => {
    if (!confirm('このスタッフを削除しますか？')) return
    save(staff.filter(s => s.id !== id))
  }

  return (
    <div style={{ fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif", color: '#1a1a1a' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 900, margin: 0, color: '#111827' }}>👤 スタッフ管理</h1>
        <button
          onClick={openAdd}
          style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: '#2563eb', color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ＋ スタッフ登録
        </button>
      </div>

      {staff.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af', background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>👤</div>
          <p style={{ fontSize: '14px', margin: '0 0 4px' }}>スタッフが登録されていません</p>
          <p style={{ fontSize: '12px', margin: 0 }}>「スタッフ登録」から追加してください</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {staff.map(s => {
            const rc = ROLE_COLORS[s.role] || ROLE_COLORS['その他']
            return (
              <div
                key={s.id}
                style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
              >
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '16px', fontWeight: 900, flexShrink: 0 }}>
                  {(s.name || '?').charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <p style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: '#111827' }}>{s.name}</p>
                    {s.nameKana && <p style={{ fontSize: '10px', color: '#9ca3af', margin: 0 }}>{s.nameKana}</p>}
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '20px', background: rc.bg, color: rc.color }}>{s.role}</span>
                  </div>
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>
                    {s.phone && <span>📞 {s.phone}　</span>}
                    {s.email && <span>✉ {s.email}</span>}
                  </p>
                  {s.notes && <p style={{ fontSize: '11px', color: '#9ca3af', margin: '2px 0 0' }}>{s.notes}</p>}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => openEdit(s)} style={{ padding: '5px 12px', borderRadius: '7px', border: '1px solid #3b82f6', color: '#2563eb', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: 'white', fontFamily: 'inherit' }}>編集</button>
                  <button onClick={() => deleteStaff(s.id)} style={{ padding: '5px 12px', borderRadius: '7px', border: '1px solid #fca5a5', color: '#ef4444', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: 'white', fontFamily: 'inherit' }}>削除</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* モーダル */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', width: '100%', maxWidth: '480px', borderRadius: '20px 20px 0 0', padding: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 900, margin: 0 }}>{editId ? 'スタッフ編集' : 'スタッフ登録'}</h2>
              <button onClick={() => setShowModal(false)} style={{ fontSize: '20px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>

            {[
              { label: '氏名 *', key: 'name', placeholder: '山田 花子' },
              { label: 'フリガナ', key: 'nameKana', placeholder: 'ヤマダ ハナコ' },
              { label: '電話番号', key: 'phone', placeholder: '090-0000-0000' },
              { label: 'メールアドレス', key: 'email', placeholder: 'staff@example.com' },
            ].map(({ label, key, placeholder }) => (
              <div key={key} style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>{label}</label>
                <input
                  type="text" value={form[key as keyof typeof form]} placeholder={placeholder}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
            ))}

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>役職</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}>
                {['管理栄養士','トレーナー','受付','その他'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>表示カラー</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {COLORS.map(c => (
                  <div
                    key={c}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    style={{
                      width: '28px', height: '28px', borderRadius: '50%', background: c, cursor: 'pointer',
                      border: form.color === c ? '3px solid #111827' : '3px solid transparent',
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>メモ</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="専門分野など" rows={2}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'none' }} />
            </div>

            <button onClick={saveForm} style={{ width: '100%', padding: '13px', borderRadius: '12px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 800, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
              保存する
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
