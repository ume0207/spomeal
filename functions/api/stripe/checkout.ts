// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env; params: Record<string, string>; next: () => Promise<Response> }) => Promise<Response> | Response

interface Env {
  STRIPE_SECRET_KEY: string
  STRIPE_PRICE_LIGHT_MONTHLY: string
  STRIPE_PRICE_LIGHT_QUARTERLY: string
  STRIPE_PRICE_LIGHT_SEMIANNUAL: string
  STRIPE_PRICE_LIGHT_ANNUAL: string
  STRIPE_PRICE_STANDARD_MONTHLY: string
  STRIPE_PRICE_STANDARD_QUARTERLY: string
  STRIPE_PRICE_STANDARD_SEMIANNUAL: string
  STRIPE_PRICE_STANDARD_ANNUAL: string
  STRIPE_PRICE_PREMIUM_MONTHLY: string
  STRIPE_PRICE_PREMIUM_QUARTERLY: string
  STRIPE_PRICE_PREMIUM_SEMIANNUAL: string
  STRIPE_PRICE_PREMIUM_ANNUAL: string
  NEXT_PUBLIC_APP_URL: string
  // 既存ユーザーの登録日を取得して trial_end に利用するため
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await request.json() as { planId: string; period: string; customerEmail?: string; userId?: string }
    const { planId, period, customerEmail, userId } = body

    const priceMap: Record<string, Record<string, string>> = {
      light: {
        monthly: env.STRIPE_PRICE_LIGHT_MONTHLY,
        quarterly: env.STRIPE_PRICE_LIGHT_QUARTERLY,
        semiannual: env.STRIPE_PRICE_LIGHT_SEMIANNUAL,
        annual: env.STRIPE_PRICE_LIGHT_ANNUAL,
      },
      standard: {
        monthly: env.STRIPE_PRICE_STANDARD_MONTHLY,
        quarterly: env.STRIPE_PRICE_STANDARD_QUARTERLY,
        semiannual: env.STRIPE_PRICE_STANDARD_SEMIANNUAL,
        annual: env.STRIPE_PRICE_STANDARD_ANNUAL,
      },
      premium: {
        monthly: env.STRIPE_PRICE_PREMIUM_MONTHLY,
        quarterly: env.STRIPE_PRICE_PREMIUM_QUARTERLY,
        semiannual: env.STRIPE_PRICE_PREMIUM_SEMIANNUAL,
        annual: env.STRIPE_PRICE_PREMIUM_ANNUAL,
      },
    }

    const priceId = priceMap[planId]?.[period]?.trim()
    if (!priceId) {
      return new Response(JSON.stringify({ error: 'Invalid plan or period' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // リクエスト元のオリジンを使用（環境変数の値に依存しない確実な方法）
    const reqOrigin = new URL(request.url).origin
    const appUrl = reqOrigin.includes('localhost')
      ? 'https://spomeal.jp'
      : reqOrigin

    // ★トライアル期間★
    // 常に14日固定。Stripe が「now + 14日」を自動計算するため、
    // checkout UI は確実に「14日間無料」と表示される。
    // （以前は profile.created_at + 14日 を trial_end に渡していたが、
    //   登録〜チェックアウトに数分でも経つと Stripe UI が切り捨てで「13日」と表示される
    //   off-by-one バグがあったため、シンプルな trial_period_days 方式に戻した）
    const trialParams: Record<string, string> = { 'subscription_data[trial_period_days]': '14' }

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'payment_method_types[0]': 'card',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'mode': 'subscription',
        ...trialParams,
        ...(userId ? { 'subscription_data[metadata][userId]': userId } : {}),
        'subscription_data[metadata][planId]': planId,
        'success_url': `${appUrl}/login?paid=true`,
        'cancel_url': `${appUrl}/plans`,
        ...(customerEmail ? { 'customer_email': customerEmail } : {}),
        ...(userId ? { 'metadata[userId]': userId } : {}),
        'metadata[planId]': planId,
        'metadata[period]': period,
      }),
    })

    const sessionText = await stripeRes.text()
    console.log('Stripe response status:', stripeRes.status, 'body:', sessionText)
    const session = JSON.parse(sessionText) as { url?: string; error?: { message: string; type?: string; code?: string } }

    if (!session.url) {
      const errMsg = `[${stripeRes.status}] ${session.error?.message || sessionText}`
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}
