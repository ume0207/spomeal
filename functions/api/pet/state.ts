/**
 * GET /api/pet/state?userId=xxx
 *   現在のペット状態を返す。HPは時間経過減算を反映した最新値を計算して返す。
 *   profile に pet_* カラムが未初期化なら、卵の初期状態を返す（DBへの書き込みはしない）。
 *
 * POST /api/pet/state
 *   body: { userId, action: 'reset' | 'rename' | 'use_skip_pass' | 'enable' | 'disable', name? }
 */

import { verifyUser, corsHeaders, handleOptions, authErrorResponse } from '../../_shared/auth'

type PagesFunction<Env = Record<string, unknown>> = (context: {
  request: Request
  env: Env
}) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
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
    ? HP_MAX  // 卵で1度も食べてないなら満タン表示
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

  const supaHeaders = {
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  }

  // profile を取得
  const r = await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`,
    { headers: supaHeaders }
  )
  if (!r.ok) {
    return new Response(JSON.stringify({ error: 'profile取得失敗' }), { status: 500, headers: cors })
  }
  const rows = await r.json() as ProfileRow[]
  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: 'profileが見つかりません' }), { status: 404, headers: cors })
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

  const supaHeaders = {
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    'Content-Type': 'application/json',
  }

  const patch: Record<string, unknown> = {}

  if (body.action === 'reset') {
    // 現在のペットを「manual」リセットで履歴に保存して新しい卵を生成
    // まず現状取得
    const r = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${body.userId}&select=*`,
      { headers: supaHeaders }
    )
    if (r.ok) {
      const rows = await r.json() as ProfileRow[]
      const cur = rows[0]
      if (cur && cur.pet_form) {
        // 大人になっていたなら履歴保存
        await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/pet_history`, {
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
    // 初回ON時にstarted_atを今に
    patch.pet_started_at = new Date().toISOString()
    patch.pet_stage = 'egg'
    patch.pet_hp = 100
  } else if (body.action === 'disable') {
    patch.pet_enabled = false
  } else {
    return new Response(JSON.stringify({ error: '不明なaction' }), { status: 400, headers: cors })
  }

  const updateRes = await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${body.userId}`,
    { method: 'PATCH', headers: supaHeaders, body: JSON.stringify(patch) }
  )
  if (!updateRes.ok) {
    return new Response(JSON.stringify({ error: 'profile更新失敗', detail: await updateRes.text() }), { status: 500, headers: cors })
  }

  return new Response(JSON.stringify({ ok: true }), { headers: cors })
}
