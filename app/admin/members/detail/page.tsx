'use client'

import { useState, useEffect, Suspense } from 'react'
import { apiFetch } from '@/lib/api'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface GoalData {
  cal: number
  protein: number
  fat: number
  carbs: number
  targetWeight?: number
  currentWeight?: number
  height?: number
  activityLevel?: string
  goalType?: string
  pfcP?: number
  pfcF?: number
  pfcC?: number
}

// ===== 型定義 =====
interface Member {
  id: string
  name: string
  nameKana: string
  email: string
  phone: string
  address: string
  team: string
  gender: string
  status: 'active' | 'inactive'
  memo: string
  createdAt: string
}

interface MealRecord {
  id: string
  date: string
  mealType: string
  items: { name: string; amount: string; calories: number; protein: number; fat: number; carbs: number }[]
  totalCalories: number
  totalProtein: number
  totalFat: number
  totalCarbs: number
  photos?: string[]
  advice?: string
}

interface BodyRecord {
  id: string
  date: string
  weight: number
  bodyFat?: number
  muscleMass?: number
  bmi?: number
  memo?: string
}

interface NutritionistComment {
  id: string
  date: string
  staffName: string
  targetMember: string
  targetMemberName?: string
  category: string
  comment: string
}

interface StaffMember {
  id: string
  name: string
  role: string
  active?: boolean
}


// ===== デモデータ =====
const demoMembers: Member[] = [
  { id: '1', name: '山田 太郎', nameKana: 'ヤマダ タロウ', email: 'yamada@example.com', phone: '090-1111-2222', address: '東京都渋谷区', team: '○○高校サッカー部', gender: 'male', status: 'active', memo: 'アレルギーなし', createdAt: '2026-01-15' },
  { id: '2', name: '佐藤 花子', nameKana: 'サトウ ハナコ', email: 'sato@example.com', phone: '080-3333-4444', address: '東京都新宿区', team: '△△バスケ部', gender: 'female', status: 'active', memo: '', createdAt: '2026-02-01' },
]

const demoMealRecords: Record<string, MealRecord[]> = {
  '1': [
    { id: 'm1', date: '2026-04-03', mealType: '朝食', items: [{ name: '鶏むね肉のグリル', amount: '150g', calories: 230, protein: 38, fat: 5, carbs: 0 }, { name: '玄米ごはん', amount: '200g', calories: 264, protein: 5.6, fat: 1.8, carbs: 57 }], totalCalories: 494, totalProtein: 43.6, totalFat: 6.8, totalCarbs: 57, advice: 'タンパク質がしっかり摂れています。野菜を追加するとさらにバランスが良くなります。' },
    { id: 'm2', date: '2026-04-03', mealType: '昼食', items: [{ name: 'サーモンの刺身定食', amount: '1人前', calories: 580, protein: 32, fat: 18, carbs: 65 }], totalCalories: 580, totalProtein: 32, totalFat: 18, totalCarbs: 65, advice: '良質な脂質を含むサーモンで栄養バランスが良いですね。' },
    { id: 'm3', date: '2026-04-02', mealType: '夕食', items: [{ name: 'ハンバーグ定食', amount: '1人前', calories: 720, protein: 28, fat: 35, carbs: 70 }], totalCalories: 720, totalProtein: 28, totalFat: 35, totalCarbs: 70 },
  ],
  '2': [
    { id: 'm4', date: '2026-04-03', mealType: '朝食', items: [{ name: 'ギリシャヨーグルト', amount: '200g', calories: 130, protein: 20, fat: 0, carbs: 10 }, { name: 'バナナ', amount: '1本', calories: 86, protein: 1.1, fat: 0.2, carbs: 22.5 }], totalCalories: 216, totalProtein: 21.1, totalFat: 0.2, totalCarbs: 32.5, advice: '朝食にしっかりタンパク質が取れています。' },
  ],
}

