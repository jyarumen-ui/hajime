import Anthropic from '@anthropic-ai/sdk'
import type { UserProfile } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  const { userMessage, assistantMessage, currentProfile } = await request.json() as {
    userMessage: string
    assistantMessage: string
    currentProfile: UserProfile
  }

  const existing = Object.entries(currentProfile)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `以下の会話から、ユーザーについて新たにわかった事実だけを抽出してください。

【既知情報（抽出不要）】
${existing || 'なし'}

【今回の会話】
ユーザー: ${userMessage}
AI: ${assistantMessage}

【抽出ルール】
- 既知情報と重複する内容は除外
- 明確に述べられた事実のみ（推測不可）
- 以下のキーのいずれかに当てはまる場合のみ抽出
  売上規模, 事業ステージ, リソース, 主な課題, 試したこと, ターゲット顧客, 収益モデル, 目標, 強み, 業種
- 新しい情報がなければ空オブジェクトを返す

必ずJSON形式のみで返答（説明文不要）:
{"キー": "値"}`,
    }],
  })

  try {
    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const extracted: UserProfile = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    const merged: UserProfile = { ...currentProfile }
    for (const [k, v] of Object.entries(extracted)) {
      if (v && !merged[k]) merged[k] = v
    }
    return Response.json({ profile: merged })
  } catch {
    return Response.json({ profile: currentProfile })
  }
}
