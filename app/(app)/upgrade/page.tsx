'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Period = 1 | 3 | 6 | 12

const periodTabs: { key: Period; label: string; discount: string; badge?: string }[] = [
  { key: 1,  label: '単月',   discount: '通常' },
  { key: 3,  label: '3ヶ月', discount: '5%OFF' },
  { key: 6,  label: '半年',  discount: '10%OFF', badge: '人気' },
  { key: 12, label: '1年',   discount: '20%OFF', badge: 'お得' },
]

const discountRate: Record<Period, number> = { 1: 1, 3: 0.95, 6: 0.9, 12: 0.8 }

const basePrices = { light: 615, standard: 2980, premium: 9980 }

const plansData = [
  {
    id: 'light',
    name: 'ライト',
    icon: '🌱',
    color: '#0891b2',
    gradientFrom: '#0891b2',
    gradientTo: '#0e7490',
    rank: 1,
    features: [
      { text: '食事記録・カロリー管理', ok: true },
      { text: '体組成記録', ok: true },
      { text: 'AI食事データ分析（1日5回）', ok: true },
      { text: 'ミーティング', ok: false },
      { text: 'フィードバックコメント', ok: false },
    ],
  },
  {
    id: 'standard',
    name: 'スタンダード',
    icon: '⭐',
    color: '#d97706',
    gradientFrom: '#f59e0b',
    gradientTo: '#d97706',
    popular: true,
    rank: 2,
    features: [
      { text: '食事記録・カロリー管理', ok: true },
      { text: '体組成記録', ok: true },
      { text: 'AI食事データ分析（1日20回）', ok: true },
      { text: '20分ミーティング（月1回）', ok: true },
      { text: 'フィードバックコメント', ok: false },
    ],
    addedFeatures: ['AI分析 5回→20回/日', 'ミーティング月1回'],
  },
  {
    id: 'premium',
    name: 'プレミアム',
    icon: '👑',
    color: '#7c3aed',
    gradientFrom: '#8b5cf6',
    gradientTo: '#7c3aed',
    rank: 3,
    features: [
      { text: '食事記録・カロリー管理', ok: true },
      { text: '体組成記録', ok: true },
      { text: 'AI食事データ分析（上限解放）', ok: true },
      { text: 'ミーティング（月2回）', ok: true },
      { text: '週1回フィードバックコメント', ok: true },
    ],
    addedFeatures: ['AI分析 無制限', 'ミーティング月2回', '週1フィードバック'],
  },
]

function calcPrice(planId: string, period: Period) {
  const base = basePrices[planId as keyof typeof basePrices]
  const rate = discountRate[period]
  const monthly = Math.round(base * rate)
  return { monthly, total: monthly * period }
}

const periodKey: Record<Period, string> = {
  1: 'monthly', 3: 'quarterly', 6: 'semiannual', 12: 'annual',
}

