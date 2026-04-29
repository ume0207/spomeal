// Cloudflare Pages Function: /api/auth/login
// iOSブラウザからsupabase.coへの直接接続が失敗する場合のサーバーサイドプロキシ
// ブラウザ → pages.dev/api/auth/login → Supabase（サーバーサイド）

import { getSupabaseUrl, getSupabaseAnonKey } from '../../_shared/env-fallback'

type PagesFunction<Env = Record<string, unknown>> = (context: {
  request: Request
  env: Env
}) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  try {
    const body = await request.json() as { email?: string; password?: string }
    const { email, password } = body

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'email and password required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // 本番では Cloudflare Pages の env vars から読む。
    // Preview/フィーチャーブランチで env vars が未設定の場合は
    // 公開済みの値（NEXT_PUBLIC_* なので元々ブラウザに送信されている）に
    // フォールバックする。これは秘密情報ではない。
    const supabaseUrl = getSupabaseUrl(env as unknown as Record<string, unknown>)
    const anonKey = getSupabaseAnonKey(env as unknown as Record<string, unknown>)

    // サーバーサイドでSupabaseに認証リクエスト
    const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ email, password }),
    })

    const authData = await authRes.json()

    if (!authRes.ok) {
      return new Response(JSON.stringify({ error: 'invalid_credentials', details: authData }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // セッションデータをクライアントに返す
    return new Response(JSON.stringify({ success: true, session: authData }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { headers: cors })
