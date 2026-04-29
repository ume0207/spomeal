'use client'

/**
 * /pet/showcase
 * すべての進化ステージと大人形態を一覧で表示する確認用ページ
 */

import Link from 'next/link'
import { Character } from '@/components/pet/Character'
import { STAGE_PROGRESSION, FORM_INFO, type PetStage, type PetForm } from '@/lib/pet/types'

const STAGES: PetStage[] = ['egg', 'baby', 'child', 'teen', 'adult']
const ADULT_FORMS: PetForm[] = ['muscle', 'energy', 'fluffy', 'green', 'gold', 'secret_ninja', 'secret_warrior']

export default function PetShowcasePage() {
  return (
    <div style={{
      padding: '20px 16px 80px',
      maxWidth: 760,
      margin: '0 auto',
      fontFamily: "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 'bold' }}>🍙 おにぎり君 進化図鑑</h1>
        <Link href="/pet" style={{ color: '#16a34a', fontSize: 14, textDecoration: 'none' }}>← 戻る</Link>
      </div>

      <div style={{ background: '#FEF3C7', padding: 12, borderRadius: 12, marginBottom: 24, fontSize: 13, color: '#854D0E' }}>
        🪧 食事を記録すると育つ「たまごっち式」ペット。卵 → 大人まで5段階＋PFC比率で7種類に分岐
      </div>

      {/* ステージ進化セクション */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
          🌱 進化の5段階
        </h2>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16, lineHeight: 1.7 }}>
          時間と食事記録数の両方が条件を満たした時に進化。<br />
          サボれば時間が経っても食事数が足りず進化しません。
        </p>

        <div style={{ display: 'flex', overflowX: 'auto', gap: 12, paddingBottom: 8 }}>
          {STAGES.map((stage, idx) => {
            const info = STAGE_PROGRESSION.find(s => s.stage === stage)!
            return (
              <div key={stage} style={{
                background: 'white',
                borderRadius: 16,
                padding: 12,
                minWidth: 140,
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                border: '1px solid #e5e7eb',
              }}>
                <div style={{ marginBottom: 4 }}>
                  <Character
                    stage={stage}
                    form={stage === 'adult' ? 'gold' : null}
                    hp={100}
                    size={120}
                    animated={false}
                  />
                </div>
                <div style={{ fontSize: 14, fontWeight: 'bold', color: '#1a1a1a' }}>
                  {idx + 1}. {info.emoji} {info.label}
                </div>
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4, lineHeight: 1.5 }}>
                  {idx === 0 && '最初は卵から'}
                  {idx === 1 && '初食事で即進化'}
                  {idx === 2 && '3日 + 6食'}
                  {idx === 3 && '7日 + 15食'}
                  {idx === 4 && '14日 + 40食'}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 大人形態セクション */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
          🦸 大人形態の7パターン
        </h2>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16, lineHeight: 1.7 }}>
          ティーン → 大人になる時、過去の食事のPFC比率で<strong>自動的にどれかに分岐</strong>します。<br />
          食事の偏りで運命が決まる！
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {ADULT_FORMS.map(form => {
            const info = FORM_INFO[form]
            return (
              <div key={form} style={{
                background: 'white',
                borderRadius: 16,
                padding: 14,
                textAlign: 'center',
                boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                border: form === 'gold' ? '2px solid #fbbf24'
                     : form.startsWith('secret_') ? '2px solid #a855f7'
                     : '1px solid #e5e7eb',
              }}>
                <div style={{ marginBottom: 4 }}>
                  <Character stage="adult" form={form} hp={100} size={130} animated={false} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 'bold', marginTop: 6 }}>
                  {info.emoji} {info.label}
                </div>
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                  {'⭐'.repeat(info.rarity)}
                </div>
                <div style={{ fontSize: 11, color: '#374151', marginTop: 8, lineHeight: 1.5 }}>
                  {info.description}
                </div>
                <div style={{
                  fontSize: 10, color: '#9ca3af', marginTop: 8,
                  padding: '6px 8px', background: '#f9fafb', borderRadius: 6,
                  lineHeight: 1.4,
                }}>
                  <strong style={{ color: '#16a34a' }}>進化条件：</strong><br />
                  {form === 'muscle' && 'タンパク質 ≥ 35%'}
                  {form === 'energy' && '炭水化物 ≥ 60%（または分岐に該当しない場合のデフォルト）'}
                  {form === 'fluffy' && '脂質 ≥ 35%'}
                  {form === 'green' && 'タンパク質 ≥ 20% かつ脂質 ≤ 25% かつ炭水化物 ≥ 45%'}
                  {form === 'gold' && 'PFCバランス完璧（P 25-35% / F 20-30% / C 40-50%）'}
                  {form === 'secret_ninja' && '30日連続記録ストリーク（隠しキャラ）'}
                  {form === 'secret_warrior' && '14日連続記録 + PFC完璧（最高レアリティ）'}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* HP・状態の見え方 */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
          ❤️ HPによる表情変化
        </h2>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
          食事を記録しないとHPが減って弱った表情に。HP=0で72時間続くと「お別れ」演出。
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { hp: 100, label: 'げんき (HP 100)', desc: 'キラキラ＋にっこり' },
            { hp: 50, label: 'ふつう (HP 50)', desc: '通常の表情' },
            { hp: 10, label: 'よわってる (HP 10)', desc: '汗マーク＋ぐるぐる目' },
          ].map(({ hp, label, desc }) => (
            <div key={hp} style={{
              background: 'white', borderRadius: 12, padding: 12, textAlign: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <Character stage="child" form={null} hp={hp} size={110} animated={false} />
              <div style={{ fontSize: 13, fontWeight: 'bold', marginTop: 4 }}>{label}</div>
              <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 死亡（お別れ）の挙動 */}
      <section style={{ background: '#fef2f2', padding: 16, borderRadius: 12, marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#991b1b' }}>
          🕊️ HP=0が72時間続いたら…
        </h2>
        <p style={{ fontSize: 12, color: '#991b1b', lineHeight: 1.7 }}>
          現代たまごっち（My Tamagotchi Forever 等）と同じく、<strong>「死」ではなく「旅立ち／卒業」演出</strong>を採用。
          ユーザーに罪悪感を与えず、新しい卵から再スタート。これまでのおにぎり君の記録は<strong>図鑑に残る</strong>形でやんわり振り返れます。
        </p>
      </section>

      {/* 卒業の流れ */}
      <section style={{ background: '#fef9c3', padding: 16, borderRadius: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#854d0e' }}>
          🎓 大人になって30日経過 → 卒業
        </h2>
        <p style={{ fontSize: 12, color: '#854d0e', lineHeight: 1.7 }}>
          おにぎり君は卒業して旅立ち、図鑑（/pet/collection）にその姿が永久保存されます。
          すぐに新しい卵が生まれて、また5段階の冒険が始まります。<br />
          全7形態をコンプリートできるかな？
        </p>
      </section>
    </div>
  )
}
