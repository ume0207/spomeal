'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const inputStyle = {
  width: '100%',
  background: '#f9fafb',
  border: '1.5px solid #e5e7eb',
  borderRadius: '10px',
  padding: '11px 14px',
  color: '#111827',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box' as const,
  transition: 'all 0.2s',
}

const labelStyle = {
  fontSize: '11px',
  fontWeight: 600 as const,
  color: '#374151',
  display: 'block' as const,
  marginBottom: '5px',
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
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

    router.push('/plans')
  }

  const focusStyle = {
    borderColor: '#22c55e',
    background: '#f0fdf4',
    boxShadow: '0 0 0 3px rgba(34,197,94,0.1)',
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
      {/* 背景装飾 */}
      <div
        style={{
          position: 'fixed',
          top: '-80px',
          right: '-80px',
          width: 'min(55vw, 420px)',
          height: 'min(55vw, 420px)',
          background: 'linear-gradient(145deg, #4ade80, #22c55e, #16a34a)',
          borderRadius: '50%',
          opacity: 0.12,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '640px',
          margin: '0 auto',
          padding: '32px 20px 60px',
        }}
      >
        {/* 戻るリンク */}
        <Link
          href="/login"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#9ca3af',
            textDecoration: 'none',
            fontSize: '13px',
            marginBottom: '20px',
          }}
        >
          ← ログインに戻る
        </Link>

        {/* ロゴ */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '16px',
                fontWeight: 900,
              }}
            >
              S
            </div>
            <span style={{ fontSize: '22px', fontWeight: 900, color: '#1a1a1a' }}>
              スポミル
            </span>
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>
            📝 新規会員登録
          </h1>
          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
            スポーツ栄養管理を始めましょう
          </p>
        </div>

        {/* フォームカード */}
        <div
          style={{
            background: '#ffffff',
            border: '1.5px solid #e5e7eb',
            borderTop: '3px solid #22c55e',
            borderRadius: '18px',
            padding: '28px 24px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.07)',
          }}
        >
          <form onSubmit={handleRegister}>
            {/* 基本情報 */}
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: '#22c55e',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  marginBottom: '12px',
                  paddingBottom: '6px',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                基本情報
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="氏名" required>
                  <input
                    type="text"
                    placeholder="山田 太郎"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={inputStyle}
                    onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb'
                      e.target.style.background = '#f9fafb'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </Field>
                <Field label="フリガナ">
                  <input
                    type="text"
                    placeholder="ヤマダ タロウ"
                    value={furigana}
                    onChange={(e) => setFurigana(e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb'
                      e.target.style.background = '#f9fafb'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </Field>
                <Field label="生年月日">
                  <input
                    type="date"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb'
                      e.target.style.background = '#f9fafb'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </Field>
                <Field label="性別">
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb'
                      e.target.style.background = '#f9fafb'
                      e.target.style.boxShadow = 'none'
                    }}
                  >
                    <option value="">選択してください</option>
                    <option value="male">男性</option>
                    <option value="female">女性</option>
                    <option value="other">その他</option>
                  </select>
                </Field>
              </div>
            </div>

            {/* 所属 */}
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: '#22c55e',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  marginBottom: '12px',
                  paddingBottom: '6px',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                所属
              </div>
              <Field label="所属チーム名" required>
                <input
                  type="text"
                  placeholder="○○高校サッカー部"
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  required
                  style={inputStyle}
                  onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb'
                    e.target.style.background = '#f9fafb'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </Field>
            </div>

            {/* 連絡先 */}
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: '#22c55e',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  marginBottom: '12px',
                  paddingBottom: '6px',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                連絡先
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="電話番号">
                  <input
                    type="tel"
                    placeholder="090-0000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb'
                      e.target.style.background = '#f9fafb'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </Field>
                <Field label="メールアドレス" required>
                  <input
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    style={inputStyle}
                    onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb'
                      e.target.style.background = '#f9fafb'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </Field>
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field label="住所">
                    <input
                      type="text"
                      placeholder="東京都○○区..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      style={inputStyle}
                      onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb'
                        e.target.style.background = '#f9fafb'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                  </Field>
                </div>
                <Field label="LINE ID">
                  <input
                    type="text"
                    placeholder="line_id_here"
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb'
                      e.target.style.background = '#f9fafb'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </Field>
              </div>
            </div>

            {/* その他 */}
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: '#22c55e',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  marginBottom: '12px',
                  paddingBottom: '6px',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                その他
              </div>
              <Field label="メモ（アレルギー等）">
                <textarea
                  placeholder="アレルギー・食事制限など"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  rows={3}
                  style={{
                    ...inputStyle,
                    resize: 'vertical' as const,
                  }}
                  onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb'
                    e.target.style.background = '#f9fafb'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </Field>
            </div>

            {/* ログイン情報 */}
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: '#22c55e',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  marginBottom: '12px',
                  paddingBottom: '6px',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                ログイン情報
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="パスワード" required>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="8文字以上"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      style={{ ...inputStyle, paddingRight: '40px' }}
                      onFocus={(e) => Object.assign(e.target.style, focusStyle)}
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
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: '13px',
                      }}
                    >
                      {showPassword ? '🙈' : '👁'}
                    </button>
                  </div>
                </Field>
                <Field label="確認パスワード" required>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="再入力"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      style={{ ...inputStyle, paddingRight: '40px' }}
                      onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb'
                        e.target.style.background = '#f9fafb'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: '13px',
                      }}
                    >
                      {showConfirm ? '🙈' : '👁'}
                    </button>
                  </div>
                </Field>
              </div>
            </div>

            {/* エラー */}
            {error && (
              <div
                style={{
                  fontSize: '12px',
                  color: '#dc2626',
                  textAlign: 'center',
                  marginBottom: '12px',
                  padding: '8px 12px',
                  background: 'rgba(220,38,38,0.06)',
                  borderRadius: '8px',
                }}
              >
                {error}
              </div>
            )}

            {/* 同意文 */}
            <p style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', marginBottom: '14px', lineHeight: 1.7 }}>
              登録することで、
              <Link href="#" style={{ color: '#22c55e' }}>利用規約</Link>
              および
              <Link href="#" style={{ color: '#22c55e' }}>プライバシーポリシー</Link>
              に同意します
            </p>

            {/* 登録ボタン */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: loading ? '#d1d5db' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: 'white',
                fontWeight: 900,
                fontSize: '15px',
                padding: '15px',
                borderRadius: '12px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(34,197,94,0.3)',
                transition: 'all 0.25s',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? '登録中...' : '会員登録する →'}
            </button>
          </form>

          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: '#9ca3af' }}>
              すでにアカウントをお持ちの方は{' '}
              <Link href="/login" style={{ color: '#22c55e', fontWeight: 700, textDecoration: 'none' }}>
                ログイン
              </Link>
            </p>
          </div>
        </div>

        <div style={{ paddingTop: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '10px', color: '#d1d5db' }}>© 2025 スポミル. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
