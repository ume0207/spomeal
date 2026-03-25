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

    let imageData: string
    let mediaType: string = 'image/jpeg'

    if (image) {
      const buffer = await image.arrayBuffer()
      imageData = Buffer.from(buffer).toString('base64')
      mediaType = image.type
    } else {
      // For URL-based images, fetch and convert to base64
      const response = await fetch(imageUrl!)
      const buffer = await response.arrayBuffer()
      imageData = Buffer.from(buffer).toString('base64')
      mediaType = response.headers.get('content-type') || 'image/jpeg'
    }

    // Call Anthropic Claude API for food analysis
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: imageData,
                },
              },
              {
                type: 'text',
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
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`)
    }

    const claudeResponse = await response.json()
    const content = claudeResponse.content[0]?.text

    if (!content) {
      throw new Error('No content in response')
    }

    // Parse the JSON response
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
