#!/usr/bin/env node
/**
 * 食品DB(lib/food-db.ts)の全エントリに対し、本番の
 *   POST https://spomeal.jp/api/admin/batch-vitamins
 * を呼び出して微量栄養素17項目を生成し、JSONに保存するスクリプト。
 *
 * 使い方:
 *   node scripts/generate-vitamins.mjs            # 通常実行（中断後はレジューム）
 *   node scripts/generate-vitamins.mjs --resume   # 既存出力を尊重して未処理だけ
 *   node scripts/generate-vitamins.mjs --reset    # 既存出力を削除して最初から
 *
 * 出力: scripts/vitamins-output.json
 *   { "白米": { vitaminA_ug: 0, ... }, "玄米": { ... }, ... }
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')
const FOOD_DB_PATH = path.join(REPO_ROOT, 'lib/food-db.ts')
const OUTPUT_PATH = path.join(__dirname, 'vitamins-output.json')

const ENDPOINT = process.env.SPOMEAL_BATCH_URL || 'https://spomeal.jp/api/admin/batch-vitamins'
const PASSWORD = process.env.ADMIN_DANGER_PASSWORD || '0323@'
const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || '20', 10)
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '6', 10)
const RETRY_LIMIT = 3
const RETRY_DELAY_MS = 2000

function parseFoodDb() {
  const src = fs.readFileSync(FOOD_DB_PATH, 'utf8')
  const re = /'([^']+)':\s*\{\s*kcal:\s*([\d.]+),\s*p:\s*([\d.]+),\s*f:\s*([\d.]+),\s*c:\s*([\d.]+),\s*g:\s*([\d.]+)\s*\}/g
  const entries = []
  let m
  while ((m = re.exec(src)) !== null) {
    entries.push({
      name: m[1],
      kcal: parseFloat(m[2]),
      p: parseFloat(m[3]),
      f: parseFloat(m[4]),
      c: parseFloat(m[5]),
      g: parseFloat(m[6]),
    })
  }
  return entries
}

function loadExisting() {
  if (!fs.existsSync(OUTPUT_PATH)) return {}
  try { return JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8')) } catch { return {} }
}

function saveResults(results) {
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), 'utf8')
}

async function callBatch(foods, attempt = 1) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      password: PASSWORD,
      foods: foods.map(f => ({ name: f.name, g: f.g })),
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    if (attempt <= RETRY_LIMIT) {
      console.warn(`  [retry ${attempt}/${RETRY_LIMIT}] HTTP ${res.status}: ${err.slice(0, 200)}`)
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt))
      return callBatch(foods, attempt + 1)
    }
    throw new Error(`Failed after ${RETRY_LIMIT} retries: ${res.status} ${err.slice(0, 200)}`)
  }
  const json = await res.json()
  if (!json.ok || !Array.isArray(json.results)) {
    throw new Error('Invalid response: ' + JSON.stringify(json).slice(0, 300))
  }
  return json.results
}

async function main() {
  const args = new Set(process.argv.slice(2))
  if (args.has('--reset') && fs.existsSync(OUTPUT_PATH)) {
    fs.unlinkSync(OUTPUT_PATH)
    console.log('既存出力を削除しました')
  }

  const allFoods = parseFoodDb()
  console.log(`food-db.ts から ${allFoods.length} 品目を抽出`)

  const results = loadExisting()
  const initialCount = Object.keys(results).length
  console.log(`既存結果: ${initialCount} 品目`)

  const todo = allFoods.filter(f => !results[f.name])
  console.log(`未処理: ${todo.length} 品目`)

  if (todo.length === 0) {
    console.log('全品目処理済みです')
    return
  }

  const chunks = []
  for (let i = 0; i < todo.length; i += CHUNK_SIZE) {
    chunks.push(todo.slice(i, i + CHUNK_SIZE))
  }
  console.log(`チャンク数: ${chunks.length} (${CHUNK_SIZE}品目/チャンク, 並列度 ${CONCURRENCY})`)
  console.log('')

  const startTs = Date.now()
  let nextIdx = 0
  let completed = 0
  let failed = false
  const KEYS = ['vitaminA_ug','vitaminD_ug','vitaminE_mg','vitaminK_ug','vitaminB1_mg','vitaminB2_mg','vitaminB6_mg','vitaminB12_ug','vitaminC_mg','niacin_mg','folate_ug','calcium_mg','iron_mg','magnesium_mg','potassium_mg','sodium_mg','zinc_mg']

  let saveCounter = 0
  function maybeSave() {
    saveCounter++
    if (saveCounter % 3 === 0) saveResults(results)
  }

  async function worker(workerId) {
    while (!failed) {
      const idx = nextIdx++
      if (idx >= chunks.length) return
      const chunk = chunks[idx]
      const t0 = Date.now()
      try {
        const items = await callBatch(chunk)
        for (const it of items) {
          if (!it || !it.name) continue
          const out = {}
          for (const k of KEYS) {
            out[k] = typeof it[k] === 'number' ? Math.round(it[k] * 100) / 100 : 0
          }
          results[it.name] = out
        }
        completed++
        maybeSave()
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
        console.log(`[w${workerId} ${completed}/${chunks.length}] ${chunk[0].name} 〜 ${chunk[chunk.length - 1].name} OK (${elapsed}s, 累計 ${Object.keys(results).length}/${allFoods.length})`)
      } catch (e) {
        console.error(`\n  チャンク${idx}失敗: ${e.message}`)
        saveResults(results)
        failed = true
        return
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1))
  await Promise.all(workers)
  saveResults(results)

  if (failed) {
    console.log('一部失敗。--resume で続きから再開できます')
    process.exit(1)
  }
  const totalSec = ((Date.now() - startTs) / 1000).toFixed(0)
  console.log(`\n完了: ${Object.keys(results).length}/${allFoods.length} 品目 (${totalSec}s)`)
  console.log(`出力: ${OUTPUT_PATH}`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
