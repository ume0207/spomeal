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
          detail: 'low',  // コスト抑制: lowで十分（食品特定には問題なし）
        },
      })
    }

    const foodDesc = text ? `食事: ${text}` : 'この写真の食事'
    content.push({
      type: 'text',
      text: `あなたは管理栄養士です。${foodDesc}の栄養素を分析してください。各食品のグラム数(grams)も推定してください。

回答はこのJSON形式のみ（他のテキスト不要）:
{"items":[{"name":"食品名","amount":"量の説明","grams":200,"kcal":0,"protein":0,"fat":0,"carbs":0}],"calories":0,"protein":0,"fat":0,"carbs":0,"comment":"簡潔な栄養アドバイス"}`,
    })

    // OpenAI API呼び出し（GPT-4o mini）
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'あなたは管理栄養士です。食事の栄養素を正確に分析し、指定されたJSON形式のみで回答してください。JSONのみ返してください。説明文やマークダウンは不要です。',
          },
          { role: 'user', content },
        ],
        temperature: 0.2,
        max_tokens: 2048,
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
      // マークダウンやゴミを除去
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
        const calMatch = rawText.match(/"calories"\s*:\s*(\d+\.?\d*)/)
        if (calMatch) {
          const proMatch = rawText.match(/"protein"\s*:\s*(\d+\.?\d*)/)
          const fatMatch = rawText.match(/"fat"\s*:\s*(\d+\.?\d*)/)
          const carbMatch = rawText.match(/"carbs"\s*:\s*(\d+\.?\d*)/)
          result = {
            calories: parseFloat(calMatch[1]),
            protein: proMatch ? parseFloat(proMatch[1]) : 0,
            fat: fatMatch ? parseFloat(fatMatch[1]) : 0,
            carbs: carbMatch ? parseFloat(carbMatch[1]) : 0,
            comment: '', items: [],
          }
        } else {
          return new Response(JSON.stringify({
            error: '栄養データを取得できませんでした',
            raw: rawText.substring(0, 500),
          }), {
            status: 422,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          })
        }
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
