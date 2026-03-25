'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Link from 'next/link'

interface Supplement {
  id: string
  name: string
  type: string
  timing: string
  dose: string
  taken: boolean
  icon: string
}

const demoSupplements: Supplement[] = [
  { id: '1', name: 'ホエイプロテイン', type: 'プロテイン', timing: 'トレーニング後', dose: '30g', taken: true, icon: '🥛' },
  { id: '2', name: 'クレアチン', type: 'パフォーマンス', timing: 'トレーニング前', dose: '5g', taken: true, icon: '⚡' },
  { id: '3', name: 'BCAA', type: 'アミノ酸', timing: 'トレーニング中', dose: '10g', taken: false, icon: '💊' },
  { id: '4', name: 'マルチビタミン', type: 'ビタミン', timing: '朝食後', dose: '1粒', taken: true, icon: '🌿' },
  { id: '5', name: 'オメガ3', type: '脂肪酸', timing: '夕食後', dose: '2粒', taken: false, icon: '🐟' },
  { id: '6', name: 'ZMA', type: 'ミネラル', timing: '就寝前', dose: '3粒', taken: false, icon: '🌙' },
]

const timings = ['朝食後', 'トレーニング前', 'トレーニング中', 'トレーニング後', '夕食後', '就寝前']

export default function SupplementPage() {
  const [supplements, setSupplements] = useState(demoSupplements)
  const [showAddModal, setShowAddModal] = useState(false)

  const toggleTaken = (id: string) => {
    setSupplements((prev) =>
      prev.map((s) => (s.id === id ? { ...s, taken: !s.taken } : s))
    )
  }

  const takenCount = supplements.filter((s) => s.taken).length

  return (
    <div className="flex flex-col">
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-gray-900">サプリ管理</h1>
            <p className="text-xs text-gray-400 mt-0.5">サプリメント摂取記録</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/plans" className="text-xs text-gray-400 hover:text-[#22c55e]">
              その他
            </Link>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              追加
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Today's progress */}
        <Card className="bg-gradient-to-br from-[#22c55e] to-[#16a34a] text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold">今日の摂取状況</span>
            <span className="text-xs text-green-100">{takenCount}/{supplements.length}</span>
          </div>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-4xl font-black">{Math.round((takenCount / supplements.length) * 100)}</span>
            <span className="text-sm text-green-100 mb-1">%</span>
          </div>
          <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-700"
              style={{ width: `${(takenCount / supplements.length) * 100}%` }}
            />
          </div>
          <div className="mt-2 flex gap-2">
            {supplements.map((s) => (
              <div
                key={s.id}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  s.taken ? 'bg-white text-green-600' : 'bg-white/20 text-white'
                }`}
              >
                {s.taken ? '✓' : '·'}
              </div>
            ))}
          </div>
        </Card>

        {/* Supplement list by timing */}
        {timings.map((timing) => {
          const timingSupps = supplements.filter((s) => s.timing === timing)
          if (timingSupps.length === 0) return null
          return (
            <div key={timing}>
              <h2 className="text-xs font-bold text-gray-500 mb-2 px-1">{timing}</h2>
              <Card padding="none">
                <div className="divide-y divide-gray-50">
                  {timingSupps.map((supp) => (
                    <div key={supp.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                          supp.taken ? 'bg-[#f0fdf4]' : 'bg-gray-50'
                        }`}>
                          {supp.icon}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-800">{supp.name}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{supp.type} · {supp.dose}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleTaken(supp.id)}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                          supp.taken
                            ? 'bg-[#22c55e] text-white shadow-sm shadow-green-200'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )
        })}

        {/* Quick links */}
        <Card>
          <h2 className="text-sm font-bold text-gray-800 mb-3">その他の機能</h2>
          <div className="space-y-2">
            {[
              { href: '/plans', icon: '💎', label: 'プラン・料金', desc: 'サブスクリプション管理' },
              { href: '#', icon: '🔔', label: '通知設定', desc: '摂取リマインダー' },
              { href: '#', icon: '📊', label: '週次レポート', desc: '摂取傾向を確認' },
              { href: '#', icon: '👤', label: 'プロフィール', desc: '目標・設定の変更' },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-lg">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-gray-800">{item.label}</div>
                  <div className="text-[10px] text-gray-400">{item.desc}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddModal(false)} />
          <div className="relative z-10 w-full max-w-[640px] bg-white rounded-t-[24px] p-6">
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="text-base font-bold text-gray-900 mb-4">サプリを追加</h3>
            <p className="text-sm text-gray-500 mb-4">管理するサプリメントを追加します</p>
            <Button variant="primary" fullWidth onClick={() => setShowAddModal(false)}>
              追加する
            </Button>
            <Button variant="ghost" fullWidth className="mt-2" onClick={() => setShowAddModal(false)}>
              キャンセル
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
