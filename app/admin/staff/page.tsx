'use client'

import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '@/lib/api'

interface Staff {
  id: string
  name: string
  name_kana: string
  role: string
  title: string
  phone: string
  email: string
  notes: string
  bio: string
  specialties: string
  photo: string
  color: string
  active: boolean
  created_at: string
}

const COLORS = ['#2563eb','#16a34a','#dc2626','#7c3aed','#f97316','#0ea5e9','#ec4899','#14b8a6']
const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  '管理栄養士': { bg: '#dbeafe', color: '#1d4ed8' },
  'トレーナー':  { bg: '#dcfce7', color: '#16a34a' },
  '受付':        { bg: '#fef9c3', color: '#a16207' },
  'マネージャー': { bg: '#f3e8ff', color: '#7c3aed' },
  'その他':      { bg: '#f3f4f6', color: '#6b7280' },
}

const emptyForm = { name: '', name_kana: '', role: '管理栄養士', title: '', phone: '', email: '', notes: '', bio: '', specialties: '', photo: '', color: '#2563eb' }

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [showProfile, setShowProfile] = useState<Staff | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadStaff = async () => {
    try {
      const res = await apiFetch('/api/staff')
      if (res.ok) {
        const data = await res.json()
        setStaff(data)
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    loadStaff()
  }, [])

  const openAdd = () => {
    setEditId(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (s: Staff) => {
    setEditId(s.id)
    setForm({
      name: s.name, name_kana: s.name_kana || '', role: s.role, title: s.title || '',
      phone: s.phone || '', email: s.email || '', notes: s.notes || '',
      bio: s.bio || '', specialties: s.specialties || '', photo: s.photo || '', color: s.color || '#2563eb',
    })
    setShowModal(true)
    setShowProfile(null)
  }

  const saveForm = async () => {
    if (!form.name.trim()) { alert('氏名を入力してください'); return }
    setSaving(true)
    try {
      if (editId) {
        const res = await apiFetch(`/api/staff/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (res.ok) {
          await loadStaff()
          setShowModal(false)
        } else {
          alert('更新に失敗しました')
        }
      } else {
        const newStaff = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2),
          ...form,
          active: true,
          created_at: new Date().toISOString(),
        }
        const res = await apiFetch('/api/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newStaff),
        })
        if (res.ok) {
          await loadStaff()
          setShowModal(false)
        } else {
          alert('登録に失敗しました')
        }
      }
    } catch {
      alert('エラーが発生しました')
    }
    setSaving(false)
  }

  const deleteStaff = async (id: string) => {
    if (!confirm('このスタッフを削除しますか？')) return
    try {
      const res = await apiFetch(`/api/staff/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await loadStaff()
        setShowProfile(null)
      } else {
        alert('削除に失敗しました')
      }
    } catch {
      alert('エラーが発生しました')
    }
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const MAX = 600
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX }
        else { width = Math.round(width * MAX / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      const compressed = canvas.toDataURL('image/jpeg', 0.8)
      setForm(f => ({ ...f, photo: compressed }))
    }
    img.src = objectUrl
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: '8px',
    border: '1.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box',
    fontFamily: 'inherit', outline: 'none', background: '#f9fafb',
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>読み込み中...</div>
      ) : staff.length === 0 ? (
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
                onClick={() => setShowProfile(s)}
                style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              >
                {s.photo ? (
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `2px solid ${s.color}` }}>
                    <img src={s.photo} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px', fontWeight: 900, flexShrink: 0 }}>
                    {(s.name || '?').charAt(0)}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                    <p style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: '#111827' }}>{s.name}</p>
                    {s.name_kana && <p style={{ fontSize: '10px', color: '#9ca3af', margin: 0 }}>{s.name_kana}</p>}
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '20px', background: rc.bg, color: rc.color }}>{s.role}</span>
                  </div>
                  {s.title && <p style={{ fontSize: '12px', color: '#4b5563', margin: '0 0 2px', fontWeight: 600 }}>{s.title}</p>}
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>
                    {s.phone && <span>📞 {s.phone}　</span>}
                    {s.email && <span>✉ {s.email}</span>}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={(e) => { e.stopPropagation(); openEdit(s) }} style={{ padding: '5px 12px', borderRadius: '7px', border: '1px solid #3b82f6', color: '#2563eb', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: 'white', fontFamily: 'inherit' }}>編集</button>
                  <button onClick={(e) => { e.stopPropagation(); deleteStaff(s.id) }} style={{ padding: '5px 12px', borderRadius: '7px', border: '1px solid #fca5a5', color: '#ef4444', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: 'white', fontFamily: 'inherit' }}>削除</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ===== プロフィール表示モーダル ===== */}
      {showProfile && (
        <div onClick={() => setShowProfile(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', width: '100%', maxWidth: '520px', borderRadius: '20px 20px 0 0', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ background: `linear-gradient(135deg, ${showProfile.color} 0%, ${showProfile.color}cc 100%)`, padding: '30px 20px 20px', textAlign: 'center', position: 'relative' }}>
              <button onClick={() => setShowProfile(null)} style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '20px', color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              {showProfile.photo ? (
                <div style={{ width: '90px', height: '90px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 12px', border: '3px solid rgba(255,255,255,0.5)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                  <img src={showProfile.photo} alt={showProfile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : (
                <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 900, color: 'white' }}>
                  {showProfile.name.charAt(0)}
                </div>
              )}
              <h2 style={{ fontSize: '20px', fontWeight: 900, margin: '0 0 2px', color: 'white' }}>{showProfile.name}</h2>
              {showProfile.name_kana && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: '0 0 6px' }}>{showProfile.name_kana}</p>}
              {showProfile.title && <p style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', margin: '0 0 6px' }}>{showProfile.title}</p>}
              <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 700, padding: '3px 12px', borderRadius: '20px', background: 'rgba(255,255,255,0.2)', color: 'white' }}>{showProfile.role}</span>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px', fontSize: '13px' }}>
                {showProfile.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4b5563' }}><span style={{ fontSize: '16px' }}>📞</span> {showProfile.phone}</div>}
                {showProfile.email && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4b5563' }}><span style={{ fontSize: '16px' }}>✉️</span> {showProfile.email}</div>}
              </div>
              {showProfile.specialties && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', marginBottom: '6px' }}>🎯 専門分野</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {showProfile.specialties.split(/[、,，]/).map((s, i) => (
                      <span key={i} style={{ fontSize: '12px', background: '#f0fdf4', color: '#16a34a', padding: '4px 12px', borderRadius: '20px', fontWeight: 600, border: '1px solid #bbf7d0' }}>{s.trim()}</span>
                    ))}
                  </div>
                </div>
              )}
              {showProfile.bio && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', marginBottom: '6px' }}>📋 自己紹介</div>
                  <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.7, margin: 0, background: '#f9fafb', borderRadius: '10px', padding: '12px 14px', border: '1px solid #f3f4f6' }}>{showProfile.bio}</p>
                </div>
              )}
              {showProfile.notes && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', marginBottom: '6px' }}>📝 メモ</div>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{showProfile.notes}</p>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                <button onClick={() => openEdit(showProfile)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>編集する</button>
                <button onClick={() => deleteStaff(showProfile.id)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid #fca5a5', background: 'white', color: '#ef4444', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>削除する</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 登録・編集モーダル ===== */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', width: '100%', maxWidth: '520px', borderRadius: '20px 20px 0 0', padding: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 900, margin: 0 }}>{editId ? 'スタッフ編集' : 'スタッフ登録'}</h2>
              <button onClick={() => setShowModal(false)} style={{ fontSize: '20px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>

            {/* プロフィール画像 */}
            <div style={{ marginBottom: '16px', textAlign: 'center' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '8px', textAlign: 'left' }}>プロフィール写真</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto',
                  background: form.photo ? 'transparent' : '#f3f4f6',
                  border: form.photo ? `3px solid ${form.color}` : '2px dashed #d1d5db',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', overflow: 'hidden',
                }}
              >
                {form.photo ? (
                  <img src={form.photo} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', marginBottom: '2px' }}>📷</div>
                    <div style={{ fontSize: '9px', color: '#9ca3af' }}>写真を選択</div>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              {form.photo && (
                <button onClick={() => setForm(f => ({ ...f, photo: '' }))} style={{ marginTop: '6px', fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>写真を削除</button>
              )}
            </div>

            {[
              { label: '氏名 *', key: 'name', placeholder: '山田 花子' },
              { label: 'フリガナ', key: 'name_kana', placeholder: 'ヤマダ ハナコ' },
              { label: '肩書き', key: 'title', placeholder: '例: チーフ管理栄養士 / ヘッドトレーナー' },
              { label: '電話番号', key: 'phone', placeholder: '090-0000-0000' },
              { label: 'メールアドレス', key: 'email', placeholder: 'staff@example.com' },
            ].map(({ label, key, placeholder }) => (
              <div key={key} style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>{label}</label>
                <input
                  type="text" value={form[key as keyof typeof form]} placeholder={placeholder}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            ))}

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>役職</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={inputStyle}>
                {['管理栄養士','トレーナー','マネージャー','受付','その他'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>専門分野（カンマ区切り）</label>
              <input type="text" value={form.specialties} placeholder="例: スポーツ栄養、減量指導、サプリメント" onChange={e => setForm(f => ({ ...f, specialties: e.target.value }))} style={inputStyle} />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>自己紹介</label>
              <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="お客様に表示されるプロフィール文を入力..." rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>表示カラー</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? '3px solid #111827' : '3px solid transparent' }} />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>メモ（内部用）</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="内部メモ..." rows={2} style={{ ...inputStyle, resize: 'none' }} />
            </div>

            <button
              onClick={saveForm}
              disabled={saving}
              style={{ width: '100%', padding: '13px', borderRadius: '12px', border: 'none', background: saving ? '#d1d5db' : '#2563eb', color: 'white', fontWeight: 800, fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
            >
              {saving ? '保存中...' : '保存する'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
