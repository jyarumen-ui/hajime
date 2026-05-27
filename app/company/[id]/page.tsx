'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import type { Company, ExecutiveRole, Message } from '@/types'
import { getCompany, addMessage } from '@/lib/store'
import { EXECUTIVE_INFO } from '@/lib/executives'
import { getFounderProfile } from '@/lib/profile'
import ExecutiveBar from '@/components/ExecutiveBar'
import ChatBubble from '@/components/ChatBubble'

export default function CompanyPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [company, setCompany] = useState<Company | null>(null)
  const [activeRole, setActiveRole] = useState<ExecutiveRole>('CEO')
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const c = getCompany(id)
    if (!c) {
      router.push('/')
      return
    }
    setCompany(c)
  }, [id, router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [company?.conversations, activeRole])

  const messages = company?.conversations[activeRole] ?? []
  const execInfo = EXECUTIVE_INFO[activeRole]

  async function send(override?: string) {
    const content = (override ?? input).trim()
    if (!content || isLoading || !company) return

    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now(),
    }

    addMessage(company.id, activeRole, userMsg)
    const updated = getCompany(company.id)!
    setCompany({ ...updated })
    setInput('')
    setIsLoading(true)

    const contextMessages = updated.conversations[activeRole]

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: contextMessages,
          role: activeRole,
          companyContext: { name: company.name, concept: company.concept },
          allConversations: updated.conversations,
          summary: updated.summaries?.[activeRole],
          userProfile: updated.userProfile ?? {},
          founderProfile: getFounderProfile(),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'エラーが発生しました')
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      const assistantMsg: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: '',
        executiveRole: activeRole,
        timestamp: Date.now(),
      }

      addMessage(company.id, activeRole, assistantMsg)
      const withNew = getCompany(company.id)!
      setCompany({ ...withNew })
      setStreamingId(assistantMsg.id)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantContent += decoder.decode(value, { stream: true })
        setCompany(prev => {
          if (!prev) return prev
          const updatedConvs = {
            ...prev.conversations,
            [activeRole]: prev.conversations[activeRole].map(m =>
              m.id === assistantMsg.id ? { ...m, content: assistantContent } : m
            ),
          }
          return { ...prev, conversations: updatedConvs }
        })
      }

      // 途中切れ検出
      const isTruncated = assistantContent.endsWith('__TRUNCATED__')
      const cleanContent = isTruncated
        ? assistantContent.slice(0, -'__TRUNCATED__'.length).trimEnd()
        : assistantContent

      // 最終メッセージをlocalStorageに反映
      const finalCompany = getCompany(company.id)!
      finalCompany.conversations[activeRole] = finalCompany.conversations[activeRole].map(m =>
        m.id === assistantMsg.id ? { ...m, content: cleanContent, isTruncated } : m
      )
      setCompany(prev => {
        if (!prev) return prev
        return {
          ...prev,
          conversations: {
            ...prev.conversations,
            [activeRole]: prev.conversations[activeRole].map(m =>
              m.id === assistantMsg.id ? { ...m, content: cleanContent, isTruncated } : m
            ),
          },
        }
      })
      const { saveCompany, getCompanies } = await import('@/lib/store')
      saveCompany(finalCompany)

      // 16件超えたら古いメッセージを自動要約
      const allMsgs = finalCompany.conversations[activeRole]
      if (allMsgs.length > 16) {
        const toSummarize = allMsgs.slice(0, allMsgs.length - 8)
        const keep = allMsgs.slice(allMsgs.length - 8)
        const sumRes = await fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: toSummarize,
            role: activeRole,
            companyName: finalCompany.name,
          }),
        }).catch(() => null)
        if (sumRes?.ok) {
          const { summary } = await sumRes.json()
          finalCompany.summaries = { ...finalCompany.summaries, [activeRole]: summary }
          finalCompany.conversations[activeRole] = keep
          saveCompany(finalCompany)
          setCompany({ ...finalCompany })
        }
      }

      // プロフィール抽出（バックグラウンド）
      const lastUserMsg = contextMessages.filter(m => m.role === 'user').at(-1)
      if (lastUserMsg) {
        fetch('/api/extract-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMessage: lastUserMsg.content,
            assistantMessage: cleanContent,
            currentProfile: finalCompany.userProfile ?? {},
          }),
        }).then(r => r.json()).then(async ({ profile }) => {
          if (profile) {
            const { saveCompany: sc, getCompany: gc } = await import('@/lib/store')
            const latest = gc(company.id)
            if (latest) { latest.userProfile = profile; sc(latest) }
          }
        }).catch(() => {})
      }

      // バックグラウンドで同期
      const { pushSync } = await import('@/lib/sync')
      pushSync(getCompanies()).catch(() => {})
    } catch (err) {
      const errMsg: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: err instanceof Error ? err.message : 'エラーが発生しました',
        executiveRole: activeRole,
        timestamp: Date.now(),
      }
      addMessage(company.id, activeRole, errMsg)
      setCompany({ ...getCompany(company.id)! })
    } finally {
      setIsLoading(false)
      setStreamingId(null)
    }
  }

  function handleChoice(choice: string) {
    if (choice === '') {
      inputRef.current?.focus()
      return
    }
    send(choice)
  }

  function handleContinue() {
    send('続きをお願いします')
  }

  if (!company) return null

  return (
    <div className="min-h-screen flex flex-col max-w-sm mx-auto"
      style={{ backgroundColor: '#F5F0EB', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <button onClick={() => router.push('/')}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            ダッシュボード
          </button>
          <span className="text-lg font-bold" style={{ color: '#C0392B' }}>始</span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{company.emoji}</span>
          <div>
            <h1 className="font-bold text-gray-800 text-base leading-tight">{company.name}</h1>
            <p className="text-xs text-gray-500 line-clamp-1">{company.concept}</p>
          </div>
        </div>
        <ExecutiveBar activeRole={activeRole} onSelect={setActiveRole} />
      </div>

      {/* Active executive indicator */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm">
          <span>{execInfo.emoji}</span>
          <span className="text-xs font-medium" style={{ color: execInfo.color }}>{execInfo.name}</span>
          <span className="text-xs text-gray-400">— {execInfo.title}</span>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {messages.length === 0 && (
          <div className="flex justify-center py-8">
            <p className="text-xs text-gray-400 text-center">
              {execInfo.emoji} {execInfo.name}に相談してみましょう
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatBubble
            key={msg.id}
            message={msg}
            isStreaming={msg.id === streamingId}
            onChoice={i === messages.length - 1 ? handleChoice : undefined}
            onContinue={i === messages.length - 1 && msg.isTruncated ? handleContinue : undefined}
          />
        ))}
        {isLoading && !streamingId && (
          <div className="flex justify-start mb-3">
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-6 pt-2">
        <div className="flex gap-2 items-end bg-white rounded-2xl px-3 py-2 shadow-sm">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder={`${activeRole}に相談する...`}
            rows={1}
            className="flex-1 resize-none outline-none text-sm text-gray-800 bg-transparent placeholder-gray-400"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || isLoading}
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-40"
            style={{ backgroundColor: execInfo.color }}>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
