'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

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
    <div className="min-h-screen bg-white relative overflow-hidden flex flex-col">
      {/* Background decoration */}
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
      <div
        className="fixed pointer-events-none"
        style={{
          bottom: '-60px', left: '-60px',
          width: 'min(35vw, 280px)', height: 'min(35vw, 280px)',
          background: 'linear-gradient(145deg, #86efac, #4ade80)',
          borderRadius: '50%',
          opacity: 0.10,
          zIndex: 0,
        }}
      />
      <div
        className="fixed pointer-events-none opacity-[0.03]"
        style={{
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          zIndex: 0,
        }}
      />

      <div className="relative z-10 flex flex-col min-h-screen max-w-[640px] mx-auto w-full px-6">
        {/* Header area */}
        <div className="pt-16 pb-8 text-center">
          {/* Logo */}
          <div className="inline-flex items-center justify-center mb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                </svg>
              </div>
              <span className="text-3xl font-black tracking-tight text-[#1a1a1a]">
                スポ<span className="text-[#22c55e]">ミル</span>
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-400 font-medium mt-1">sports meal</p>
          <div className="mt-6">
            <h1 className="text-2xl font-black text-[#1a1a1a] leading-tight">
              勝つ体は、
              <br />
              <span className="text-[#22c55e]">食事から。</span>
            </h1>
            <p className="mt-2 text-xs text-gray-400">スポーツ栄養管理をもっとスマートに</p>
          </div>
        </div>

        {/* Login form */}
        <div className="flex-1 flex flex-col">
          <div className="bg-white rounded-[20px] shadow-lg border border-gray-100 p-6">
            <h2 className="text-base font-bold text-gray-800 mb-5">ログイン</h2>

            <form onSubmit={handleLogin} className="space-y-4">
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
                type={showPassword ? 'text' : 'password'}
                placeholder="パスワードを入力"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                leftIcon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                }
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
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

              <div className="text-right">
                <Link href="#" className="text-xs text-[#22c55e] hover:text-[#16a34a] font-medium">
                  パスワードを忘れた方
                </Link>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                className="mt-2"
              >
                {loading ? 'ログイン中...' : 'ログイン'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-400">
                アカウントをお持ちでない方は{' '}
                <Link href="/register" className="text-[#22c55e] font-semibold hover:text-[#16a34a]">
                  新規登録
                </Link>
              </p>
            </div>
          </div>

          {/* Demo note */}
          <div className="mt-4 p-3 bg-[#f0fdf4] rounded-xl border border-green-100 text-center">
            <p className="text-xs text-green-700">
              <span className="font-semibold">デモ版</span>で機能をお試しいただけます
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="py-8 text-center">
          <p className="text-[10px] text-gray-300">© 2025 スポミル. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
