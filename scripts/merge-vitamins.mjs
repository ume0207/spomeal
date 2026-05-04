#!/usr/bin/env node
/**
 * scripts/vitamins-output.json (バッチ生成結果) を読み、
 * lib/food-db.ts の各エントリにマージして書き戻すスクリプト。
 *
 * 各エントリの型を { kcal, p, f, c, g } から
 * { kcal, p, f, c, g, vitaminA_ug, ... } に拡張する。
 *
 * 使い方:
 *   node scripts/merge-vitamins.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')
const FOOD_DB_PATH = path.join(REPO_ROOT, 'lib/food-db.ts')
const OUTPUT_PATH = path.join(__dirname, 'vitamins-output.json')

const MICRO_KEYS = [
  'vitaminA_ug','vitaminD_ug','vitaminE_mg','vitaminK_ug',
  'vitaminB1_mg','vitaminB2_mg','vitaminB6_mg','vitaminB12_ug',
  'vitaminC_mg','niacin_mg','folate_ug',
  'calcium_mg','iron_mg','magnesium_mg','potassium_mg','sodium_mg','zinc_mg',
]

function main() {
  if (!fs.existsSync(OUTPUT_PATH)) {
    console.error(`vitamins-output.json が見つかりません: ${OUTPUT_PATH}`)
    process.exit(1)
  }
  const vitamins = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'))
  const src = fs.readFileSync(FOOD_DB_PATH, 'utf8')

  // 1. 型宣言を拡張
  const newType = `export const FOOD_DB: Record<string, {
  kcal: number; p: number; f: number; c: number; g: number;
  vitaminA_ug?: number; vitaminD_ug?: number; vitaminE_mg?: number; vitaminK_ug?: number;
  vitaminB1_mg?: number; vitaminB2_mg?: number; vitaminB6_mg?: number; vitaminB12_ug?: number;
  vitaminC_mg?: number; niacin_mg?: number; folate_ug?: number;
  calcium_mg?: number; iron_mg?: number; magnesium_mg?: number; potassium_mg?: number; sodium_mg?: number; zinc_mg?: number;
}> = {`

  let updated = src.replace(
    /export const FOOD_DB:\s*Record<string,\s*\{[^}]*\}>\s*=\s*\{/,
    newType
  )

  // 2. 各エントリにビタミン値を追記
  let mergedCount = 0
  let missingCount = 0
  const re = /'([^']+)':\s*\{\s*kcal:\s*([\d.]+),\s*p:\s*([\d.]+),\s*f:\s*([\d.]+),\s*c:\s*([\d.]+),\s*g:\s*([\d.]+)\s*\}/g

  updated = updated.replace(re, (full, name, kcal, p, f, c, g) => {
    const v = vitamins[name]
    if (!v) {
      missingCount++
      return full  // データなしはそのまま
    }
    mergedCount++
    const microStr = MICRO_KEYS.map(k => `${k}: ${v[k] ?? 0}`).join(', ')
    return `'${name}': { kcal: ${kcal}, p: ${p}, f: ${f}, c: ${c}, g: ${g}, ${microStr} }`
  })

  fs.writeFileSync(FOOD_DB_PATH, updated, 'utf8')
  console.log(`マージ完了: ${mergedCount} 品目`)
  if (missingCount > 0) console.log(`データなし: ${missingCount} 品目（既存PFCのまま）`)
  console.log(`書き込み先: ${FOOD_DB_PATH}`)

  // ファイルサイズ表示
  const size = fs.statSync(FOOD_DB_PATH).size
  console.log(`サイズ: ${(size / 1024).toFixed(1)} KB`)
}

main()
