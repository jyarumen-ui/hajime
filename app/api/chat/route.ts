import Anthropic from '@anthropic-ai/sdk'
import type { ExecutiveRole, Message } from '@/types'
import { getSystemPrompt } from '@/lib/executives'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'APIキーを設定してください' }, { status: 500 })
  }

  const body = await request.json() as {
    messages: Message[]
    role: ExecutiveRole
    companyContext: { name: string; concept: string }
  }

  const { messages, role, companyContext } = body
  const systemPrompt = getSystemPrompt(role, companyContext.name, companyContext.concept)

  const anthropicMessages = messages
    .filter(m => m.content.trim())
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: anthropicMessages,
  })

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } catch (e) {
        controller.error(e)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}
