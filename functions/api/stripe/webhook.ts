// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env; params: Record<string, string>; next: () => Promise<Response> }) => Promise<Response> | Response

interface Env {
  STRIPE_WEBHOOK_SECRET: string
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  RESEND_API_KEY?: string
}

interface StripeSession {
  customer_email?: string
  customer_details?: { email?: string }
  metadata?: { userId?: string; planId?: string; period?: string }
  customer?: string
  subscription?: string
}

interface StripeSubscription {
  metadata?: { userId?: string }
  customer?: string
}

async function verifyStripeSignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    const parts = signature.split(',')
    const t = parts.find((p) => p.startsWith('t='))?.split('=')[1]
    const v1 = parts.find((p) => p.startsWith('v1='))?.split('=')[1]
    if (!t || !v1) return false

    const encoder = new TextEncoder()
    const signedPayload = `${t}.${body}`
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
    const computed = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
    return computed === v1
  } catch {
    return false
  }
}

async function sendWelcomeEmail(
  resendApiKey: string,
  email: string,
  planId: string
) {
  const planNames: Record<string, string> = {
    light: 'ライト',
    standard: 'スタンダード',
    premium: 'プレミアム',
  }
  const planName = planNames[planId] || planId

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'スポミル <noreply@spomeal.jp>',
      to: [email],
      subject: '【スポミル】ご登録ありがとうございます',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #22c55e;">スポミルへようこそ！</h2>
          <p>この度は<strong>${planName}プラン</strong>にご登録いただきありがとうございます。</p>
          <p>2週間の無料トライアル期間中、すべての機能をお試しいただけます。</p>
          <a href="https://spomeal.jp/login" style="display:inline-block;background:#22c55e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
            ログインして始める →
          </a>
          <p style="margin-top:24px;color:#6b7280;font-size:12px;">
            ご不明な点はお気軽にお問い合わせください。<br>スポミルサポートチーム
          </p>
        </div>
      `,
    }),
  })
}

async function updateSupabaseProfile(
  supabaseUrl: string,
  serviceKey: string,
  userId: string,
  data: Record<string, unknown>
) {
  const res = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ id: userId, ...data, updated_at: new Date().toISOString() }),
  })
  if (!res.ok) {
    console.error('Supabase update error:', await res.text())
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return new Response(JSON.stringify({ error: 'No signature' }), { status: 400 })
  }

  // 署名検証
  if (env.STRIPE_WEBHOOK_SECRET) {
    const valid = await verifyStripeSignature(body, signature, env.STRIPE_WEBHOOK_SECRET)
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 })
    }
  }

  let event: { type: string; data: { object: unknown } }
  try {
    event = JSON.parse(body)
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  const resendApiKey = env.RESEND_API_KEY

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as StripeSession
      const email = session.customer_email || session.customer_details?.email
      const { userId, planId, period } = session.metadata || {}

      console.log(`Checkout completed: email=${email}, plan=${planId}, userId=${userId}`)

      if (supabaseUrl && serviceKey) {
        let resolvedUserId = userId

        // userId がない場合はメールアドレスで検索
        if (!resolvedUserId && email) {
          const userRes = await fetch(
            `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}&page=1&per_page=1`,
            { headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey } }
          )
          if (userRes.ok) {
            const userData = await userRes.json() as { users?: Array<{ id: string }> }
            resolvedUserId = userData.users?.[0]?.id
          }
        }

        if (resolvedUserId) {
          await updateSupabaseProfile(supabaseUrl, serviceKey, resolvedUserId, {
            subscription_plan: planId || 'light',
            subscription_status: 'trialing',
            subscription_period: period,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
          })
        }

        // ウェルカムメール送信
        if (resendApiKey && email) {
          try {
            await sendWelcomeEmail(resendApiKey, email, planId || 'light')
          } catch (e) {
            console.error('Welcome email error:', e)
          }
        }
      }

    } else if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as StripeSubscription & { status: string }
      const userId = subscription.metadata?.userId
      if (userId && supabaseUrl && serviceKey) {
        await updateSupabaseProfile(supabaseUrl, serviceKey, userId, {
          subscription_status: subscription.status,
        })
      }

    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as StripeSubscription & {
        metadata?: { userId?: string; pending_deletion?: string }
        customer?: string
      }
      const userId = subscription.metadata?.userId
      const pendingDeletion = subscription.metadata?.pending_deletion === 'true'

      if (userId && supabaseUrl && serviceKey) {
        // 管理者による削除予約だった場合 → 完全削除を実行
        if (pendingDeletion) {
          const supaHeaders = {
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey,
            'Content-Type': 'application/json',
          }
          // 関連データ削除
          const tables = ['meals', 'body_records', 'reservations']
          for (const table of tables) {
            try {
              await fetch(`${supabaseUrl}/rest/v1/${table}?user_id=eq.${userId}`, {
                method: 'DELETE', headers: supaHeaders,
              })
            } catch { /* ignore */ }
          }
          // profiles削除
          try {
            await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
              method: 'DELETE', headers: supaHeaders,
            })
          } catch { /* ignore */ }
          // Stripe Customer削除
          const stripeSecret = (env as Env & { STRIPE_SECRET_KEY?: string }).STRIPE_SECRET_KEY
          if (stripeSecret && subscription.customer) {
            try {
              await fetch(`https://api.stripe.com/v1/customers/${subscription.customer}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${stripeSecret}` },
              })
            } catch { /* ignore */ }
          }
          // Supabase Authユーザー削除
          try {
            await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
              method: 'DELETE', headers: supaHeaders,
            })
          } catch { /* ignore */ }
          console.log(`Full deletion completed for user ${userId}`)
        } else {
          // 通常のサブスク終了
          await updateSupabaseProfile(supabaseUrl, serviceKey, userId, {
            subscription_plan: 'free',
            subscription_status: 'cancelled',
          })
        }
      }

    } else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as { customer?: string; id?: string }
      console.log(`Payment failed: invoice=${invoice.id}, customer=${invoice.customer}`)
    }

  } catch (err) {
    console.error('Webhook processing error:', err)
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
