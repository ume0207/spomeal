import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set')
    }
    _stripe = new Stripe(key, {
      apiVersion: '2026-02-25.clover',
      typescript: true,
    })
  }
  return _stripe
}

// Convenience export for direct import
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export const PLANS = {
  light: {
    name: 'ライト',
    nameEn: 'Light',
    description: '基本的な食事管理機能',
    features: ['食事記録（1日3食）', 'カロリー・PFC管理', '週次レポート'],
    prices: {
      monthly: { amount: 980, label: '月額', period: 'monthly' },
      quarterly: { amount: 2646, label: '3ヶ月', period: 'quarterly' },
      semiannual: { amount: 4900, label: '半年', period: 'semiannual' },
      annual: { amount: 8820, label: '年間', period: 'annual' },
    },
  },
  standard: {
    name: 'スタンダード',
    nameEn: 'Standard',
    description: '本格的なスポーツ栄養管理',
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
    popular: true,
  },
  premium: {
    name: 'プレミアム',
    nameEn: 'Premium',
    description: 'AIサポート付き完全管理',
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
} as const
