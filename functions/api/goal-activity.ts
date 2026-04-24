import { verifyUser, verifyAdmin, corsHeaders, handleOptions, authErrorResponse } from '../_shared/auth'

type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  ADMIN_EMAILS?: string
}

/**
 * POST /api/goal-activity
 *
 * ★重要バグ修正★ この API は以前 auth.users.user_metadata.goal_data を
 * 「GET → 変更 → PUT」で更新していたが、これは read-modify-write レースで
 * 他の activity API と衝突して他フィールド（meal_activity / body_activity）
 * を巻き添えで破壊することがあった。
 *
 * 目標データの本体は `user_goals` テーブル（/api/user-goals 経由）に
 * 正しく保存されている。管理者画面も `user_goals` を直接読む設計に移行済み。
 * したがって user_metadata.goal_data はもはや不要。
 *
 * race を根絶するため、この API は **no-op** に変更した。
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const cors = corsHeaders(request)

  try {
    const body = await request.json().catch(() => ({})) as { userId?: string }

    if (!body.userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), { status: 400, headers: cors })
    }

    const admin = await verifyAdmin(request, env)
    if (!admin.ok) {
      const auth = await verifyUser(request, env)
      if (!auth.ok) return authErrorResponse(auth, request)
      if (auth.user.id !== body.userId) {
        return authErrorResponse({ ok: false, status: 403, error: '他のユーザーのデータは更新できません' }, request)
      }
    }

    // 意図的に何も書き込まない。user_goals テーブルが真実源。
    return new Response(JSON.stringify({ success: true, noop: true }), { status: 200, headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors })
  }
}

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)
