import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

const PRICE_IDS: Record<string, Record<string, string>> = {
  light: {
    monthly: process.env.STRIPE_PRICE_LIGHT_MONTHLY || 'price_light_monthly',
    quarterly: process.env.STRIPE_PRICE_LIGHT_QUARTERLY || 'price_light_quarterly',
    semiannual: process.env.STRIPE_PRICE_LIGHT_SEMIANNUAL || 'price_light_semiannual',
    annual: process.env.STRIPE_PRICE_LIGHT_ANNUAL || 'price_light_annual',
  },
  standard: {
    monthly: process.env.STRIPE_PRICE_STANDARD_MONTHLY || 'price_standard_monthly',
    quarterly: process.env.STRIPE_PRICE_STANDARD_QUARTERLY || 'price_standard_quarterly',
    semiannual: process.env.STRIPE_PRICE_STANDARD_SEMIANNUAL || 'price_standard_semiannual',
    annual: process.env.STRIPE_PRICE_STANDARD_ANNUAL || 'price_standard_annual',
  },
  premium: {
    monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || 'price_premium_monthly',
    quarterly: process.env.STRIPE_PRICE_PREMIUM_QUARTERLY || 'price_premium_quarterly',
    semiannual: process.env.STRIPE_PRICE_PREMIUM_SEMIANNUAL || 'price_premium_semiannual',
    annual: process.env.STRIPE_PRICE_PREMIUM_ANNUAL || 'price_premium_annual',
  },
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { planId, period } = body as { planId: string; period: string }

    if (!planId || !period || !PRICE_IDS[planId]?.[period]) {
      return NextResponse.json({ error: 'Invalid plan or period' }, { status: 400 })
    }

    const priceId = PRICE_IDS[planId][period]

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/plans?cancelled=true`,
      metadata: {
        userId: user.id,
        planId,
        period,
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          userId: user.id,
          planId,
          period,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
