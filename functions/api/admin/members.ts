type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  }

  try {
    const res = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=100`,
      {
        headers: {
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    )

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch users' }), { status: 500, headers: cors })
    }

    const data = await res.json() as { users: Array<{
      id: string
      email: string
      created_at: string
      user_metadata: Record<string, string>
      last_sign_in_at?: string
    }> }

    const members = (data.users || []).map((u) => ({
      id: u.id,
      email: u.email,
      name: u.user_metadata?.full_name || u.email,
      furigana: u.user_metadata?.furigana || '',
      phone: u.user_metadata?.phone || '',
      team: u.user_metadata?.team || '',
      gender: u.user_metadata?.gender || '',
      address: u.user_metadata?.address || '',
      memo: u.user_metadata?.memo || '',
      createdAt: u.created_at?.slice(0, 10) || '',
      lastSignIn: u.last_sign_in_at?.slice(0, 10) || '',
    }))

    return new Response(JSON.stringify({ members }), { status: 200, headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors })
  }
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  })
}
