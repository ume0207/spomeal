'use client'

import { useState, useEffect, useCallback } from 'react'

// ========== チュートリアルステップ定義 ==========
const tutorialSteps: Array<{ target: string; title: string; description: string; position: 'top' | 'bottom'; icon: string }> = [
  {
    target: 'quick-record',
    title: 'クイック記録',
    description: 'ここから食事や体組成をすぐに記録できます。毎日の記録が習慣化の第一歩！',
    position: 'bottom' as const,
    icon: '⚡',
  },
  {
    target: 'nav-meal',
    title: '食事記録',
    description: '写真やAIで食事を簡単に記録。PFC（タンパク質・脂質・炭水化物）も自動計算されます。',
    position: 'bottom' as const,
    icon: '🍽',
  },
  {
    target: 'nav-body',
    title: '体組成データ',
    description: '体重・体脂肪率・筋肉量を記録してグラフで推移を確認できます。',
    position: 'bottom' as const,
    icon: '📊',
  },
  {
    target: 'nav-reserve',
    title: '予約管理',
    description: '栄養相談の予約ができます。管理栄養士があなたの食事をサポートします。',
    position: 'bottom' as const,
    icon: '📅',
  },
  {
    target: 'avatar-icon',
    title: 'プロフィール写真',
    description: 'アイコンをタップすると、プロフィール写真を変更できます。',
    position: 'bottom' as const,
    icon: '📸',
  },
]

// ========== スライドガイド定義 ==========
const guideSlides = [
  {
    icon: '🏠',
    title: 'ホーム画面',
    description: '今日の栄養バランス、次回の予約、\n最新の体組成データがひと目でわかります。',
    gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    bgPattern: '🥗🏋️‍♂️📊',
  },
  {
    icon: '🍽',
    title: '食事を記録する',
    description: '写真を撮るだけでAIが栄養素を自動分析。\n手入力やデータベース検索もできます。',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    bgPattern: '🍛🥩🥦',
  },
  {
    icon: '📊',
    title: '体組成を管理する',
    description: '体重・体脂肪率・筋肉量を記録。\nグラフで推移を確認して目標に近づきましょう。',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    bgPattern: '💪📈🎯',
  },
  {
    icon: '📅',
    title: '栄養相談を予約',
    description: '管理栄養士にいつでも相談できます。\nあなたの食事をプロがサポートします。',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    bgPattern: '👩‍⚕️💬📋',
  },
  {
    icon: '🎯',
    title: '目標を設定しよう',
    description: 'カロリーやPFCの目標を設定して\n毎日の達成度をチェック。ポイントも貯まります！',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
    bgPattern: '🏆✨🔥',
  },
]

