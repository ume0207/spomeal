'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
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

  if (success) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">登録完了！</h2>
          <p className="text-sm text-gray-500 mb-6">
            確認メールを送信しました。
            <br />
            メールを確認してアカウントを有効化してください。
          </p>
          <Button variant="primary" fullWidth onClick={() => router.push('/login')}>
            ログインページへ
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden flex flex-col">
      <div
        className="fixed pointer-events-none"
        style={{
          top: '-80px', right: '-80px',
          width: 'min(55vw, 420px)', height: 'min(55vw, 420px)',
          background: 'linear-gradient(145deg, #4ade80, #22c55e, #16a34a)',
          borderRadius: '50%',
          opacity: 0.12,
          zIndex: 0,
        }}
      />

      <div className="relative z-10 flex flex-col min-h-screen max-w-[640px] mx-auto w-full px-6">
        <div className="pt-12 pb-6 text-center">
          <Link href="/login" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-600 text-sm mb-6">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            ログインに戻る
          </Link>

          <div className="inline-flex items-center gap-2 justify-center">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
              </svg>
            </div>
            <span className="text-2xl font-black text-[#1a1a1a]">
              スポ<span className="text-[#22c55e]">ミル</span>
            </span>
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-800">新規会員登録</h1>
          <p className="mt-1 text-xs text-gray-400">スポーツ栄養管理を始めましょう</p>
        </div>

        <div className="bg-white rounded-[20px] shadow-lg border border-gray-100 p-6">
          <form onSubmit={handleRegister} className="space-y-4">
            <Input
              label="お名前"
              type="text"
              placeholder="山田 太郎"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              leftIcon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              }
            />

            <Input
              label="メールアドレス"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              leftIcon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              }
            />

            <Input
              label="パスワード"
              type="password"
              placeholder="8文字以上"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              leftIcon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              }
            />

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <div className="pt-1">
              <p className="text-[10px] text-gray-400 text-center mb-3">
                登録することで、
                <Link href="#" className="text-[#22c55e]">利用規約</Link>
                および
                <Link href="#" className="text-[#22c55e]">プライバシーポリシー</Link>
                に同意します
              </p>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
              >
                {loading ? '登録中...' : '無料で始める'}
              </Button>
            </div>
          </form>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">
              すでにアカウントをお持ちの方は{' '}
              <Link href="/login" className="text-[#22c55e] font-semibold hover:text-[#16a34a]">
                ログイン
              </Link>
            </p>
          </div>
        </div>

        <div className="py-8 text-center">
          <p className="text-[10px] text-gray-300">© 2025 スポミル. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
