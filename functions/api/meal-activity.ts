import { verifyUser, verifyAdmin, corsHeaders, handleOptions, authErrorResponse } from '../_shared/auth'

type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  ADMIN_EMAILS?: string
}

/**
 * POST /api/meal-activity
 *
 * ★重要バグ修正★ この API は以前 auth.users.user_metadata.meal_activity 配列を
 * 「GET → 変更 → PUT」で更新していたが、これは **read-modify-write レース** になっており、
 * 短時間に複数の食事記録や他の activity API（goal-activity, body-activity）が
 * 並行して走ると、同じ user_metadata の古いスナップショットに対して両者が書き戻し、
 * **片方の更新が丸ごと消える** データ消失バグの原因になっていた。
 *
 * 食事の本体データは `meal_records` テーブル（/api/meals 経由）に正しく保存されている。
 * 管理者画面 (/admin/members/detail 等) も `meal_records` を優先して読むように実装済み
 * （functions/api/admin/member-data.ts GET, functions/api/admin/meal-feed.ts）。
 * したがって user_metadata 側のキャッシュ配列はもはや不要。
 *
 * race を根絶するため、この API は **no-op（認証のみ通して 200 を返す）** に変更した。
 * 既存のフロントエンドからは引き続き呼ばれても、データを破壊することはなくなる。
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const cors = corsHeaders(request)

  try {
    const body = await request.json().catch(() => ({})) as { userId?: string }

    if (!body.userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), { status: 400, headers: cors })
    }

    // 認証だけは維持（他人を詐称した呼び出しを防ぐ）
    const admin = await verifyAdmin(request, env)
    if (!admin.ok) {
      const auth = await verifyUser(request, env)
      if (!auth.ok) return authErrorResponse(auth, request)
      if (auth.user.id !== body.userId) {
        return authErrorResponse({ ok: false, status: 403, error: '他のユーザーのデータは更新できません' }, request)
      }
    }

    // 意図的に何も書き込まない。meal_records テーブルが真実源。
    return new Response(JSON.stringify({ success: true, noop: true }), { status: 200, headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors })
  }
}

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)
