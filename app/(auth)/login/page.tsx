'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function ForgotPasswordLink() {
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [showInput, setShowInput] = useState(false)
  const [email, setEmail] = useState('')

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      // Resend経由でパスワードリセットメールを送信（信頼性が高い）
      await fetch('/api/auth/send-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } catch { /* エラーでも成功扱い（セキュリティ上） */ }
    setSent(true)
    setSending(false)
  }

  if (sent) {
    return (
      <div style={{ fontSize: '12px', color: '#16a34a', textAlign: 'center', marginTop: '4px' }}>
        ✅ パスワード再設定メールを送信しました
      </div>
    )
  }

  if (showInput) {
    return (
      <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '320px' }}>
        <input
          type="email"
          placeholder="登録済みのメールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1.5px solid #e5e7eb',
            fontSize: '13px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <button
          type="submit"
          disabled={sending}
          style={{
            background: 'linear-gradient(135deg, #22c55e, #15803d)',
            color: 'white',
            fontWeight: 700,
            fontSize: '13px',
            padding: '9px 22px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          {sending ? '送信中...' : '再設定メールを送る'}
        </button>
        <button type="button" onClick={() => setShowInput(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '12px', cursor: 'pointer' }}>
          キャンセル
        </button>
      </form>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setShowInput(true)}
      style={{
        background: 'none',
        border: 'none',
        color: '#6b7280',
        fontSize: '12px',
        cursor: 'pointer',
        textDecoration: 'underline',
        textUnderlineOffset: '2px',
        padding: 0,
      }}
    >
      パスワードをお忘れの方はこちら
    </button>
  )
}

