'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface Exercise {
  name: string
  sets: number
  reps: number
  weight: number
  unit: string
}

interface WorkoutRecord {
  id: string
  date: string
  title: string
  duration: number
  calories: number
  exercises: Exercise[]
}

const demoWorkouts: WorkoutRecord[] = [
  {
    id: '1',
    date: '今日',
    title: '胸・三頭筋',
    duration: 65,
    calories: 320,
    exercises: [
      { name: 'ベンチプレス', sets: 4, reps: 8, weight: 80, unit: 'kg' },
      { name: 'インクラインDB', sets: 3, reps: 10, weight: 30, unit: 'kg' },
      { name: 'ケーブルクロス', sets: 3, reps: 12, weight: 20, unit: 'kg' },
      { name: 'トライセプス', sets: 3, reps: 12, weight: 30, unit: 'kg' },
    ],
  },
  {
    id: '2',
    date: '3月23日',
    title: '背中・二頭筋',
    duration: 70,
    calories: 380,
    exercises: [
      { name: 'デッドリフト', sets: 4, reps: 6, weight: 120, unit: 'kg' },
      { name: '懸垂', sets: 4, reps: 8, weight: 0, unit: 'BW' },
      { name: 'ロープロウ', sets: 3, reps: 10, weight: 60, unit: 'kg' },
    ],
  },
]

const muscleGroups = ['全部', '胸', '背中', '肩', '腕', '脚', '体幹']

export default function TrainingPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeGroup, setActiveGroup] = useState('全部')
  const [expanded, setExpanded] = useState<string | null>('1')

  return (
    <div className="flex flex-col">
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-gray-900">トレーニング</h1>
            <p className="text-xs text-gray-400 mt-0.5">ワークアウト記録</p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            記録
          </Button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Weekly summary */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '今週のトレ', value: '3', unit: '回' },
            { label: '総時間', value: '195', unit: '分' },
            { label: '消費カロリー', value: '1,050', unit: 'kcal' },
          ].map((stat) => (
            <Card key={stat.label} className="text-center">
              <div className="text-[10px] text-gray-400 mb-1">{stat.label}</div>
              <div className="text-xl font-black text-[#22c55e]">{stat.value}</div>
              <div className="text-[10px] text-gray-400">{stat.unit}</div>
            </Card>
          ))}
        </div>

        {/* Muscle group filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {muscleGroups.map((group) => (
            <button
              key={group}
              onClick={() => setActiveGroup(group)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
                activeGroup === group ? 'bg-[#22c55e] text-white' : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {group}
            </button>
          ))}
        </div>

        {/* Workout records */}
        <div className="space-y-3">
          {demoWorkouts.map((workout) => (
            <Card key={workout.id} padding="none">
              <button
                className="w-full px-4 py-3 flex items-center justify-between"
                onClick={() => setExpanded(expanded === workout.id ? null : workout.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#f0fdf4] rounded-xl flex items-center justify-center">
                    <span className="text-lg">💪</span>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-gray-800">{workout.title}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {workout.date} · {workout.duration}分 · {workout.calories} kcal
                    </div>
                  </div>
                </div>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"
                  className={`transition-transform ${expanded === workout.id ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {expanded === workout.id && (
                <div className="px-4 pb-3 border-t border-gray-50">
                  <div className="grid grid-cols-3 gap-1 text-[10px] font-semibold text-gray-400 py-2 border-b border-gray-50">
                    <span>種目</span>
                    <span className="text-center">セット×回数</span>
                    <span className="text-right">重量</span>
                  </div>
                  {workout.exercises.map((ex, i) => (
                    <div key={i} className="grid grid-cols-3 gap-1 py-2 border-b border-gray-50 last:border-0">
                      <span className="text-xs font-medium text-gray-800">{ex.name}</span>
                      <span className="text-xs text-gray-500 text-center">{ex.sets}×{ex.reps}</span>
                      <span className="text-xs font-semibold text-gray-800 text-right">
                        {ex.weight > 0 ? `${ex.weight}${ex.unit}` : ex.unit}
                      </span>
                    </div>
                  ))}
                  <div className="mt-2 flex gap-2">
                    <button className="flex-1 py-1.5 text-xs text-[#22c55e] font-semibold bg-[#f0fdf4] rounded-lg hover:bg-green-100 transition-colors">
                      編集
                    </button>
                    <button className="flex-1 py-1.5 text-xs text-red-400 font-semibold bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                      削除
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Personal records */}
        <Card>
          <h2 className="text-sm font-bold text-gray-800 mb-3">自己ベスト</h2>
          <div className="space-y-2">
            {[
              { name: 'ベンチプレス', weight: 100, unit: 'kg', date: '2月15日' },
              { name: 'スクワット', weight: 130, unit: 'kg', date: '3月10日' },
              { name: 'デッドリフト', weight: 140, unit: 'kg', date: '3月18日' },
            ].map((pr) => (
              <div key={pr.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🏆</span>
                  <span className="text-xs font-semibold text-gray-800">{pr.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-[#22c55e]">{pr.weight}</span>
                  <span className="text-xs text-gray-400 ml-0.5">{pr.unit}</span>
                  <div className="text-[9px] text-gray-400">{pr.date}</div>
                </div>
              </div>
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
            <h3 className="text-base font-bold text-gray-900 mb-4">トレーニングを記録</h3>
            <p className="text-sm text-gray-500 mb-4">本日のワークアウトを記録します</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {['胸・三頭筋', '背中・二頭筋', '肩', '脚・臀部', '腕', 'カスタム'].map((t) => (
                <button
                  key={t}
                  className="py-3 px-4 bg-gray-50 rounded-xl border border-gray-100 text-xs font-semibold text-gray-700 hover:bg-[#f0fdf4] hover:border-green-200 hover:text-[#22c55e] transition-all text-left"
                >
                  {t}
                </button>
              ))}
            </div>
            <Button variant="ghost" fullWidth onClick={() => setShowAddModal(false)}>
              キャンセル
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
