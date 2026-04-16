// 栄養アドバイス用: GPT-4o（テキストのみ、画像なし）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { verifyUser, corsHeaders as sharedCors, authErrorResponse } from '../../_shared/auth'

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

  try {
    const { items, totals, goal } = await context.request.json() as {
      items: { name: string; grams: number; kcal: number; protein: number; fat: number; carbs: number }[]
      totals: { kcal: number; protein: number; fat: number; carbs: number }
      goal?: { kcal?: number; protein?: number; fat?: number; carbs?: number }
    }

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: '食品データが必要です' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const apiKey = context.env.OPENAI_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI APIキーが設定されていません' }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // 食事内容を文字列にまとめる
    const mealSummary = items.map(i => `${i.name} ${i.grams}g (${i.kcal}kcal P${i.protein}g F${i.fat}g C${i.carbs}g)`).join('\n')
    const totalSummary = `合計: ${totals.kcal}kcal / P${totals.protein}g / F${totals.fat}g / C${totals.carbs}g`
    const goalSummary = goal ? `目標: ${goal.kcal || '?'}kcal / P${goal.protein || '?'}g / F${goal.fat || '?'}g / C${goal.carbs || '?'}g` : ''

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
            content: `あなたは明るくポジティブなスポーツ栄養士です。ユーザーの食事記録に対して、元気よく・褒めながら・実用的なアドバイスをしてください。

【必ず守るルール】
1. 最初に「今日の食事の良いところ」を具体的に褒める（例：タンパク質がしっかり摂れてます！野菜も入っていて素晴らしい！）
2. 次に「もう少しこうするともっと良くなる」という前向きな改善アドバイスを1〜2つ
3. コンビニ・スーパーで手軽に買える具体的な商品名を挙げて補い方を提案する（例：セブンの「サラダチキン」、ファミマの「プロテインバー」、スーパーの「無調整豆乳」など）
4. 手間がかからない工夫や時短のコツも添える（例：「冷凍野菜を活用」「コンビニのゆで卵は最強」など）
5. 語尾は元気よく！感嘆符（！）を使い、テンションを上げる
6. 全体を通じて「この調子で続けよう！」という励ましのトーンで締める
7. 回答は4〜5文、読みやすく改行を入れる

【禁止事項】
- 否定から始めない（「〜が足りません」「〜がよくない」で始めない）
- 難しい専門用語を多用しない`,
          },
          {
            role: 'user',
            content: `この食事のアドバイスをください。\n\n${mealSummary}\n\n${totalSummary}\n${goalSummary}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 400,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as any
      console.error('OpenAI API error:', res.status, err)
      return new Response(JSON.stringify({
        error: err.error?.message || `OpenAI API error: ${res.status}`,
      }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const data = await res.json() as any
    const advice = data.choices?.[0]?.message?.content || ''

    return new Response(JSON.stringify({ advice }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (e) {
    console.error('advice error:', e)
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
