'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // PASSWORD_RECOVERYイベントを待つ（メールリンクからのアクセス）
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true)
      }
    })

    // すでにセッションがある場合もOK（リロード時など）
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })

    // URLハッシュにtokenがある場合、Supabaseに処理させる
    if (typeof window !== 'undefined' && window.location.hash) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) setReady(true)
      })
    }

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('パスワードが一致しません')
      return
    }
    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError('パスワードの更新に失敗しました。もう一度お試しください。')
      setLoading(false)
      return
    }
    setSuccess(true)
    setTimeout(() => router.push('/login'), 2000)
  }

  return (
    <div
      style={{
        background: '#ffffff',
        color: '#111827',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 20px',
        fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          background: '#ffffff',
          border: '1.5px solid #e5e7eb',
          borderTop: '3px solid #22c55e',
          borderRadius: '18px',
          padding: '32px 26px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.07)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '8px',
            }}
          >
            スポミル
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#374151' }}>
            パスワード再設定
          </div>
        </div>

        {success ? (
          <div
            style={{
              background: '#f0fdf4',
              border: '1.5px solid #22c55e',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              color: '#16a34a',
              fontWeight: 700,
              fontSize: '15px',
            }}
          >
            ✅ パスワードを更新しました！<br />
            <span style={{ fontSize: '13px', fontWeight: 400 }}>ログイン画面に移動します...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
                新しいパスワード
              </label>
              <input
                type="password"
                placeholder="6文字以上"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  background: '#f9fafb',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '13px 16px',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
                パスワード（確認）
              </label>
              <input
                type="password"
                placeholder="もう一度入力"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                style={{
                  width: '100%',
                  background: '#f9fafb',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '13px 16px',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <div style={{ color: '#dc2626', fontSize: '12px', marginBottom: '12px', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !ready}
              style={{
                width: '100%',
                background: loading || !ready ? '#d1d5db' : 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
                color: 'white',
                fontWeight: 900,
                fontSize: '15px',
                padding: '15px',
                borderRadius: '10px',
                border: 'none',
                cursor: loading || !ready ? 'not-allowed' : 'pointer',
                boxShadow: loading || !ready ? 'none' : '0 4px 20px rgba(34,197,94,0.3)',
              }}
            >
              {loading ? '更新中...' : 'パスワードを更新する'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}
