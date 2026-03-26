'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('メールアドレスまたはパスワードが正しくありません')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div
      style={{
        background: '#ffffff',
        color: '#111827',
        minHeight: '100vh',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",
      }}
    >
      {/* 右上グリーン装飾ブロック */}
      <div
        style={{
          position: 'fixed',
          top: '-80px',
          right: '-80px',
          width: 'min(55vw, 420px)',
          height: 'min(55vw, 420px)',
          background: 'linear-gradient(145deg, #4ade80, #22c55e, #16a34a)',
          borderRadius: '50%',
          opacity: 0.15,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {/* 左下グリーン装飾ブロック */}
      <div
        style={{
          position: 'fixed',
          bottom: '-60px',
          left: '-60px',
          width: 'min(35vw, 280px)',
          height: 'min(35vw, 280px)',
          background: 'linear-gradient(145deg, #86efac, #4ade80)',
          borderRadius: '50%',
          opacity: 0.13,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 20px 60px',
          maxWidth: '640px',
          margin: '0 auto',
        }}
      >
        {/* ロゴエリア */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '10px',
            animation: 'fadeUp 0.7s ease both',
          }}
        >
          <a
            href="/admin"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: 'white',
              fontSize: '9px',
              fontWeight: 800,
              letterSpacing: '0.22em',
              padding: '4px 12px',
              borderRadius: '3px',
              marginBottom: '16px',
              textTransform: 'uppercase',
              boxShadow: '0 2px 10px rgba(34,197,94,0.35)',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            管理栄養士監修
          </a>
          <div
            style={{
              fontSize: 'clamp(56px, 14vw, 90px)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              background: 'linear-gradient(135deg, #15803d 0%, #22c55e 60%, #4ade80 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            スポ<span>ミル</span>
          </div>
          <div
            style={{
              fontSize: 'clamp(10px, 2vw, 13px)',
              fontWeight: 400,
              letterSpacing: '0.5em',
              color: '#9ca3af',
              textTransform: 'lowercase',
              marginTop: '8px',
            }}
          >
            sports meal
          </div>
        </div>

        {/* タグライン */}
        <div
          style={{
            fontSize: 'clamp(13px, 3vw, 15px)',
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: '#374151',
            textAlign: 'center',
            margin: '20px 0 32px',
            lineHeight: 2.1,
            animation: 'fadeUp 0.7s ease 0.12s both',
          }}
        >
          <span style={{ color: '#16a34a', fontWeight: 800 }}>勝つ体</span>は、食事から。
        </div>

        {/* ログインカード */}
        <div
          style={{
            width: '100%',
            maxWidth: '380px',
            animation: 'fadeUp 0.7s ease 0.22s both',
            background: '#ffffff',
            border: '1.5px solid #e5e7eb',
            borderTop: '3px solid #22c55e',
            borderRadius: '18px',
            padding: '30px 26px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.07), 0 2px 8px rgba(34,197,94,0.08)',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              fontWeight: 800,
              color: '#9ca3af',
              letterSpacing: '0.2em',
              textAlign: 'center',
              marginBottom: '20px',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
            LOGIN
            <span style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
          </div>

          <form onSubmit={handleLogin}>
            {/* メールアドレス */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
                メールアドレス
              </label>
              <input
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{
                  width: '100%',
                  background: '#f9fafb',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '13px 16px',
                  color: '#111827',
                  fontSize: '15px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#22c55e'
                  e.target.style.background = '#f0fdf4'
                  e.target.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb'
                  e.target.style.background = '#f9fafb'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* パスワード */}
            <div style={{ marginTop: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
                パスワード
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="パスワードを入力"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    background: '#f9fafb',
                    border: '1.5px solid #e5e7eb',
                    borderRadius: '10px',
                    padding: '13px 44px 13px 16px',
                    color: '#111827',
                    fontSize: '15px',
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#22c55e'
                    e.target.style.background = '#f0fdf4'
                    e.target.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb'
                    e.target.style.background = '#f9fafb'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '13px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#9ca3af',
                    fontSize: '15px',
                    cursor: 'pointer',
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* ログイン情報を記憶する */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '14px',
                fontSize: '12px',
                color: '#6b7280',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: '15px', height: '15px', accentColor: '#22c55e', cursor: 'pointer', flexShrink: 0 }}
              />
              ログイン情報を記憶する
            </label>

            {/* エラー */}
            {error && (
              <div
                style={{
                  fontSize: '11px',
                  color: '#dc2626',
                  textAlign: 'center',
                  marginTop: '10px',
                  lineHeight: 1.5,
                  padding: '6px 10px',
                  background: 'rgba(220,38,38,0.06)',
                  borderRadius: '6px',
                }}
              >
                {error}
              </div>
            )}

            {/* ログインボタン */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                marginTop: '22px',
                background: loading ? '#d1d5db' : 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
                color: 'white',
                fontWeight: 900,
                fontSize: '15px',
                padding: '15px',
                borderRadius: '10px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                transition: 'all 0.25s',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(34,197,94,0.3)',
                fontFamily: 'inherit',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.35 : 1,
              }}
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
        </div>

        {/* リンク */}
        <div
          style={{
            marginTop: '28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            animation: 'fadeUp 0.7s ease 0.32s both',
          }}
        >
          <Link
            href="/plans"
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#16a34a',
              textDecoration: 'none',
              letterSpacing: '0.03em',
              padding: '9px 22px',
              border: '1.5px solid #bbf7d0',
              borderRadius: '8px',
              background: '#f0fdf4',
              transition: 'all 0.2s',
            }}
          >
            新規会員登録
          </Link>
        </div>

        {/* 法的情報 */}
        <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', padding: '4px 24px 16px', lineHeight: 1.7, marginTop: '16px' }}>
          ログインすることで
          <Link href="#" style={{ color: '#22c55e', textDecoration: 'underline', textUnderlineOffset: '2px' }}>利用規約</Link>
          および
          <Link href="#" style={{ color: '#22c55e', textDecoration: 'underline', textUnderlineOffset: '2px' }}>プライバシーポリシー</Link>
          に同意します
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
