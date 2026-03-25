'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface MealEntry {
  id: string
  name: string
  time: string
  category: string
  calories: number
  protein: number
  fat: number
  carbs: number
}

const demoMeals: MealEntry[] = [
  { id: '1', name: 'オートミール', time: '07:30', category: '朝食', calories: 150, protein: 5, fat: 3, carbs: 27 },
  { id: '2', name: 'プロテインシェイク', time: '07:30', category: '朝食', calories: 130, protein: 25, fat: 2, carbs: 5 },
  { id: '3', name: '鶏胸肉（ソテー）', time: '12:15', category: '昼食', calories: 200, protein: 40, fat: 5, carbs: 0 },
  { id: '4', name: '白米', time: '12:15', category: '昼食', calories: 250, protein: 4, fat: 0, carbs: 55 },
  { id: '5', name: 'サラダ', time: '12:15', category: '昼食', calories: 50, protein: 2, fat: 2, carbs: 8 },
  { id: '6', name: 'プロテインバー', time: '15:00', category: '間食', calories: 210, protein: 20, fat: 8, carbs: 20 },
]

const categories = ['朝食', '昼食', '夕食', '間食']

export default function MealPage() {
  const [meals] = useState<MealEntry[]>(demoMeals)
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const totals = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      fat: acc.fat + meal.fat,
      carbs: acc.carbs + meal.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  )

  const groupedMeals = categories.reduce((acc, cat) => {
    acc[cat] = meals.filter((m) => m.category === cat)
    return acc
  }, {} as Record<string, MealEntry[]>)

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-gray-900">食事管理</h1>
            <p className="text-xs text-gray-400 mt-0.5">今日の食事記録</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            食事を追加
          </Button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Daily summary */}
        <Card className="bg-gradient-to-br from-[#22c55e] to-[#16a34a] text-white" padding="none">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-green-100">本日の合計</span>
              <span className="text-xs text-green-200">目標: 2,200 kcal</span>
            </div>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-4xl font-black">{totals.calories}</span>
              <span className="text-sm text-green-200 mb-1">kcal</span>
              <span className="text-sm text-green-200 mb-1 ml-2">残り {2200 - totals.calories} kcal</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'タンパク質', value: totals.protein, target: 160, unit: 'g', color: '#86efac' },
                { label: '脂質', value: totals.fat, target: 60, unit: 'g', color: '#fde68a' },
                { label: '炭水化物', value: totals.carbs, target: 250, unit: 'g', color: '#93c5fd' },
              ].map((item) => (
                <div key={item.label} className="bg-white/10 rounded-xl p-2.5">
                  <div className="text-[10px] text-green-100 mb-1">{item.label}</div>
                  <div className="text-sm font-bold">
                    {item.value}<span className="text-xs font-normal text-green-200">{item.unit}</span>
                  </div>
                  <div className="mt-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min((item.value / item.target) * 100, 100)}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
              activeCategory === null ? 'bg-[#22c55e] text-white' : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            すべて
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
                activeCategory === cat ? 'bg-[#22c55e] text-white' : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Meal list by category */}
        {categories.map((cat) => {
          const catMeals = groupedMeals[cat]
          if (activeCategory && activeCategory !== cat) return null
          return (
            <Card key={cat} padding="none">
              <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-800">{cat}</span>
                  {catMeals.length > 0 && (
                    <span className="text-xs text-gray-400">
                      {catMeals.reduce((s, m) => s + m.calories, 0)} kcal
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="text-xs text-[#22c55e] font-semibold hover:text-[#16a34a]"
                >
                  + 追加
                </button>
              </div>
              {catMeals.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs text-gray-400">まだ記録がありません</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {catMeals.map((meal) => (
                    <div key={meal.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#f0fdf4] rounded-xl flex items-center justify-center text-sm">
                          🍽️
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-800">{meal.name}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            P: {meal.protein}g · F: {meal.fat}g · C: {meal.carbs}g
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-800">{meal.calories}</div>
                          <div className="text-[10px] text-gray-400">kcal</div>
                        </div>
                        <button className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14H6L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Add Meal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative z-10 w-full max-w-[640px] bg-white rounded-t-[24px] p-6">
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="text-base font-bold text-gray-900 mb-4">食事を追加</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { icon: '📷', label: '写真から解析', sublabel: 'AI自動認識', premium: true },
                { icon: '🔍', label: '食品検索', sublabel: 'データベース検索' },
                { icon: '✏️', label: '手入力', sublabel: '自分で入力' },
                { icon: '📋', label: 'よく食べる', sublabel: 'お気に入り' },
              ].map((item) => (
                <button
                  key={item.label}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <div className="text-xs font-semibold text-gray-800 flex items-center gap-1">
                      {item.label}
                      {item.premium && (
                        <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded-md font-bold">PRO</span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400">{item.sublabel}</div>
                  </div>
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
