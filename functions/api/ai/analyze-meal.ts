// 写真解析用: Gemini 2.5 Flash（食品名+グラム数の特定のみ）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env; params: Record<string, string>; next: () => Promise<Response> }) => Promise<Response> | Response

interface Env {
  NEXT_PUBLIC_GEMINI_API_KEY: string
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

    const apiKey = context.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Gemini APIキーが設定されていません' }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

    // Gemini用パーツ構築
    const parts: any[] = []

    if (image) {
      const mime = mimeType || 'image/jpeg'
      parts.push({
        inlineData: {
          mimeType: mime,
          data: image,
        },
      })
    }

    const foodDesc = text ? `食事: ${text}` : 'この写真の食事'
    parts.push({
      text: `${foodDesc}に含まれる食品を特定してください。

各食品の「名前」と「推定グラム数」だけをJSON形式で返してください。栄養計算は不要です。
日本の一般的な食品名で回答してください（例: 白米、鶏むね肉、味噌汁）。

回答はこのJSON形式のみ（他のテキスト不要）:
{"items":[{"name":"食品名","amount":"量の説明","grams":200}],"comment":"一言コメント"}`,
    })

    // Gemini API呼び出し
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 512,
        },
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as any
      console.error('Gemini API error:', res.status, err)
      return new Response(JSON.stringify({
        error: err.error?.message || `Gemini API error: ${res.status}`,
      }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const geminiData = await res.json() as any
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    if (!rawText) {
      return new Response(JSON.stringify({ error: 'AIから応答がありませんでした' }), {
        status: 422, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

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
