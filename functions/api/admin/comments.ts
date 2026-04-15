import { verifyUser, verifyAdmin, corsHeaders, handleOptions, authErrorResponse } from '../../_shared/auth'

type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  ADMIN_EMAILS?: string
}

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)

// GET /api/admin/comments?memberId=xxx
// 会員: 自分のコメントのみ読める / 管理者: 全員分読める
export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const cors = corsHeaders(request)
  const url = new URL(request.url)
  const memberId = url.searchParams.get('memberId')
  if (!memberId) {
    return new Response(JSON.stringify({ error: 'memberId required' }), { status: 400, headers: cors })
  }

  // まずユーザー認証
  const userAuth = await verifyUser(request, env)
  if (!userAuth.ok) return authErrorResponse(userAuth, request)

  // 自分のコメント or 管理者のみ許可
  const isSelf = userAuth.user.id === memberId
  if (!isSelf) {
    const adminAuth = await verifyAdmin(request, env)
    if (!adminAuth.ok) return authErrorResponse(adminAuth, request)
  }

  const { NEXT_PUBLIC_SUPABASE_URL: sbUrl, SUPABASE_SERVICE_ROLE_KEY: sbKey } = env
  const res = await fetch(
    `${sbUrl}/rest/v1/nutritionist_comments?target_member_id=eq.${memberId}&order=created_at.desc`,
    { headers: { Authorization: `Bearer ${sbKey}`, apikey: sbKey } }
  )
  const data = res.ok ? await res.json() : []
  return new Response(JSON.stringify(data), { headers: cors })
}

// POST /api/admin/comments { memberId, staffName, category, comment }
// 管理者のみ
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const cors = corsHeaders(request)

  const auth = await verifyAdmin(request, env)
  if (!auth.ok) return authErrorResponse(auth, request)

  const { NEXT_PUBLIC_SUPABASE_URL: sbUrl, SUPABASE_SERVICE_ROLE_KEY: sbKey } = env
  const body = await request.json() as {
    memberId?: string
    staffName?: string
    category?: string
    comment?: string
  }
  const { memberId, staffName, category, comment } = body
  if (!memberId || !comment) {
    return new Response(JSON.stringify({ error: 'memberId and comment required' }), { status: 400, headers: cors })
  }

  const res = await fetch(`${sbUrl}/rest/v1/nutritionist_comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sbKey}`, apikey: sbKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      target_member_id: memberId,
      staff_name: staffName || '管理栄養士',
      category: category || '全般',
      comment,
    }),
  })
  const data = res.ok ? await res.json() : null
  return new Response(JSON.stringify(data?.[0] || { ok: true }), { status: res.ok ? 200 : 500, headers: cors })
}

// DELETE /api/admin/comments?id=xxx
// 管理者のみ
export const onRequestDelete: PagesFunction<Env> = async ({ env, request }) => {
  const cors = corsHeaders(request)

  const auth = await verifyAdmin(request, env)
  if (!auth.ok) return authErrorResponse(auth, request)

  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: cors })

  const { NEXT_PUBLIC_SUPABASE_URL: sbUrl, SUPABASE_SERVICE_ROLE_KEY: sbKey } = env
  const res = await fetch(`${sbUrl}/rest/v1/nutritionist_comments?id=eq.${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${sbKey}`, apikey: sbKey },
  })
  return new Response(JSON.stringify({ ok: res.ok }), { status: res.ok ? 200 : 500, headers: cors })
}
