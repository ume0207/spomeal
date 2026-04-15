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
    description: '基本的な食事管理 + AI分析1日5回',
    features: ['食事記録・カロリー管理', '体組成記録', 'AI食事データ分析（1日5回）'],
    prices: {
      monthly: { amount: 615, label: '月額', period: 'monthly' },
      quarterly: { amount: 1753, label: '3ヶ月', period: 'quarterly' },
      semiannual: { amount: 3321, label: '半年', period: 'semiannual' },
      annual: { amount: 5904, label: '年間', period: 'annual' },
    },
  },
  standard: {
    name: 'スタンダード',
    nameEn: 'Standard',
    description: 'AI分析1日10回 + ミーティング月1回',
    features: [
      '食事記録・カロリー管理',
      '体組成記録',
      'AI食事データ分析（1日10回）',
      '20分ミーティング（月1回）',
    ],
    prices: {
      monthly: { amount: 2980, label: '月額', period: 'monthly' },
      quarterly: { amount: 8493, label: '3ヶ月', period: 'quarterly' },
      semiannual: { amount: 16092, label: '半年', period: 'semiannual' },
      annual: { amount: 28608, label: '年間', period: 'annual' },
    },
    popular: true,
  },
  premium: {
    name: 'プレミアム',
    nameEn: 'Premium',
    description: 'AI上限解放 + ミーティング月2回 + 週次フィードバック',
    features: [
      '食事記録・カロリー管理',
      '体組成記録',
      'AI食事データ分析（上限解放）',
      'ミーティング（月2回）',
      '週1回フィードバックコメント',
    ],
    prices: {
      monthly: { amount: 9980, label: '月額', period: 'monthly' },
      quarterly: { amount: 28443, label: '3ヶ月', period: 'quarterly' },
      semiannual: { amount: 53892, label: '半年', period: 'semiannual' },
      annual: { amount: 95808, label: '年間', period: 'annual' },
    },
  },
} as const
