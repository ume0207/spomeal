// 写真解析用: GPT-4o（食品名+グラム数の特定のみ、軽量プロンプト）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { verifyUser, corsHeaders as sharedCors, authErrorResponse } from '../../_shared/auth'
import { canUseAiAnalysis, incrementAiAnalysisCount } from '../../_shared/usage'

type PagesFunction<Env = Record<string, unknown>> = (context: { request: Request; env: Env; params: Record<string, string>; next: () => Promise<Response> }) => Promise<Response> | Response

interface Env {
  OPENAI_API_KEY: string
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = sharedCors(context.request)

  // 認証: ログイン中ユーザーのみ
  const auth = await verifyUser(context.request, context.env)
  if (!auth.ok) return authErrorResponse(auth, context.request)

  // プラン別AI解析回数チェック
  const quota = await canUseAiAnalysis(auth.user.id, context.env)
  if (!quota.ok) {
    return new Response(
      JSON.stringify({
        error: quota.message,
        planId: quota.planId,
        current: quota.current,
        limit: quota.limit,
      }),
      { status: 429, headers: corsHeaders }
    )
  }

  try {
    const { text, image, mimeType, images } = await context.request.json() as {
      text?: string
      image?: string  // base64 (単一画像・後方互換)
      mimeType?: string
      images?: { data: string; mimeType: string }[]  // 複数画像対応
    }

    if (!text && !image && (!images || images.length === 0)) {
      return new Response(JSON.stringify({ error: '食事の説明または写真が必要です' }), {
        status: 400, headers: corsHeaders,
      })
    }

    const apiKey = context.env.OPENAI_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'APIキーが設定されていません' }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // メッセージ構築（OpenAI Vision形式・複数画像対応）
    const content: any[] = []

