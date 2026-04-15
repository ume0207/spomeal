'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('メールアドレスとパスワードを入力してください')
      return
    }

    setLoading(true)

    try {
      // 1. Supabase認証
      const supabase = createClient()
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError || !signInData.session) {
        setError(signInError?.message || 'メールアドレスまたはパスワードが正しくありません')
        setLoading(false)
        return
      }

      // 2. 管理者権限をサーバー側で検証
      const verifyRes = await fetch('/api/admin/auth', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${signInData.session.access_token}`,
        },
      })

      if (!verifyRes.ok) {
        await supabase.auth.signOut()
        setError('このアカウントには管理者権限がありません')
        setLoading(false)
        return
      }

      const data = await verifyRes.json() as { success?: boolean; admin?: { email?: string; name?: string } }
      if (!data.success) {
        await supabase.auth.signOut()
        setError('管理者認証に失敗しました')
        setLoading(false)
        return
      }

      // 管理者セッション（表示用のみ、認証はSupabaseで行う）
      const session = {
        name: data.admin?.name || email.trim(),
        email: data.admin?.email || email.trim(),
        loggedIn: true,
        loginAt: new Date().toISOString(),
      }
      localStorage.setItem('spomeal_admin_session', JSON.stringify(session))

      router.push('/admin')
    } catch {
      setError('通信エラーが発生しました')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: '48px 32px',
        maxWidth: '400px',
        width: '100%',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        {/* ロゴ */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            fontSize: '28px', fontWeight: 900, color: 'white',
            letterSpacing: '-0.5px',
          }}>
            スポ<span style={{ color: '#22c55e' }}>ミル</span>
          </div>
          <div style={{
            fontSize: '12px', color: 'rgba(255,255,255,0.5)',
            marginTop: '4px', letterSpacing: '2px',
          }}>
            ADMIN PORTAL
          </div>
        </div>

        {/* ロック表示 */}
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          border: '1px solid rgba(34,197,94,0.3)',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <h2 style={{
          fontSize: '18px', fontWeight: 700, color: 'white',
          textAlign: 'center', margin: '0 0 8px',
        }}>
          管理者ログイン
        </h2>
        <p style={{
          fontSize: '13px', color: 'rgba(255,255,255,0.45)',
          textAlign: 'center', margin: '0 0 28px',
        }}>
          管理者アカウントのメールアドレスを入力してください
        </p>

        <form onSubmit={handleLogin}>
          {/* メールアドレス */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              autoComplete="username"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* パスワード */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* エラー */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '10px',
              padding: '10px 14px',
              marginBottom: '16px',
              fontSize: '13px',
              color: '#fca5a5',
            }}>
              {error}
            </div>
          )}

          {/* ログインボタン */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading
                ? 'rgba(34,197,94,0.4)'
                : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '14px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 4px 14px rgba(34,197,94,0.3)',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  )
}
