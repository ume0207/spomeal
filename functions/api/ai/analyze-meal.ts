// 写真解析用: GPT-4o（食品名+グラム数の特定のみ、軽量プロンプト）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env; params: Record<string, string>; next: () => Promise<Response> }) => Promise<Response> | Response

interface Env {
  OPENAI_API_KEY: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  try {
    const { text, image, mimeType } = await context.request.json() as {
      text?: string
      image?: string  // base64
      mimeType?: string
    }

    if (!text && !image) {
      return new Response(JSON.stringify({ error: '食事の説明または写真が必要です' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const apiKey = context.env.OPENAI_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'APIキーが設定されていません' }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // メッセージ構築（OpenAI Vision形式）
    const content: any[] = []

    if (image) {
      const mime = mimeType || 'image/jpeg'
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:${mime};base64,${image}`,
          detail: 'auto',
        },
      })
    }

    // プロンプト: 食品名とグラム数の特定（丁寧でわかりやすい料理名）
    const foodDesc = text ? `食事: ${text}` : 'この写真の食事'
    content.push({
      type: 'text',
      text: `${foodDesc}に含まれる食品・料理を分析してください。

## ルール
1. 料理名は「丁寧でわかりやすい日本語」で記述してください
   - 良い例: 「鶏むね肉のグリル」「ほうれん草のおひたし」「玄米ごはん」「豚肉の生姜焼き」「ツナマヨネーズのおにぎり」
   - 悪い例: 「鶏むね」「ほうれん草」「米」（単なる食材名はNG）
2. 料理の場合は調理法を含めてください（例: 〜の炒め物、〜のサラダ、〜の煮物）
3. 飲み物やドレッシングも含めてください
4. 量の説明は具体的にわかりやすく（例: 「お茶碗1杯分」「手のひらサイズ1枚」「小鉢1杯」）
5. 写真がある場合は見た目から量を正確に推定してください
6. comment は食事全体の簡単な説明（例: 「バランスの良い和定食です」「高タンパクなトレーニング向きメニューです」）

## 回答形式（JSONのみ、他のテキスト不要）
{"items":[{"name":"丁寧な料理名","amount":"わかりやすい量の説明","grams":200}],"comment":"食事全体の一言説明"}`,
    })

    // OpenAI API呼び出し（GPT-4o）
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: '写真や説明から食品・料理を正確に分析する栄養管理の専門家です。料理名は「鶏むね肉のグリル」「ほうれん草のおひたし」のように丁寧でわかりやすい日本語で記述してください。単なる食材名（「鶏むね」「米」など）ではなく、調理法を含めた料理名にしてください。量の説明も「お茶碗1杯」「手のひらサイズ」など具体的に。JSONのみ返してください。',
          },
          { role: 'user', content },
        ],
        temperature: 0.2,
        max_tokens: 512,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as any
      console.error('OpenAI API error:', res.status, err)
      return new Response(JSON.stringify({
        error: err.error?.message || `API error: ${res.status}`,
      }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const data = await res.json() as any
    const rawText = data.choices?.[0]?.message?.content || ''

    // JSON抽出
    let result: any = null
    try {
      result = JSON.parse(rawText)
    } catch {
      let jsonStr = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
      const firstBrace = jsonStr.indexOf('{')
      const lastBrace = jsonStr.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = jsonStr.slice(firstBrace, lastBrace + 1)
      }
      jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1')
      try {
        result = JSON.parse(jsonStr)
      } catch {
        return new Response(JSON.stringify({
          error: '食品データを取得できませんでした',
          raw: rawText.substring(0, 500),
        }), {
          status: 422,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (e) {
    console.error('analyze-meal error:', e)
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
}

// CORS preflight
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
