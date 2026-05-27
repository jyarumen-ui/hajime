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
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-3 text-white text-sm leading-relaxed"
          style={{ backgroundColor: '#8B4513' }}>
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
            <span className="text-xs font-medium" style={{ color: exec.color }}>{exec.name}</span>
          </div>
        )}
        <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed shadow-sm text-gray-800 whitespace-pre-wrap">
          {text}
          {isStreaming && (
            <span className="inline-flex gap-0.5 ml-1">
              <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          )}
        </div>

        {showContinue && (
          <button
            onClick={onContinue}
            className="mt-2 w-full text-xs px-3 py-2 rounded-xl border border-dashed flex items-center justify-center gap-1.5 transition-all hover:bg-orange-50"
            style={{ borderColor: '#C0392B', color: '#C0392B' }}>
            <span>📖</span>
            <span>途中で切れました — 続きを読む</span>
          </button>
        )}

        {showChoices && !showContinue && (
          <div className="mt-2 flex flex-col gap-1.5">
            {choices.map((choice, i) => (
              <button
                key={i}
                onClick={() => onChoice(choice)}
                className="text-left text-xs px-3 py-2 rounded-xl border transition-all hover:shadow-sm active:scale-95"
                style={{
                  borderColor: exec?.color ?? '#ddd',
                  color: exec?.color ?? '#333',
                  backgroundColor: `${exec?.color ?? '#ccc'}10`,
                }}>
                <span className="font-bold mr-1.5">{i + 1}.</span>{choice}
              </button>
            ))}
            <button
              onClick={() => onChoice('')}
              className="text-left text-xs px-3 py-2 rounded-xl border border-dashed transition-all hover:bg-gray-50 text-gray-400"
              style={{ borderColor: '#ccc' }}>
              ✏️ その他（自由入力）
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
