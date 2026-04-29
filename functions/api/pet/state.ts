/**
 * GET /api/pet/state?userId=xxx
 *   現在のペット状態を返す。HPは時間経過減算を反映した最新値を計算して返す。
 *
 * POST /api/pet/state
 *   body: { userId, action: 'reset' | 'rename' | 'enable' | 'disable', name? }
 *
 * ★Preview環境対応：SUPABASE_SERVICE_ROLE_KEY を使わず、ユーザーJWT + anon key
 *   で動作する。RLS により自分の profile / pet_history のみ読み書きできる。
 */

import { verifyUser, corsHeaders, handleOptions, authErrorResponse } from '../../_shared/auth'
import { getSupabaseUrl, getSupabaseAnonKey } from '../../_shared/env-fallback'

type PagesFunction<Env = Record<string, unknown>> = (context: {
  request: Request
  env: Env
}) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
}

const HP_DECAY_PER_DAY = 50
const HP_MAX = 100
const HP_MIN = 0

interface ProfileRow {
  id: string
  pet_stage?: string | null
  pet_form?: string | null
  pet_hp?: number | null
  pet_last_fed_at?: string | null
  pet_started_at?: string | null
  pet_meals_count?: number | null
  pet_streak_days?: number | null
  pet_last_streak_date?: string | null
  pet_skip_passes?: number | null
  pet_skip_passes_refilled_at?: string | null
  pet_name?: string | null
  pet_enabled?: boolean | null
}

function calculateCurrentHP(hp: number | null, lastFedAt: string | null, now = new Date()): number {
  if (hp == null) return HP_MAX
  if (!lastFedAt) return hp
  const last = new Date(lastFedAt).getTime()
  const elapsedMs = now.getTime() - last
  if (elapsedMs <= 0) return hp
  const daysElapsed = elapsedMs / (24 * 60 * 60 * 1000)
  const decay = Math.floor(daysElapsed * HP_DECAY_PER_DAY)
  return Math.max(HP_MIN, hp - decay)
}

function profileToPetState(p: ProfileRow): Record<string, unknown> {
  const now = new Date()
  const startedAt = p.pet_started_at || now.toISOString()
  const stage = p.pet_stage || 'egg'
  const baseHP = p.pet_hp == null ? HP_MAX : p.pet_hp
  const currentHP = stage === 'egg' && !p.pet_last_fed_at
    ? HP_MAX
    : calculateCurrentHP(baseHP, p.pet_last_fed_at || null, now)

  return {
    stage,
    form: p.pet_form || null,
    hp: currentHP,
    storedHp: baseHP,
    lastFedAt: p.pet_last_fed_at || null,
    startedAt,
    mealsCount: p.pet_meals_count || 0,
    streakDays: p.pet_streak_days || 0,
    lastStreakDate: p.pet_last_streak_date || null,
    skipPasses: p.pet_skip_passes == null ? 2 : p.pet_skip_passes,
    skipPassesRefilledAt: p.pet_skip_passes_refilled_at || null,
    name: p.pet_name || 'おにぎり君',
    enabled: p.pet_enabled !== false,
  }
}

/**
 * Authorization から JWT を取り出す
 */