const demoBodyRecords: Record<string, BodyRecord[]> = {
  '1': [
    { id: 'b1', date: '2026-04-03', weight: 72.5, bodyFat: 18.2, muscleMass: 56.1, bmi: 23.4 },
    { id: 'b2', date: '2026-04-01', weight: 73.0, bodyFat: 18.5, muscleMass: 55.8, bmi: 23.6 },
    { id: 'b3', date: '2026-03-28', weight: 73.8, bodyFat: 19.0, muscleMass: 55.5, bmi: 23.8 },
  ],
  '2': [
    { id: 'b4', date: '2026-04-03', weight: 55.0, bodyFat: 22.0, muscleMass: 40.5, bmi: 20.8 },
    { id: 'b5', date: '2026-04-01', weight: 55.3, bodyFat: 22.3, muscleMass: 40.2, bmi: 20.9 },
  ],
}

const categoryColors: Record<string, { color: string; bg: string; icon: string }> = {
  '食事': { color: '#16a34a', bg: '#f0fdf4', icon: '🍽️' },
  '体組成': { color: '#dc2626', bg: '#fef2f2', icon: '📊' },
  'トレーニング': { color: '#7c3aed', bg: '#f5f3ff', icon: '💪' },
  '全般': { color: '#2563eb', bg: '#eff6ff', icon: '💬' },
}

const mealTypeColors: Record<string, { color: string; bg: string; icon: string }> = {
  '朝食': { color: '#f59e0b', bg: '#fffbeb', icon: '🌅' },
  '昼食': { color: '#f97316', bg: '#fff7ed', icon: '☀️' },
  '夕食': { color: '#6366f1', bg: '#eef2ff', icon: '🌙' },
  '間食': { color: '#ec4899', bg: '#fdf2f8', icon: '🍪' },
}

