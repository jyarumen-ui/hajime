import Anthropic from '@anthropic-ai/sdk'
import type { ExecutiveRole, Message } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  const { messages, role, companyName } = await request.json() as {
    messages: Message[]
    role: ExecutiveRole
    companyName: string
  }

  const transcript = messages
    .filter(m => m.content.trim())
    .map(m => `${m.role === 'user' ? '代表' : role}: ${m.content}`)
    .join('\n')

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `以下は「${companyName}」の${role}との会話ログです。重要な意思決定・戦略・数値・課題を300字以内で箇条書きにまとめてください。

${transcript}`,
    }],
  })

  const summary = response.content[0].type === 'text' ? response.content[0].text : ''
  return Response.json({ summary })
}
