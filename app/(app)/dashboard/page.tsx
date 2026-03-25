import Link from 'next/link'
import NutritionCard from '@/components/dashboard/NutritionCard'
import Card from '@/components/ui/Card'

const today = new Date()
const dateStr = today.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })

export default function DashboardPage() {
  // Demo data
  const nutrition = {
    calories: { current: 1420, target: 2200 },
    protein: { current: 98, target: 160 },
    fat: { current: 42, target: 60 },
    carbs: { current: 165, target: 250 },
  }

  const quickActions = [
    { href: '/meal', label: '食事を記録', icon: '🍱', color: '#f0fdf4', border: '#bbf7d0' },
    { href: '/body', label: '体重を記録', icon: '⚖️', color: '#eff6ff', border: '#bfdbfe' },
    { href: '/training', label: 'トレーニング', icon: '💪', color: '#fef3c7', border: '#fde68a' },
    { href: '/supplement', label: 'サプリ記録', icon: '💊', color: '#fdf4ff', border: '#e9d5ff' },
  ]

  const recentMeals = [
    { name: '朝食', time: '07:30', items: 'オートミール、プロテイン', kcal: 380 },
    { name: '昼食', time: '12:15', items: '鶏胸肉定食、サラダ', kcal: 650 },
    { name: '間食', time: '15:00', items: 'プロテインバー', kcal: 210 },
  ]

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">{dateStr}</p>
            <h1 className="text-lg font-black text-[#1a1a1a] mt-0.5">
              スポ<span className="text-[#22c55e]">ミル</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/plans"
              className="px-3 py-1.5 bg-[#f0fdf4] text-[#16a34a] text-xs font-semibold rounded-xl border border-green-200 hover:bg-green-100 transition-colors"
            >
              プラン
            </Link>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center">
              <span className="text-white text-sm font-bold">U</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Nutrition card */}
        <NutritionCard {...nutrition} />

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-bold text-gray-700 mb-3">クイックアクション</h2>
          <div className="grid grid-cols-4 gap-2">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-1.5 p-3 rounded-[14px] border transition-all active:scale-95"
                style={{ backgroundColor: action.color, borderColor: action.border }}
              >
                <span className="text-xl">{action.icon}</span>
                <span className="text-[10px] font-semibold text-gray-600 text-center leading-tight">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Today's body stats */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-800">今日の体重</h2>
            <Link href="/body" className="text-xs text-[#22c55e] font-medium">詳細 →</Link>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <span className="text-3xl font-black text-gray-900">72.4</span>
              <span className="text-sm text-gray-400 ml-1">kg</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-green-600 font-semibold mb-0.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
              -0.3 kg
            </div>
            <div className="text-xs text-gray-400 mb-0.5">前日比</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="bg-gray-50 rounded-xl p-2.5">
              <div className="text-[10px] text-gray-400 mb-0.5">体脂肪率</div>
              <div className="text-base font-bold text-gray-800">18.5<span className="text-xs font-normal text-gray-400 ml-0.5">%</span></div>
            </div>
            <div className="bg-gray-50 rounded-xl p-2.5">
              <div className="text-[10px] text-gray-400 mb-0.5">筋肉量</div>
              <div className="text-base font-bold text-gray-800">59.0<span className="text-xs font-normal text-gray-400 ml-0.5">kg</span></div>
            </div>
          </div>
        </Card>

        {/* Recent meals */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-800">今日の食事</h2>
            <Link href="/meal" className="text-xs text-[#22c55e] font-medium">すべて →</Link>
          </div>
          <div className="space-y-2">
            {recentMeals.map((meal, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#f0fdf4] rounded-xl flex items-center justify-center">
                    <span className="text-xs font-bold text-[#22c55e]">{meal.name.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-800">{meal.name}</div>
                    <div className="text-[10px] text-gray-400">{meal.time} · {meal.items}</div>
                  </div>
                </div>
                <div className="text-xs font-semibold text-gray-600">{meal.kcal} <span className="text-[10px] text-gray-400">kcal</span></div>
              </div>
            ))}
          </div>
          <Link
            href="/meal"
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-green-300 text-xs text-[#22c55e] font-semibold hover:bg-[#f0fdf4] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            食事を追加
          </Link>
        </Card>

        {/* Weekly summary */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-800">今週の達成率</h2>
            <span className="text-xs text-gray-400">月〜日</span>
          </div>
          <div className="flex gap-1 items-end h-16">
            {[65, 80, 45, 90, 72, 88, 64].map((val, i) => {
              const days = ['月', '火', '水', '木', '金', '土', '日']
              const isToday = i === 3
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full relative" style={{ height: `${val * 0.48}px` }}>
                    <div
                      className="absolute bottom-0 w-full rounded-t-sm transition-all"
                      style={{
                        height: '100%',
                        backgroundColor: isToday ? '#22c55e' : '#dcfce7',
                      }}
                    />
                  </div>
                  <span className={`text-[10px] font-semibold ${isToday ? 'text-[#22c55e]' : 'text-gray-300'}`}>{days[i]}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
