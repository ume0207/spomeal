'use client'

import { usePathname, useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard', icon: '🏠', label: 'ホーム', tutorialId: 'nav-home' },
  { href: '/meal', icon: '🍽', label: '食事', tutorialId: 'nav-meal' },
  { href: '/pet', icon: '🍙', label: 'ペット', tutorialId: 'nav-pet' },
  { href: '/body', icon: '📊', label: '体組成', tutorialId: 'nav-body' },
  { href: '/reserve', icon: '📅', label: '予約', tutorialId: 'nav-reserve' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState('選手')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [subscriptionLocked, setSubscriptionLocked] = useState(false)
  const [subscriptionChecked, setSubscriptionChecked] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteMessage, setDeleteMessage] = useState('')
  const [pendingDeletion, setPendingDeletion] = useState(false)
  const [scheduledDeletionAt, setScheduledDeletionAt] = useState<string | null>(null)
  const [periodEnd, setPeriodEnd] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // プロフィール編集モーダル
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editPasswordConfirm, setEditPasswordConfirm] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    // getUser()はsupabase.coへの通信が必要でiOS 26.4 betaで失敗する
    // getSession()はローカル保存のトークンを読むだけなので通信不要
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user

      if (!user) {
        // 未ログイン → ログインページへ
        window.location.href = '/login'
        return
      }

      const name = user.user_metadata?.full_name || user.email || '選手'
      setUserName(name)
      // アバター読み込み: user_metadata → localStorage fallback
      const metaAvatar = user.user_metadata?.avatar_url
      if (metaAvatar) {
        setAvatarUrl(metaAvatar)
        localStorage.setItem('spomeal_avatar', metaAvatar)
      } else {
        const saved = localStorage.getItem('spomeal_avatar')
        if (saved) setAvatarUrl(saved)
      }

      // サブスクリプション状態チェック
      // ★プレビュー環境（*.pages.dev）では Service Role Key が
      //   伝播していないため check-subscription が失敗する。
      //   テスト用途として、プレビュー時はチェックをスキップして無条件解錠する。
      const isPreviewHost = typeof window !== 'undefined'
        && window.location.hostname.endsWith('.pages.dev')
      if (isPreviewHost) {
        setSubscriptionLocked(false)
      } else {
        try {
          const email = user.email
          const userId = user.id
          const res = await apiFetch(`/api/check-subscription?email=${encodeURIComponent(email || '')}&userId=${userId}`)
          if (res.ok) {
            const subData = await res.json() as { active: boolean; reason?: string }
            if (!subData.active) {
              setSubscriptionLocked(true)
            }
          } else {
            // APIエラー（5xx等）→ 安全のためロック
            setSubscriptionLocked(true)
          }
        } catch {
          // ネットワークエラー → 安全のためロック
          setSubscriptionLocked(true)
        }
      }
      setSubscriptionChecked(true)
    })
  }, [])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      // 画像をリサイズしてbase64に変換（最大120px）
      const bitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      const MAX = 120
      let w = bitmap.width, h = bitmap.height
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX }
        else { w = Math.round(w * MAX / h); h = MAX }
      }
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(bitmap, 0, 0, w, h)
      bitmap.close()
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7)

      setAvatarUrl(dataUrl)
      localStorage.setItem('spomeal_avatar', dataUrl)

      // Supabase user_metadataにも保存
      const supabase = createClient()
      await supabase.auth.updateUser({ data: { avatar_url: dataUrl } })
    } catch { /* ignore */ }
    // input をリセット（同じファイルを再選択可能にする）
    e.target.value = ''
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    // ★修正: ログアウト時は「ログイン情報を記憶する」で保存したメールも消す。
    // 共有端末で前のユーザーのメールが自動入力されるプライバシー問題を防ぐ。
    try {
      localStorage.removeItem('spomeal_saved_email')
    } catch { /* ignore */ }
    router.push('/login')
  }

  // プロフィール保存
  const handleSaveProfile = async () => {
    setProfileSaving(true)
    setProfileMessage(null)
    try {
      const supabase = createClient()
      const updates: Parameters<typeof supabase.auth.updateUser>[0] = {}

      if (editName.trim()) {
        updates.data = { full_name: editName.trim() }
      }

      if (editPassword) {
        if (editPassword.length < 6) {
          setProfileMessage({ type: 'error', text: 'パスワードは6文字以上で入力してください' })
          return
        }
        if (editPassword !== editPasswordConfirm) {
          setProfileMessage({ type: 'error', text: 'パスワードが一致しません' })
          return
        }
        updates.password = editPassword
      }

      if (!updates.data && !updates.password) {
        setProfileMessage({ type: 'error', text: '変更する項目を入力してください' })
        return
      }

      const { error } = await supabase.auth.updateUser(updates)
      if (error) {
        setProfileMessage({ type: 'error', text: error.message || '保存に失敗しました' })
        return
      }

      if (editName.trim()) {
        setUserName(editName.trim())
      }
      setEditPassword('')
      setEditPasswordConfirm('')
      setProfileMessage({ type: 'success', text: '保存しました！' })
    } finally {
      setProfileSaving(false)
    }
  }

  const openProfileModal = () => {
    setEditName(userName === '選手' ? '' : userName)
    setEditPassword('')
    setEditPasswordConfirm('')
    setProfileMessage(null)
    setShowProfileModal(true)
  }

  // 退会状態を取得
  const loadDeletionStatus = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('pending_deletion, scheduled_deletion_at, subscription_current_period_end')
      .eq('id', user.id)
      .single()
    if (data) {
      setPendingDeletion(!!data.pending_deletion)
      setScheduledDeletionAt(data.scheduled_deletion_at || null)
      setPeriodEnd(data.subscription_current_period_end || null)
    }
  }

  useEffect(() => { loadDeletionStatus() }, [])

  const callDeletionApi = async (action: 'request' | 'cancel') => {
    setDeleteLoading(true)
    setDeleteMessage('')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('ログインが必要です')
      const res = await apiFetch('/api/user/request-deletion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action }),
      })
      const json = await res.json() as { success: boolean; message?: string; error?: string }
      if (!json.success) throw new Error(json.error || '処理に失敗しました')
      setDeleteMessage(json.message || '完了しました')
      await loadDeletionStatus()
      if (action === 'request' && !json.message?.includes('期間終了時')) {
        // 即時削除の場合はログアウト扱い
        setTimeout(() => { router.push('/login') }, 2000)
      }
    } catch (err) {
      setDeleteMessage(`エラー: ${(err as Error).message}`)
    } finally {
      setDeleteLoading(false)
    }
  }

  // サブスク確認中はローディング（未払いユーザーへのコンテンツ一瞬表示を防ぐ）
  if (!subscriptionChecked) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f4f6',
        fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",
      }}>
        <div style={{ textAlign: 'center', color: '#9ca3af' }}>
          <div style={{
            width: '40px', height: '40px', border: '3px solid #e5e7eb',
            borderTopColor: '#22c55e', borderRadius: '50%',
            margin: '0 auto 12px',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ fontSize: '13px' }}>読み込み中...</div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f3f4f6',
        fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",
        color: '#1a1a1a',
        fontSize: '14px',
      }}
    >
      {/* ===== 共通アプリヘッダー（ユーザー情報行）===== */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 110,
          background: '#22c55e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px 8px',
          minHeight: '60px',
        }}
      >
        {/* 左: アバター + Welcome */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
          />
          <div
            data-tutorial="avatar-icon"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              cursor: 'pointer',
              overflow: 'hidden',
              border: '2px solid rgba(255,255,255,0.5)',
              position: 'relative',
            }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            )}
            {/* カメラアイコンオーバーレイ */}
            <div style={{
              position: 'absolute', bottom: '-1px', right: '-1px',
              width: '16px', height: '16px', borderRadius: '50%',
              background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)', fontWeight: 500, marginBottom: '1px' }}>
              Welcome
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ fontSize: '17px', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>
                {userName} 様
              </div>
              <button
                onClick={openProfileModal}
                title="プロフィール編集"
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  borderRadius: '50%',
                  width: '22px',
                  height: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 右: ログアウト */}
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: 'rgba(255,255,255,0.15)',
            color: 'white',
            border: '1.5px solid rgba(255,255,255,0.45)',
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
            fontFamily: 'inherit',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          ログアウト
        </button>
      </div>

      {/* ===== Shared Nav（タブバー）===== */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: '#22c55e',
          padding: '6px 8px 10px',
          position: 'sticky',
          top: '60px',
          zIndex: 100,
          overflowX: 'auto',
          scrollbarWidth: 'none' as const,
        }}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <a
              key={item.href}
              href={item.href}
              data-tutorial={item.tutorialId}
              style={{
                display: 'flex',
                flexDirection: 'column' as const,
                alignItems: 'center',
                gap: '2px',
                padding: isActive ? '10px 12px' : '7px 10px 6px',
                color: isActive ? '#22c55e' : 'rgba(255,255,255,0.85)',
                fontWeight: 600,
                whiteSpace: 'nowrap' as const,
                flexShrink: 0,
                textDecoration: 'none',
                minWidth: '52px',
                flex: 1,
                transition: 'background 0.12s',
                background: isActive ? 'white' : 'transparent',
                borderRadius: isActive ? '14px' : '0',
                boxShadow: isActive ? '0 4px 16px rgba(0,0,0,0.20)' : 'none',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: isActive ? '20px' : '18px', lineHeight: 1.2 }}>
                {item.icon}
              </span>
              <span
                style={{
                  fontSize: isActive ? '10px' : '9px',
                  fontWeight: isActive ? 800 : 700,
                  color: isActive ? '#22c55e' : 'rgba(255,255,255,0.85)',
                }}
              >
                {item.label}
              </span>
            </a>
          )
        })}
      </nav>

      {/* ===== サブスクリプションロック画面 ===== */}
      {subscriptionLocked ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            padding: '40px 24px',
            maxWidth: '380px',
            width: '100%',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: '36px',
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>

            <h2 style={{
              fontSize: '20px', fontWeight: 800, color: '#111827',
              margin: '0 0 8px', lineHeight: 1.3,
            }}>
              サブスクリプションが無効です
            </h2>

            <p style={{
              fontSize: '14px', color: '#6b7280', lineHeight: 1.7,
              margin: '0 0 28px',
            }}>
              アプリを引き続きご利用いただくには、
              プランへのお申し込みが必要です。
            </p>

            <a
              href="/plans"
              style={{
                display: 'block',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: 'white',
                padding: '14px 24px',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(34,197,94,0.3)',
                marginBottom: '12px',
              }}
            >
              プランを選択する
            </a>

            <button
              onClick={handleLogout}
              style={{
                display: 'block',
                width: '100%',
                background: 'transparent',
                color: '#9ca3af',
                padding: '10px',
                border: 'none',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              ログアウト
            </button>

            <button
              onClick={() => setShowDeleteModal(true)}
              style={{
                display: 'block',
                width: '100%',
                background: 'transparent',
                color: '#dc2626',
                padding: '8px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                marginTop: '4px',
                textDecoration: 'underline',
              }}
            >
              退会する
            </button>
          </div>
        </div>
      ) : (
        /* ページコンテンツ */
        <>
          {/* 退会予約中バナー */}
          {pendingDeletion && scheduledDeletionAt && (
            <div style={{
              background: '#fef3c7',
              borderBottom: '1px solid #f59e0b',
              padding: '10px 16px',
              fontSize: '13px',
              color: '#92400e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap',
            }}>
              <span>
                ⚠ <strong>{new Date(scheduledDeletionAt).toLocaleDateString('ja-JP')}</strong> にアカウントが削除されます
              </span>
              <button
                onClick={() => callDeletionApi('cancel')}
                disabled={deleteLoading}
                style={{
                  padding: '6px 12px',
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: deleteLoading ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {deleteLoading ? '処理中…' : '退会をキャンセル'}
              </button>
            </div>
          )}
          {children}
          {/* フッター: 退会リンク */}
          {!pendingDeletion && (
            <div style={{
              padding: '24px 16px 40px',
              textAlign: 'center',
              background: '#f3f4f6',
            }}>
              <button
                onClick={() => setShowDeleteModal(true)}
                style={{
                  background: 'transparent',
                  color: '#9ca3af',
                  border: 'none',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontFamily: 'inherit',
                  padding: '6px 12px',
                }}
              >
                退会する
              </button>
            </div>
          )}
        </>
      )}

      {/* プロフィール編集モーダル */}
      {showProfileModal && (
        <div
          onClick={() => !profileSaving && setShowProfileModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '20px', padding: '28px 24px',
              maxWidth: '400px', width: '100%',
              boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
            }}
          >
            <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 800, color: '#111827' }}>
              プロフィール設定
            </h3>

            {/* 表示名 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#6b7280', marginBottom: '6px' }}>
                表示名
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="例: 山田 太郎"
                style={{
                  width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb',
                  borderRadius: '10px', fontSize: '14px', fontFamily: 'inherit',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '20px 0' }} />

            {/* パスワード変更 */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#6b7280', marginBottom: '6px' }}>
                新しいパスワード（変更する場合のみ）
              </label>
              <input
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="6文字以上"
                style={{
                  width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb',
                  borderRadius: '10px', fontSize: '14px', fontFamily: 'inherit',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#6b7280', marginBottom: '6px' }}>
                新しいパスワード（確認）
              </label>
              <input
                type="password"
                value={editPasswordConfirm}
                onChange={(e) => setEditPasswordConfirm(e.target.value)}
                placeholder="同じパスワードをもう一度"
                style={{
                  width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb',
                  borderRadius: '10px', fontSize: '14px', fontFamily: 'inherit',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* メッセージ */}
            {profileMessage && (
              <div style={{
                fontSize: '13px', padding: '10px 12px', borderRadius: '8px', marginBottom: '16px',
                background: profileMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
                color: profileMessage.type === 'success' ? '#166534' : '#991b1b',
              }}>
                {profileMessage.type === 'success' ? '✅ ' : '⚠ '}{profileMessage.text}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowProfileModal(false); setProfileMessage(null) }}
                disabled={profileSaving}
                style={{
                  padding: '10px 18px', background: '#f3f4f6', color: '#374151',
                  border: 'none', borderRadius: '10px', fontSize: '14px',
                  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={profileSaving}
                style={{
                  padding: '10px 22px',
                  background: profileSaving ? '#86efac' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px',
                  fontWeight: 700, cursor: profileSaving ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
                }}
              >
                {profileSaving ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 退会確認モーダル */}
      {showDeleteModal && (
        <div
          onClick={() => !deleteLoading && setShowDeleteModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '16px', padding: '28px 24px',
              maxWidth: '420px', width: '100%',
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 800, color: '#111827' }}>
              本当に退会しますか？
            </h3>
            <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#4b5563', margin: '0 0 16px' }}>
              {periodEnd ? (
                <>現在のサブスク期間の終了日（<strong>{new Date(periodEnd).toLocaleDateString('ja-JP')}</strong>）にアカウントが完全に削除されます。<br />期間終了までは引き続きスポミールをご利用いただけます。<br /><br />※期間終了までは退会をキャンセルできます。</>
              ) : (
                <>アカウントとすべてのデータが完全に削除されます。この操作は取り消せません。</>
              )}
            </p>
            {deleteMessage && (
              <p style={{
                fontSize: '13px', padding: '10px 12px', borderRadius: '8px',
                background: deleteMessage.startsWith('エラー') ? '#fee2e2' : '#dcfce7',
                color: deleteMessage.startsWith('エラー') ? '#991b1b' : '#166534',
                margin: '0 0 16px',
              }}>{deleteMessage}</p>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteMessage('') }}
                disabled={deleteLoading}
                style={{
                  padding: '10px 18px', background: '#f3f4f6', color: '#374151',
                  border: 'none', borderRadius: '8px', fontSize: '14px',
                  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={() => callDeletionApi('request')}
                disabled={deleteLoading}
                style={{
                  padding: '10px 18px', background: '#dc2626', color: '#fff',
                  border: 'none', borderRadius: '8px', fontSize: '14px',
                  fontWeight: 700, cursor: deleteLoading ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {deleteLoading ? '処理中…' : '退会を確定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
