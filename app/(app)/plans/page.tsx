'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Period = 'monthly' | 'quarterly' | 'semiannual' | 'annual'

const periodTabs: { key: Period; label: string; discount?: string }[] = [
  { key: 'monthly', label: '単月' },
  { key: 'quarterly', label: '3ヶ月', discount: '5%OFF' },
  { key: 'semiannual', label: '半年', discount: '10%OFF' },
  { key: 'annual', label: '1年', discount: '20%OFF' },
]

interface PlanData {
  id: string
  name: string
  color: string
  bgColor: string
  borderColor: string
  emoji: string
  popular?: boolean
  features: string[]
  prices: Record<Period, number>
}

const plans: PlanData[] = [
  {
    id: 'light',
    name: 'ライト',
    color: '#3b82f6',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
    emoji: '🌱',
    features: [
      'AI食事分析',
      '食事管理',
      '体組成管理',
      'トレーニング記録',
      'サプリメント管理',
    ],
    prices: {
      monthly: 615,
      quarterly: 1752,
      semiannual: 3321,
      annual: 5904,
    },
  },
  {
    id: 'standard',
    name: 'スタンダード',
    color: '#22c55e',
    bgColor: '#f0fdf4',
    borderColor: '#22c55e',
    emoji: '⚡',
    popular: true,
    features: [
      'AI食事分析',
      '食事管理',
      '体組成管理',
      'トレーニング記録',
      'サプリメント管理',
      '管理栄養士面談（月1回）',
    ],
    prices: {
      monthly: 2560,
      quarterly: 7296,
      semiannual: 13824,
      annual: 24576,
    },
  },
  {
    id: 'premium',
    name: 'プレミアム',
    color: '#f59e0b',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    emoji: '👑',
    features: [
      'AI食事分析',
      '食事管理',
      '体組成管理',
      'トレーニング記録',
      'サプリメント管理',
      '管理栄養士面談（月1回）',
      '管理栄養士面談（月2回）',
    ],
    prices: {
      monthly: 4540,
      quarterly: 12943,
      semiannual: 24516,
      annual: 43584,
    },
  },
]

const monthCount: Record<Period, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
}

export default function PlansPage() {
  const router = useRouter()
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('monthly')
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async (planId: string) => {
    setLoading(true)
    setSelectedPlan(planId)
    await new Promise((resolve) => setTimeout(resolve, 1200))
    setLoading(false)
    alert('Stripe checkout would open here')
  }

  return (
    <div
      style={{
        background: '#f3f4f6',
        minHeight: '100vh',
        fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",
        color: '#1a1a1a',
      }}
    >
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '20px 14px 80px' }}>

        {/* ロゴ＋タイトル */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: 900,
              }}
            >
              S
            </div>
            <span style={{ fontSize: '18px', fontWeight: 900, color: '#1a1a1a' }}>スポミル</span>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 900, margin: '0 0 4px', color: '#111827' }}>
            プランを選択
          </h1>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
            すべてのプランに2週間の無料トライアルつき
          </p>
        </div>

        {/* トライアルバッジ */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
            border: '1.5px solid #bbf7d0',
            borderRadius: '14px',
            padding: '14px 16px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '20px', flexShrink: 0 }}>🎁</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#16a34a', marginBottom: '3px' }}>
              2週間無料トライアル
            </div>
            <div style={{ fontSize: '11px', color: '#4b7a5c', lineHeight: 1.6 }}>
              クレジットカード登録不要。2週間は全機能を無料でお試しいただけます。
              期間終了後は自動的には課金されません。
            </div>
          </div>
        </div>

        {/* 期間タブ */}
        <div
          style={{
            display: 'flex',
            background: 'white',
            borderRadius: '14px',
            padding: '4px',
            marginBottom: '18px',
            border: '1px solid #e5e7eb',
            gap: '3px',
          }}
        >
          {periodTabs.map((tab) => {
            const active = selectedPeriod === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedPeriod(tab.key)}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  borderRadius: '10px',
                  background: active ? '#22c55e' : 'transparent',
                  color: active ? 'white' : '#6b7280',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '11px',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                <span>{tab.label}</span>
                {tab.discount && (
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 800,
                      background: active ? 'rgba(255,255,255,0.25)' : '#f0fdf4',
                      color: active ? 'white' : '#16a34a',
                      borderRadius: '20px',
                      padding: '1px 6px',
                    }}
                  >
                    {tab.discount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* プランカード */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {plans.map((plan) => {
            const totalPrice = plan.prices[selectedPeriod]
            const monthlyPrice = Math.round(totalPrice / monthCount[selectedPeriod])
            const isLoading = loading && selectedPlan === plan.id

            return (
              <div
                key={plan.id}
                style={{
                  background: 'white',
                  borderRadius: '18px',
                  border: plan.popular ? `2px solid ${plan.borderColor}` : '1.5px solid #e5e7eb',
                  boxShadow: plan.popular
                    ? '0 8px 32px rgba(34,197,94,0.15)'
                    : '0 2px 8px rgba(0,0,0,0.05)',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {/* 人気バッジ */}
                {plan.popular && (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: 800,
                      textAlign: 'center',
                      padding: '6px',
                      letterSpacing: '0.05em',
                    }}
                  >
                    ⭐ 人気No.1 · おすすめ
                  </div>
                )}

                <div style={{ padding: '18px 18px 16px' }}>
                  {/* プランヘッダー */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          background: plan.bgColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                        }}
                      >
                        {plan.emoji}
                      </div>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 900, color: '#111827' }}>
                          {plan.name}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: plan.color, lineHeight: 1 }}>
                        ¥{monthlyPrice.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>/月</div>
                      {selectedPeriod !== 'monthly' && (
                        <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                          合計 ¥{totalPrice.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 機能一覧 */}
                  <div style={{ marginBottom: '14px' }}>
                    {plan.features.map((feature) => (
                      <div
                        key={feature}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '4px 0',
                        }}
                      >
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: plan.bgColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={plan.color} strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                        <span style={{ fontSize: '12px', color: '#4b5563' }}>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTAボタン */}
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '13px',
                      borderRadius: '12px',
                      background: plan.popular
                        ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                        : 'transparent',
                      color: plan.popular ? 'white' : plan.color,
                      border: plan.popular ? 'none' : `2px solid ${plan.color}`,
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                      boxShadow: plan.popular ? '0 4px 16px rgba(34,197,94,0.3)' : 'none',
                      transition: 'all 0.2s',
                      opacity: isLoading ? 0.6 : 1,
                    }}
                  >
                    {isLoading ? '処理中...' : '2週間無料で始める →'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* 注記 */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ fontSize: '10px', color: '#9ca3af' }}>
            お支払いはStripeで安全に処理されます
          </p>
        </div>
      </div>
    </div>
  )
}
