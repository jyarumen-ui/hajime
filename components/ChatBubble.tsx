'use client'

import type { Message } from '@/types'
import { EXECUTIVE_INFO } from '@/lib/executives'

interface Props {
  message: Message
}

export default function ChatBubble({ message }: Props) {
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

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%]">
        {exec && (
          <div className="flex items-center gap-1 mb-1 ml-1">
            <span className="text-xs">{exec.emoji}</span>
            <span className="text-xs font-medium" style={{ color: exec.color }}>{exec.name}</span>
          </div>
        )}
        <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed shadow-sm text-gray-800 whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    </div>
  )
}