function LoginForm() {
  const router = useRouter()
  const isPaid = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('paid') === 'true'
  const redirect = (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('redirect')) || '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isPreviewHost, setIsPreviewHost] = useState(false)

  // 保存済みのメールアドレスを読み込む
  useEffect(() => {
    const savedEmail = localStorage.getItem('spomeal_saved_email')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
    // プレビュー環境（*.pages.dev）：ページ表示後すぐ自動ログイン → /pet へ直行
    if (typeof window !== 'undefined' && window.location.hostname.endsWith('.pages.dev')) {
      setIsPreviewHost(true)
      // 既にセッションがあるかチェック → あれば即 /pet へ
      const supabase = createClient()
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session) {
          window.location.href = '/pet'
          return
        }
        // セッション無ければ自動でテストログイン → /pet
        setLoading(true)
        try {
          const r = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'pet-test@spomeal.jp', password: 'PetTest2026!' }),
          })
          if (r.ok) {
            const data = await r.json() as { success?: boolean; session?: { access_token: string; refresh_token: string } }
            if (data.success && data.session?.access_token) {
              await supabase.auth.setSession({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
              })
              window.location.href = '/pet'
              return
            }
          }
          // プロキシ失敗 → 直接ログインフォールバック
          const { error: signErr } = await supabase.auth.signInWithPassword({
            email: 'pet-test@spomeal.jp', password: 'PetTest2026!',
          })
          if (!signErr) {
            window.location.href = '/pet'
            return
          }
          setLoading(false)
        } catch {
          setLoading(false)
        }
      })
    }
  }, [])

  // プレビュー専用：ワンクリックでテストアカウントへログイン
  const handleTestLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const TEST_EMAIL = 'pet-test@spomeal.jp'
      const TEST_PASSWORD = 'PetTest2026!'

      // プロキシ経由
      let sessionData: { access_token: string; refresh_token: string } | null = null
      try {
        const proxyRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
        })
        if (proxyRes.ok) {
          const data = await proxyRes.json() as { success?: boolean; session?: { access_token: string; refresh_token: string } }
          if (data.success && data.session?.access_token) {
            sessionData = data.session
          }
        }
      } catch { /* fallback to direct */ }

      if (sessionData) {
        await supabase.auth.setSession({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
        })
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        })
        if (authError) {
          setError('テストログイン失敗：' + authError.message)
          setLoading(false)
          return
        }
      }

      window.location.href = '/dashboard'
    } catch (err) {
      setError('テストログイン中にエラー：' + String(err))
      setLoading(false)
    }
  }

  // 決済完了後にリダイレクトされてきた場合、すでにセッションがあればそのままダッシュボードへ
  useEffect(() => {
    if (!isPaid) return
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // サブスク状態の更新を少し待ってからリダイレクト（webhookの処理時間）
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1500)
      }
    })
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      // まずサーバーサイドプロキシ経由でログイン試行
      // （iOS 26.4 betaがsupabase.coに直接接続できない問題への対策）
      let sessionData: { access_token: string; refresh_token: string } | null = null

      try {
        const proxyRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })

        if (proxyRes.status === 401) {
          setError('メールアドレスまたはパスワードが正しくありません')
          setLoading(false)
          return
        }

        if (proxyRes.ok) {
          const data = await proxyRes.json() as { success?: boolean; session?: { access_token: string; refresh_token: string } }
          if (data.success && data.session?.access_token) {
            sessionData = data.session
          }
        }
      } catch {
        // プロキシが使えない場合は直接接続にフォールバック
      }

      if (sessionData) {
        // プロキシ経由成功: セッションをクライアントに設定
        await supabase.auth.setSession({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
        })
      } else {
        // フォールバック: 直接Supabase接続（タイムアウト付き）
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 15000)
        )
        const authPromise = supabase.auth.signInWithPassword({ email, password })
        const { error: authError } = await Promise.race([authPromise, timeoutPromise])

        if (authError) {
          setError('メールアドレスまたはパスワードが正しくありません')
          setLoading(false)
          return
        }
      }

      // ログイン情報を記憶する処理
      if (rememberMe) {
        localStorage.setItem('spomeal_saved_email', email)
      } else {
        localStorage.removeItem('spomeal_saved_email')
      }

      window.location.href = redirect
    } catch (err) {
      const isTimeout = err instanceof Error && err.message === 'timeout'
      setError(isTimeout
        ? '接続がタイムアウトしました。Wi-Fiまたは別のネットワークでお試しください。'
        : '通信エラーが発生しました。ネットワークを確認してください。')
      setLoading(false)
    }
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
            href="/admin/login/"
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

        {/* プレビュー専用：ワンクリックテストログイン */}
        {isPreviewHost && (
          <div
            style={{
              width: '100%',
              maxWidth: '380px',
              marginBottom: '20px',
              padding: '18px 18px 16px',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: '2px dashed #f59e0b',
              borderRadius: '14px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>
              🧪 プレビュー専用テスト環境
            </div>
            <div style={{ fontSize: '11px', color: '#a16207', marginBottom: '12px', lineHeight: 1.5 }}>
              ログイン情報なしで、テスト用アカウントでそのまま入れます
            </div>
            <button
              type="button"
              onClick={handleTestLogin}
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '14px',
                letterSpacing: '0.05em',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
              }}
            >
              {loading ? '入室中...' : '🍙 ワンクリックでテストログイン'}
            </button>
          </div>
        )}

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
            {isPaid && (
              <div style={{
                background: '#f0fdf4', border: '1.5px solid #22c55e', borderRadius: '12px',
                padding: '12px 16px', marginBottom: '16px', textAlign: 'center',
                fontSize: '14px', color: '#16a34a', fontWeight: 700,
              }}>
                ✅ 決済が完了しました！ログインしてご利用ください。
              </div>
            )}
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
            href="/register"
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
          <ForgotPasswordLink />
        </div>

        {/* 法的情報 */}
        <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', padding: '4px 24px 16px', lineHeight: 1.7, marginTop: '16px' }}>
          ログインすることで
          <Link href="/terms" style={{ color: '#22c55e', textDecoration: 'underline', textUnderlineOffset: '2px' }}>利用規約</Link>
          および
          <Link href="/privacy" style={{ color: '#22c55e', textDecoration: 'underline', textUnderlineOffset: '2px' }}>プライバシーポリシー</Link>
          に同意します
        </div>
      </div>

    </div>
  )
}

export default function LoginPage() {
  return <LoginForm />
}
