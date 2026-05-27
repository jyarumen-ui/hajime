import Anthropic from '@anthropic-ai/sdk'
import type { ExecutiveRole, Message } from '@/types'
import { getSystemPrompt } from '@/lib/executives'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildTeamContext(allConversations: Record<ExecutiveRole, Message[]>, currentRole: ExecutiveRole): string {
  const roles: ExecutiveRole[] = ['CEO', 'COO', 'CTO', 'CMO', 'CFO']
  const lines: string[] = []

  for (const role of roles) {
    if (role === currentRole) continue
    const msgs = allConversations[role] ?? []
    const recent = msgs.filter(m => m.content.trim()).slice(-4)
    if (recent.length === 0) continue
    lines.push(`【${role}の直近の議論】`)
    for (const m of recent) {
      lines.push(`${m.role === 'user' ? '代表' : role}: ${m.content.slice(0, 200)}`)
    }
  }

  return lines.length > 0
    ? `\n\n---\n# チーム共有コンテキスト（他役員の議論）\n${lines.join('\n')}\n---\n`
    : ''
}

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
  }

  const { messages, role, companyContext, allConversations, summary } = body
  const teamContext = allConversations ? buildTeamContext(allConversations, role) : ''
  const summaryContext = summary
    ? `\n\n---\n# これまでの会話サマリー\n${summary}\n---\n`
    : ''
  const systemPrompt = getSystemPrompt(role, companyContext.name, companyContext.concept) + summaryContext + teamContext

  // summaryがある場合は直近8件のみ送る
  const recentMessages = summary ? messages.slice(-8) : messages
  const anthropicMessages = recentMessages
    .filter(m => m.content.trim())
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: anthropicMessages.length > 0 ? anthropicMessages : [{ role: 'user', content: '...' }],
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
