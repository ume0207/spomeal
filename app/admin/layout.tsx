'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const navItems = [
  { href: '/admin', label: 'ダッシュボード', tutorialId: 'admin-dashboard' },
  { href: '/admin/members', label: 'メンバー', tutorialId: 'admin-members' },
  { href: '/admin/calendar', label: '予約カレンダー', tutorialId: 'admin-calendar' },
  { href: '/admin/schedule', label: 'スケジュール', tutorialId: 'admin-schedule' },
  { href: '/admin/staff', label: 'スタッフ', tutorialId: 'admin-staff' },
  { href: '/admin/shift', label: 'シフト', tutorialId: 'admin-shift' },
]

interface AdminSession {
  name: string
  email: string
  loggedIn: boolean
  isFirstLogin?: boolean
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [session, setSession] = useState<AdminSession | null>(null)
  const [checked, setChecked] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)

  // ログインページの場合はガードをスキップ
  const isLoginPage = pathname === '/admin/login' || pathname === '/admin/login/'

  useEffect(() => {
    if (isLoginPage) {
      setChecked(true)
      return
    }

    const stored = localStorage.getItem('spomeal_admin_session')
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AdminSession
        if (parsed.loggedIn) {
          setSession(parsed)
          // チュートリアルチェック
          const tutorialStatus = localStorage.getItem('spomeal_admin_tutorial')
          if (tutorialStatus === 'pending') {
            setShowTutorial(true)
          }
          setChecked(true)
          return
        }
      } catch { /* invalid JSON */ }
    }
    // 未ログイン → ログインページへ
    router.replace('/admin/login')
    setChecked(true)
  }, [isLoginPage, router])

  const handleLogout = () => {
    localStorage.removeItem('spomeal_admin_session')
    setSession(null)
    router.replace('/admin/login')
  }

  // チュートリアルステップ定義
  const tutorialSteps = [
    {
      targetId: 'admin-dashboard',
      title: 'ダッシュボード',
      desc: '会員の食事記録・体組成フィード、売上統計、栄養士コメントなどを一覧で確認できます。ここが管理の中心です。',
      position: 'bottom' as const,
    },
    {
      targetId: 'admin-members',
      title: 'メンバー管理',
      desc: '全会員の一覧を表示し、個別の食事記録・体組成・目標・コメント履歴を確認できます。会員の詳細ページにもアクセスできます。',
      position: 'bottom' as const,
    },
    {
      targetId: 'admin-calendar',
      title: '予約カレンダー',
      desc: '会員からの予約をカレンダー形式で確認・管理できます。Google Calendarとも連携可能です。',
      position: 'bottom' as const,
    },
    {
      targetId: 'admin-schedule',
      title: 'スケジュール',
      desc: '施設の営業スケジュールや予約枠の設定を行います。曜日ごとの営業時間や定休日を管理できます。',
      position: 'bottom' as const,
    },
    {
      targetId: 'admin-staff',
      title: 'スタッフ管理',
      desc: 'スタッフの登録・編集を行います。担当者ごとの情報を一元管理できます。',
      position: 'bottom' as const,
    },
    {
      targetId: 'admin-shift',
      title: 'シフト管理',
      desc: 'スタッフのシフトを管理します。週間・月間のシフト表を作成・確認できます。',
      position: 'bottom' as const,
    },
    {
      targetId: 'admin-logout',
      title: 'ログアウト',
      desc: '管理画面からログアウトします。再度ログインする場合は名前・メール・パスワードが必要です。',
      position: 'bottom' as const,
    },
    {
      targetId: 'admin-back',
      title: 'アプリに戻る',
      desc: '会員向けのアプリ画面に切り替えます。会員としての画面を確認したい時に使います。',
      position: 'bottom' as const,
    },
  ]

  const handleTutorialNext = () => {
    if (tutorialStep < tutorialSteps.length - 1) {
      setTutorialStep(tutorialStep + 1)
    } else {
      // チュートリアル完了
      setShowTutorial(false)
      setTutorialStep(0)
      localStorage.setItem('spomeal_admin_tutorial', 'done')
    }
  }

  const handleTutorialSkip = () => {
    setShowTutorial(false)
    setTutorialStep(0)
    localStorage.setItem('spomeal_admin_tutorial', 'done')
  }

  // ログインページはそのまま表示
  if (isLoginPage) {
    return <>{children}</>
  }

  // ログインチェック中
  if (!checked) {
    return (
      <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#6b7280', fontSize: '14px' }}>読み込み中...</div>
      </div>
    )
  }

  // 未ログイン（リダイレクト中）
  if (!session) return null

  const currentStep = tutorialSteps[tutorialStep]

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif" }}>
      {/* チュートリアルオーバーレイ */}
      {showTutorial && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 9998,
          background: 'rgba(0,0,0,0.55)',
          pointerEvents: 'auto',
        }} />
      )}

      {/* Admin top nav */}
      <nav style={{ background: '#1a1a1a', color: 'white', padding: '0 16px', position: 'relative', zIndex: showTutorial ? 9999 : 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '52px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            <Link
              href="/admin"
              style={{ fontSize: '15px', fontWeight: 900, color: 'white', textDecoration: 'none', whiteSpace: 'nowrap', marginRight: '8px', flexShrink: 0 }}
            >
              スポ<span style={{ color: '#22c55e' }}>ミル</span>
              <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '6px', fontWeight: 400 }}>Admin</span>
            </Link>
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
              const isTutorialTarget = showTutorial && currentStep?.targetId === item.tutorialId
              return (
                <div key={item.href} style={{ position: 'relative' }} data-tutorial={item.tutorialId}>
                  <Link
                    href={item.href}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 400,
                      color: isActive ? 'white' : '#9ca3af',
                      background: isTutorialTarget ? 'rgba(34,197,94,0.3)' : isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      transition: 'all 0.12s',
                      position: 'relative',
                      zIndex: isTutorialTarget ? 10000 : 'auto',
                      boxShadow: isTutorialTarget ? '0 0 0 3px rgba(34,197,94,0.5)' : 'none',
                    }}
                  >
                    {item.label}
                  </Link>
                  {/* チュートリアル吹き出し */}
                  {isTutorialTarget && (
                    <TutorialTooltip
                      step={tutorialStep}
                      total={tutorialSteps.length}
                      title={currentStep.title}
                      desc={currentStep.desc}
                      onNext={handleTutorialNext}
                      onSkip={handleTutorialSkip}
                    />
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            {/* 管理者名表示 */}
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>
              {session.name}
            </span>
            {/* ログアウト */}
            <div style={{ position: 'relative' }} data-tutorial="admin-logout">
              <button
                onClick={handleLogout}
                style={{
                  fontSize: '11px', color: '#ef4444', background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px',
                  padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit',
                  position: 'relative',
                  zIndex: showTutorial && currentStep?.targetId === 'admin-logout' ? 10000 : 'auto',
                  boxShadow: showTutorial && currentStep?.targetId === 'admin-logout' ? '0 0 0 3px rgba(34,197,94,0.5)' : 'none',
                }}
              >
                ログアウト
              </button>
              {showTutorial && currentStep?.targetId === 'admin-logout' && (
                <TutorialTooltip
                  step={tutorialStep}
                  total={tutorialSteps.length}
                  title={currentStep.title}
                  desc={currentStep.desc}
                  onNext={handleTutorialNext}
                  onSkip={handleTutorialSkip}
                />
              )}
            </div>
            {/* アプリに戻る */}
            <div style={{ position: 'relative' }} data-tutorial="admin-back">
              <Link
                href="/dashboard"
                style={{
                  fontSize: '11px', color: '#9ca3af', textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: '4px',
                  position: 'relative',
                  zIndex: showTutorial && currentStep?.targetId === 'admin-back' ? 10000 : 'auto',
                  boxShadow: showTutorial && currentStep?.targetId === 'admin-back' ? '0 0 0 3px rgba(34,197,94,0.5)' : 'none',
                  padding: '4px 8px', borderRadius: '6px',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                アプリに戻る
              </Link>
              {showTutorial && currentStep?.targetId === 'admin-back' && (
                <TutorialTooltip
                  step={tutorialStep}
                  total={tutorialSteps.length}
                  title={currentStep.title}
                  desc={currentStep.desc}
                  onNext={handleTutorialNext}
                  onSkip={handleTutorialSkip}
                />
              )}
            </div>
          </div>
        </div>
      </nav>
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
        {children}
      </main>
    </div>
  )
}

/* ========== チュートリアル吹き出しコンポーネント ========== */
function TutorialTooltip({
  step, total, title, desc, onNext, onSkip,
}: {
  step: number; total: number; title: string; desc: string;
  onNext: () => void; onSkip: () => void;
}) {
  const isLast = step === total - 1
  return (
    <div style={{
      position: 'absolute',
      top: 'calc(100% + 12px)',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '300px',
      background: 'white',
      borderRadius: '16px',
      padding: '20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      zIndex: 10001,
      pointerEvents: 'auto',
    }}>
      {/* 三角 */}
      <div style={{
        position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
        borderBottom: '8px solid white',
      }} />

      {/* ステップ表示 */}
      <div style={{
        fontSize: '11px', color: '#22c55e', fontWeight: 700,
        marginBottom: '6px',
      }}>
        STEP {step + 1} / {total}
      </div>

      {/* タイトル */}
      <div style={{
        fontSize: '16px', fontWeight: 800, color: '#111827',
        marginBottom: '8px',
      }}>
        {title}
      </div>

      {/* 説明 */}
      <div style={{
        fontSize: '13px', color: '#6b7280', lineHeight: 1.7,
        marginBottom: '16px',
      }}>
        {desc}
      </div>

      {/* ドットインジケータ */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '14px' }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            width: i === step ? '18px' : '6px', height: '6px',
            borderRadius: '3px',
            background: i === step ? '#22c55e' : '#e5e7eb',
            transition: 'all 0.3s',
          }} />
        ))}
      </div>

      {/* ボタン */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onSkip}
          style={{
            flex: 1, padding: '10px', border: '1px solid #e5e7eb',
            borderRadius: '10px', background: 'white', color: '#6b7280',
            fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          スキップ
        </button>
        <button
          onClick={onNext}
          style={{
            flex: 1, padding: '10px', border: 'none',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: 'white',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 2px 8px rgba(34,197,94,0.3)',
          }}
        >
          {isLast ? '完了！' : '次へ →'}
        </button>
      </div>
    </div>
  )
}