    // 複数画像対応
    if (images && images.length > 0) {
      for (const img of images) {
        content.push({
          type: 'image_url',
          image_url: {
            url: `data:${img.mimeType || 'image/jpeg'};base64,${img.data}`,
            detail: 'auto',
          },
        })
      }
    } else if (image) {
      // 後方互換: 単一画像
      const mime = mimeType || 'image/jpeg'
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:${mime};base64,${image}`,
          detail: 'auto',
        },
      })
    }

    // テキストのみか写真ありかで完全に別プロンプトを使い分ける
    const photoCount = (images && images.length > 0) ? images.length : (image ? 1 : 0)
    const isTextOnly = !!text && photoCount === 0

    if (isTextOnly) {
      // ===== テキスト入力専用プロンプト =====
      // ルール: ユーザーが入力した料理名をそのまま使う・分解しない・PFC + 微量栄養素17項目を返す
      content.push({
        type: 'text',
        text: `以下の食事内容の栄養情報をJSON形式で返してください。

食事内容: ${text}

## ルール（重要）
- ユーザーが入力した料理・食品名をそのまま使うこと（分解・細分化しない）
- 例: 「ラーメン」→「ラーメン」1品として返す（スープと麺に分けない）
- 例: 「唐揚げ定食」→「唐揚げ定食」1品（唐揚げ・ごはん・味噌汁に分けない）
- ユーザーが複数品を入力した場合はその品数分だけ返す
- 量が未指定の場合は一般的な1人前のグラム数を推定する
- kcal・protein・fat・carbs および 微量栄養素17項目は日本食品標準成分表（八訂）に基づいた値を返す
- 微量栄養素の単位は固定: vitaminA_ug, vitaminD_ug, vitaminE_mg, vitaminK_ug, vitaminB1_mg, vitaminB2_mg, vitaminB6_mg, vitaminB12_ug, vitaminC_mg, niacin_mg, folate_ug, calcium_mg, iron_mg, magnesium_mg, potassium_mg, sodium_mg, zinc_mg
- 不明な値は0を返す（nullや省略は不可）

## 回答形式（JSONのみ、他のテキスト不要）
{"items":[{"name":"料理名（入力のまま）","amount":"1人前（約Xg）","grams":500,"kcal":450,"protein":17,"fat":12,"carbs":68,"vitaminA_ug":120,"vitaminD_ug":0.5,"vitaminE_mg":1.2,"vitaminK_ug":15,"vitaminB1_mg":0.2,"vitaminB2_mg":0.15,"vitaminB6_mg":0.3,"vitaminB12_ug":0.8,"vitaminC_mg":5,"niacin_mg":3.5,"folate_ug":40,"calcium_mg":80,"iron_mg":1.5,"magnesium_mg":35,"potassium_mg":280,"sodium_mg":850,"zinc_mg":1.8}],"comment":"一言コメント"}`,
      })
    } else {
      // ===== 写真解析プロンプト =====
      const foodDesc = text
        ? `食事: ${text}`
        : (photoCount > 1 ? `これら${photoCount}枚の写真に写っている全ての食事` : 'この写真の食事')

      content.push({
        type: 'text',
        text: `${foodDesc}に含まれる食品・料理をプロの栄養士として徹底的に分析してください。

## 分析ルール

### 料理名の書き方
- 丁寧でわかりやすい日本語で記述すること
- 良い例: 「鶏むね肉のグリル」「ほうれん草のおひたし」「玄米ごはん」「豚肉の生姜焼き」
- 悪い例: 「鶏むね」「ほうれん草」「米」（単なる食材名はNG）
- 調理法を含める（〜の炒め物、〜のサラダ、〜の煮物、〜のフライ）

### ソース・調味料・ドレッシングの分析（重要）
- ソースや調味料は必ず別の品目として分けて記載すること
- 何のソースか具体的に特定する（「ソース」だけはNG）
- 良い例: 「デミグラスソース」「タルタルソース」「和風ドレッシング」「ケチャップ」「マヨネーズ」
- 写真から判断できない場合は料理に合う一般的なソースを推定して記載

### その他の注意
- 飲み物（お茶、コーヒー、ジュースなど）も必ず含める
- サラダの場合はドレッシングを別品目で記載
- 丼物・麺類のつゆ・スープも別品目で記載
- 量の説明は具体的に（「お茶碗1杯分」「手のひらサイズ1枚」「小鉢1杯」「大さじ1杯分」）
- 写真がある場合は見た目から量を正確に推定
- commentは食事全体のわかりやすい説明

### 栄養素（必須）
- 各品目に kcal, protein, fat, carbs および 微量栄養素17項目を返す
- 単位は固定: kcal, protein(g), fat(g), carbs(g), vitaminA_ug, vitaminD_ug, vitaminE_mg, vitaminK_ug, vitaminB1_mg, vitaminB2_mg, vitaminB6_mg, vitaminB12_ug, vitaminC_mg, niacin_mg, folate_ug, calcium_mg, iron_mg, magnesium_mg, potassium_mg, sodium_mg, zinc_mg
- 値は日本食品標準成分表（八訂）に基づくこと
- 不明な値は0を返す（nullや省略は不可）

## 回答形式（JSONのみ、他のテキスト不要）
{"items":[{"name":"丁寧な料理名","amount":"わかりやすい量の説明","grams":200,"kcal":300,"protein":15,"fat":8,"carbs":40,"vitaminA_ug":100,"vitaminD_ug":0.3,"vitaminE_mg":1.0,"vitaminK_ug":10,"vitaminB1_mg":0.15,"vitaminB2_mg":0.12,"vitaminB6_mg":0.25,"vitaminB12_ug":0.6,"vitaminC_mg":4,"niacin_mg":3,"folate_ug":35,"calcium_mg":60,"iron_mg":1.2,"magnesium_mg":30,"potassium_mg":250,"sodium_mg":700,"zinc_mg":1.5}],"comment":"食事全体の一言説明"}`,
      })
    }

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
            content: '写真や説明から食品・料理を正確に分析するプロの栄養管理士です。料理名は「鶏むね肉のグリル」「ほうれん草のおひたし」のように丁寧でわかりやすい日本語で記述してください。ソース・調味料・ドレッシングは必ず種類を特定して別品目として記載してください（「デミグラスソース」「タルタルソース」「和風ドレッシング」など。「ソース」だけはNG）。飲み物やスープも含めてください。量の説明も「お茶碗1杯」「大さじ1杯分」など具体的に。JSONのみ返してください。',
          },
          { role: 'user', content },
        ],
        temperature: 0.2,
        max_tokens: 4096,
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

    // 解析成功: AI使用回数をインクリメント
    await incrementAiAnalysisCount(auth.user.id, context.env).catch(() => {})

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
