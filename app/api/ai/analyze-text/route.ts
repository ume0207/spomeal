import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { text } = await request.json()

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 })
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `あなたは管理栄養士です。以下の食事内容から各食品の栄養情報を推定してJSON形式で返してください。
量が指定されていない場合は一般的な1人前の量を推定してください。

食事内容: ${text}

以下のフォーマットで返答してください：
{
  "foods": [
    {
      "name": "食品名（日本語）",
      "amount": "量（例: 150g, 1杯）",
      "calories": カロリー数値,
      "protein": タンパク質g数値,
      "fat": 脂質g数値,
      "carbs": 炭水化物g数値
    }
  ],
  "total": {
    "calories": 合計カロリー数値,
    "protein": 合計タンパク質g,
    "fat": 合計脂質g,
    "carbs": 合計炭水化物g
  }
}

JSONのみを返してください。他のテキストは不要です。`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024,
          },
        }),
      }
    )

    if (!response.ok) {
      const errBody = await response.text()
      console.error('Gemini API error:', response.status, errBody)
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const geminiResponse = await response.json()
    const content = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text

    if (!content) {
      throw new Error('No content in response')
    }

    const cleanedContent = content.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '')
    const nutritionData = JSON.parse(cleanedContent)

    return NextResponse.json(nutritionData)
  } catch (error) {
    console.error('AI text analyze error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze text' },
      { status: 500 }
    )
  }
}
