'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api'
import { Character } from '@/components/pet/Character'
import { FORM_INFO, type PetForm } from '@/lib/pet/types'

interface HistoryEntry {
  id: string
  pet_name: string
  final_form: PetForm
  graduated_at: string
  meals_count: number
  streak_max_days: number
  reason: string
}

const ALL_FORMS: PetForm[] = ['energy', 'muscle', 'fluffy', 'green', 'gold', 'secret_ninja', 'secret_warrior']

export default function PetCollectionPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) return
      const r = await apiFetch(`/api/pet/history?userId=${session.user.id}`)
      if (r.ok) {
        const j = await r.json() as { history?: HistoryEntry[] }
        setHistory(j.history || [])
      }
      setLoading(false)
    })()
  }, [])

  // 各フォームについて獲得済みかどうかを判定
  const owned = new Set(history.map(h => h.final_form))

  return (
    <div style={{ padding: '20px 16px 80px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 'bold' }}>📖 おにぎり図鑑</h1>
        <Link href="/pet" style={{ color: '#16a34a', textDecoration: 'none', fontSize: 14 }}>← 戻る</Link>
      </div>

      <div style={{ background: '#FEF9C3', borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 13, color: '#854D0E' }}>
        🏆 コンプリート率：<strong>{owned.size} / {ALL_FORMS.length}</strong>（{Math.round(owned.size / ALL_FORMS.length * 100)}%）
      </div>

      {/* 全フォーム一覧（未獲得は???） */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        {ALL_FORMS.map(form => {
          const info = FORM_INFO[form]
          const isOwned = owned.has(form)
          const entry = history.find(h => h.final_form === form)
          return (
            <div
              key={form}
              style={{
                background: 'white', borderRadius: 12, padding: 12, textAlign: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                border: isOwned ? '2px solid #fbbf24' : '2px solid transparent',
                opacity: isOwned ? 1 : 0.4,
              }}
            >
              {isOwned ? (
                <Character stage="adult" form={form} hp={100} size={100} animated={false} />
              ) : (
                <div style={{ fontSize: 60, padding: '10px 0' }}>❓</div>
              )}
              <div style={{ fontSize: 14, fontWeight: 'bold', marginTop: 4 }}>
                {isOwned ? `${info.emoji} ${info.label}` : '???'}
              </div>
              <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                {'⭐'.repeat(info.rarity)}
              </div>
              {isOwned && entry && (
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
                  {new Date(entry.graduated_at).toLocaleDateString('ja-JP')}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 卒業履歴 */}
      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>🎓 卒業履歴</h2>
        {loading ? (
          <p style={{ color: '#6b7280', fontSize: 13 }}>読み込み中…</p>
        ) : history.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 12, padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
            まだ卒業したペットはいません<br />
            <span style={{ fontSize: 11 }}>食事を続けて大人まで育てよう！</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map(h => {
              const info = FORM_INFO[h.final_form]
              return (
                <div key={h.id} style={{ background: 'white', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Character stage="adult" form={h.final_form} hp={100} size={60} animated={false} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 'bold' }}>
                      {h.pet_name} - {info.emoji} {info.label}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                      {new Date(h.graduated_at).toLocaleDateString('ja-JP')}
                      ・🔥{h.streak_max_days}日 ・{h.meals_count}食
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
