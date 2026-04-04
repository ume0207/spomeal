type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
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
    const body = await request.json() as { userId?: string }
    const { userId } = body

    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: 'userIdが必要です' }), { status: 400, headers: cors })
    }

    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'Supabase環境変数が設定されていません' }), { status: 500, headers: cors })
    }

    // 1. 関連データ削除（profiles, meals, body_records など）
    // テーブルに依存: エラーがあっても継続
    const tables = ['meals', 'body_records', 'reservations', 'profiles']
    for (const table of tables) {
      try {
        await fetch(
          `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?user_id=eq.${userId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            },
          }
        )
      } catch { /* ignore */ }
    }
    // profilesのIDカラムは id=user.id の場合もある
    try {
      await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          },
        }
      )
    } catch { /* ignore */ }

    // 2. Supabase Authからユーザー削除
    const delRes = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    )

    if (!delRes.ok) {
      const errText = await delRes.text()
      return new Response(JSON.stringify({ success: false, error: `削除に失敗しました: ${errText}` }), { status: 500, headers: cors })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), { status: 500, headers: cors })
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { headers: cors })
