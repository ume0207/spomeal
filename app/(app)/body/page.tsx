'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface BodyRecord {
  date: string
  weight: number
  bodyFat: number
  muscle: number
}

const demoRecords: BodyRecord[] = [
  { date: '3月25日', weight: 72.4, bodyFat: 18.5, muscle: 59.0 },
  { date: '3月24日', weight: 72.7, bodyFat: 18.7, muscle: 58.9 },
  { date: '3月23日', weight: 72.9, bodyFat: 18.9, muscle: 58.8 },
  { date: '3月22日', weight: 73.1, bodyFat: 19.0, muscle: 58.7 },
  { date: '3月21日', weight: 73.0, bodyFat: 19.1, muscle: 58.6 },
  { date: '3月20日', weight: 73.4, bodyFat: 19.2, muscle: 58.5 },
  { date: '3月19日', weight: 73.6, bodyFat: 19.4, muscle: 58.4 },
]

const weekWeights = [73.6, 73.4, 73.0, 73.1, 72.9, 72.7, 72.4]
const minW = Math.min(...weekWeights) - 0.5
const maxW = Math.max(...weekWeights) + 0.5

export default function BodyPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [newWeight, setNewWeight] = useState('')
  const [newBodyFat, setNewBodyFat] = useState('')
  const [newMuscle, setNewMuscle] = useState('')

  const latest = demoRecords[0]
  const prev = demoRecords[1]
  const weightChange = (latest.weight - prev.weight).toFixed(1)

  return (
    <div className="flex flex-col">
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-gray-900">体組成管理</h1>
            <p className="text-xs text-gray-400 mt-0.5">体重・体脂肪・筋肉量</p>
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
        {/* Current stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '体重', value: latest.weight, unit: 'kg', change: weightChange, isGreen: parseFloat(weightChange) <= 0 },
            { label: '体脂肪率', value: latest.bodyFat, unit: '%', change: ((latest.bodyFat - prev.bodyFat) < 0 ? '' : '+') + (latest.bodyFat - prev.bodyFat).toFixed(1), isGreen: latest.bodyFat < prev.bodyFat },
            { label: '筋肉量', value: latest.muscle, unit: 'kg', change: ((latest.muscle - prev.muscle) >= 0 ? '+' : '') + (latest.muscle - prev.muscle).toFixed(1), isGreen: latest.muscle > prev.muscle },
          ].map((stat) => (
            <Card key={stat.label} className="text-center">
              <div className="text-[10px] text-gray-400 mb-1">{stat.label}</div>
              <div className="text-xl font-black text-gray-900">{stat.value}</div>
              <div className="text-[10px] text-gray-400">{stat.unit}</div>
              <div className={`mt-1.5 text-[10px] font-semibold ${stat.isGreen ? 'text-green-600' : 'text-red-400'}`}>
                {stat.change}
              </div>
            </Card>
          ))}
        </div>

        {/* Weight chart */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-800">体重推移（7日間）</h2>
            <span className="text-xs text-gray-400">kg</span>
          </div>
          <div className="relative h-28">
            <svg width="100%" height="100%" viewBox="0 0 300 80" preserveAspectRatio="none">
              {/* Grid lines */}
              {[0, 25, 50, 75].map((y) => (
                <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="#f3f4f6" strokeWidth="1" />
              ))}
              {/* Area fill */}
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={weekWeights.map((w, i) => {
                  const x = (i / (weekWeights.length - 1)) * 300
                  const y = 75 - ((w - minW) / (maxW - minW)) * 65
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                }).join(' ') + ` L 300 80 L 0 80 Z`}
                fill="url(#areaGrad)"
              />
              {/* Line */}
              <path
                d={weekWeights.map((w, i) => {
                  const x = (i / (weekWeights.length - 1)) * 300
                  const y = 75 - ((w - minW) / (maxW - minW)) * 65
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                }).join(' ')}
                fill="none"
                stroke="#22c55e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Dots */}
              {weekWeights.map((w, i) => {
                const x = (i / (weekWeights.length - 1)) * 300
                const y = 75 - ((w - minW) / (maxW - minW)) * 65
                return (
                  <circle key={i} cx={x} cy={y} r={i === weekWeights.length - 1 ? 4 : 3}
                    fill={i === weekWeights.length - 1 ? '#22c55e' : 'white'}
                    stroke="#22c55e"
                    strokeWidth="2"
                  />
                )
              })}
            </svg>
          </div>
          <div className="flex justify-between mt-1">
            {['19日', '20日', '21日', '22日', '23日', '24日', '今日'].map((d) => (
              <span key={d} className="text-[9px] text-gray-300">{d}</span>
            ))}
          </div>
        </Card>

        {/* BMI */}
        <Card>
          <h2 className="text-sm font-bold text-gray-800 mb-3">BMI</h2>
          {(() => {
            const height = 175 // cm - demo
            const bmi = latest.weight / ((height / 100) ** 2)
            const bmiStr = bmi.toFixed(1)
            const bmiLabel = bmi < 18.5 ? '低体重' : bmi < 25 ? '普通体重' : bmi < 30 ? '肥満(1度)' : '肥満(2度以上)'
            const bmiColor = bmi < 18.5 ? '#3b82f6' : bmi < 25 ? '#22c55e' : bmi < 30 ? '#f59e0b' : '#ef4444'
            const pct = Math.min(Math.max(((bmi - 15) / (35 - 15)) * 100, 0), 100)
            return (
              <>
                <div className="flex items-end gap-3 mb-3">
                  <span className="text-3xl font-black text-gray-900">{bmiStr}</span>
                  <span className="text-sm font-semibold mb-0.5" style={{ color: bmiColor }}>{bmiLabel}</span>
                </div>
                <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div className="absolute inset-0 flex">
                    {[
                      { width: 18, color: '#93c5fd' },
                      { width: 30, color: '#86efac' },
                      { width: 20, color: '#fde68a' },
                      { width: 32, color: '#fca5a5' },
                    ].map((seg, i) => (
                      <div key={i} style={{ width: `${seg.width}%`, backgroundColor: seg.color }} />
                    ))}
                  </div>
                  <div
                    className="absolute top-0 w-1 h-full bg-gray-800 rounded-full"
                    style={{ left: `calc(${pct}% - 2px)` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                  <span>低体重 &lt;18.5</span>
                  <span>標準 18.5-24.9</span>
                  <span>肥満 25+</span>
                </div>
              </>
            )
          })()}
        </Card>

        {/* History */}
        <Card>
          <h2 className="text-sm font-bold text-gray-800 mb-3">記録履歴</h2>
          <div className="divide-y divide-gray-50">
            {demoRecords.map((record, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between">
                <div className="text-xs text-gray-500 w-14">{record.date}</div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <div className="text-xs font-bold text-gray-800">{record.weight}</div>
                    <div className="text-[9px] text-gray-400">kg</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-bold text-gray-800">{record.bodyFat}</div>
                    <div className="text-[9px] text-gray-400">%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-bold text-gray-800">{record.muscle}</div>
                    <div className="text-[9px] text-gray-400">筋肉kg</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Add Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddModal(false)} />
          <div className="relative z-10 w-full max-w-[640px] bg-white rounded-t-[24px] p-6">
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="text-base font-bold text-gray-900 mb-4">体組成を記録</h3>
            <div className="space-y-3">
              <Input
                label="体重 (kg)"
                type="number"
                step="0.1"
                placeholder="72.5"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
              />
              <Input
                label="体脂肪率 (%)"
                type="number"
                step="0.1"
                placeholder="18.5"
                value={newBodyFat}
                onChange={(e) => setNewBodyFat(e.target.value)}
              />
              <Input
                label="筋肉量 (kg)"
                type="number"
                step="0.1"
                placeholder="59.0"
                value={newMuscle}
                onChange={(e) => setNewMuscle(e.target.value)}
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" fullWidth onClick={() => setShowAddModal(false)}>
                キャンセル
              </Button>
              <Button variant="primary" fullWidth onClick={() => setShowAddModal(false)}>
                記録する
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