// ========== 吹き出し式チュートリアル ==========
export function SpotlightTutorial({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [visible, setVisible] = useState(false)

  const findTarget = useCallback(() => {
    const current = tutorialSteps[step]
    if (!current) return
    const el = document.querySelector(`[data-tutorial="${current.target}"]`)
    if (el) {
      setTargetRect(el.getBoundingClientRect())
      setVisible(true)
    }
  }, [step])

  useEffect(() => {
    // 少し遅延させてDOMが安定してから位置を取得
    const timer = setTimeout(findTarget, 300)
    window.addEventListener('resize', findTarget)
    window.addEventListener('scroll', findTarget, true)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', findTarget)
      window.removeEventListener('scroll', findTarget, true)
    }
  }, [findTarget])

  const handleNext = () => {
    if (step < tutorialSteps.length - 1) {
      setVisible(false)
      setTimeout(() => setStep(step + 1), 150)
    } else {
      onComplete()
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  if (!visible || !targetRect) return null

  const current = tutorialSteps[step]
  const isTop = current.position === 'top'

  // 吹き出しの位置
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.max(12, Math.min(targetRect.left + targetRect.width / 2 - 140, window.innerWidth - 292)),
    zIndex: 10002,
    width: '280px',
    ...(isTop
      ? { bottom: window.innerHeight - targetRect.top + 14 }
      : { top: targetRect.bottom + 14 }),
  }

  // 三角形の位置
  const arrowLeft = Math.max(20, Math.min(
    targetRect.left + targetRect.width / 2 - (tooltipStyle.left as number) - 8,
    260
  ))

  return (
    <>
      {/* オーバーレイ（スポットライト穴あき） */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.55)',
          transition: 'opacity 0.2s',
        }}
        onClick={handleSkip}
      />

      {/* スポットライト（対象要素をハイライト） */}
      <div
        style={{
          position: 'fixed',
          left: targetRect.left - 6,
          top: targetRect.top - 6,
          width: targetRect.width + 12,
          height: targetRect.height + 12,
          borderRadius: '14px',
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
          zIndex: 10001,
          pointerEvents: 'none',
          transition: 'all 0.3s ease',
        }}
      />

      {/* 吹き出し */}
      <div style={tooltipStyle}>
        {/* 三角形（矢印） */}
        <div style={{
          position: 'absolute',
          left: `${arrowLeft}px`,
          ...(isTop
            ? { bottom: '-8px', borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderTop: '9px solid white' }
            : { top: '-8px', borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderBottom: '9px solid white' }),
          width: 0, height: 0,
        }} />

        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '18px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
        }}>
          {/* ステップインジケーター */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
            {tutorialSteps.map((_, i) => (
              <div key={i} style={{
                flex: 1, height: '3px', borderRadius: '2px',
                background: i <= step ? '#22c55e' : '#e5e7eb',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>

          {/* コンテンツ */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '14px' }}>
            <span style={{
              fontSize: '28px', lineHeight: 1,
              background: '#f0fdf4', borderRadius: '10px',
              width: '44px', height: '44px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>{current.icon}</span>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827', marginBottom: '4px' }}>
                {current.title}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.6 }}>
                {current.description}
              </div>
            </div>
          </div>

          {/* ボタン */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSkip}
              style={{
                padding: '8px 14px', borderRadius: '10px', fontSize: '12px',
                fontWeight: 600, border: '1px solid #e5e7eb', background: 'white',
                color: '#9ca3af', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              スキップ
            </button>
            <button
              onClick={handleNext}
              style={{
                flex: 1, padding: '8px 14px', borderRadius: '10px', fontSize: '13px',
                fontWeight: 700, border: 'none',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: 'white', cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 2px 8px rgba(34,197,94,0.3)',
              }}
            >
              {step < tutorialSteps.length - 1 ? `次へ (${step + 1}/${tutorialSteps.length})` : 'はじめる！'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ========== スライド式使い方ガイド ==========
export function UsageGuide({ onClose }: { onClose: () => void }) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')

  const slide = guideSlides[currentSlide]

  const goNext = () => {
    if (currentSlide < guideSlides.length - 1) {
      setDirection('next')
      setCurrentSlide(currentSlide + 1)
    } else {
      onClose()
    }
  }

  const goPrev = () => {
    if (currentSlide > 0) {
      setDirection('prev')
      setCurrentSlide(currentSlide - 1)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: '380px',
          borderRadius: '24px', overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          background: 'white',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヒーローエリア */}
        <div style={{
          background: slide.gradient,
          padding: '40px 24px 32px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '220px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* 背景パターン */}
          <div style={{
            position: 'absolute', inset: 0,
            fontSize: '48px', opacity: 0.1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '16px', letterSpacing: '16px',
            pointerEvents: 'none',
          }}>
            {slide.bgPattern}
          </div>

          {/* メインアイコン */}
          <div style={{
            width: '80px', height: '80px', borderRadius: '20px',
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '40px', marginBottom: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}>
            {slide.icon}
          </div>

          <h2 style={{
            fontSize: '22px', fontWeight: 900, color: 'white',
            margin: 0, letterSpacing: '-0.5px',
          }}>
            {slide.title}
          </h2>
        </div>

        {/* 説明エリア */}
        <div style={{ padding: '24px 24px 20px' }}>
          <p style={{
            fontSize: '14px', color: '#4b5563', lineHeight: 1.8,
            textAlign: 'center', margin: 0, whiteSpace: 'pre-line',
          }}>
            {slide.description}
          </p>
        </div>

        {/* ドットインジケーター */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', paddingBottom: '16px' }}>
          {guideSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => { setDirection(i > currentSlide ? 'next' : 'prev'); setCurrentSlide(i) }}
              style={{
                width: i === currentSlide ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: i === currentSlide ? '#22c55e' : '#e5e7eb',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* ナビゲーションボタン */}
        <div style={{ padding: '0 24px 24px', display: 'flex', gap: '10px' }}>
          {currentSlide > 0 && (
            <button
              onClick={goPrev}
              style={{
                padding: '12px 18px', borderRadius: '12px', fontSize: '13px',
                fontWeight: 700, border: '1.5px solid #e5e7eb', background: 'white',
                color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              戻る
            </button>
          )}
          <button
            onClick={goNext}
            style={{
              flex: 1, padding: '12px 18px', borderRadius: '12px', fontSize: '14px',
              fontWeight: 800, border: 'none',
              background: slide.gradient,
              color: 'white', cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              transition: 'all 0.2s',
            }}
          >
            {currentSlide < guideSlides.length - 1 ? '次へ' : 'アプリを使い始める'}
          </button>
        </div>
      </div>
    </div>
  )
}
