'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import type { Message } from '@/types'
import { createCompany } from '@/lib/store'
import { getFounderProfile } from '@/lib/profile'
import ChatBubble from '@/components/ChatBubble'

const EMOJIS = ['😎', '🔥', '💀', '⚡', '🦁', '🎯', '🌊', '👊', '🚀', '🎪']

const INITIAL_MESSAGE: Message = {
  id: 'init',
  role: 'assistant',
  content: 'よ。俺がAI-CEOだ。\n\nまぁ正直に言うと、俺もマダオみたいなもんだ。でもな、下克上するためにここにいる。\n\nお前のビジネスアイデアを聞かせろ。どんな課題を解決したい？なんのサービスを作りたい？\nCHOICES:["アイデアがある","課題はわかってる","ジャンルだけ決まってる","何もわからん","とりあえず話したい"]',
  executiveRole: 'CEO',
  timestamp: Date.now(),
}

type Step = 'chat' | 'onboarding'

export default function NewPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [step, setStep] = useState<Step>('chat')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [turn, setTurn] = useState(0)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [companyData, setCompanyData] = useState<{ name: string; concept: string; emoji: string } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const executives = ['😎 CEO', '⚙️ COO', '💻 CTO', '📣 CMO', '💰 CFO']

  async function send(override?: string) {
    const content = (override ?? input).trim()
    if (!content || isLoading) return

    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now(),
    }

    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    const nextTurn = turn + 1

    const contextMessages = newMessages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    }))

    let systemSuffix = ''
    if (nextTurn >= 3) {
      systemSuffix = '\n\n重要: このターンで会話をまとめ、事業名（社名）とコアコンセプト（1文）を決めろ。必ず末尾に以下のJSON形式で出力：\n\n```json\n{"name": "会社名", "concept": "事業コンセプト1文"}\n```'
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: contextMessages,
          role: 'CEO',
          companyContext: { name: '新規事業', concept: 'ヒアリング中' },
          founderProfile: getFounderProfile(),
          systemSuffix,
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
        executiveRole: 'CEO',
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, assistantMsg])
      setStreamingId(assistantMsg.id)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantContent += decoder.decode(value, { stream: true })
        setMessages(prev =>
          prev.map(m => m.id === assistantMsg.id ? { ...m, content: assistantContent } : m)
        )
      }
      const isTruncated = assistantContent.endsWith('__TRUNCATED__')
      const cleanContent = isTruncated
        ? assistantContent.slice(0, -'__TRUNCATED__'.length).trimEnd()
        : assistantContent
      setMessages(prev =>
        prev.map(m => m.id === assistantMsg.id ? { ...m, content: cleanContent, isTruncated } : m)
      )
      assistantContent = cleanContent
      setStreamingId(null)
      setTurn(nextTurn)

      if (nextTurn >= 3) {
        const jsonMatch = assistantContent.match(/```json\s*([\s\S]*?)\s*```/)
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1])
            if (parsed.name && parsed.concept) {
              const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)]
              setCompanyData({ name: parsed.name, concept: parsed.concept, emoji })
              setTimeout(() => setStep('onboarding'), 1000)
            }
          } catch { /* continue */ }
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'assistant',
        content: err instanceof Error ? err.message : 'エラーが発生しました',
        executiveRole: 'CEO',
        timestamp: Date.now(),
      }])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (step === 'onboarding' && onboardingStep < executives.length) {
      const timer = setTimeout(() => {
        if (onboardingStep < executives.length - 1) {
          setOnboardingStep(prev => prev + 1)
        } else {
          if (companyData) {
            const company = createCompany(companyData.name, companyData.concept, companyData.emoji)
            router.push(`/company/${company.id}`)
          }
        }
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [step, onboardingStep, companyData, router, executives.length])

  if (step === 'onboarding' && companyData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ backgroundColor: '#0A0A12', fontFamily: 'system-ui, sans-serif' }}>
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">{companyData.emoji}</div>
          <h2 className="text-xl font-bold mb-1" style={{ color: '#F5C518' }}>{companyData.name}</h2>
          <p className="text-sm mb-8" style={{ color: '#8080A0' }}>{companyData.concept}</p>
          <div className="space-y-3">
            {executives.map((exec, i) => (
              <div key={exec}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-500"
                style={{
                  backgroundColor: '#1A1A28',
                  opacity: i <= onboardingStep ? 1 : 0,
                  transform: i <= onboardingStep ? 'translateY(0)' : 'translateY(20px)',
                }}>
                <span className="text-lg">{exec.split(' ')[0]}</span>
                <div className="flex-1 text-left">
                  <span className="text-sm font-medium" style={{ color: '#F0F0F0' }}>AI {exec.split(' ')[1]} 着任</span>
                </div>
                {i <= onboardingStep && (
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#F5C518' }} />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs mt-6" style={{ color: '#8080A0' }}>マダオチームを組成中…下克上、はじめるぞ。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col max-w-sm mx-auto"
      style={{ backgroundColor: '#0A0A12', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">😎</span>
          <div>
            <span className="text-sm font-bold" style={{ color: '#F5C518' }}>マダオカンパニーズ</span>
            <p className="text-[10px]" style={{ color: '#8080A0' }}>下克上、はじめるぞ。</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="w-2 h-2 rounded-full transition-colors"
              style={{ backgroundColor: turn > i ? '#F5C518' : '#2A2A3A' }} />
          ))}
        </div>
      </div>

      <div className="px-4 pb-2">
        <p className="text-xs rounded-xl px-3 py-2" style={{ color: '#8080A0', backgroundColor: '#1A1A28' }}>
          お前が代表だ。マダオAI執行チームがお前の下で事業を動かす。
        </p>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
        {messages.map((msg, i) => (
          <ChatBubble
            key={msg.id}
            message={msg}
            isStreaming={msg.id === streamingId}
            onChoice={i === messages.length - 1 ? (c) => c === '' ? inputRef.current?.focus() : send(c) : undefined}
            onContinue={i === messages.length - 1 && msg.isTruncated ? () => send('続きをお願いします') : undefined}
          />
        ))}
        {isLoading && !streamingId && (
          <div className="flex justify-start mb-3">
            <div className="rounded-2xl px-4 py-3 flex items-center gap-1" style={{ backgroundColor: '#1A1A28' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: '#F5C518', animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: '#F5C518', animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: '#F5C518', animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-6 pt-2">
        <div className="flex gap-2 items-end rounded-2xl px-3 py-2" style={{ backgroundColor: '#1A1A28' }}>
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
            placeholder="話しかけろ..."
            rows={1}
            className="flex-1 resize-none outline-none text-sm bg-transparent placeholder-gray-600"
            style={{ color: '#F0F0F0', maxHeight: '120px' }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || isLoading}
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-40"
            style={{ backgroundColor: '#F5C518' }}>
            <svg className="w-4 h-4" fill="none" stroke="#0A0A12" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
