type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
  ADMIN_PASSWORD?: string
  NEXT_PUBLIC_SUPABASE_URL?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  try {
    const body = await request.json() as { name?: string; email?: string; password?: string }
    const { name, email, password } = body

    if (!name || !email || !password) {
      return new Response(JSON.stringify({ success: false, error: 'すべての項目を入力してください' }), { status: 400, headers: cors })
    }

    // パスワード検証 (環境変数 or デフォルト)
    const adminPassword = env.ADMIN_PASSWORD || 'spomeal0323'
    if (password !== adminPassword) {
      return new Response(JSON.stringify({ success: false, error: 'パスワードが正しくありません' }), { status: 401, headers: cors })
    }

    // 初回ログイン判定: Supabase KVストア（profiles テーブルを再利用）で管理者ログイン履歴を確認
    let isFirstLogin = true

    if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        // admin_logins テーブルから該当メールアドレスのレコードを検索
        const checkRes = await fetch(
          `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/admin_logins?email=eq.${encodeURIComponent(email)}&select=email,login_count`,
          {
            headers: {
              'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            },
          }
        )

        if (checkRes.ok) {
          const records = await checkRes.json() as Array<{ email: string; login_count: number }>
          if (records.length > 0) {
            isFirstLogin = false
            // ログイン回数をインクリメント
            await fetch(
              `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/admin_logins?email=eq.${encodeURIComponent(email)}`,
              {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                  'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  login_count: records[0].login_count + 1,
                  name,
                  last_login: new Date().toISOString(),
                }),
              }
            )
          } else {
            // 初回ログイン: レコードを挿入
            await fetch(
              `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/admin_logins`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                  'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=minimal',
                },
                body: JSON.stringify({
                  email,
                  name,
                  login_count: 1,
                  last_login: new Date().toISOString(),
                }),
              }
            )
          }
        }
      } catch (err) {
        // DB接続失敗時はlocalStorageベースのフォールバックを使う
        console.error('Admin login tracking error:', err)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      isFirstLogin,
      admin: { name, email },
    }), { status: 200, headers: cors })

  } catch {
    return new Response(JSON.stringify({ success: false, error: '認証エラーが発生しました' }), { status: 500, headers: cors })
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { headers: cors })
