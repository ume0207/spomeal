// 一時的な管理エンドポイント - ユーザー確認・削除用
// 使用後は削除すること

type PagesFunction<Env = Record<string, unknown>> = (context: {
  request: Request
  env: Env
}) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

// GET: ユーザー一覧
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context
  const res = await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=50`,
    {
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      },
    }
  )
  const data = await res.json() as { users?: Array<{ id: string; email: string; created_at: string }> }
  const users = (data.users || []).map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
  }))
  return new Response(JSON.stringify({ count: users.length, users }), { headers: cors })
}

// DELETE: 全ユーザー削除
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { env } = context

  // まず全ユーザー取得
  const res = await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=50`,
    {
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      },
    }
  )
  const data = await res.json() as { users?: Array<{ id: string; email: string }> }
  const users = data.users || []

  // 全員削除
  const results = []
  for (const user of users) {
    const delRes = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${user.id}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    )
    results.push({ email: user.email, status: delRes.status, ok: delRes.ok })
  }

  return new Response(JSON.stringify({ deleted: results.length, results }), { headers: cors })
}
