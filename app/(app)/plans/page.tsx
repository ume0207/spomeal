'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Period = 1 | 3 | 6 | 12

const periodTabs: { key: Period; label: string; discount: string }[] = [
  { key: 1, label: '単月', discount: '通常' },
  { key: 3, label: '3ヶ月', discount: '5%OFF' },
  { key: 6, label: '半年', discount: '10%OFF' },
  { key: 12, label: '1年', discount: '20%OFF' },
]

const discountRate: Record<Period, number> = {
  1: 1,
  3: 0.95,
  6: 0.9,
  12: 0.8,
}

const basePrices = {
  light: 615,
  standard: 2560,
  premium: 4540,
}

const plansData = [
  {
    id: 'light',
    name: 'ライト',
    popular: false,
    features: [
      { text: 'AI食事データ分析機能', ok: true },
      { text: '食事記録・カロリー管理', ok: true },
      { text: '体組成記録', ok: true },
      { text: 'トレーニング記録', ok: true },
      { text: 'サプリメント管理', ok: true },
      { text: '管理栄養士オンライン面談', ok: false },
    ],
  },
  {
    id: 'standard',
    name: 'スタンダード',
    popular: true,
    features: [
      { text: 'AI食事データ分析機能', ok: true },
      { text: '食事記録・カロリー管理', ok: true },
      { text: '体組成記録', ok: true },
      { text: 'トレーニング記録', ok: true },
      { text: 'サプリメント管理', ok: true },
      { text: '管理栄養士オンライン面談（15分・月1回）', ok: true },
    ],
  },
  {
    id: 'premium',
    name: 'プレミアム',
    popular: false,
    features: [
      { text: 'AI食事データ分析機能', ok: true },
      { text: '食事記録・カロリー管理', ok: true },
      { text: '体組成記録', ok: true },
      { text: 'トレーニング記録', ok: true },
      { text: 'サプリメント管理', ok: true },
      { text: '管理栄養士オンライン面談（15分・月2回）', ok: true },
    ],
  },
]

function calcPrice(planId: string, period: Period): { monthly: number; total: number } {
  const base = basePrices[planId as keyof typeof basePrices]
  const rate = discountRate[period]
  const monthly = Math.round(base * rate)
  return { monthly, total: monthly * period }
}

export default function PlansPage() {
  const router = useRouter()
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(1)
  const [loading, setLoading] = useState<string | null>(null)

  const periodKey: Record<Period, string> = {
    1: 'monthly',
    3: 'quarterly',
    6: 'semiannual',
    12: 'annual',
  }

  const handleStartTrial = async (planId: string) => {
    setLoading(planId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, period: periodKey[selectedPeriod] }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('決済ページの取得に失敗しました。\n' + (data.error || 'もう一度お試しください。'))
        setLoading(null)
      }
    } catch (e) {
      alert('エラーが発生しました。もう一度お試しください。\n' + String(e))
      setLoading(null)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #0f1a2e 100%)',
        color: '#fff',
        fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",
      }}
    >
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '32px 16px 60px' }}>

        {/* ヘッダー */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#4ade80', letterSpacing: '2px', marginBottom: '8px' }}>
            スポミル
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'white', marginBottom: '4px', margin: '0 0 4px' }}>
            プランを選択
          </h1>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
            すべてのプランに2週間の無料トライアルつき
          </p>
        </div>

        {/* トライアルバッジ */}
        <div
          style={{
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.7,
            textAlign: 'center',
          }}
        >
          🎁 <strong>2週間無料トライアル</strong>でお試しいただけます。<br />
          トライアル終了後は選択プランで自動課金が開始されます。いつでも解約可能です。
        </div>

        {/* 期間タブ */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            marginBottom: '18px',
            background: 'rgba(255,255,255,0.07)',
            borderRadius: '12px',
            padding: '4px',
          }}
        >
          {periodTabs.map((tab) => {
            const isActive = selectedPeriod === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedPeriod(tab.key)}
                style={{
                  flex: 1,
                  padding: '8px 2px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
                  background: isActive ? '#22c55e' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1px',
                  boxShadow: isActive ? '0 2px 8px rgba(34,197,94,0.4)' : 'none',
                  fontFamily: 'inherit',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: isActive ? 'rgba(255,255,255,0.9)' : '#4ade80',
                  }}
                >
                  {tab.discount}
                </span>
              </button>
            )
          })}
        </div>

        {/* プランカード */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {plansData.map((plan) => {
            const { monthly, total } = calcPrice(plan.id, selectedPeriod)
            const isLoading = loading === plan.id
            return (
              <div
                key={plan.id}
                style={{
                  background: plan.popular ? 'rgba(245,158,11,0.05)' : 'rgba(255,255,255,0.05)',
                  border: plan.popular ? '1.5px solid rgba(245,158,11,0.5)' : '1.5px solid rgba(255,255,255,0.1)',
                  borderRadius: '18px',
                  padding: '20px',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {/* 人気バッジ */}
                {plan.popular && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-11px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'linear-gradient(90deg,#f59e0b,#fbbf24)',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '3px 14px',
                      borderRadius: '20px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ⭐ 人気No.1
                  </div>
                )}

                <div style={{ fontSize: '15px', fontWeight: 800, color: 'white', marginBottom: '6px' }}>
                  {plan.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '30px', fontWeight: 900, color: 'white' }}>
                    ¥{monthly.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>/月</span>
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginBottom: '14px' }}>
                  {selectedPeriod === 1
                    ? `毎月 ¥${monthly.toLocaleString()}（割引なし）`
                    : `${selectedPeriod}ヶ月合計 ¥${total.toLocaleString()}`}
                </div>

                {/* 機能リスト */}
                <ul style={{ listStyle: 'none', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {plan.features.map((feat, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: '12px',
                        color: feat.ok ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.28)',
                      }}
                    >
                      {feat.ok ? '✓' : '✗'} {feat.text}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleStartTrial(plan.id)}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '13px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 800,
                    background: plan.popular
                      ? 'linear-gradient(90deg,#f59e0b,#d97706)'
                      : 'linear-gradient(90deg,#22c55e,#16a34a)',
                    color: 'white',
                    border: 'none',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'filter 0.15s',
                    opacity: isLoading ? 0.6 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  {isLoading ? '処理中...' : '2週間無料で始める →'}
                </button>
              </div>
            )
          })}
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
          すでに登録済みの方は{' '}
          <Link href="/login" style={{ color: '#4ade80', textDecoration: 'underline' }}>
            ログインへ
          </Link>
        </p>
      </div>
    </div>
  )
}
