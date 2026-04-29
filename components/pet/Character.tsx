'use client'

/**
 * おにぎり君キャラクターSVG
 *
 * - 5ステージ（egg / baby / child / teen / adult）に対応
 * - adult時は5種類のフォーム + 隠しキャラに分岐
 * - すべてSVGで描画。CSSアニメーションで「呼吸」「弾む」を表現
 *
 * デザイン：白い米三角形 + 黒い海苔バンド + 顔
 *           ステージ・フォームごとに装飾アクセサリーを追加
 */

import React from 'react'
import { PetStage, PetForm } from '@/lib/pet/types'

interface CharacterProps {
  stage: PetStage
  form: PetForm | null
  hp: number             // 0-100 (低いと弱った表情)
  size?: number          // px
  animated?: boolean     // CSSアニメーション
}

export function Character({ stage, form, hp, size = 200, animated = true }: CharacterProps) {
  const isWeak = hp < 30
  const isHappy = hp >= 70

  // ステージに応じた本体スケール
  const bodyScale = stage === 'egg' ? 0.85
    : stage === 'baby' ? 0.7
    : stage === 'child' ? 0.85
    : stage === 'teen' ? 0.95
    : 1.0

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'inline-block',
      }}
      className={animated ? 'pet-bounce' : ''}
    >
      <svg viewBox="0 0 200 200" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
        {/* キラキラ背景 */}
        {isHappy && <Sparkles />}

        {/* ステージごとの描画 */}
        {stage === 'egg' && <EggBody />}
        {stage !== 'egg' && (
          <g transform={`translate(100, 110) scale(${bodyScale})`}>
            {/* 共通のおにぎり本体 */}
            <OnigiriBody isWeak={isWeak} stage={stage} form={form} />

            {/* ステージ・フォーム別アクセサリー */}
            {stage === 'child' && <Headband />}
            {stage === 'teen' && (
              <>
                <Headband />
                <SportsUniform />
              </>
            )}
            {stage === 'adult' && form && <AdultAccessories form={form} />}

            {/* 顔（HPに応じて表情変化） */}
            <Face isWeak={isWeak} isHappy={isHappy} />
          </g>
        )}

        {/* 弱ってる時の汗マーク */}
        {isWeak && stage !== 'egg' && (
          <text x="155" y="80" fontSize="22" className="pet-sweat">💦</text>
        )}
      </svg>

      <style jsx>{`
        .pet-bounce {
          animation: pet-bounce 2s ease-in-out infinite;
        }
        @keyframes pet-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}

/* ============================================================ */
/* おにぎり本体（白い三角 + 海苔）                                */
/* ============================================================ */

function OnigiriBody({ isWeak, stage, form }: { isWeak: boolean; stage: PetStage; form: PetForm | null }) {
  // フォームごとの色味
  const isGold = form === 'gold'
  const isGreen = form === 'green'
  const isMuscle = form === 'muscle'
  const isEnergy = form === 'energy'
  const isFluffy = form === 'fluffy'
  const isNinja = form === 'secret_ninja'
  const isWarrior = form === 'secret_warrior'

  // 本体カラー
  const riceColor = isGold ? '#FFE082'
    : isGreen ? '#F1F8E9'
    : isNinja ? '#37474F'
    : isWeak ? '#E0E0E0'
    : '#FAFAFA'

  const riceShadow = isGold ? '#FFC107'
    : isGreen ? '#C5E1A5'
    : isNinja ? '#263238'
    : '#E0E0E0'

  const noriColor = isGold ? '#5D4037' : isNinja ? '#000000' : '#1B1B1B'

  // 大きさ：マッスルは横広、ふわふわはまんまる、エネルギーは細身
  const bodyW = isMuscle ? 90 : isFluffy ? 92 : isEnergy ? 70 : 80
  const bodyH = isFluffy ? 88 : 80

  // 三角おにぎり風（角丸三角）
  return (
    <g>
      {/* 体の影 */}
      <ellipse cx="0" cy={bodyH / 2 + 8} rx={bodyW / 2} ry="6" fill="rgba(0,0,0,0.12)" />

      {/* 本体（角丸三角） */}
      <path
        d={`
          M ${-bodyW / 2 + 10} ${bodyH / 2}
          Q ${-bodyW / 2} ${bodyH / 2}, ${-bodyW / 2} ${bodyH / 2 - 10}
          L ${-15} ${-bodyH / 2 + 10}
          Q 0 ${-bodyH / 2 - 5}, 15 ${-bodyH / 2 + 10}
          L ${bodyW / 2} ${bodyH / 2 - 10}
          Q ${bodyW / 2} ${bodyH / 2}, ${bodyW / 2 - 10} ${bodyH / 2}
          Z
        `}
        fill={riceColor}
        stroke={riceShadow}
        strokeWidth="2.5"
      />

      {/* ゴマ（白米なら点々） */}
      {!isNinja && (
        <>
          <circle cx="-15" cy="-15" r="1.5" fill="#9E9E9E" />
          <circle cx="20" cy="-5" r="1.5" fill="#9E9E9E" />
          <circle cx="-25" cy="10" r="1.5" fill="#9E9E9E" />
          <circle cx="25" cy="20" r="1.5" fill="#9E9E9E" />
        </>
      )}

      {/* 海苔（下バンド） */}
      <rect
        x={-bodyW / 2 + 5}
        y={bodyH / 2 - 22}
        width={bodyW - 10}
        height="22"
        rx="3"
        fill={noriColor}
      />
    </g>
  )
}

/* ============================================================ */
/* 顔                                                            */
/* ============================================================ */

function Face({ isWeak, isHappy }: { isWeak: boolean; isHappy: boolean }) {
  return (
    <g>
      {/* 目 */}
      {isWeak ? (
        <>
          {/* ぐるぐる目 */}
          <text x="-15" y="0" textAnchor="middle" fontSize="20">@</text>
          <text x="15" y="0" textAnchor="middle" fontSize="20">@</text>
        </>
      ) : (
        <>
          <ellipse cx="-12" cy="-5" rx="4" ry="5" fill="#1B1B1B" />
          <ellipse cx="12" cy="-5" rx="4" ry="5" fill="#1B1B1B" />
          {/* ハイライト */}
          <circle cx="-11" cy="-7" r="1.5" fill="white" />
          <circle cx="13" cy="-7" r="1.5" fill="white" />
        </>
      )}

      {/* ほっぺ */}
      {!isWeak && (
        <>
          <ellipse cx="-22" cy="8" rx="5" ry="3" fill="#FFB6C1" opacity="0.6" />
          <ellipse cx="22" cy="8" rx="5" ry="3" fill="#FFB6C1" opacity="0.6" />
        </>
      )}

      {/* 口 */}
      {isWeak ? (
        <path d="M -8 12 Q 0 8, 8 12" stroke="#1B1B1B" strokeWidth="2" fill="none" />
      ) : isHappy ? (
        <path d="M -10 6 Q 0 18, 10 6" stroke="#1B1B1B" strokeWidth="2.5" fill="#FF6B6B" />
      ) : (
        <path d="M -8 8 Q 0 14, 8 8" stroke="#1B1B1B" strokeWidth="2.5" fill="none" />
      )}
    </g>
  )
}

/* ============================================================ */
/* 装飾パーツ                                                    */
/* ============================================================ */

function Headband() {
  return (
    <g>
      {/* 赤いハチマキ */}
      <rect x="-32" y="-32" width="64" height="8" rx="1" fill="#E53935" />
      <rect x="-32" y="-30" width="64" height="2" fill="white" />
      {/* 結び目（左） */}
      <path d="M -34 -28 L -42 -32 L -38 -22 Z" fill="#E53935" />
      <path d="M -34 -28 L -40 -22 L -36 -18 Z" fill="#C62828" />
    </g>
  )
}

function SportsUniform() {
  return (
    <g>
      {/* スポーツウェア（ティーン以上） */}
      <rect x="-30" y="20" width="60" height="20" rx="3" fill="#43A047" opacity="0.85" />
      <text x="0" y="36" textAnchor="middle" fontSize="11" fontWeight="bold" fill="white">8</text>
    </g>
  )
}

function AdultAccessories({ form }: { form: PetForm }) {
  switch (form) {
    case 'muscle':
      return (
        <g>
          <Headband />
          {/* ダンベル（左右） */}
          <g transform="translate(-50, 15)">
            <rect x="-8" y="-3" width="16" height="6" rx="1" fill="#424242" />
            <rect x="-12" y="-6" width="4" height="12" fill="#212121" />
            <rect x="8" y="-6" width="4" height="12" fill="#212121" />
          </g>
          <g transform="translate(50, 15)">
            <rect x="-8" y="-3" width="16" height="6" rx="1" fill="#424242" />
            <rect x="-12" y="-6" width="4" height="12" fill="#212121" />
            <rect x="8" y="-6" width="4" height="12" fill="#212121" />
          </g>
          {/* 力こぶ */}
          <text x="0" y="-45" textAnchor="middle" fontSize="20">💪</text>
        </g>
      )
    case 'energy':
      return (
        <g>
          <Headband />
          {/* スピードライン */}
          <line x1="-60" y1="-10" x2="-40" y2="-5" stroke="#FF9800" strokeWidth="2" />
          <line x1="-60" y1="0" x2="-40" y2="5" stroke="#FF9800" strokeWidth="2" />
          <line x1="-60" y1="10" x2="-40" y2="15" stroke="#FF9800" strokeWidth="2" />
          <text x="0" y="-45" textAnchor="middle" fontSize="20">⚡</text>
          <SportsUniform />
        </g>
      )
    case 'fluffy':
      return (
        <g>
          {/* リボン */}
          <path d="M -10 -38 Q 0 -45, 10 -38 Q 0 -32, -10 -38 Z" fill="#FF80AB" />
          <circle cx="0" cy="-38" r="3" fill="#FF4081" />
          <text x="40" y="-30" textAnchor="middle" fontSize="18">✨</text>
          <text x="-40" y="-30" textAnchor="middle" fontSize="18">✨</text>
        </g>
      )
    case 'green':
      return (
        <g>
          {/* 葉っぱ帽子 */}
          <ellipse cx="0" cy="-40" rx="22" ry="12" fill="#66BB6A" />
          <path d="M -15 -45 Q -20 -55, -10 -50 Q 0 -52, -8 -42 Z" fill="#43A047" />
          <path d="M 15 -45 Q 20 -55, 10 -50 Q 0 -52, 8 -42 Z" fill="#43A047" />
          {/* 葉っぱ装飾 */}
          <text x="-40" y="0" fontSize="16">🥦</text>
          <text x="32" y="0" fontSize="16">🥬</text>
        </g>
      )
    case 'gold':
      return (
        <g>
          {/* 王冠 */}
          <path d="M -25 -45 L -20 -55 L -10 -48 L 0 -58 L 10 -48 L 20 -55 L 25 -45 Z" fill="#FFC107" stroke="#FF8F00" strokeWidth="1.5" />
          <circle cx="-15" cy="-50" r="2" fill="#E91E63" />
          <circle cx="0" cy="-53" r="2.5" fill="#E91E63" />
          <circle cx="15" cy="-50" r="2" fill="#E91E63" />
          {/* キラキラ */}
          <text x="-45" y="-10" fontSize="16">✨</text>
          <text x="38" y="-10" fontSize="16">✨</text>
          <text x="0" y="-65" fontSize="14" textAnchor="middle">⭐</text>
        </g>
      )
    case 'secret_ninja':
      return (
        <g>
          {/* 忍者頭巾（黒い覆面） */}
          <rect x="-32" y="-38" width="64" height="14" rx="3" fill="#212121" />
          <rect x="-32" y="-15" width="64" height="6" fill="#212121" />
          {/* 手裏剣 */}
          <text x="-50" y="0" fontSize="18">🌟</text>
          <text x="38" y="0" fontSize="18">🌟</text>
        </g>
      )
    case 'secret_warrior':
      return (
        <g>
          {/* 兜 */}
          <ellipse cx="0" cy="-38" rx="28" ry="14" fill="#3E2723" />
          <path d="M -20 -52 L -5 -38 L 5 -38 L 20 -52 Z" fill="#FFC107" />
          {/* 刀 */}
          <line x1="40" y1="-20" x2="60" y2="0" stroke="#9E9E9E" strokeWidth="3" />
          <rect x="58" y="-2" width="6" height="8" fill="#5D4037" />
        </g>
      )
    default:
      return null
  }
}

function Sparkles() {
  return (
    <g opacity="0.7">
      <text x="20" y="30" fontSize="14">✨</text>
      <text x="170" y="40" fontSize="14">✨</text>
      <text x="30" y="170" fontSize="12">✨</text>
      <text x="160" y="160" fontSize="12">✨</text>
    </g>
  )
}

/* ============================================================ */
/* 卵ステージ                                                    */
/* ============================================================ */

function EggBody() {
  return (
    <g transform="translate(100, 110)">
      {/* 影 */}
      <ellipse cx="0" cy="48" rx="35" ry="6" fill="rgba(0,0,0,0.15)" />
      {/* 卵本体 */}
      <ellipse cx="0" cy="0" rx="42" ry="55" fill="#FFF8E1" stroke="#FFB74D" strokeWidth="2.5" />
      {/* 模様（おにぎり風点々） */}
      <circle cx="-15" cy="-20" r="3" fill="#FFE082" />
      <circle cx="18" cy="-10" r="3" fill="#FFE082" />
      <circle cx="-10" cy="15" r="3" fill="#FFE082" />
      <circle cx="20" cy="20" r="3" fill="#FFE082" />
      <circle cx="0" cy="-5" r="3" fill="#FFE082" />
      {/* ひびのアニメーション */}
      <path d="M -15 -30 L -10 -20 L -15 -10" stroke="#8D6E63" strokeWidth="1.5" fill="none" opacity="0.6" />
    </g>
  )
}
