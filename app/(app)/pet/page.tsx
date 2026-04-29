'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api'
import { Character } from '@/components/pet/Character'
import { STAGE_PROGRESSION, FORM_INFO, type PetStage, type PetForm } from '@/lib/pet/types'

interface PetState {
  stage: PetStage
  form: PetForm | null
  hp: number
  storedHp: number
  lastFedAt: string | null
  startedAt: string
  mealsCount: number
  streakDays: number
  lastStreakDate: string | null
  skipPasses: number
  skipPassesRefilledAt: string | null
  name: string
  enabled: boolean
}

interface HistoryEntry {
  id: string
  pet_name: string
  final_form: PetForm
  graduated_at: string
  meals_count: number
  streak_max_days: number
  reason: string
}

export default function PetPage() {
  const [state, setState] = useState<PetState | null>(null)
  const [loading, setLoading] = useState(true)
  const [historyCount, setHistoryCount] = useState(0)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState('')

  const fetchState = useCallback(async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return
    const userId = session.user.id

    const r = await apiFetch(`/api/pet/state?userId=${userId}`)
    if (r.ok) {
      const j = await r.json()
      setState(j.state)
    }

    // 卒業履歴の数だけ取得
    const hr = await apiFetch(`/api/pet/history?userId=${userId}`)
    if (hr.ok) {
      const hj = await hr.json() as { history?: HistoryEntry[] }
      setHistoryCount((hj.history || []).length)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchState()
  }, [fetchState])

  async function handleAction(action: 'reset' | 'rename' | 'enable' | 'disable', name?: string) {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return
    const userId = session.user.id

    await apiFetch('/api/pet/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action, name }),
    })
    await fetchState()
  }

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ color: '#666' }}>読み込み中…</p>
      </div>
    )
  }

  if (!state) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p>ペット情報が取得できませんでした。</p>
      </div>
    )
  }

  if (!state.enabled) {
    return (
      <div style={{ padding: 24, maxWidth: 480, margin: '0 auto' }}>
        <div style={{ background: 'white', borderRadius: 16, padding: 32, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🥚</div>
          <h2 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 8 }}>たまご育成、はじめる？</h2>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 24, lineHeight: 1.7 }}>
            食事を記録するとおにぎり君がすくすく育ちます。<br />
            放置すると弱っていくので毎日記録しよう！
          </p>
          <button
            onClick={() => handleAction('enable')}
            style={{
              background: '#22c55e', color: 'white', border: 'none',
              padding: '14px 36px', borderRadius: 999, fontSize: 16, fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            🥚 卵をうけとる
          </button>
        </div>
      </div>
    )
  }

  const stageInfo = STAGE_PROGRESSION.find(s => s.stage === state.stage)
  const nextStageInfo = STAGE_PROGRESSION[STAGE_PROGRESSION.findIndex(s => s.stage === state.stage) + 1]

  const daysSinceStart = Math.floor(
    (Date.now() - new Date(state.startedAt).getTime()) / (24 * 60 * 60 * 1000)
  )
  const mealsToNext = nextStageInfo ? Math.max(0, nextStageInfo.mealsRequired - state.mealsCount) : 0
  const daysToNext = nextStageInfo ? Math.max(0, nextStageInfo.daysFromStart - daysSinceStart) : 0

  const hpColor = state.hp >= 70 ? '#22c55e' : state.hp >= 40 ? '#f59e0b' : '#ef4444'
  const hpLabel = state.hp >= 70 ? 'げんき' : state.hp >= 40 ? 'ふつう' : 'よわってる'

  // 大人時の表示
  const adultInfo = state.form ? FORM_INFO[state.form] : null

  return (
    <div style={{ padding: '20px 16px 80px', maxWidth: 480, margin: '0 auto' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 'bold' }}>🍙 ペット</h1>
        <Link
          href="/pet/collection"
          style={{ background: '#fef3c7', color: '#92400e', padding: '6px 12px', borderRadius: 999, fontSize: 13, textDecoration: 'none', fontWeight: 'bold' }}
        >
          📖 図鑑 ({historyCount})
        </Link>
      </div>

      {/* キャラ表示エリア */}
      <div style={{
        background: 'linear-gradient(180deg, #DCFCE7 0%, #FFFFFF 100%)',
        borderRadius: 24, padding: '32px 16px 16px', textAlign: 'center',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 16,
      }}>
        <div style={{ marginBottom: 8 }}>
          <Character stage={state.stage} form={state.form} hp={state.hp} size={220} animated />
        </div>

        {/* 名前 */}
        {renaming ? (
          <div style={{ marginBottom: 12 }}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={20}
              style={{
                fontSize: 18, fontWeight: 'bold', textAlign: 'center',
                border: '2px solid #22c55e', borderRadius: 8, padding: '4px 12px',
                width: 200,
              }}
              autoFocus
            />
            <div style={{ marginTop: 8 }}>
              <button
                onClick={async () => { if (newName.trim()) { await handleAction('rename', newName.trim()); setRenaming(false) } }}
                style={{ background: '#22c55e', color: 'white', border: 'none', padding: '6px 16px', borderRadius: 6, marginRight: 8, cursor: 'pointer' }}
              >
                決定
              </button>
              <button
                onClick={() => setRenaming(false)}
                style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '6px 16px', borderRadius: 6, cursor: 'pointer' }}
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 22, fontWeight: 'bold' }}>{state.name}</span>
            <button
              onClick={() => { setNewName(state.name); setRenaming(true) }}
              style={{ marginLeft: 8, background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 12 }}
            >
              ✏️
            </button>
          </div>
        )}

        {/* ステージラベル */}
        <div style={{ marginBottom: 12 }}>
          <span style={{
            background: 'white', color: '#374151', padding: '4px 14px',
            borderRadius: 999, fontSize: 13, fontWeight: 'bold',
            border: '1px solid #d1d5db',
          }}>
            {stageInfo?.emoji} {stageInfo?.label}
            {state.stage === 'adult' && adultInfo && ` ・ ${adultInfo.label}`}
          </span>
        </div>

        {/* HP バー */}
        <div style={{ background: '#F1F5F9', borderRadius: 999, height: 16, overflow: 'hidden', margin: '0 16px', position: 'relative' }}>
          <div style={{
            width: `${state.hp}%`, height: '100%',
            background: hpColor,
            transition: 'width 0.5s ease, background 0.5s ease',
            borderRadius: 999,
          }} />
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 'bold', color: state.hp >= 50 ? 'white' : '#374151',
          }}>
            HP {state.hp}/100 ・ {hpLabel}
          </div>
        </div>
      </div>

      {/* 説明文 */}
      <div style={{ background: 'white', borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
          {state.stage === 'adult' && adultInfo
            ? adultInfo.description
            : stageInfo?.description}
        </p>
      </div>

      {/* 進化までのプログレス */}
      {nextStageInfo && (
        <div style={{ background: 'white', borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8, fontWeight: 'bold' }}>
            次の進化：{nextStageInfo.emoji} {nextStageInfo.label}
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <div style={{ flex: 1, background: '#FEF9C3', padding: '8px 12px', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', color: '#854D0E' }}>あと {mealsToNext} 食</div>
              <div style={{ color: '#A16207', fontSize: 11, marginTop: 2 }}>食事記録</div>
            </div>
            <div style={{ flex: 1, background: '#DBEAFE', padding: '8px 12px', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', color: '#1E40AF' }}>あと {daysToNext} 日</div>
              <div style={{ color: '#1D4ED8', fontSize: 11, marginTop: 2 }}>経過日数</div>
            </div>
          </div>
        </div>
      )}

      {/* ステータス */}
      <div style={{ background: 'white', borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8, fontWeight: 'bold' }}>📊 ステータス</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 13 }}>
          <div style={{ textAlign: 'center', padding: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#16a34a' }}>{state.mealsCount}</div>
            <div style={{ color: '#6b7280', fontSize: 11 }}>累計食事</div>
          </div>
          <div style={{ textAlign: 'center', padding: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#dc2626' }}>🔥{state.streakDays}</div>
            <div style={{ color: '#6b7280', fontSize: 11 }}>連続日数</div>
          </div>
          <div style={{ textAlign: 'center', padding: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#7c3aed' }}>{daysSinceStart}</div>
            <div style={{ color: '#6b7280', fontSize: 11 }}>育成日数</div>
          </div>
        </div>
      </div>

      {/* お休みパス */}
      <div style={{ background: 'white', borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 'bold', color: '#374151' }}>🎫 お休みパス</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>1日サボっても連続記録を維持できる</div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 'bold', color: '#a855f7' }}>×{state.skipPasses}</div>
        </div>
      </div>

      {/* メニュー */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
        <Link
          href="/meal"
          style={{
            background: '#22c55e', color: 'white',
            padding: '12px 24px', borderRadius: 999, textDecoration: 'none',
            fontWeight: 'bold', fontSize: 14, flex: 1, textAlign: 'center',
          }}
        >
          🍽 食事を記録する
        </Link>
      </div>

      {/* リセット */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <button
          onClick={() => setShowResetConfirm(true)}
          style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
        >
          ペットをリセット（最初の卵に戻す）
        </button>
      </div>

      {showResetConfirm && (
        <div
          onClick={() => setShowResetConfirm(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 16, padding: 24, maxWidth: 320, margin: 16 }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>本当にリセットしますか？</h3>
            <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 16 }}>
              現在のペットの育成データはリセットされ、新しい卵から始まります（大人になっていれば図鑑には残ります）。
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowResetConfirm(false)}
                style={{ flex: 1, background: '#e5e7eb', color: '#374151', border: 'none', padding: 12, borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}
              >
                キャンセル
              </button>
              <button
                onClick={async () => { await handleAction('reset'); setShowResetConfirm(false) }}
                style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: 12, borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}
              >
                リセット
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
