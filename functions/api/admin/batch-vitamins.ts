import { corsHeaders, handleOptions } from '../../_shared/auth'

type PagesFunction<Env = Record<string, unknown>> = (context: {
  request: Request
  env: Env
}) => Promise<Response> | Response

interface Env {
  OPENAI_API_KEY: string
  ADMIN_DANGER_PASSWORD?: string
}

const DEFAULT_DANGER_PASSWORD = '0323@'

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

export const onRequestOptions: PagesFunction = async ({ request }) => handleOptions(request)

/**
 * POST /api/admin/batch-vitamins
 * body: { password: string, foods: Array<{name: string; g: number}> }
 *
 * 食品名と基準グラム数のリストに対し、微量栄養素17項目を一括生成する。
 * food-db.ts の事前パッチ生成用。1チャンク 30品目まで。
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const cors = corsHeaders(request)

  let body: { password?: string; foods?: Array<{ name: string; g: number }> }
  try {
    body = await request.json() as typeof body
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'JSON 解析失敗' }), { status: 400, headers: cors })
  }

  const expected = env.ADMIN_DANGER_PASSWORD || DEFAULT_DANGER_PASSWORD
  if (!body.password || !safeEqual(String(body.password), expected)) {
    return new Response(JSON.stringify({ ok: false, error: '追加パスワードが違います' }), { status: 401, headers: cors })
  }

  if (!body.foods || !Array.isArray(body.foods) || body.foods.length === 0) {
    return new Response(JSON.stringify({ ok: false, error: 'foods 配列が必要です' }), { status: 400, headers: cors })
  }
  if (body.foods.length > 40) {
    return new Response(JSON.stringify({ ok: false, error: 'foods は1回40品目まで' }), { status: 400, headers: cors })
  }
  if (!env.OPENAI_API_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'OPENAI_API_KEY 未設定' }), { status: 500, headers: cors })
  }

  // プロンプト構築
  const foodsList = body.foods.map((f, i) => `${i + 1}. ${f.name} ${f.g}g`).join('\n')
  const prompt = `以下の食品それぞれに、指定グラム数あたりの微量栄養素17項目を JSON で返してください。

## 食品リスト
${foodsList}

## ルール
- 値は日本食品標準成分表（八訂）に基づくこと
- 単位は固定: vitaminA_ug, vitaminD_ug, vitaminE_mg, vitaminK_ug, vitaminB1_mg, vitaminB2_mg, vitaminB6_mg, vitaminB12_ug, vitaminC_mg, niacin_mg, folate_ug, calcium_mg, iron_mg, magnesium_mg, potassium_mg, sodium_mg, zinc_mg
- 不明な値は0を返す（nullや省略は不可）
- 順番は入力リストと同じにする
- name は入力リストと完全一致

## 回答形式（JSONのみ）
{"results":[{"name":"白米","vitaminA_ug":0,"vitaminD_ug":0,"vitaminE_mg":0,"vitaminK_ug":0,"vitaminB1_mg":0.03,"vitaminB2_mg":0.02,"vitaminB6_mg":0.03,"vitaminB12_ug":0,"vitaminC_mg":0,"niacin_mg":0.3,"folate_ug":5,"calcium_mg":4,"iron_mg":0.2,"magnesium_mg":10,"potassium_mg":42,"sodium_mg":1,"zinc_mg":0.9}]}`

  try {
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',  // 安価かつ栄養素計算には十分
        messages: [
          { role: 'system', content: '日本食品標準成分表に精通した栄養士です。指定された食品ごとの微量栄養素17項目を厳密にJSON形式で返してください。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0,
        max_tokens: 8000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!aiRes.ok) {
      const err = await aiRes.text().catch(() => '')
      return new Response(JSON.stringify({ ok: false, error: `OpenAI API ${aiRes.status}`, detail: err.slice(0, 500) }), {
        status: aiRes.status,
        headers: cors,
      })
    }

    const data = await aiRes.json() as { choices?: Array<{ message?: { content?: string } }> }
    const rawText = data.choices?.[0]?.message?.content || ''

    let parsed: { results?: any[] } = {}
    try {
      parsed = JSON.parse(rawText)
    } catch {
      let s = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
      const i = s.indexOf('{'); const j = s.lastIndexOf('}')
      if (i !== -1 && j > i) s = s.slice(i, j + 1)
      try { parsed = JSON.parse(s) } catch {
        return new Response(JSON.stringify({ ok: false, error: 'JSON parse failed', raw: rawText.slice(0, 500) }), {
          status: 422, headers: cors,
        })
      }
    }

    return new Response(JSON.stringify({ ok: true, results: parsed.results || [] }), {
      status: 200, headers: cors,
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: cors,
    })
  }
}
