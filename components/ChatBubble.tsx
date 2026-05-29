'use client'

import type { Message } from '@/types'
import { EXECUTIVE_INFO, parseChoices } from '@/lib/executives'

interface Props {
  message: Message
  isStreaming?: boolean
  onChoice?: (choice: string) => void
  onContinue?: () => void
}

export default function ChatBubble({ message, isStreaming, onChoice, onContinue }: Props) {
  const isUser = message.role === 'user'
  const exec = message.executiveRole ? EXECUTIVE_INFO[message.executiveRole] : null

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed"
          style={{ backgroundColor: '#2A2A3A', color: '#F0F0F0' }}>
          {message.content}
        </div>
      </div>
    )
  }

  const { text, choices } = isStreaming ? { text: message.content, choices: [] } : parseChoices(message.content)
  const showChoices = !isStreaming && choices.length > 0 && onChoice
  const showContinue = !isStreaming && message.isTruncated && onContinue

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[90%]">
        {exec && (
          <div className="flex items-center gap-1 mb-1 ml-1">
            <span className="text-xs">{exec.emoji}</span>
            <span className="text-xs font-bold" style={{ color: '#F5C518' }}>{exec.name}</span>
          </div>
        )}
        <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
          style={{ backgroundColor: '#1A1A28', color: '#F0F0F0' }}>
          {text}
          {isStreaming && (
            <span className="inline-flex gap-0.5 ml-1">
              <span className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: '#F5C518', animationDelay: '0ms' }} />
              <span className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: '#F5C518', animationDelay: '150ms' }} />
              <span className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: '#F5C518', animationDelay: '300ms' }} />
            </span>
          )}
        </div>

        {showContinue && (
          <button
            onClick={onContinue}
            className="mt-2 w-full text-xs px-3 py-2 rounded-xl border border-dashed flex items-center justify-center gap-1.5 transition-all"
            style={{ borderColor: '#F5C518', color: '#F5C518', backgroundColor: '#F5C51810' }}>
            <span>📖</span>
            <span>途中で切れた — 続きを読む</span>
          </button>
        )}

        {showChoices && !showContinue && (
          <div className="mt-2 flex flex-col gap-1.5">
            {choices.map((choice, i) => (
              <button
                key={i}
                onClick={() => onChoice(choice)}
                className="text-left text-xs px-3 py-2 rounded-xl border transition-all active:scale-95"
                style={{
                  borderColor: '#2A2A3A',
                  color: '#F0F0F0',
                  backgroundColor: '#1A1A28',
                }}>
                <span className="font-bold mr-1.5" style={{ color: '#F5C518' }}>{i + 1}.</span>{choice}
              </button>
            ))}
            <button
              onClick={() => onChoice('')}
              className="text-left text-xs px-3 py-2 rounded-xl border border-dashed transition-all"
              style={{ borderColor: '#2A2A3A', color: '#8080A0' }}>
              ✏️ その他（自由入力）
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