function extractJWT(request: Request): string | null {
  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  return token || null
}

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const cors = corsHeaders(request)
  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')
  if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: cors })

  const auth = await verifyUser(request, env)
  if (!auth.ok) return authErrorResponse(auth, request)
  if (auth.user.id !== userId) {
    return new Response(JSON.stringify({ error: '他のユーザーのペットは閲覧できません' }), { status: 403, headers: cors })
  }

  // ★ユーザーJWTでクエリ（RLSで自分の行だけ読める）
  const supabaseUrl = getSupabaseUrl(env as unknown as Record<string, unknown>)
  const anonKey = getSupabaseAnonKey(env as unknown as Record<string, unknown>)
  const jwt = extractJWT(request) || anonKey

  const r = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=*`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${jwt}`,
      },
    }
  )
  if (!r.ok) {
    return new Response(JSON.stringify({ error: 'profile取得失敗', detail: await r.text() }), { status: 500, headers: cors })
  }
  const rows = await r.json() as ProfileRow[]
  if (rows.length === 0) {
    // profile行が無い場合は卵の初期状態を返す
    return new Response(JSON.stringify({ ok: true, state: profileToPetState({ id: userId }) }), { headers: cors })
  }

  const state = profileToPetState(rows[0])
  return new Response(JSON.stringify({ ok: true, state }), { headers: cors })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const cors = corsHeaders(request)
  const auth = await verifyUser(request, env)
  if (!auth.ok) return authErrorResponse(auth, request)

  let body: { userId?: string; action?: string; name?: string }
  try {
    body = await request.json() as typeof body
  } catch {
    return new Response(JSON.stringify({ error: 'JSON 解析失敗' }), { status: 400, headers: cors })
  }

  if (!body.userId || body.userId !== auth.user.id) {
    return new Response(JSON.stringify({ error: '不正なuserId' }), { status: 403, headers: cors })
  }

  const supabaseUrl = getSupabaseUrl(env as unknown as Record<string, unknown>)
  const anonKey = getSupabaseAnonKey(env as unknown as Record<string, unknown>)
  const jwt = extractJWT(request) || anonKey

  const supaHeaders = {
    apikey: anonKey,
    Authorization: `Bearer ${jwt}`,
    'Content-Type': 'application/json',
  }

  const patch: Record<string, unknown> = {}

  if (body.action === 'reset') {
    // 現状の form を取得してから履歴に追加
    try {
      const r = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${body.userId}&select=pet_form,pet_name,pet_started_at,pet_meals_count,pet_streak_days`,
        { headers: supaHeaders }
      )
      if (r.ok) {
        const rows = await r.json() as Array<{
          pet_form?: string; pet_name?: string; pet_started_at?: string;
          pet_meals_count?: number; pet_streak_days?: number;
        }>
        const cur = rows[0]
        if (cur && cur.pet_form) {
          await fetch(`${supabaseUrl}/rest/v1/pet_history`, {
            method: 'POST',
            headers: supaHeaders,
            body: JSON.stringify({
              user_id: body.userId,
              pet_name: cur.pet_name || 'おにぎり君',
              final_form: cur.pet_form,
              started_at: cur.pet_started_at,
              meals_count: cur.pet_meals_count || 0,
              streak_max_days: cur.pet_streak_days || 0,
              reason: 'manual',
            }),
          }).catch(() => {})
        }
      }
    } catch { /* ignore */ }

    Object.assign(patch, {
      pet_stage: 'egg',
      pet_form: null,
      pet_hp: 100,
      pet_last_fed_at: null,
      pet_started_at: new Date().toISOString(),
      pet_meals_count: 0,
      pet_streak_days: 0,
      pet_last_streak_date: null,
    })
  } else if (body.action === 'rename') {
    if (!body.name || body.name.length > 20) {
      return new Response(JSON.stringify({ error: '名前は1〜20文字で指定してください' }), { status: 400, headers: cors })
    }
    patch.pet_name = body.name
  } else if (body.action === 'enable') {
    patch.pet_enabled = true
    patch.pet_started_at = new Date().toISOString()
    patch.pet_stage = 'egg'
    patch.pet_hp = 100
  } else if (body.action === 'disable') {
    patch.pet_enabled = false
  } else {
    return new Response(JSON.stringify({ error: '不明なaction' }), { status: 400, headers: cors })
  }

  // PATCH 先に profile が無い場合は INSERT も試行
  const updateRes = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${body.userId}`,
    { method: 'PATCH', headers: supaHeaders, body: JSON.stringify(patch) }
  )

  // 行が存在しない場合は upsert
  if (updateRes.ok) {
    // PATCH OK だが行が存在しない可能性 → 確認
    const checkRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${body.userId}&select=id`,
      { headers: supaHeaders }
    )
    if (checkRes.ok) {
      const rows = await checkRes.json() as Array<{ id?: string }>
      if (rows.length === 0) {
        // INSERT
        await fetch(`${supabaseUrl}/rest/v1/profiles`, {
          method: 'POST',
          headers: supaHeaders,
          body: JSON.stringify({ id: body.userId, ...patch }),
        })
      }
    }
  } else {
    return new Response(JSON.stringify({ error: 'profile更新失敗', detail: await updateRes.text() }), { status: 500, headers: cors })
  }

  return new Response(JSON.stringify({ ok: true }), { headers: cors })
}
