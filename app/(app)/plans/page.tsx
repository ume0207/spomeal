'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

type Period = 'monthly' | 'quarterly' | 'semiannual' | 'annual'

interface PlanPrice {
  amount: number
  label: string
  period: string
}

interface Plan {
  id: string
  name: string
  nameEn: string
  description: string
  features: string[]
  prices: Record<Period, PlanPrice>
  popular?: boolean
  color: string
  bgColor: string
}

const plans: Plan[] = [
  {
    id: 'light',
    name: 'ライト',
    nameEn: 'Light',
    description: '基本的な食事管理機能',
    color: '#3b82f6',
    bgColor: '#eff6ff',
    features: [
      '食事記録（1日3食）',
      'カロリー管理',
      'PFC自動計算',
      '週次レポート',
    ],
    prices: {
      monthly: { amount: 980, label: '月額', period: 'monthly' },
      quarterly: { amount: 2646, label: '3ヶ月', period: 'quarterly' },
      semiannual: { amount: 4900, label: '半年', period: 'semiannual' },
      annual: { amount: 8820, label: '年間', period: 'annual' },
    },
  },
  {
    id: 'standard',
    name: 'スタンダード',
    nameEn: 'Standard',
    description: '本格的なスポーツ栄養管理',
    color: '#22c55e',
    bgColor: '#f0fdf4',
    popular: true,
    features: [
      '食事記録（無制限）',
      'カロリー・PFC管理',
      '体組成トラッキング',
      'トレーニング記録',
      'サプリメント管理',
      '月次詳細レポート',
    ],
    prices: {
      monthly: { amount: 1980, label: '月額', period: 'monthly' },
      quarterly: { amount: 5346, label: '3ヶ月', period: 'quarterly' },
      semiannual: { amount: 9900, label: '半年', period: 'semiannual' },
      annual: { amount: 17820, label: '年間', period: 'annual' },
    },
  },
  {
    id: 'premium',
    name: 'プレミアム',
    nameEn: 'Premium',
    description: 'AIサポート付き完全管理',
    color: '#f59e0b',
    bgColor: '#fffbeb',
    features: [
      'スタンダードの全機能',
      'AI食事写真解析',
      'パーソナル栄養アドバイス',
      '専属トレーナーサポート',
      '優先カスタマーサポート',
      '詳細分析ダッシュボード',
    ],
    prices: {
      monthly: { amount: 3980, label: '月額', period: 'monthly' },
      quarterly: { amount: 10746, label: '3ヶ月', period: 'quarterly' },
      semiannual: { amount: 19900, label: '半年', period: 'semiannual' },
      annual: { amount: 35820, label: '年間', period: 'annual' },
    },
  },
]

const periodLabels: Record<Period, { label: string; discount?: string }> = {
  monthly: { label: '月払い' },
  quarterly: { label: '3ヶ月', discount: '10%OFF' },
  semiannual: { label: '半年', discount: '17%OFF' },
  annual: { label: '年払い', discount: '25%OFF' },
}

function formatPrice(amount: number, period: Period): string {
  const monthlyEquiv: Record<Period, number> = {
    monthly: 1,
    quarterly: 3,
    semiannual: 6,
    annual: 12,
  }
  return `¥${(amount / monthlyEquiv[period]).toLocaleString()}`
}

export default function PlansPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('monthly')
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async (planId: string) => {
    setLoading(true)
    setSelectedPlan(planId)
    // In production, this would call /api/stripe/checkout
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setLoading(false)
    alert('Stripe checkout would open here')
  }

  return (
    <div className="flex flex-col">
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div>
          <h1 className="text-lg font-black text-gray-900">プラン・料金</h1>
          <p className="text-xs text-gray-400 mt-0.5">あなたに合ったプランを選んでください</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Current plan badge */}
        <div className="flex items-center gap-3 p-3 bg-[#f0fdf4] rounded-xl border border-green-200">
          <div className="w-8 h-8 bg-[#22c55e] rounded-lg flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <div className="text-xs font-bold text-[#16a34a]">現在のプラン：無料トライアル</div>
            <div className="text-[10px] text-gray-500">14日間の無料期間中です</div>
          </div>
        </div>

        {/* Period selector */}
        <div className="bg-gray-100 p-1 rounded-2xl flex gap-1">
          {(Object.entries(periodLabels) as [Period, { label: string; discount?: string }][]).map(([period, info]) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex flex-col items-center gap-0.5 ${
                selectedPeriod === period
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span>{info.label}</span>
              {info.discount && (
                <span className={`text-[9px] font-bold px-1 rounded ${
                  selectedPeriod === period ? 'text-[#22c55e]' : 'text-gray-400'
                }`}>
                  {info.discount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Plan cards */}
        <div className="space-y-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-[20px] border-2 overflow-hidden transition-all ${
                plan.popular
                  ? 'border-[#22c55e] shadow-lg shadow-green-100'
                  : 'border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-[#22c55e] text-white text-[10px] font-bold text-center py-1">
                  ⭐ 人気No.1 · おすすめ
                </div>
              )}

              <div className={`p-4 ${plan.popular ? 'pt-8' : ''}`}>
                {/* Plan header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: plan.bgColor }}
                      >
                        <span className="text-base">
                          {plan.id === 'light' ? '🌱' : plan.id === 'standard' ? '⚡' : '👑'}
                        </span>
                      </div>
                      <div>
                        <div className="text-base font-black text-gray-900">{plan.name}</div>
                        <div className="text-[10px] text-gray-400">{plan.nameEn}</div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">{plan.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black" style={{ color: plan.color }}>
                      {formatPrice(plan.prices[selectedPeriod].amount, selectedPeriod)}
                    </div>
                    <div className="text-[10px] text-gray-400">/月</div>
                    {selectedPeriod !== 'monthly' && (
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        合計 ¥{plan.prices[selectedPeriod].amount.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-1.5 mb-4">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: plan.bgColor }}
                      >
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={plan.color} strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                      <span className="text-xs text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading && selectedPlan === plan.id}
                  className={`w-full py-3 rounded-2xl text-sm font-bold transition-all ${
                    plan.popular
                      ? 'bg-[#22c55e] text-white hover:bg-[#16a34a] shadow-sm'
                      : 'border-2 hover:opacity-80'
                  }`}
                  style={
                    !plan.popular
                      ? { borderColor: plan.color, color: plan.color }
                      : undefined
                  }
                >
                  {loading && selectedPlan === plan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      処理中...
                    </span>
                  ) : (
                    `${plan.name}プランを始める`
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <Card>
          <h2 className="text-sm font-bold text-gray-800 mb-3">よくある質問</h2>
          <div className="space-y-3">
            {[
              { q: 'いつでも解約できますか？', a: 'はい、いつでも解約可能です。解約後は次回更新日まで利用できます。' },
              { q: '無料トライアルはありますか？', a: '14日間の無料トライアルをご利用いただけます。クレジットカード不要です。' },
              { q: 'プランの変更はできますか？', a: 'いつでもプランのアップグレード・ダウングレードが可能です。' },
            ].map((faq, i) => (
              <div key={i} className="border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                <div className="text-xs font-semibold text-gray-800 mb-1">Q. {faq.q}</div>
                <div className="text-xs text-gray-500">A. {faq.a}</div>
              </div>
            ))}
          </div>
        </Card>

        <div className="text-center pb-4">
          <p className="text-[10px] text-gray-300">
            お支払いはStripeで安全に処理されます
          </p>
        </div>
      </div>
    </div>
  )
}
