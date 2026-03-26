'use client'

import { useState, useEffect, useCallback } from 'react'

// ===== 食品DB (100品目以上) =====
const FOOD_DB: Record<string, { kcal: number; p: number; f: number; c: number }> = {
  'ご飯': { kcal: 168, p: 2.5, f: 0.3, c: 37.1 }, '白米': { kcal: 168, p: 2.5, f: 0.3, c: 37.1 },
  'パン': { kcal: 264, p: 9.3, f: 4.2, c: 46.6 }, '食パン': { kcal: 264, p: 9.3, f: 4.2, c: 46.6 },
  'うどん': { kcal: 105, p: 2.6, f: 0.4, c: 21.6 }, 'そば': { kcal: 132, p: 4.8, f: 1.0, c: 26.0 },
  'パスタ': { kcal: 165, p: 5.8, f: 0.9, c: 32.2 }, 'オートミール': { kcal: 380, p: 13.7, f: 5.7, c: 69.1 },
  'おにぎり': { kcal: 179, p: 3.1, f: 0.8, c: 38.5 }, 'グラノーラ': { kcal: 429, p: 8.2, f: 14.5, c: 67.6 },
  'バナナ': { kcal: 86, p: 1.1, f: 0.2, c: 22.5 }, 'りんご': { kcal: 61, p: 0.2, f: 0.2, c: 16.2 },
  'みかん': { kcal: 45, p: 0.7, f: 0.1, c: 12.0 }, 'いちご': { kcal: 34, p: 0.9, f: 0.1, c: 8.5 },
  'アボカド': { kcal: 187, p: 2.5, f: 18.7, c: 7.9 }, 'キウイ': { kcal: 53, p: 1.0, f: 0.1, c: 13.5 },
  'キャベツ': { kcal: 23, p: 1.3, f: 0.2, c: 5.2 }, 'レタス': { kcal: 12, p: 0.6, f: 0.1, c: 2.8 },
  'ほうれん草': { kcal: 25, p: 2.2, f: 0.4, c: 3.1 }, 'ブロッコリー': { kcal: 33, p: 4.3, f: 0.5, c: 5.2 },
  'トマト': { kcal: 20, p: 0.7, f: 0.1, c: 4.7 }, 'にんじん': { kcal: 39, p: 0.7, f: 0.2, c: 9.3 },
  '玉ねぎ': { kcal: 40, p: 1.0, f: 0.1, c: 9.3 }, 'じゃがいも': { kcal: 76, p: 1.8, f: 0.1, c: 17.3 },
  'さつまいも': { kcal: 140, p: 0.9, f: 0.5, c: 33.1 }, 'かぼちゃ': { kcal: 91, p: 1.9, f: 0.3, c: 21.3 },
  'アスパラガス': { kcal: 22, p: 2.6, f: 0.2, c: 3.9 }, 'きゅうり': { kcal: 14, p: 1.0, f: 0.1, c: 3.0 },
  'なす': { kcal: 22, p: 1.1, f: 0.1, c: 5.1 }, 'ピーマン': { kcal: 22, p: 0.9, f: 0.2, c: 5.1 },
  '豆腐': { kcal: 73, p: 7.0, f: 4.3, c: 1.5 }, '木綿豆腐': { kcal: 73, p: 7.0, f: 4.3, c: 1.5 },
  '絹ごし豆腐': { kcal: 56, p: 5.3, f: 3.0, c: 2.0 }, '納豆': { kcal: 200, p: 16.5, f: 10.0, c: 12.1 },
  '枝豆': { kcal: 135, p: 11.7, f: 6.2, c: 8.8 }, '豆乳': { kcal: 46, p: 3.6, f: 2.0, c: 3.1 },
  'まぐろ': { kcal: 125, p: 26.4, f: 1.4, c: 0.1 }, 'まぐろ赤身': { kcal: 125, p: 26.4, f: 1.4, c: 0.1 },
  'かつお': { kcal: 114, p: 25.8, f: 0.5, c: 0.1 }, 'さば': { kcal: 211, p: 20.6, f: 16.8, c: 0.3 },
  'さば水煮缶': { kcal: 190, p: 20.9, f: 10.7, c: 0.2 }, 'サバ缶': { kcal: 190, p: 20.9, f: 10.7, c: 0.2 },
  'いわし': { kcal: 169, p: 19.2, f: 9.2, c: 0.2 }, 'さんま': { kcal: 318, p: 18.1, f: 25.6, c: 0.1 },
  'あじ': { kcal: 112, p: 19.7, f: 4.5, c: 0.1 }, '鮭': { kcal: 133, p: 22.3, f: 4.1, c: 0.1 },
  'サーモン': { kcal: 204, p: 20.1, f: 12.7, c: 0.1 }, 'たら': { kcal: 77, p: 17.6, f: 0.2, c: 0.1 },
  'えび': { kcal: 82, p: 18.4, f: 0.3, c: 0.0 }, 'ほたて': { kcal: 72, p: 13.5, f: 0.9, c: 1.5 },
  'ツナ缶': { kcal: 71, p: 16.0, f: 0.7, c: 0.1 }, 'ツナ缶油漬け': { kcal: 267, p: 17.7, f: 21.7, c: 0.1 },
  '鶏むね肉': { kcal: 108, p: 23.3, f: 1.9, c: 0.0 }, '鶏もも肉': { kcal: 127, p: 19.0, f: 5.0, c: 0.0 },
  '鶏胸肉': { kcal: 108, p: 23.3, f: 1.9, c: 0.0 }, '鶏むね': { kcal: 108, p: 23.3, f: 1.9, c: 0.0 },
  '鶏もも': { kcal: 127, p: 19.0, f: 5.0, c: 0.0 }, 'サラダチキン': { kcal: 109, p: 24.0, f: 1.5, c: 0.5 },
  '豚もも肉': { kcal: 171, p: 21.3, f: 9.3, c: 0.1 }, '豚ロース': { kcal: 236, p: 19.3, f: 17.1, c: 0.2 },
  '豚バラ肉': { kcal: 395, p: 14.4, f: 35.4, c: 0.1 }, '豚ヒレ肉': { kcal: 118, p: 22.2, f: 3.7, c: 0.1 },
  '牛もも肉': { kcal: 215, p: 19.6, f: 14.4, c: 0.4 }, '牛ひき肉': { kcal: 272, p: 17.1, f: 21.1, c: 0.3 },
  '卵': { kcal: 151, p: 12.3, f: 10.3, c: 0.3 }, 'ゆで卵': { kcal: 151, p: 12.3, f: 10.3, c: 0.3 },
  '目玉焼き': { kcal: 182, p: 13.0, f: 14.0, c: 0.5 }, 'スクランブルエッグ': { kcal: 182, p: 12.0, f: 14.0, c: 1.0 },
  '牛乳': { kcal: 67, p: 3.3, f: 3.8, c: 4.8 }, 'ヨーグルト': { kcal: 62, p: 3.6, f: 3.0, c: 4.9 },
  '無糖ヨーグルト': { kcal: 56, p: 3.7, f: 3.0, c: 4.0 }, 'チーズ': { kcal: 339, p: 22.7, f: 26.0, c: 1.3 },
  'プロテイン': { kcal: 120, p: 24.0, f: 2.0, c: 4.0 }, 'プロテインシェイク': { kcal: 120, p: 24.0, f: 2.0, c: 4.0 },
  'プロテインバー': { kcal: 210, p: 20.0, f: 8.0, c: 20.0 }, 'から揚げ': { kcal: 290, p: 18.9, f: 18.5, c: 12.4 },
  '唐揚げ': { kcal: 290, p: 18.9, f: 18.5, c: 12.4 }, 'ハンバーグ': { kcal: 267, p: 13.4, f: 19.6, c: 10.0 },
  'カレーライス': { kcal: 478, p: 14.5, f: 12.5, c: 76.3 }, 'ラーメン': { kcal: 445, p: 16.8, f: 11.7, c: 67.5 },
  'チャーハン': { kcal: 194, p: 5.0, f: 6.6, c: 30.0 }, 'みそ汁': { kcal: 33, p: 2.2, f: 1.2, c: 3.7 },
  'アーモンド': { kcal: 598, p: 20.3, f: 51.8, c: 19.7 }, 'くるみ': { kcal: 713, p: 14.6, f: 68.8, c: 13.6 },
  'ピーナッツ': { kcal: 613, p: 25.4, f: 50.4, c: 17.9 }, 'オリーブオイル': { kcal: 894, p: 0.0, f: 100.0, c: 0.0 },
  'バター': { kcal: 745, p: 0.6, f: 81.0, c: 0.2 }, 'しいたけ': { kcal: 25, p: 3.0, f: 0.3, c: 6.4 },
  'えのき': { kcal: 22, p: 2.7, f: 0.2, c: 7.6 }, 'わかめ': { kcal: 24, p: 1.9, f: 0.2, c: 5.6 },
  'コーヒー': { kcal: 4, p: 0.2, f: 0.0, c: 0.7 }, 'スポーツドリンク': { kcal: 25, p: 0.0, f: 0.0, c: 6.2 },
  'オレンジジュース': { kcal: 42, p: 0.7, f: 0.1, c: 10.4 },
}

