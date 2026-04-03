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

    const formData = await request.formData()
    const image = formData.get('image') as File | null
    const imageUrl = formData.get('imageUrl') as string | null

    if (!image && !imageUrl) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 })
    }

    let imageData: string
    let mimeType: string = 'image/jpeg'

    if (image) {
      const buffer = await image.arrayBuffer()
      imageData = Buffer.from(buffer).toString('base64')
      mimeType = image.type
    } else {
      const response = await fetch(imageUrl!)
      const buffer = await response.arrayBuffer()
      imageData = Buffer.from(buffer).toString('base64')
      mimeType = response.headers.get('content-type') || 'image/jpeg'
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
                  inlineData: {
                    mimeType: mimeType,
                    data: imageData,
                  },
                },
                {
                  text: `この食事の写真を分析して、栄養情報をJSON形式で返してください。

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
  },
  "confidence": "high/medium/low",
  "notes": "補足説明（あれば）"
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
    console.error('AI analyze error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze image' },
      { status: 500 }
    )
  }
}
