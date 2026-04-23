import { verifyUser, verifyAdmin, corsHeaders, handleOptions, authErrorResponse } from '../../_shared/auth'

type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  ADMIN_EMAILS?: string
}

const BUCKET = 'app-config'
const SHIFTS_FILE = 'shifts.json'

/**
 * バケットが存在しない場合は作成する（初回のみ）。
 * service role key でのみ実行可能。バケットは private で作成する。
 */
async function ensureBucket(sbUrl: string, sbKey: string): Promise<void> {
  // バケット一覧を確認
  const listRes = await fetch(`${sbUrl}/storage/v1/bucket`, {
    headers: { Authorization: `Bearer ${sbKey}`, apikey: sbKey },
  })
  if (listRes.ok) {
    const buckets = await listRes.json() as Array<{ name?: string; id?: string }>
    if (Array.isArray(buckets) && buckets.some(b => b.name === BUCKET || b.id === BUCKET)) {
      return
    }
  }
  // 作成（public=false の private bucket）
  await fetch(`${sbUrl}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sbKey}`,
      apikey: sbKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
  }).catch(() => {})
}

/**
 * GET /api/shifts
 * シフトデータを取得（ログインユーザーまたは管理者）
 *
 * ★バグ修正★ 以前は /storage/v1/object/public/ を使用していたため、
 * private バケットだと常に失敗 → 空配列を返し「毎回リセットされる」ように見えていた。
 * service role key で認証付き GET に変更し、private バケットでも確実に読める。
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const cors = corsHeaders(request)

  // 管理者または会員（どちらかの認証が通ればOK）
  const admin = await verifyAdmin(request, env)
  if (!admin.ok) {
    const auth = await verifyUser(request, env)
    if (!auth.ok) return authErrorResponse(auth, request)
  }

  const sbUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const sbKey = env.SUPABASE_SERVICE_ROLE_KEY

  try {
    // 認証付きエンドポイント（private バケットでも可）
    const res = await fetch(
      `${sbUrl}/storage/v1/object/${BUCKET}/${SHIFTS_FILE}`,
      { headers: { Authorization: `Bearer ${sbKey}`, apikey: sbKey } }
    )
    if (res.ok) {
      const text = await res.text()
      try {
        const data = JSON.parse(text)
        return new Response(JSON.stringify(data), { status: 200, headers: cors })
      } catch {
        // 破損していたら空を返す（POST で上書きされる）
        return new Response(JSON.stringify([]), { status: 200, headers: cors })
      }
    }
    // ファイル未作成（初回）または bucket 未作成
    return new Response(JSON.stringify([]), { status: 200, headers: cors })
  } catch {
    return new Response(JSON.stringify([]), { status: 200, headers: cors })
  }
}

/**
 * POST /api/shifts
 * シフトデータを保存（管理者のみ）
 *
 * ★バグ修正★ バケット未作成でも確実に保存できるよう、事前に ensureBucket() を実行。
 * また、失敗時はエラー内容をフロントに返して silent failure を防ぐ。
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const cors = corsHeaders(request)

  const auth = await verifyAdmin(request, env)
  if (!auth.ok) return authErrorResponse(auth, request)

  const sbUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const sbKey = env.SUPABASE_SERVICE_ROLE_KEY

  try {
    const shifts = await request.json()

    const upload = async () => fetch(
      `${sbUrl}/storage/v1/object/${BUCKET}/${SHIFTS_FILE}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sbKey}`,
          apikey: sbKey,
          'Content-Type': 'application/json',
          'x-upsert': 'true',
          'cache-control': 'no-cache',
        },
        body: JSON.stringify(shifts),
      }
    )

    let res = await upload()

    // bucket が無ければ作って再試行（初回デプロイ対策）
    if (!res.ok && (res.status === 404 || res.status === 400)) {
      await ensureBucket(sbUrl, sbKey)
      res = await upload()
    }

    if (res.ok) {
      return new Response(
        JSON.stringify({ ok: true, count: Array.isArray(shifts) ? shifts.length : null }),
        { status: 200, headers: cors }
      )
    }
    const err = await res.text().catch(() => '')
    return new Response(
      JSON.stringify({ ok: false, status: res.status, error: err.slice(0, 500) }),
      { status: 500, headers: cors }
    )
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500, headers: cors })
  }
}

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)
