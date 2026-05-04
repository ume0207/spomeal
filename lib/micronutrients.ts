/**
 * 微量栄養素（ビタミン・ミネラル）共通定義
 * - 単位: vitaminA/D/K/B12/folate=μg, それ以外=mg
 * - RDA: 厚労省「日本人の食事摂取基準2025」推奨量（成人男性30-49歳ベース）
 */

export const MICRONUTRIENT_KEYS = [
  'vitaminA_ug', 'vitaminD_ug', 'vitaminE_mg', 'vitaminK_ug',
  'vitaminB1_mg', 'vitaminB2_mg', 'vitaminB6_mg', 'vitaminB12_ug',
  'vitaminC_mg', 'niacin_mg', 'folate_ug',
  'calcium_mg', 'iron_mg', 'magnesium_mg', 'potassium_mg', 'sodium_mg', 'zinc_mg',
] as const

export type MicronutrientKey = typeof MICRONUTRIENT_KEYS[number]
export type Micronutrients = Partial<Record<MicronutrientKey, number>>

export const MICRONUTRIENT_LABELS: Record<MicronutrientKey, { name: string; unit: string }> = {
  vitaminA_ug:   { name: 'ビタミンA', unit: 'μg' },
  vitaminD_ug:   { name: 'ビタミンD', unit: 'μg' },
  vitaminE_mg:   { name: 'ビタミンE', unit: 'mg' },
  vitaminK_ug:   { name: 'ビタミンK', unit: 'μg' },
  vitaminB1_mg:  { name: 'ビタミンB1', unit: 'mg' },
  vitaminB2_mg:  { name: 'ビタミンB2', unit: 'mg' },
  vitaminB6_mg:  { name: 'ビタミンB6', unit: 'mg' },
  vitaminB12_ug: { name: 'ビタミンB12', unit: 'μg' },
  vitaminC_mg:   { name: 'ビタミンC', unit: 'mg' },
  niacin_mg:     { name: 'ナイアシン', unit: 'mg' },
  folate_ug:     { name: '葉酸', unit: 'μg' },
  calcium_mg:    { name: 'カルシウム', unit: 'mg' },
  iron_mg:       { name: '鉄', unit: 'mg' },
  magnesium_mg:  { name: 'マグネシウム', unit: 'mg' },
  potassium_mg:  { name: 'カリウム', unit: 'mg' },
  sodium_mg:     { name: 'ナトリウム', unit: 'mg' },
  zinc_mg:       { name: '亜鉛', unit: 'mg' },
}

export const MICRO_RDA: Record<MicronutrientKey, number> = {
  vitaminA_ug: 900, vitaminD_ug: 8.5, vitaminE_mg: 6.0, vitaminK_ug: 150,
  vitaminB1_mg: 1.4, vitaminB2_mg: 1.6, vitaminB6_mg: 1.4, vitaminB12_ug: 2.4,
  vitaminC_mg: 100, niacin_mg: 15, folate_ug: 240,
  calcium_mg: 750, iron_mg: 7.5, magnesium_mg: 370, potassium_mg: 3000, sodium_mg: 2900, zinc_mg: 11,
}

// 主要表示項目（デフォルトで見せる6項目）
export const MICRO_PRIMARY: MicronutrientKey[] = [
  'vitaminC_mg', 'calcium_mg', 'iron_mg', 'vitaminD_ug', 'vitaminB12_ug', 'sodium_mg',
]

export function getMicroBarColor(k: MicronutrientKey): string {
  if (k === 'sodium_mg') return '#F59E0B'  // 抑制目標は警戒色
  if (k.startsWith('vitamin') || k === 'niacin_mg' || k === 'folate_ug') return '#6366F1'
  if (k === 'calcium_mg') return '#EC4899'
  if (k === 'iron_mg') return '#EF4444'
  return '#22C55E'
}

/** itemsの配列から微量栄養素の合計を計算 */
export function sumMicros(items: Array<Partial<Record<MicronutrientKey, number>>>): Partial<Record<MicronutrientKey, number>> {
  const out: Partial<Record<MicronutrientKey, number>> = {}
  for (const k of MICRONUTRIENT_KEYS) {
    let sum = 0
    let any = false
    for (const it of items) {
      const v = it[k]
      if (typeof v === 'number') { sum += v; any = true }
    }
    if (any) out[k] = Math.round(sum * 100) / 100
  }
  return out
}
