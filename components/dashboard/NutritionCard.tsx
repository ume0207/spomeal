'use client'

interface NutritionItem {
  label: string
  current: number
  target: number
  unit: string
  color: string
}

interface NutritionCardProps {
  calories: { current: number; target: number }
  protein: { current: number; target: number }
  fat: { current: number; target: number }
  carbs: { current: number; target: number }
}

function ProgressBar({ current, target, color }: { current: number; target: number; color: string }) {
  const percent = Math.min((current / target) * 100, 100)
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${percent}%`, backgroundColor: color }}
      />
    </div>
  )
}

function PFCItem({ label, current, target, unit, color }: NutritionItem) {
  const percent = Math.min(Math.round((current / target) * 100), 100)
  return (
    <div className="flex-1">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-semibold" style={{ color }}>{label}</span>
        <span className="text-xs text-gray-400">{percent}%</span>
      </div>
      <ProgressBar current={current} target={target} color={color} />
      <div className="mt-1 text-xs text-gray-500">
        <span className="font-semibold text-gray-800">{current}</span>/{target}{unit}
      </div>
    </div>
  )
}

export default function NutritionCard({ calories, protein, fat, carbs }: NutritionCardProps) {
  const calPercent = Math.min(Math.round((calories.current / calories.target) * 100), 100)
  const circumference = 2 * Math.PI * 40
  const strokeDashoffset = circumference - (calPercent / 100) * circumference

  return (
    <div className="bg-white rounded-[14px] shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-800">本日の栄養摂取</h2>
        <span className="text-xs text-gray-400">目標比</span>
      </div>

      <div className="flex items-center gap-4 mb-4">
        {/* Circular calorie gauge */}
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
            <circle cx="48" cy="48" r="40" fill="none" stroke="#f0fdf4" strokeWidth="10" />
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="#22c55e"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-gray-400">kcal</span>
            <span className="text-lg font-bold text-gray-900">{calories.current}</span>
            <span className="text-[10px] text-gray-400">/{calories.target}</span>
          </div>
        </div>

        {/* PFC breakdown */}
        <div className="flex-1 space-y-3">
          <PFCItem label="タンパク質" current={protein.current} target={protein.target} unit="g" color="#22c55e" />
          <PFCItem label="脂質" current={fat.current} target={fat.target} unit="g" color="#f59e0b" />
          <PFCItem label="炭水化物" current={carbs.current} target={carbs.target} unit="g" color="#3b82f6" />
        </div>
      </div>

      <div className="bg-[#f0fdf4] rounded-xl p-3 flex justify-between items-center">
        <div className="text-center">
          <div className="text-[10px] text-gray-500 mb-0.5">残りカロリー</div>
          <div className="text-sm font-bold text-[#16a34a]">{calories.target - calories.current} kcal</div>
        </div>
        <div className="w-px h-8 bg-green-200" />
        <div className="text-center">
          <div className="text-[10px] text-gray-500 mb-0.5">消費カロリー</div>
          <div className="text-sm font-bold text-gray-700">320 kcal</div>
        </div>
        <div className="w-px h-8 bg-green-200" />
        <div className="text-center">
          <div className="text-[10px] text-gray-500 mb-0.5">達成率</div>
          <div className="text-sm font-bold text-[#22c55e]">{calPercent}%</div>
        </div>
      </div>
    </div>
  )
}