function MemberDetailContent() {
  const searchParams = useSearchParams()
  const memberId = searchParams.get('id')
  const initialTab = (searchParams.get('tab') as 'meals' | 'body' | 'goal' | 'comments') || 'meals'

  const [member, setMember] = useState<Member | null>(null)
  const [meals, setMeals] = useState<MealRecord[]>([])
  const [bodyRecords, setBodyRecords] = useState<BodyRecord[]>([])
  const [goalData, setGoalData] = useState<GoalData | null>(null)
  const [comments, setComments] = useState<NutritionistComment[]>([])
  const [activeTab, setActiveTab] = useState<'meals' | 'body' | 'goal' | 'comments'>(initialTab)
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(true)

  // コメント入力
  const [showCommentForm, setShowCommentForm] = useState(false)
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [commentStaff, setCommentStaff] = useState('管理栄養士')
  const [commentCategory, setCommentCategory] = useState('食事')
  const [commentText, setCommentText] = useState('')
  const [commentSaved, setCommentSaved] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [commentSending, setCommentSending] = useState(false)

  // スタッフ一覧読み込み（Supabase API）
  useEffect(() => {
    apiFetch('/api/staff')
      .then(r => r.ok ? r.json() : [])
      .then((parsed: StaffMember[]) => {
        const activeStaff = parsed.filter(s => s.active !== false)
        setStaffList(activeStaff)
        if (activeStaff.length > 0) setCommentStaff(activeStaff[0].name)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!memberId) return

    // 会員情報読み込み（API）
    const loadMember = async () => {
      try {
        const res = await apiFetch('/api/admin/members')
        const data = await res.json()
        if (data.members) {
          const found = data.members.find((m: Member) => m.id === memberId)
          if (found) { setMember({ ...found, status: 'active' }); return }
        }
      } catch {}
    }
    loadMember()

    // 食事・体組成・目標データをSupabaseから取得
    const loadMemberData = async () => {
      setDataLoading(true)
      try {
        const res = await apiFetch(`/api/admin/member-data?id=${memberId}`)
        if (res.ok) {
          const data = await res.json()
          // 食事記録を変換
          if (data.meal_activity && data.meal_activity.length > 0) {
            const mealRecords: MealRecord[] = data.meal_activity.map((m: any, i: number) => ({
              id: `meal_${i}`,
              date: m.date || m.recordedAt?.split('T')[0] || '',
              mealType: m.mealType || '食事',
              items: (m.items || []).map((item: any) => ({
                name: item.name || '',
                amount: '',
                calories: item.kcal || 0,
                protein: item.protein || 0,
                fat: item.fat || 0,
                carbs: item.carbs || 0,
              })),
              totalCalories: m.totalKcal || 0,
              totalProtein: m.totalProtein || 0,
              totalFat: m.totalFat || 0,
              totalCarbs: m.totalCarbs || 0,
            }))
            setMeals(mealRecords)
          } else {
            setMeals([])
          }
          // 体組成記録を変換
          if (data.body_activity && data.body_activity.length > 0) {
            const bodyRecs: BodyRecord[] = data.body_activity.map((b: any, i: number) => ({
              id: `body_${i}`,
              date: b.date || '',
              weight: b.weight || 0,
              bodyFat: b.bodyFat || undefined,
              muscleMass: b.muscle || undefined,
              bmi: b.bmi || undefined,
            }))
            setBodyRecords(bodyRecs)
          } else {
            setBodyRecords([])
          }
          // 目標データ
          if (data.goal_data) {
            setGoalData(data.goal_data)
          }
        }
      } catch (e) {
        console.error('Failed to load member data:', e)
      }
      setDataLoading(false)
    }
    loadMemberData()

    // コメントをAPIから取得
    apiFetch(`/api/admin/comments?memberId=${memberId}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        setComments(data.map(c => ({
          id: c.id,
          date: new Date(c.created_at).toLocaleString('sv-SE', { timeZone: 'Asia/Tokyo' }).slice(0, 16),
          staffName: c.staff_name,
          targetMember: c.target_member_id,
          category: c.category,
          comment: c.comment,
        })))
      })
      .catch(() => {})
  }, [memberId])

  const handleSendComment = async () => {
    if (!commentText.trim()) return
    // member.id が取れない場合はURLパラメータのmemberIdをフォールバックで使用
    const targetMemberId = member?.id || memberId
    if (!targetMemberId) {
      setCommentError('会員IDが取得できませんでした。ページを再読み込みしてください。')
      return
    }
    setCommentSending(true)
    setCommentError('')
    try {
      const res = await apiFetch('/api/admin/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: targetMemberId,
          staffName: commentStaff || '管理栄養士',
          category: commentCategory,
          comment: commentText.trim(),
        }),
      })
      if (res.ok) {
        const saved = await res.json()
        const newComment: NutritionistComment = {
          id: saved.id,
          date: new Date(saved.created_at).toLocaleString('sv-SE', { timeZone: 'Asia/Tokyo' }).slice(0, 16),
          staffName: saved.staff_name,
          targetMember: saved.target_member_id,
          category: saved.category,
          comment: saved.comment,
        }
        setComments(prev => [newComment, ...prev])
        setCommentText('')
        setCommentSaved(true)
        setTimeout(() => { setCommentSaved(false); setShowCommentForm(false) }, 1500)
      } else {
        const errData = await res.json().catch(() => ({})) as any
        setCommentError(`送信失敗（${res.status}）: ${errData?.error || '不明なエラー'}`)
      }
    } catch (e) {
      console.error('Failed to save comment:', e)
      setCommentError(`通信エラー: ${(e as Error).message}`)
    } finally {
      setCommentSending(false)
    }
  }

  const deleteComment = async (id: string) => {
    if (!confirm('このコメントを削除しますか？')) return
    try {
      await apiFetch(`/api/admin/comments?id=${id}`, { method: 'DELETE' })
      setComments(prev => prev.filter(c => c.id !== id))
    } catch (e) {
      console.error('Failed to delete comment:', e)
    }
  }

  if (!memberId) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
        <p>会員IDが指定されていません</p>
        <Link href="/admin/members" style={{ color: '#2563eb', fontWeight: 700, fontSize: '14px' }}>← 会員一覧に戻る</Link>
      </div>
    )
  }

  if (!member) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏳</div>
        <p>読み込み中...</p>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif", color: '#1a1a1a' }}>
      {/* 戻るリンク */}
      <Link href="/admin/members" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#6b7280', fontSize: '13px', textDecoration: 'none', marginBottom: '16px', fontWeight: 600 }}>
        ← 会員一覧に戻る
      </Link>

      {/* 会員プロフィールカード */}
      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
        <div style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', padding: '20px', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 900, flexShrink: 0 }}>
              {member.name.charAt(0)}
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 900, margin: '0 0 2px', color: 'white' }}>{member.name}</h1>
              <p style={{ fontSize: '12px', margin: 0, color: 'rgba(255,255,255,0.7)' }}>{member.nameKana}</p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                {member.team && <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: '20px' }}>⚽ {member.team}</span>}
                <span style={{ fontSize: '11px', background: member.status === 'active' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.15)', padding: '2px 10px', borderRadius: '20px' }}>
                  {member.status === 'active' ? '✅ アクティブ' : '⏸ 非アクティブ'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 20px', display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: '#6b7280' }}>
          {member.phone && <span>📞 {member.phone}</span>}
          {member.email && <span>✉ {member.email}</span>}
          {member.address && <span>📍 {member.address}</span>}
          <span>📅 登録: {member.createdAt}</span>
        </div>
      </div>

      {/* サマリーカード */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
        <div style={{ background: 'white', borderRadius: '14px', padding: '14px', textAlign: 'center', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>🍽 食事記録</div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#16a34a' }}>{meals.length}<span style={{ fontSize: '11px', fontWeight: 400, color: '#9ca3af' }}> 件</span></div>
        </div>
        <div style={{ background: 'white', borderRadius: '14px', padding: '14px', textAlign: 'center', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>📊 体組成</div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#dc2626' }}>{bodyRecords.length}<span style={{ fontSize: '11px', fontWeight: 400, color: '#9ca3af' }}> 件</span></div>
        </div>
        <div style={{ background: 'white', borderRadius: '14px', padding: '14px', textAlign: 'center', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>💬 コメント</div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#2563eb' }}>{comments.length}<span style={{ fontSize: '11px', fontWeight: 400, color: '#9ca3af' }}> 件</span></div>
        </div>
      </div>

      {/* タブ切り替え */}
      <div style={{ display: 'flex', gap: '4px', background: '#f3f4f6', borderRadius: '12px', padding: '4px', marginBottom: '16px' }}>
        {([
          { key: 'meals' as const, label: '🍽 食事', color: '#16a34a' },
          { key: 'body' as const, label: '📊 体組成', color: '#dc2626' },
          { key: 'goal' as const, label: '🎯 目標', color: '#f59e0b' },
          { key: 'comments' as const, label: '💬 コメント', color: '#2563eb' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: '10px 8px', borderRadius: '10px', border: 'none',
              background: activeTab === tab.key ? 'white' : 'transparent',
              color: activeTab === tab.key ? tab.color : '#6b7280',
              fontWeight: activeTab === tab.key ? 800 : 500,
              fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: activeTab === tab.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== 食事記録タブ ===== */}
      {activeTab === 'meals' && (
        <div>
          {dataLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>
              読み込み中...
            </div>
          ) : meals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.3 }}>🍽</div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>食事記録はまだありません</p>
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#9ca3af' }}>会員がアプリで食事を記録すると自動的に表示されます</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {meals.map(meal => {
                const mt = mealTypeColors[meal.mealType] || mealTypeColors['間食']
                const isExpanded = expandedMeal === meal.id
                return (
                  <div key={meal.id} style={{ background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div
                      onClick={() => setExpandedMeal(isExpanded ? null : meal.id)}
                      style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
                    >
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: mt.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                        {mt.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: mt.color }}>{meal.mealType}</span>
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>{meal.date}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {meal.items.map(i => i.name).join('、')}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>{meal.totalCalories}<span style={{ fontSize: '10px', fontWeight: 400, color: '#9ca3af' }}> kcal</span></div>
                      </div>
                      <span style={{ color: '#9ca3af', fontSize: '14px', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '0 16px 14px', borderTop: '1px solid #f3f4f6' }}>
                        {/* PFC */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '12px 0' }}>
                          <div style={{ textAlign: 'center', background: '#fef2f2', borderRadius: '8px', padding: '8px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#ef4444' }}>{meal.totalProtein.toFixed(1)}g</div>
                            <div style={{ fontSize: '10px', color: '#9ca3af' }}>タンパク質</div>
                          </div>
                          <div style={{ textAlign: 'center', background: '#fffbeb', borderRadius: '8px', padding: '8px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#f59e0b' }}>{meal.totalFat.toFixed(1)}g</div>
                            <div style={{ fontSize: '10px', color: '#9ca3af' }}>脂質</div>
                          </div>
                          <div style={{ textAlign: 'center', background: '#eff6ff', borderRadius: '8px', padding: '8px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#3b82f6' }}>{meal.totalCarbs.toFixed(1)}g</div>
                            <div style={{ fontSize: '10px', color: '#9ca3af' }}>炭水化物</div>
                          </div>
                        </div>
                        {/* 食品リスト */}
                        <div style={{ fontSize: '12px', color: '#4b5563' }}>
                          {meal.items.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: idx < meal.items.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                              <span>{item.name} ({item.amount})</span>
                              <span style={{ color: '#9ca3af' }}>{item.calories} kcal</span>
                            </div>
                          ))}
                        </div>
                        {/* AIアドバイス */}
                        {meal.advice && (
                          <div style={{ marginTop: '10px', background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', borderRadius: '10px', padding: '10px 12px', border: '1px solid #bbf7d0' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', marginBottom: '4px' }}>💡 AIアドバイス</div>
                            <p style={{ fontSize: '12px', color: '#374151', margin: 0, lineHeight: 1.6 }}>{meal.advice}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== 体組成タブ ===== */}
      {activeTab === 'body' && (
        <div>
          {dataLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>
              読み込み中...
            </div>
          ) : bodyRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.3 }}>📊</div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>体組成記録はまだありません</p>
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#9ca3af' }}>会員がアプリで体組成を記録すると自動的に表示されます</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* 最新値ハイライト */}
              {bodyRecords.length > 0 && (
                <div style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)', borderRadius: '16px', padding: '16px', border: '1px solid #fecaca', marginBottom: '4px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', marginBottom: '10px' }}>📊 最新データ ({bodyRecords[0].date})</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    <div style={{ background: 'white', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>体重</div>
                      <div style={{ fontSize: '20px', fontWeight: 900, color: '#111827' }}>{bodyRecords[0].weight}<span style={{ fontSize: '11px', color: '#9ca3af' }}> kg</span></div>
                    </div>
                    {bodyRecords[0].bodyFat !== undefined && (
                      <div style={{ background: 'white', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#6b7280' }}>体脂肪率</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#ef4444' }}>{bodyRecords[0].bodyFat}<span style={{ fontSize: '11px', color: '#9ca3af' }}> %</span></div>
                      </div>
                    )}
                    {bodyRecords[0].muscleMass !== undefined && (
                      <div style={{ background: 'white', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#6b7280' }}>筋肉量</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#2563eb' }}>{bodyRecords[0].muscleMass}<span style={{ fontSize: '11px', color: '#9ca3af' }}> kg</span></div>
                      </div>
                    )}
                    {bodyRecords[0].bmi !== undefined && (
                      <div style={{ background: 'white', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#6b7280' }}>BMI</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#7c3aed' }}>{bodyRecords[0].bmi}</div>
                      </div>
                    )}
                  </div>
                  {/* 変動 */}
                  {bodyRecords.length >= 2 && (
                    <div style={{ marginTop: '10px', fontSize: '11px', color: '#6b7280', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                      {(() => {
                        const diff = bodyRecords[0].weight - bodyRecords[1].weight
                        const sign = diff > 0 ? '+' : ''
                        const color = diff < 0 ? '#16a34a' : diff > 0 ? '#ef4444' : '#6b7280'
                        return <span>体重: <strong style={{ color }}>{sign}{diff.toFixed(1)}kg</strong> (前回比)</span>
                      })()}
                      {bodyRecords[0].bodyFat !== undefined && bodyRecords[1].bodyFat !== undefined && (() => {
                        const diff = bodyRecords[0].bodyFat! - bodyRecords[1].bodyFat!
                        const sign = diff > 0 ? '+' : ''
                        const color = diff < 0 ? '#16a34a' : diff > 0 ? '#ef4444' : '#6b7280'
                        return <span>体脂肪: <strong style={{ color }}>{sign}{diff.toFixed(1)}%</strong></span>
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* 記録リスト */}
              {bodyRecords.map(rec => (
                <div key={rec.id} style={{ background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>📅 {rec.date}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', flexWrap: 'wrap' }}>
                    <span><strong style={{ color: '#111827' }}>{rec.weight}</strong> <span style={{ color: '#9ca3af', fontSize: '11px' }}>kg</span></span>
                    {rec.bodyFat !== undefined && <span><strong style={{ color: '#ef4444' }}>{rec.bodyFat}</strong> <span style={{ color: '#9ca3af', fontSize: '11px' }}>% 体脂肪</span></span>}
                    {rec.muscleMass !== undefined && <span><strong style={{ color: '#2563eb' }}>{rec.muscleMass}</strong> <span style={{ color: '#9ca3af', fontSize: '11px' }}>kg 筋肉</span></span>}
                    {rec.bmi !== undefined && <span><strong style={{ color: '#7c3aed' }}>{rec.bmi}</strong> <span style={{ color: '#9ca3af', fontSize: '11px' }}>BMI</span></span>}
                  </div>
                  {rec.memo && <p style={{ fontSize: '11px', color: '#6b7280', margin: '6px 0 0' }}>{rec.memo}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== 目標タブ ===== */}
      {activeTab === 'goal' && (
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#111827' }}>🎯 目標設定</h3>
          </div>
          {dataLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>読み込み中...</div>
          ) : goalData ? (
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: '#fffbeb', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#92400e', marginBottom: '4px' }}>目標カロリー</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#f59e0b' }}>{goalData.cal}<span style={{ fontSize: '11px', color: '#9ca3af' }}> kcal</span></div>
                </div>
                <div style={{ background: '#fef2f2', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#991b1b', marginBottom: '4px' }}>目標体重</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#dc2626' }}>{goalData.targetWeight || '-'}<span style={{ fontSize: '11px', color: '#9ca3af' }}> kg</span></div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#166534', marginBottom: '2px' }}>タンパク質</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#16a34a' }}>{goalData.protein}<span style={{ fontSize: '10px' }}>g</span></div>
                  {goalData.pfcP && <div style={{ fontSize: '10px', color: '#6b7280' }}>{goalData.pfcP}%</div>}
                </div>
                <div style={{ background: '#fff7ed', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#9a3412', marginBottom: '2px' }}>脂質</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#f97316' }}>{goalData.fat}<span style={{ fontSize: '10px' }}>g</span></div>
                  {goalData.pfcF && <div style={{ fontSize: '10px', color: '#6b7280' }}>{goalData.pfcF}%</div>}
                </div>
                <div style={{ background: '#eef2ff', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#3730a3', marginBottom: '2px' }}>炭水化物</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#6366f1' }}>{goalData.carbs}<span style={{ fontSize: '10px' }}>g</span></div>
                  {goalData.pfcC && <div style={{ fontSize: '10px', color: '#6b7280' }}>{goalData.pfcC}%</div>}
                </div>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '14px', fontSize: '12px', color: '#6b7280' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span>現在体重</span><span style={{ fontWeight: 700, color: '#374151' }}>{goalData.currentWeight || '-'} kg</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span>身長</span><span style={{ fontWeight: 700, color: '#374151' }}>{goalData.height || '-'} cm</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span>活動レベル</span><span style={{ fontWeight: 700, color: '#374151' }}>{goalData.activityLevel || '-'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>目標タイプ</span><span style={{ fontWeight: 700, color: '#374151' }}>{goalData.goalType || '-'}</span></div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎯</div>
              <p style={{ margin: 0, fontSize: '13px' }}>目標設定データがありません</p>
            </div>
          )}
        </div>
      )}

      {/* ===== コメントタブ ===== */}
      {activeTab === 'comments' && (
        <div>
          {/* コメント入力ボタン */}
          {!showCommentForm ? (
            <button
              onClick={() => setShowCommentForm(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: 'white',
                fontWeight: 800, padding: '14px', borderRadius: '14px', fontSize: '14px',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 2px 8px rgba(22,163,74,0.3)', marginBottom: '16px',
              }}
            >
              <span style={{ fontSize: '16px' }}>📝</span>
              {member.name}さんにコメントを送信
            </button>
          ) : (
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '16px', marginBottom: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontWeight: 800, fontSize: '14px', color: '#111827' }}>📝 コメント送信</span>
                <button onClick={() => setShowCommentForm(false)} style={{ fontSize: '18px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
              </div>

              {/* 送信者（担当者） */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>送信者（担当者）</label>
                {staffList.length > 0 ? (
                  <select
                    value={commentStaff}
                    onChange={e => setCommentStaff(e.target.value)}
                    style={{
                      width: '100%', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '10px',
                      padding: '10px 14px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                      appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3e%3cpath fill=\'%236b7280\' d=\'M6 9L1 4h10z\'/%3e%3c/svg%3e")',
                      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: '36px',
                    }}
                  >
                    {staffList.map(s => (
                      <option key={s.id} value={s.name}>{s.name}（{s.role}）</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text" value={commentStaff} onChange={e => setCommentStaff(e.target.value)}
                    placeholder="管理栄養士"
                    style={{ width: '100%', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                )}
                {staffList.length === 0 && (
                  <p style={{ fontSize: '10px', color: '#9ca3af', margin: '4px 0 0' }}>※ スタッフ管理でスタッフを登録すると選択式になります</p>
                )}
              </div>

              {/* カテゴリ */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '6px', display: 'block' }}>カテゴリ</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['食事', '体組成', 'トレーニング', '全般'].map(cat => {
                    const cc = categoryColors[cat]
                    return (
                      <button
                        key={cat}
                        onClick={() => setCommentCategory(cat)}
                        style={{
                          padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                          border: commentCategory === cat ? `2px solid ${cc.color}` : '2px solid #e5e7eb',
                          background: commentCategory === cat ? cc.bg : 'white',
                          color: commentCategory === cat ? cc.color : '#6b7280',
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >{cc.icon} {cat}</button>
                    )
                  })}
                </div>
              </div>

              {/* コメント */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '4px', display: 'block' }}>コメント内容</label>
                <textarea
                  value={commentText} onChange={e => setCommentText(e.target.value)}
                  placeholder={`${member.name}さんへのコメントを入力...`}
                  rows={4}
                  style={{ width: '100%', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6 }}
                />
              </div>

              <button
                onClick={handleSendComment}
                disabled={!commentText.trim() || commentSending}
                style={{
                  width: '100%',
                  background: commentSaved ? '#22c55e' : ((!commentText.trim() || commentSending) ? '#d1d5db' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'),
                  color: 'white', fontWeight: 800, padding: '13px', borderRadius: '12px',
                  fontSize: '14px', border: 'none', cursor: (commentText.trim() && !commentSending) ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', transition: 'all 0.2s',
                }}
              >
                {commentSaved ? '✅ 送信しました！' : commentSending ? '送信中...' : '送信する'}
              </button>
              {commentError && (
                <div style={{ marginTop: '8px', padding: '10px 12px', background: '#fee2e2', borderRadius: '8px', fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                  ❌ {commentError}
                </div>
              )}
            </div>
          )}

          {/* コメント一覧 */}
          {comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.3 }}>💬</div>
              コメントはまだありません
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {comments.map(c => {
                const cat = categoryColors[c.category] || categoryColors['全般']
                const targetName = c.targetMember === '__all__'
                  ? '全員'
                  : (c.targetMemberName || member.name)
                return (
                  <div key={c.id} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: cat.color, background: cat.bg, padding: '2px 8px', borderRadius: '6px' }}>{cat.icon} {c.category}</span>
                      <span style={{ fontSize: '10px', color: '#9ca3af' }}>{c.date}</span>
                      <button
                        onClick={() => deleteComment(c.id)}
                        style={{ marginLeft: 'auto', fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
                      >🗑</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', padding: '2px 8px', borderRadius: '6px' }}>
                        👤 {c.staffName}
                      </span>
                      <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700 }}>→</span>
                      <span style={{
                        fontSize: '10px', fontWeight: 700,
                        color: c.targetMember === '__all__' ? '#a16207' : '#15803d',
                        background: c.targetMember === '__all__' ? '#fef9c3' : '#dcfce7',
                        padding: '2px 8px', borderRadius: '6px',
                      }}>
                        {c.targetMember === '__all__' ? '📢 全員' : `🎯 ${targetName}`}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#374151', margin: 0, lineHeight: 1.6 }}>{c.comment}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function MemberDetailPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>読み込み中...</div>}>
      <MemberDetailContent />
    </Suspense>
  )
}
