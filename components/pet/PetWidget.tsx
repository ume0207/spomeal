'use client'

/**
 * ダッシュボード用 ペットウィジェット
 * - 現在のペット状態をミニ表示
 * - HP・進化までの食数・連続日数を一目で確認
 * - クリックで /pet へ遷移
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api'
import { Character } from './Character'
import { STAGE_PROGRESSION, FORM_INFO, type PetStage, type PetForm } from '@/lib/pet/types'

interface PetState {
  stage: PetStage
  form: PetForm | null
  hp: number
  startedAt: string
  mealsCount: number
  streakDays: number
  name: string
  enabled: boolean
}

export function PetWidget() {
  const [state, setState] = useState<PetState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) { setLoading(false); return }
      try {
        const r = await apiFetch(`/api/pet/state?userId=${session.user.id}`)
        if (r.ok) {
          const j = await r.json()
          setState(j.state)
        }
      } catch { /* ignore */ }
      setLoading(false)
    })()
  }, [])

  if (loading) return null

  if (!state || !state.enabled) {
    // 未開始 → スタート促し
    return (
      <Link
        href="/pet"
        style={{
          display: 'block', textDecoration: 'none', color: 'inherit',
          background: 'linear-gradient(135deg, #FEF3C7 0%, #FED7AA 100%)',
          borderRadius: 16, padding: 16, marginBottom: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 50 }}>🥚</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', color: '#92400e' }}>
              おにぎり君を育てよう！
            </div>
            <div style={{ fontSize: 11, color: '#a16207', marginTop: 2 }}>
              食事を記録するとすくすく成長 →
            </div>
          </div>
        </div>
      </Link>
    )
  }

  const stageInfo = STAGE_PROGRESSION.find(s => s.stage === state.stage)
  const nextIdx = STAGE_PROGRESSION.findIndex(s => s.stage === state.stage) + 1
  const nextStage = STAGE_PROGRESSION[nextIdx]
  const mealsToNext = nextStage ? Math.max(0, nextStage.mealsRequired - state.mealsCount) : 0
  const adultInfo = state.form ? FORM_INFO[state.form] : null

  const hpColor = state.hp >= 70 ? '#22c55e' : state.hp >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <Link
      href="/pet"
      style={{
        display: 'block', textDecoration: 'none', color: 'inherit',
        background: 'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)',
        borderRadius: 16, padding: 14, marginBottom: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flexShrink: 0 }}>
          <Character stage={state.stage} form={state.form} hp={state.hp} size={64} animated />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 'bold', color: '#166534' }}>{state.name}</span>
            <span style={{ fontSize: 10, background: 'white', padding: '2px 6px', borderRadius: 999, color: '#374151' }}>
              {stageInfo?.label}{state.stage === 'adult' && adultInfo && `・${adultInfo.label}`}
            </span>
          </div>

          {/* HPバー */}
          <div style={{ background: '#F1F5F9', borderRadius: 999, height: 8, overflow: 'hidden', marginBottom: 4 }}>
            <div style={{ width: `${state.hp}%`, height: '100%', background: hpColor, transition: 'all 0.3s' }} />
          </div>

          <div style={{ fontSize: 11, color: '#166534', display: 'flex', gap: 12 }}>
            <span>HP {state.hp}</span>
            <span>🔥{state.streakDays}日</span>
            {nextStage && <span>あと{mealsToNext}食で進化</span>}
          </div>
        </div>

        <div style={{ color: '#16a34a', fontSize: 18 }}>›</div>
      </div>
    </Link>
  )
}