export default function UpgradePage() {
  const router = useRouter()
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(6)
  const [loading, setLoading] = useState<string | null>(null)
  const [currentPlan, setCurrentPlan] = useState<string>('light')
  const [currentStatus, setCurrentStatus] = useState<string>('trialing')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push('/login?redirect=/upgrade')
        return
      }
      setUserEmail(session.user.email ?? null)
      setUserId(session.user.id ?? null)

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_plan, subscription_status')
          .eq('id', session.user.id)
          .single()
        if (profile) {
          setCurrentPlan(profile.subscription_plan || 'light')
          setCurrentStatus(profile.subscription_status || 'none')
        }
      } catch { /* ignore */ }
    })
  }, [router])

  const handleUpgrade = async (planId: string) => {
    setLoading(planId)
    try {
      const res = await apiFetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          period: periodKey[selectedPeriod],
          customerEmail: userEmail,
          userId,
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('決済ページの取得に失敗しました。\n' + (data.error || 'もう一度お試しください。'))
        setLoading(null)
      }
    } catch (e) {
      alert('エラーが発生しました。もう一度お試しください。\n' + String(e))
      setLoading(null)
    }
  }

  const currentPlanInfo = plansData.find(p => p.id === currentPlan) || plansData[0]
  const currentRank = currentPlanInfo.rank
  const upgradePlans = plansData.filter(p => p.rank > currentRank)
  const statusLabel: Record<string, string> = {
    trialing: '無料トライアル中',
    active: '利用中',
    cancelling: '解約予定',
    cancelled: '解約済み',
    free: '無料プラン',
    none: '',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      color: '#fff',
      fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",
    }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 16px 80px' }}>

        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <Link href="/dashboard" style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '13px',
          }}>
            ← ダッシュボード
          </Link>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>スポミル</span>
        </div>

        {/* タイトルエリア */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>👑</div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'white', margin: '0 0 8px' }}>
            プランをアップグレード
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.6 }}>
            より充実したサポートで目標達成を加速させよう
          </p>
        </div>

        {/* 現在のプラン */}
        <div style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '14px',
          padding: '14px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ fontSize: '28px' }}>{currentPlanInfo.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginBottom: '2px' }}>現在のプラン</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: 'white' }}>{currentPlanInfo.name}</div>
          </div>
          {currentStatus && statusLabel[currentStatus] && (
            <span style={{
              fontSize: '10px', fontWeight: 700,
              background: currentStatus === 'trialing' ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.1)',
              color: currentStatus === 'trialing' ? '#4ade80' : 'rgba(255,255,255,0.6)',
              padding: '4px 10px', borderRadius: '20px',
              border: currentStatus === 'trialing' ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(255,255,255,0.15)',
            }}>
              {statusLabel[currentStatus]}
            </span>
          )}
        </div>

        {/* プレミアムの場合 */}
        {upgradePlans.length === 0 && (
          <div style={{
            background: 'rgba(124,58,237,0.15)',
            border: '1.5px solid rgba(124,58,237,0.4)',
            borderRadius: '18px',
            padding: '32px 24px',
            textAlign: 'center',
            marginBottom: '20px',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'white', marginBottom: '8px' }}>
              最上位プランをご利用中です
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: '20px' }}>
              プレミアムプランの全機能をご利用いただけます。<br />
              引き続きスポミルをご活用ください。
            </p>
            <Link href="/dashboard" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'linear-gradient(90deg,#8b5cf6,#7c3aed)',
              color: 'white', padding: '12px 24px', borderRadius: '12px',
              fontSize: '14px', fontWeight: 800, textDecoration: 'none',
            }}>
              ダッシュボードへ戻る
            </Link>
          </div>
        )}

        {upgradePlans.length > 0 && (
          <>
            {/* 期間タブ */}
            <div style={{
              display: 'flex', gap: '6px', marginBottom: '20px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '14px', padding: '4px',
            }}>
              {periodTabs.map((tab) => {
                const isActive = selectedPeriod === tab.key
                return (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedPeriod(tab.key)}
                    style={{
                      flex: 1, padding: '9px 2px', borderRadius: '10px',
                      fontSize: '11px', fontWeight: 700,
                      color: isActive ? 'white' : 'rgba(255,255,255,0.5)',
                      background: isActive ? 'linear-gradient(90deg,#8b5cf6,#7c3aed)' : 'transparent',
                      border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                      boxShadow: isActive ? '0 2px 8px rgba(124,58,237,0.45)' : 'none',
                      fontFamily: 'inherit',
                      position: 'relative',
                    }}
                  >
                    {tab.badge && (
                      <span style={{
                        position: 'absolute', top: '-7px', right: '4px',
                        fontSize: '8px', fontWeight: 800,
                        background: '#ef4444', color: 'white',
                        padding: '1px 5px', borderRadius: '6px',
                      }}>{tab.badge}</span>
                    )}
                    <span>{tab.label}</span>
                    <span style={{
                      fontSize: '10px', fontWeight: 800,
                      color: isActive ? 'rgba(255,255,255,0.9)' : '#a78bfa',
                    }}>{tab.discount}</span>
                  </button>
                )
              })}
            </div>

            {/* アップグレード先プランカード */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
              {upgradePlans.map((plan) => {
                const { monthly, total } = calcPrice(plan.id, selectedPeriod)
                const isLoading = loading === plan.id
                const isRecommended = plan.id === (currentPlan === 'light' ? 'standard' : 'premium')

                return (
                  <div
                    key={plan.id}
                    style={{
                      background: plan.popular
                        ? 'rgba(245,158,11,0.07)'
                        : plan.id === 'premium'
                          ? 'rgba(124,58,237,0.08)'
                          : 'rgba(255,255,255,0.05)',
                      border: `1.5px solid ${plan.popular ? 'rgba(245,158,11,0.5)' : plan.id === 'premium' ? 'rgba(124,58,237,0.45)' : 'rgba(255,255,255,0.12)'}`,
                      borderRadius: '20px',
                      padding: '22px 20px',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* おすすめバッジ */}
                    {isRecommended && (
                      <div style={{
                        position: 'absolute', top: '-1px', left: '50%',
                        transform: 'translateX(-50%)',
                        background: `linear-gradient(90deg,${plan.gradientFrom},${plan.gradientTo})`,
                        color: 'white', fontSize: '10px', fontWeight: 800,
                        padding: '4px 16px', borderRadius: '0 0 12px 12px',
                        whiteSpace: 'nowrap', letterSpacing: '0.3px',
                      }}>
                        {plan.icon} おすすめアップグレード先
                      </div>
                    )}

                    {/* 装飾 */}
                    <div style={{
                      position: 'absolute', top: '-30px', right: '-30px',
                      width: '100px', height: '100px', borderRadius: '50%',
                      background: `${plan.id === 'premium' ? 'rgba(124,58,237,0.15)' : 'rgba(245,158,11,0.12)'}`,
                      pointerEvents: 'none',
                    }} />

                    <div style={{ position: 'relative', marginTop: isRecommended ? '14px' : '0' }}>
                      {/* プラン名・価格 */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '20px' }}>{plan.icon}</span>
                            <span style={{ fontSize: '17px', fontWeight: 900, color: 'white' }}>{plan.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                            <span style={{ fontSize: '28px', fontWeight: 900, color: 'white', lineHeight: 1 }}>
                              ¥{monthly.toLocaleString()}
                            </span>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>/月</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                            {selectedPeriod === 1
                              ? '毎月 ¥' + monthly.toLocaleString()
                              : `${selectedPeriod}ヶ月 合計 ¥${total.toLocaleString()}`}
                          </div>
                        </div>
                      </div>

                      {/* 追加される機能 */}
                      {plan.addedFeatures && (
                        <div style={{
                          background: 'rgba(255,255,255,0.06)',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          marginBottom: '12px',
                        }}>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: 700, marginBottom: '6px', letterSpacing: '0.5px' }}>
                            ✨ 現在のプランからの追加機能
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {plan.addedFeatures.map((f, i) => (
                              <span key={i} style={{
                                fontSize: '11px', fontWeight: 700,
                                background: `linear-gradient(90deg,${plan.gradientFrom}22,${plan.gradientTo}22)`,
                                border: `1px solid ${plan.color}44`,
                                color: plan.id === 'premium' ? '#c4b5fd' : '#fcd34d',
                                padding: '3px 9px', borderRadius: '20px',
                              }}>
                                + {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 全機能リスト */}
                      <ul style={{ listStyle: 'none', margin: '0 0 16px', padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {plan.features.map((feat, i) => (
                          <li key={i} style={{
                            fontSize: '12px',
                            color: feat.ok ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)',
                            display: 'flex', alignItems: 'center', gap: '7px',
                          }}>
                            <span style={{
                              width: '16px', height: '16px', borderRadius: '50%',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '9px', fontWeight: 900, flexShrink: 0,
                              background: feat.ok ? `${plan.color}33` : 'rgba(255,255,255,0.06)',
                              color: feat.ok ? plan.color : 'rgba(255,255,255,0.25)',
                            }}>
                              {feat.ok ? '✓' : '✗'}
                            </span>
                            {feat.text}
                          </li>
                        ))}
                      </ul>

                      {/* ボタン */}
                      <button
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={isLoading}
                        style={{
                          width: '100%', padding: '14px',
                          borderRadius: '14px', fontSize: '14px', fontWeight: 900,
                          background: isLoading ? '#6b7280' : `linear-gradient(90deg,${plan.gradientFrom},${plan.gradientTo})`,
                          color: 'white', border: 'none',
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: isLoading ? 'none' : `0 4px 16px ${plan.color}55`,
                          fontFamily: 'inherit',
                          letterSpacing: '0.3px',
                        }}
                      >
                        {isLoading ? '処理中...' : `${plan.name}プランにアップグレードする →`}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 注意事項 */}
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '20px',
            }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.8, margin: 0 }}>
                ・アップグレード後は新プランの料金が請求されます<br />
                ・いつでも解約・ダウングレードが可能です<br />
                ・お支払いはStripeの安全な決済で処理されます
              </p>
            </div>
          </>
        )}

        {/* フッターリンク */}
        <div style={{ textAlign: 'center' }}>
          <Link href="/tokushoho" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textDecoration: 'underline' }}>
            特定商取引法に基づく表記
          </Link>
        </div>
      </div>
    </div>
  )
}
