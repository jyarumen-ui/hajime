import Anthropic from '@anthropic-ai/sdk'
import type { ExecutiveRole, Message, UserProfile } from '@/types'
import type { FounderProfile } from '@/lib/profile'
import { getSystemPrompt, buildTeamContext, cleanMessageForApi } from '@/lib/executives'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'APIキーを設定してください' }, { status: 500 })
  }

  const body = await request.json() as {
    messages: Message[]
    role: ExecutiveRole
    companyContext: { name: string; concept: string }
    allConversations?: Record<ExecutiveRole, Message[]>
    summary?: string
    userProfile?: UserProfile
    founderProfile?: FounderProfile | null
  }

  const { messages, role, companyContext, allConversations, summary, userProfile, founderProfile } = body

  const systemPrompt = getSystemPrompt(
    role,
    companyContext.name,
    companyContext.concept,
    founderProfile,
    userProfile,
    summary,
  ) + (allConversations ? buildTeamContext(allConversations, role) : '')

  // summaryがある場合は直近8件、なければ全件。CHOICES行を除去してから送る
  const recentMessages = summary ? messages.slice(-8) : messages
  const anthropicMessages = recentMessages
    .filter(m => m.content.trim())
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: cleanMessageForApi(m.content),
    }))
    .filter(m => m.content.trim())

  let stopReason = 'end_turn'
  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    messages: anthropicMessages.length > 0 ? anthropicMessages : [{ role: 'user', content: 'よろしくお願いします' }],
  })

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
          if (chunk.type === 'message_delta' && chunk.delta.stop_reason) {
            stopReason = chunk.delta.stop_reason
          }
        }
        if (stopReason === 'max_tokens') {
          controller.enqueue(encoder.encode('\n\n__TRUNCATED__'))
        }
      } catch (e) {
        controller.error(e)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
  })
}