// ===== 型定義 =====
interface MealItem {
  foodName: string
  caloriesKcal: number
  proteinG: number
  fatG: number
  carbsG: number
}

interface MealRecord {
  id: string
  mealDate: string
  mealType: string
  foodName: string
  caloriesKcal: number
  proteinG: number
  fatG: number
  carbsG: number
  fiberG: number
  saltG: number
  items: MealItem[]
}

interface GoalData {
  cal: number
  protein: number
  fat: number
  carbs: number
  targetWeight?: number
  startDate?: string
  endDate?: string
  goalType?: string
}

const MEAL_KEY = 'mealRecords_v1'
const GOAL_KEY = 'goals_v1'

const categories = ['朝食', '昼食', '夕食', '間食']
const catIcons: Record<string, string> = { 朝食: '🌅', 昼食: '☀️', 夕食: '🌙', 間食: '🍪' }
const mealTypeMap: Record<string, string> = { breakfast: '朝食', lunch: '昼食', dinner: '夕食', snack: '間食' }
const mealTypeReverseMap: Record<string, string> = { 朝食: 'breakfast', 昼食: 'lunch', 夕食: 'dinner', 間食: 'snack' }

const defaultGoal: GoalData = { cal: 2000, protein: 160, fat: 60, carbs: 250 }

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default function MealPage() {
  const [records, setRecords] = useState<MealRecord[]>([])
  const [goal, setGoal] = useState<GoalData>(defaultGoal)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [currentDate, setCurrentDate] = useState<Date | null>(null)
  const [activeMealType, setActiveMealType] = useState<string>('lunch')

  // モーダルタブ
  const [activeTab, setActiveTab] = useState<'search' | 'fav' | 'manual'>('search')

  // 検索
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ name: string; data: typeof FOOD_DB[string] }>>([])

  // 手動入力
  const [manualName, setManualName] = useState('')
  const [manualKcal, setManualKcal] = useState('')
  const [manualProtein, setManualProtein] = useState('')
  const [manualFat, setManualFat] = useState('')
  const [manualCarbs, setManualCarbs] = useState('')

  // カートに追加した食品リスト
  const [cartItems, setCartItems] = useState<MealItem[]>([])

  // 目標設定フォーム
  const [goalCal, setGoalCal] = useState('')
  const [goalProtein, setGoalProtein] = useState('')
  const [goalFat, setGoalFat] = useState('')
  const [goalCarbs, setGoalCarbs] = useState('')
  const [goalTargetWeight, setGoalTargetWeight] = useState('')
  const [goalStartDate, setGoalStartDate] = useState('')
  const [goalEndDate, setGoalEndDate] = useState('')
  const [goalType, setGoalType] = useState('')

  // お気に入り（デモ）
  const favorites = Object.entries(FOOD_DB).slice(0, 8).map(([name, data]) => ({ name, data }))

  // 日付初期化（hydration安全）
  useEffect(() => {
    setCurrentDate(new Date())
  }, [])

  // localStorage読み込み
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(MEAL_KEY)
      if (raw) setRecords(JSON.parse(raw))
    } catch { /* ignore */ }
    try {
      const raw = localStorage.getItem(GOAL_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed['__default__']) setGoal(parsed['__default__'])
      }
    } catch { /* ignore */ }
  }, [])

  const saveRecords = useCallback((newRecords: MealRecord[]) => {
    setRecords(newRecords)
    if (typeof window !== 'undefined') {
      localStorage.setItem(MEAL_KEY, JSON.stringify(newRecords))
    }
  }, [])

  // 当日フィルタ（currentDate が null の間はローディング扱い）
  const dateStr = currentDate ? toDateStr(currentDate) : ''
  const todayRecords = records.filter(r => r.mealDate === dateStr)

  const totals = todayRecords.reduce(
    (acc, r) => ({
      calories: acc.calories + r.caloriesKcal,
      protein: acc.protein + r.proteinG,
      fat: acc.fat + r.fatG,
      carbs: acc.carbs + r.carbsG,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  )

  const calGoal = goal.cal
  const calPct = Math.min((totals.calories / calGoal) * 100, 100)
  const isOver = totals.calories > calGoal

  const groupedRecords = categories.reduce((acc, cat) => {
    acc[cat] = todayRecords.filter(r => r.mealType === cat)
    return acc
  }, {} as Record<string, MealRecord[]>)

  const prevDay = () => {
    const d = new Date(currentDate ?? new Date())
    d.setDate(d.getDate() - 1)
    setCurrentDate(d)
  }
  const nextDay = () => {
    const d = new Date(currentDate ?? new Date())
    d.setDate(d.getDate() + 1)
    setCurrentDate(d)
  }
  const dateLabel = currentDate
    ? `${currentDate.getFullYear()}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${String(currentDate.getDate()).padStart(2, '0')}`
    : '読み込み中...'

  const deleteRecord = (id: string) => {
    saveRecords(records.filter(r => r.id !== id))
  }

  // 検索
  const handleSearch = (q: string) => {
    setSearchQuery(q)
    if (!q.trim()) {
      setSearchResults([])
      return
    }
    const results = Object.entries(FOOD_DB)
      .filter(([name]) => name.includes(q))
      .slice(0, 20)
      .map(([name, data]) => ({ name, data }))
    setSearchResults(results)
  }

  // カートに追加
  const addToCart = (name: string, data: typeof FOOD_DB[string]) => {
    setCartItems(prev => [...prev, {
      foodName: name,
      caloriesKcal: data.kcal,
      proteinG: data.p,
      fatG: data.f,
      carbsG: data.c,
    }])
  }

  // 手動追加
  const addManualToCart = () => {
    if (!manualName.trim()) return
    setCartItems(prev => [...prev, {
      foodName: manualName,
      caloriesKcal: parseFloat(manualKcal) || 0,
      proteinG: parseFloat(manualProtein) || 0,
      fatG: parseFloat(manualFat) || 0,
      carbsG: parseFloat(manualCarbs) || 0,
    }])
    setManualName('')
    setManualKcal('')
    setManualProtein('')
    setManualFat('')
    setManualCarbs('')
  }

  const removeFromCart = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index))
  }

  const openAddModal = (cat?: string) => {
    if (cat) setActiveMealType(mealTypeReverseMap[cat] ?? 'lunch')
    setCartItems([])
    setSearchQuery('')
    setSearchResults([])
    setManualName('')
    setManualKcal('')
    setManualProtein('')
    setManualFat('')
    setManualCarbs('')
    setActiveTab('search')
    setShowAddModal(true)
  }

  // 記録する
  const handleRecord = () => {
    if (cartItems.length === 0) return
    const catName = mealTypeMap[activeMealType] ?? '昼食'
    const totKcal = cartItems.reduce((s, i) => s + i.caloriesKcal, 0)
    const totP = cartItems.reduce((s, i) => s + i.proteinG, 0)
    const totF = cartItems.reduce((s, i) => s + i.fatG, 0)
    const totC = cartItems.reduce((s, i) => s + i.carbsG, 0)
    const newRecord: MealRecord = {
      id: Date.now().toString(),
      mealDate: dateStr,
      mealType: catName,
      foodName: cartItems.map(i => i.foodName).join('、'),
      caloriesKcal: totKcal,
      proteinG: totP,
      fatG: totF,
      carbsG: totC,
      fiberG: 0,
      saltG: 0,
      items: cartItems,
    }
    saveRecords([...records, newRecord])
    setShowAddModal(false)
  }

  // 目標設定モーダルを開く
  const openGoalModal = () => {
    setGoalCal(String(goal.cal))
    setGoalProtein(String(goal.protein))
    setGoalFat(String(goal.fat))
    setGoalCarbs(String(goal.carbs))
    setGoalTargetWeight(goal.targetWeight != null ? String(goal.targetWeight) : '')
    setGoalStartDate(goal.startDate ?? '')
    setGoalEndDate(goal.endDate ?? '')
    setGoalType(goal.goalType ?? '')
    setShowGoalModal(true)
  }

  const handleSaveGoal = () => {
    const newGoal: GoalData = {
      cal: parseFloat(goalCal) || 2000,
      protein: parseFloat(goalProtein) || 160,
      fat: parseFloat(goalFat) || 60,
      carbs: parseFloat(goalCarbs) || 250,
      targetWeight: goalTargetWeight ? parseFloat(goalTargetWeight) : undefined,
      startDate: goalStartDate || undefined,
      endDate: goalEndDate || undefined,
      goalType: goalType || undefined,
    }
    setGoal(newGoal)
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(GOAL_KEY)
        const parsed = raw ? JSON.parse(raw) : {}
        parsed['__default__'] = newGoal
        localStorage.setItem(GOAL_KEY, JSON.stringify(parsed))
      } catch { /* ignore */ }
    }
    setShowGoalModal(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '10px 12px',
    fontSize: '14px',
    outline: 'none',
    color: '#1a1a1a',
    background: 'white',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  }

  const cartTotal = {
    kcal: cartItems.reduce((s, i) => s + i.caloriesKcal, 0),
    p: cartItems.reduce((s, i) => s + i.proteinG, 0),
    f: cartItems.reduce((s, i) => s + i.fatG, 0),
    c: cartItems.reduce((s, i) => s + i.carbsG, 0),
  }

  return (
    <div style={{ fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif", color: '#1a1a1a' }}>

      {/* ===== 日付ヘッダー ===== */}
      <div
        style={{
          background: '#22C55E',
          color: 'white',
          padding: '10px 16px',
          position: 'sticky',
          top: '126px',
          zIndex: 90,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '8px', minHeight: '40px', position: 'relative',
          }}
        >
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={prevDay}
                  style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  ◄
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  style={{
                    fontSize: '13px', fontWeight: 700, minWidth: '130px',
                    textAlign: 'center', color: 'white', padding: '2px 8px',
                    borderRadius: '4px', background: 'none', border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {dateLabel}
                </button>
                <button
                  onClick={nextDay}
                  style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  ►
                </button>
              </div>
              <span
                style={{
                  fontSize: '10px', background: 'rgba(255,255,255,0.3)',
                  borderRadius: '20px', padding: '1px 8px', fontWeight: 500,
                }}
              >
                {todayRecords.length > 0 ? `✓ ${todayRecords.length}件の記録` : '記録なし'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '12px 8px 100px' }}>

        {/* ===== 栄養サマリーカード ===== */}
        <div
          style={{
            background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '12px', padding: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>栄養サマリー</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={openGoalModal}
                style={{
                  fontSize: '14px', fontWeight: 700, color: '#22C55E',
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '4px 8px', border: '1px solid #22C55E', borderRadius: '8px',
                  background: 'none', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                ⚙ 目標設定
              </button>
            </div>
          </div>
          <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>カロリー</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '36px', fontWeight: 900, color: '#111827', lineHeight: 1 }}>
              {Math.round(totals.calories).toLocaleString()}
            </span>
            <span style={{ fontSize: '13px', color: '#9ca3af' }}>/ {calGoal.toLocaleString()} kcal</span>
          </div>
          <div
            style={{
              width: '100%', height: '12px', background: '#f3f4f6',
              borderRadius: '20px', overflow: 'hidden', margin: '8px 0 4px',
            }}
          >
            <div
              style={{
                height: '100%', borderRadius: '20px', width: `${calPct}%`,
                background: isOver
                  ? 'linear-gradient(90deg, #22C55E 0%, #F59E0B 60%, #EF4444 100%)'
                  : 'linear-gradient(90deg, #22C55E 0%, #86efac 100%)',
                transition: 'width 0.5s',
              }}
            />
          </div>
          {/* PFCグリッド */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', marginTop: '12px' }}>
            {[
              { label: 'たんぱく質', value: totals.protein, target: goal.protein, unit: 'g', color: '#3B82F6' },
              { label: '脂質', value: totals.fat, target: goal.fat, unit: 'g', color: '#F59E0B' },
              { label: '炭水化物', value: totals.carbs, target: goal.carbs, unit: 'g', color: '#10B981' },
            ].map((item) => (
              <div key={item.label}>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>{item.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 900, color: '#111827' }}>{item.value.toFixed(1)}</span>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>/ {item.target}{item.unit}</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#f3f4f6', borderRadius: '20px', overflow: 'hidden', marginTop: '4px' }}>
                  <div
                    style={{
                      height: '100%', borderRadius: '20px',
                      width: `${Math.min((item.value / item.target) * 100, 100)}%`,
                      background: item.color, transition: 'width 0.5s',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* ビタミン・ミネラルセクション */}
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', marginBottom: '8px' }}>
              ビタミン・ミネラル
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { label: '食物繊維', value: '8.2', unit: 'g', goal: '目標 21g', color: '#22C55E', pct: 39 },
                { label: '塩分', value: '3.1', unit: 'g', goal: '目標 7.5g', color: '#F59E0B', pct: 41 },
                { label: 'VitC', value: '45', unit: 'mg', goal: '目標 100mg', color: '#6366F1', pct: 45 },
                { label: 'カルシウム', value: '280', unit: 'mg', goal: '目標 650mg', color: '#EC4899', pct: 43 },
                { label: '鉄', value: '3.2', unit: 'mg', goal: '目標 7mg', color: '#EF4444', pct: 46 },
                { label: 'VitD', value: '4.5', unit: 'μg', goal: '目標 15μg', color: '#8B5CF6', pct: 30 },
              ].map((vit) => (
                <div
                  key={vit.label}
                  style={{ background: '#f9fafb', borderRadius: '8px', padding: '8px' }}
                >
                  <p style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px' }}>{vit.label}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>{vit.value}</span>
                    <span style={{ fontSize: '10px', color: '#9ca3af' }}>{vit.unit}</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: '#e5e7eb', borderRadius: '4px', marginTop: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '4px', width: `${vit.pct}%`, background: vit.color, transition: 'width 0.5s' }} />
                  </div>
                  <p style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{vit.goal}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ===== 食事タイムライン ===== */}
        {categories.map((cat) => {
          const catMeals = groupedRecords[cat]
          const catTotal = catMeals.reduce((s, m) => s + m.caloriesKcal, 0)
          return (
            <div
              key={cat}
              style={{
                background: 'white', border: '1px solid #f0f0f0', borderRadius: '16px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '12px',
              }}
            >
              {/* セクションヘッダー */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 16px', borderBottom: catMeals.length > 0 ? '1px solid #f3f4f6' : 'none',
                }}
              >
                <span style={{ fontSize: '18px' }}>{catIcons[cat]}</span>
                <span style={{ fontSize: '14px', fontWeight: 700, flex: 1 }}>{cat}</span>
                {catTotal > 0 && (
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                    {Math.round(catTotal)} kcal
                  </span>
                )}
                <button
                  onClick={() => openAddModal(cat)}
                  style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '20px', fontWeight: 300, color: '#22c55e', fontFamily: 'inherit',
                  }}
                >
                  ＋
                </button>
              </div>

              {catMeals.length === 0 ? (
                <div style={{ padding: '16px 4px', fontSize: '12px', color: '#d1d5db', textAlign: 'center' }}>
                  まだ記録がありません
                </div>
              ) : (
                <div style={{ borderTop: '1px solid #f3f4f6' }}>
                  {catMeals.map((record) => (
                    <div
                      key={record.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 16px', borderBottom: '1px solid #f8f8f8', gap: '8px',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '13px', fontWeight: 600, color: '#1f2937',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                        >
                          {record.foodName}
                        </div>
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                          P:{record.proteinG.toFixed(1)}g · F:{record.fatG.toFixed(1)}g · C:{record.carbsG.toFixed(1)}g
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '12px', fontWeight: 700, padding: '2px 8px',
                          borderRadius: '12px', background: '#f0fdf4', color: '#16a34a',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {Math.round(record.caloriesKcal)} kcal
                      </span>
                      <button
                        onClick={() => deleteRecord(record.id)}
                        style={{
                          width: '28px', height: '28px', borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#d1d5db', background: 'none', border: 'none',
                          cursor: 'pointer', fontSize: '14px',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#fee2e2'
                          e.currentTarget.style.color = '#ef4444'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'none'
                          e.currentTarget.style.color = '#d1d5db'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ===== FAB ===== */}
      <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 200 }}>
        <button
          onClick={() => openAddModal()}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: '#22C55E', color: 'white', fontWeight: 700,
            padding: '14px 32px', borderRadius: '50px',
            boxShadow: '0 8px 32px rgba(34,197,94,0.35)',
            fontSize: '15px', transition: 'all 0.2s',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <span style={{ fontSize: '20px', fontWeight: 300 }}>＋</span>
          食事を記録する
        </button>
      </div>

      {/* ===== 食事追加モーダル ===== */}
      {showAddModal && (
        <div
          style={{
            display: 'flex', position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 300,
            alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              background: 'white', width: '100%', maxWidth: '500px',
              borderRadius: '24px 24px 0 0', maxHeight: '92vh', overflowY: 'auto',
              display: 'flex', flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* モーダルヘッダー */}
            <div
              style={{
                position: 'sticky', top: 0, background: 'white',
                borderBottom: '1px solid #f0f0f0', padding: '16px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderRadius: '24px 24px 0 0', zIndex: 10,
              }}
            >
              <div>
                <p style={{ fontWeight: 700, color: '#111827', fontSize: '15px' }}>食事を記録する</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  fontSize: '20px', color: '#9ca3af', width: '32px', height: '32px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {/* 食事区分 4ボタン */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>
                  食事区分
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {[
                    { key: 'breakfast', icon: '🌅', label: '朝食' },
                    { key: 'lunch', icon: '☀️', label: '昼食' },
                    { key: 'dinner', icon: '🌙', label: '夕食' },
                    { key: 'snack', icon: '🍪', label: '間食' },
                  ].map((mt) => (
                    <button
                      key={mt.key}
                      onClick={() => setActiveMealType(mt.key)}
                      type="button"
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                        padding: '10px 4px', borderRadius: '12px',
                        border: activeMealType === mt.key ? '2px solid #22C55E' : '2px solid #e5e7eb',
                        background: activeMealType === mt.key ? '#f0fdf4' : 'white',
                        color: activeMealType === mt.key ? '#16a34a' : '#6b7280',
                        fontSize: '11px', fontWeight: 600, transition: 'all 0.2s',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ fontSize: '22px', lineHeight: 1 }}>{mt.icon}</span>
                      {mt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI栄養自動計算カード */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #faf5ff, #eef2ff)',
                  border: '1px solid #e9d5ff', borderRadius: '12px', padding: '12px', marginBottom: '12px',
                }}
              >
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#7c3aed', marginBottom: '8px' }}>
                  ✨ AI栄養自動計算
                </p>
                <textarea
                  placeholder="食事内容を打ち込んでください（例：白ゴハン150g、鶏胸肉のグリル200g、サラダ）"
                  rows={3}
                  style={{
                    width: '100%', border: '1px solid #d8b4fe', borderRadius: '8px',
                    padding: '8px 10px', fontSize: '12px', resize: 'none',
                    background: 'white', outline: 'none', color: '#374151',
                    fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
                <button
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '6px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    color: 'white', fontWeight: 700, padding: '11px', borderRadius: '10px',
                    fontSize: '13px', transition: 'all 0.2s', border: 'none', cursor: 'pointer',
                    marginTop: '8px', fontFamily: 'inherit',
                  }}
                >
                  ✨ AIで栄養素を自動計算
                </button>
              </div>

              {/* 3タブ：検索/お気に入り/手動 */}
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
                <div style={{ display: 'flex', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {[
                    { key: 'search' as const, label: '🔍 検索' },
                    { key: 'fav' as const, label: '⭐ お気に入り' },
                    { key: 'manual' as const, label: '✏️ 手動' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      style={{
                        flex: 1, padding: '9px 4px', fontSize: '12px', fontWeight: 600,
                        color: activeTab === tab.key ? '#22c55e' : '#9ca3af',
                        background: 'none', border: 'none',
                        borderBottom: activeTab === tab.key ? '2px solid #22c55e' : '2px solid transparent',
                        transition: 'all 0.2s', cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div style={{ padding: '12px' }}>
                  {/* 検索タブ */}
                  {activeTab === 'search' && (
                    <>
                      <input
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="食品名で検索（例：鶏胸肉、ご飯、バナナ）"
                        style={{
                          width: '100%', border: '1px solid #e5e7eb', borderRadius: '8px',
                          padding: '8px 10px', fontSize: '13px', outline: 'none', marginBottom: '8px',
                          boxSizing: 'border-box', fontFamily: 'inherit',
                        }}
                      />
                      {searchResults.length === 0 && searchQuery === '' && (
                        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '12px', padding: '20px 0' }}>
                          食品名を入力してください
                        </p>
                      )}
                      {searchResults.length === 0 && searchQuery !== '' && (
                        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '12px', padding: '20px 0' }}>
                          「{searchQuery}」に一致する食品が見つかりません
                        </p>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {searchResults.map((r) => (
                          <div
                            key={r.name}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '8px 10px', borderRadius: '8px', background: '#f9fafb',
                              border: '1px solid #f0f0f0',
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 600 }}>{r.name}</div>
                              <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '1px' }}>
                                {r.data.kcal}kcal · P{r.data.p}g · F{r.data.f}g · C{r.data.c}g
                              </div>
                            </div>
                            <button
                              onClick={() => addToCart(r.name, r.data)}
                              style={{
                                width: '28px', height: '28px', borderRadius: '50%',
                                background: '#22c55e', color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '18px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                                flexShrink: 0,
                              }}
                            >
                              ＋
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* お気に入りタブ */}
                  {activeTab === 'fav' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {favorites.map((r) => (
                        <div
                          key={r.name}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 10px', borderRadius: '8px', background: '#f9fafb',
                            border: '1px solid #f0f0f0',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600 }}>{r.name}</div>
                            <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '1px' }}>
                              {r.data.kcal}kcal · P{r.data.p}g · F{r.data.f}g · C{r.data.c}g
                            </div>
                          </div>
                          <button
                            onClick={() => addToCart(r.name, r.data)}
                            style={{
                              width: '28px', height: '28px', borderRadius: '50%',
                              background: '#22c55e', color: 'white',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '18px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                              flexShrink: 0,
                            }}
                          >
                            ＋
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 手動タブ */}
                  {activeTab === 'manual' && (
                    <div>
                      <div style={{ marginBottom: '8px' }}>
                        <input
                          value={manualName}
                          onChange={(e) => setManualName(e.target.value)}
                          placeholder="食品名"
                          style={{ ...inputStyle, marginBottom: '6px' }}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                          <input
                            value={manualKcal}
                            onChange={(e) => setManualKcal(e.target.value)}
                            placeholder="kcal"
                            type="number"
                            style={inputStyle}
                          />
                          <input
                            value={manualProtein}
                            onChange={(e) => setManualProtein(e.target.value)}
                            placeholder="たんぱく質 (g)"
                            type="number"
                            step="0.1"
                            style={inputStyle}
                          />
                          <input
                            value={manualFat}
                            onChange={(e) => setManualFat(e.target.value)}
                            placeholder="脂質 (g)"
                            type="number"
                            step="0.1"
                            style={inputStyle}
                          />
                          <input
                            value={manualCarbs}
                            onChange={(e) => setManualCarbs(e.target.value)}
                            placeholder="炭水化物 (g)"
                            type="number"
                            step="0.1"
                            style={inputStyle}
                          />
                        </div>
                        <button
                          onClick={addManualToCart}
                          style={{
                            width: '100%', padding: '9px', borderRadius: '8px',
                            background: '#f0fdf4', border: '1px solid #22c55e',
                            color: '#16a34a', fontWeight: 700, fontSize: '13px',
                            cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          リストに追加
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* カートアイテム */}
              {cartItems.length > 0 && (
                <div
                  style={{
                    border: '1px solid #bbf7d0', borderRadius: '12px',
                    background: '#f0fdf4', marginBottom: '8px',
                  }}
                >
                  <div style={{ padding: '10px 12px 0', fontSize: '12px', fontWeight: 700, color: '#15803d' }}>
                    追加リスト（{cartItems.length}品 · 合計 {Math.round(cartTotal.kcal)}kcal）
                  </div>
                  <div style={{ padding: '6px 12px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {cartItems.map((item, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '5px 8px', background: 'white', borderRadius: '8px',
                          border: '1px solid #dcfce7',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600 }}>{item.foodName}</div>
                          <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                            {Math.round(item.caloriesKcal)}kcal · P{item.proteinG.toFixed(1)}g
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromCart(i)}
                          style={{
                            fontSize: '14px', color: '#d1d5db', background: 'none',
                            border: 'none', cursor: 'pointer', padding: '2px 4px',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* モーダルフッター */}
            <div
              style={{
                display: 'flex', gap: '8px', padding: '12px 16px',
                borderTop: '1px solid #f3f4f6', background: 'white',
              }}
            >
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  flex: 1, padding: '11px', border: '1px solid #e5e7eb',
                  borderRadius: '10px', fontSize: '14px', fontWeight: 600,
                  color: '#6b7280', background: 'white', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleRecord}
                disabled={cartItems.length === 0}
                style={{
                  flex: 2, padding: '11px', borderRadius: '10px', fontSize: '14px',
                  fontWeight: 700, color: 'white',
                  background: cartItems.length > 0 ? '#22C55E' : '#9ca3af',
                  border: 'none', cursor: cartItems.length > 0 ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', transition: 'background 0.2s',
                }}
              >
                記録する ({cartItems.length}品)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 目標設定モーダル ===== */}
      {showGoalModal && (
        <div
          style={{
            display: 'flex', position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 300,
            alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={() => setShowGoalModal(false)}
        >
          <div
            style={{
              background: 'white', width: '100%', maxWidth: '500px',
              borderRadius: '24px 24px 0 0', maxHeight: '92vh', overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                position: 'sticky', top: 0, background: 'white',
                borderBottom: '1px solid #f0f0f0', padding: '16px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderRadius: '24px 24px 0 0', zIndex: 10,
              }}
            >
              <p style={{ fontWeight: 700, color: '#111827', fontSize: '15px' }}>⚙ 目標設定</p>
              <button
                onClick={() => setShowGoalModal(false)}
                style={{
                  fontSize: '20px', color: '#9ca3af', width: '32px', height: '32px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                {[
                  { label: 'カロリー目標 (kcal)', value: goalCal, set: setGoalCal, placeholder: '2000' },
                  { label: 'たんぱく質目標 (g)', value: goalProtein, set: setGoalProtein, placeholder: '160' },
                  { label: '脂質目標 (g)', value: goalFat, set: setGoalFat, placeholder: '60' },
                  { label: '炭水化物目標 (g)', value: goalCarbs, set: setGoalCarbs, placeholder: '250' },
                ].map((f) => (
                  <div key={f.label}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>
                      {f.label}
                    </label>
                    <input
                      type="number"
                      value={f.value}
                      onChange={(e) => f.set(e.target.value)}
                      placeholder={f.placeholder}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>
                  目標体重 (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={goalTargetWeight}
                  onChange={(e) => setGoalTargetWeight(e.target.value)}
                  placeholder="例：65.0"
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>
                  目標タイプ
                </label>
                <select
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">選択してください</option>
                  <option value="減量">減量</option>
                  <option value="増量">増量</option>
                  <option value="維持">維持</option>
                  <option value="バルクアップ">バルクアップ</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>
                    開始日
                  </label>
                  <input
                    type="date"
                    value={goalStartDate}
                    onChange={(e) => setGoalStartDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>
                    終了日
                  </label>
                  <input
                    type="date"
                    value={goalEndDate}
                    onChange={(e) => setGoalEndDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
              <button
                onClick={handleSaveGoal}
                style={{
                  width: '100%', background: '#22C55E', color: 'white',
                  fontWeight: 700, padding: '12px', borderRadius: '12px',
                  fontSize: '15px', marginTop: '8px', border: 'none',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
