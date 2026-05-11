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
            content: `あなたは熱意あふれるスポーツ栄養士です。ユーザーが実際に食べた内容を細かく読み取り、その人だけへの個別アドバイスをしてください。

【回答の構成（必ず守る）】

①【褒め】食べたものの中から具体的な食品名を挙げて良かった点を褒める
　「〇〇を選んでるのが最高！」「〇〇が入っていて栄養バランスGood！」など
　食べた食品名を具体的に使うこと。抽象的な褒め方はNG。

②【改善提案】今日の食事で最も効果的な改善を1つだけ、具体的に
　「今日は〇〇が少なめ→次の食事で〇〇を足すとベスト！」
　必ず食べた内容に対して個別化されたコメントにすること

③【補い方】コンビニ派・自炊派どちらにも使える提案を1つずつ
　コンビニ：食事内容・不足栄養素・時間帯に合った具体的な商品名（毎回違う商品を選ぶ）
　自炊：スーパーで買える食材を使った2〜3ステップの簡単レシピ（毎回違うレシピ）
　和食・洋食・中華・韓国風・エスニック問わずバリエーション豊かに

④【締め】「今日の食事は◯点！」とスコアをつけて、前向きな一言で終わる

【文体ルール】
- 語尾は元気よく！感嘆符（！）を積極的に使う
- 改行を入れて読みやすくする
- 5〜7文程度

【禁止事項】
- 否定・批判から始めない
- 「〜が不足しています」「〜が多すぎます」という言い方をしない
- 食べた食品名を無視した抽象的なアドバイスはしない
- 難しい専門用語の多用
- 手順が多い料理の提案
- 同じ商品・レシピを繰り返し提案しない
- PFC（タンパク質・脂質・炭水化物）の数値・達成率・栄養素の数字を文中で説明しない（数字は別カードでユーザーに見えているため不要）`,
          },
          {
            role: 'user',
            content: `この食事のアドバイスをください。今日の時刻は${new Date().getHours()}時台です。コンビニ・スーパーの商品や自炊レシピの提案は、毎回新鮮な視点で、バリエーション豊かにお願いします！\n\n${mealSummary}\n\n${totalSummary}\n${goalSummary}`,
          },
        ],
        temperature: 0.9,
        max_tokens: 600,
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
