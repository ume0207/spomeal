'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // フォームデータ
  const [name, setName] = useState('')
  const [furigana, setFurigana] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [gender, setGender] = useState('')
  const [team, setTeam] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [lineId, setLineId] = useState('')
  const [memo, setMemo] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      return
    }
    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          furigana,
          birthdate,
          gender,
          team,
          phone,
          address,
          line_id: lineId,
          memo,
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: 'white',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '4px',
    display: 'block',
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0b0f1a',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 20px 60px',
        position: 'relative',
        zIndex: 1,
        fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",
      }}
    >
      {/* ヘッダー */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div
          style={{
            fontSize: '36px',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #ffffff 0%, #a7f3d0 50%, #22c55e 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '6px',
          }}
        >
          スポミル
        </div>
        <p style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
          📝 新規会員登録
        </p>
      </div>

      {!success ? (
        /* 登録フォームカード */
        <div
          style={{
            width: '100%',
            maxWidth: '480px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '28px 24px',
          }}
        >
          <form onSubmit={handleRegister}>
            {/* 基本情報 */}
            <div
              style={{
                fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.1em', textTransform: 'uppercase',
                margin: '0 0 10px', paddingBottom: '6px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              基本情報
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>氏名<span style={{ color: '#f87171', marginLeft: '2px' }}>*</span></label>
                <input
                  className="reg-input"
                  type="text"
                  placeholder="山田 太郎"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>フリガナ</label>
                <input
                  className="reg-input"
                  type="text"
                  placeholder="ヤマダ タロウ"
                  value={furigana}
                  onChange={(e) => setFurigana(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>生年月日</label>
                <input
                  className="reg-input"
                  type="date"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>性別</label>
                <select
                  className="reg-select"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="">選択してください</option>
                  <option value="男性">男性</option>
                  <option value="女性">女性</option>
                  <option value="その他">その他</option>
                  <option value="回答しない">回答しない</option>
                </select>
              </div>
            </div>

            {/* 所属・チーム */}
            <div
              style={{
                fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.1em', textTransform: 'uppercase',
                margin: '18px 0 10px', paddingBottom: '6px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              所属・チーム
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>所属チーム名<span style={{ color: '#f87171', marginLeft: '2px' }}>*</span></label>
              <input
                className="reg-input"
                type="text"
                placeholder="例：〇〇高校サッカー部、△△FC"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            {/* 連絡先 */}
            <div
              style={{
                fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.1em', textTransform: 'uppercase',
                margin: '18px 0 10px', paddingBottom: '6px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              連絡先
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>電話番号</label>
                <input
                  className="reg-input"
                  type="tel"
                  placeholder="090-0000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>メールアドレス</label>
                <input
                  className="reg-input"
                  type="email"
                  placeholder="example@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                  style={inputStyle}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>住所</label>
                <input
                  className="reg-input"
                  type="text"
                  placeholder="東京都〇〇区..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>LINE ID</label>
                <input
                  className="reg-input"
                  type="text"
                  placeholder="line_id_example"
                  value={lineId}
                  onChange={(e) => setLineId(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* その他 */}
            <div
              style={{
                fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.1em', textTransform: 'uppercase',
                margin: '18px 0 10px', paddingBottom: '6px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              その他
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>メモ・備考（アレルギー、特記事項など）</label>
              <input
                className="reg-input"
                type="text"
                placeholder="食物アレルギー、持病など"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* ログイン情報 */}
            <div
              style={{
                fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.1em', textTransform: 'uppercase',
                margin: '18px 0 10px', paddingBottom: '6px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              🔑 ログイン情報
            </div>
            <div style={{ marginBottom: '10px' }}>
              <p
                style={{
                  fontSize: '11px', color: 'rgba(74,222,128,0.8)', marginBottom: '10px',
                  background: 'rgba(34,197,94,0.1)', borderRadius: '8px', padding: '8px 12px',
                }}
              >
                📧 上記のメールアドレスがログインIDになります
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>パスワード<span style={{ color: '#f87171', marginLeft: '2px' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="reg-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="6文字以上"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    style={{ ...inputStyle, paddingRight: '36px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: '10px', top: '50%',
                      transform: 'translateY(-50%)', background: 'none',
                      border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 0, lineHeight: 1,
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
              <div>
                <label style={labelStyle}>パスワード確認<span style={{ color: '#f87171', marginLeft: '2px' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="reg-input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="もう一度入力"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    style={{ ...inputStyle, paddingRight: '36px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute', right: '10px', top: '50%',
                      transform: 'translateY(-50%)', background: 'none',
                      border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 0, lineHeight: 1,
                    }}
                  >
                    {showConfirmPassword ? (
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
            </div>

            {/* エラー */}
            {error && (
              <div
                style={{
                  fontSize: '12px', color: '#f87171', textAlign: 'center',
                  marginBottom: '12px', padding: '8px 12px',
                  background: 'rgba(239,68,68,0.1)', borderRadius: '8px',
                  border: '1px solid rgba(239,68,68,0.3)',
                }}
              >
                {error}
              </div>
            )}

            {/* 登録ボタン */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                marginTop: '20px',
                background: loading ? 'rgba(34,197,94,0.4)' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: 'white',
                fontWeight: 800,
                fontSize: '16px',
                padding: '14px',
                borderRadius: '12px',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(34,197,94,0.3)',
                transition: 'all 0.25s',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {loading ? '登録中...' : '会員登録する →'}
            </button>
          </form>
        </div>
      ) : (
        /* 成功画面 */
        <div
          style={{
            width: '100%',
            maxWidth: '480px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '28px 24px',
          }}
        >
          <div style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
            <p style={{ fontSize: '22px', fontWeight: 900, color: '#4ade80', marginBottom: '8px' }}>
              登録完了！
            </p>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '24px' }}>
              会員登録が完了しました。<br />
              ログインページからお入りください。
            </p>
            <Link
              href="/login"
              style={{
                display: 'inline-block',
                padding: '12px 32px',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: 'white',
                fontWeight: 800,
                borderRadius: '12px',
                fontSize: '15px',
                textDecoration: 'none',
              }}
            >
              ログインページへ →
            </Link>
          </div>
        </div>
      )}

      <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
        すでに登録済みの方は{' '}
        <Link href="/login" style={{ color: 'rgba(255,255,255,0.5)' }}>ログインへ</Link>
      </p>
    </div>
  )
}
