type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  RESEND_API_KEY: string
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { headers: cors })

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  const { email } = await request.json() as { email?: string }
  if (!email) {
    return new Response(JSON.stringify({ error: 'メールアドレスが必要です' }), { status: 400, headers: cors })
  }

  // 1. Supabase admin APIでリカバリーリンクを生成
  const genRes = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'recovery',
      email,
      options: { redirectTo: 'https://spomeal.jp/reset-password' },
    }),
  })

  if (!genRes.ok) {
    const err = await genRes.text()
    console.error('generate_link error:', err)
    // ユーザーが存在しない場合でも成功を返す（セキュリティ上の理由）
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: cors })
  }

  const linkData = await genRes.json() as {
    action_link?: string
    hashed_token?: string
    verification_type?: string
    properties?: { action_link?: string }
  }

  const resetLink = linkData.action_link || linkData.properties?.action_link
  if (!resetLink) {
    console.error('No action_link in response:', JSON.stringify(linkData))
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: cors })
  }

  // 2. Resendでメール送信
  const mailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'スポミル <noreply@spomeal.jp>',
      to: [email],
      subject: '【スポミル】パスワード再設定のご案内',
      html: `
        <div style="font-family:'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif; max-width:480px; margin:0 auto; padding:32px 24px; background:#ffffff;">
          <div style="text-align:center; margin-bottom:24px;">
            <span style="font-size:28px; font-weight:900; background:linear-gradient(135deg,#15803d,#22c55e); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">スポミル</span>
          </div>
          <h2 style="font-size:18px; color:#111827; margin-bottom:8px;">パスワード再設定のご案内</h2>
          <p style="color:#374151; font-size:14px; line-height:1.8; margin-bottom:24px;">
            パスワード再設定のリクエストを受け付けました。<br>
            以下のボタンをクリックして新しいパスワードを設定してください。
          </p>
          <div style="text-align:center; margin-bottom:24px;">
            <a href="${resetLink}"
               style="display:inline-block; background:linear-gradient(135deg,#22c55e,#15803d); color:white; font-weight:700; font-size:15px; padding:14px 32px; border-radius:10px; text-decoration:none; box-shadow:0 4px 14px rgba(34,197,94,0.3);">
              パスワードを再設定する
            </a>
          </div>
          <p style="color:#9ca3af; font-size:12px; line-height:1.7;">
            このリンクの有効期限は<strong>1時間</strong>です。<br>
            このメールに心当たりがない場合は無視してください。<br>
            ご不明な点はスポミルサポートまでお問い合わせください。
          </p>
          <hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0;" />
          <p style="color:#d1d5db; font-size:11px; text-align:center;">スポミル｜スポーツ栄養管理アプリ</p>
        </div>
      `,
    }),
  })

  if (!mailRes.ok) {
    console.error('Resend error:', await mailRes.text())
  }

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: cors })
}
