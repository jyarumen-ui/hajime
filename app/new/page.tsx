'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import type { Message } from '@/types'
import { createCompany } from '@/lib/store'
import { getFounderProfile } from '@/lib/profile'
import ChatBubble from '@/components/ChatBubble'

const EMOJIS = ['🚀', '💡', '🌱', '⚡', '🔥', '🎯', '🌊', '🦁', '🌟', '🎪']

const INITIAL_MESSAGE: Message = {
  id: 'init',
  role: 'assistant',
  content: 'はじめまして。私はAI-CEOです。\n\nあなたのビジネスアイデアをお聞かせください。\n\nどんな課題を解決したいですか？または、どんなサービスを作りたいと思っていますか？',
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

  const executives = ['👔 CEO', '⚙️ COO', '💻 CTO', '📣 CMO', '💰 CFO']

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
      systemSuffix = '\n\n重要: このターンでは会話をまとめ、事業名（社名）とコアコンセプト（1文）を決定してください。必ず末尾に以下のJSON形式で出力してください:\n\n```json\n{"name": "会社名", "concept": "事業コンセプト1文"}\n```'
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
          } catch {
            // JSONパース失敗時は継続
          }
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

  function handleOnboarding() {
    if (onboardingStep < executives.length - 1) {
      setOnboardingStep(prev => prev + 1)
    } else {
      if (companyData) {
        const company = createCompany(companyData.name, companyData.concept, companyData.emoji)
        router.push(`/company/${company.id}`)
      }
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
        style={{ backgroundColor: '#F5F0EB', fontFamily: 'system-ui, sans-serif' }}>
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">{companyData.emoji}</div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">{companyData.name}</h2>
          <p className="text-sm text-gray-600 mb-8">{companyData.concept}</p>
          <div className="space-y-3">
            {executives.map((exec, i) => (
              <div key={exec}
                className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm transition-all duration-500"
                style={{
                  opacity: i <= onboardingStep ? 1 : 0,
                  transform: i <= onboardingStep ? 'translateY(0)' : 'translateY(20px)',
                }}>
                <span className="text-lg">{exec.split(' ')[0]}</span>
                <div className="flex-1 text-left">
                  <span className="text-sm font-medium text-gray-800">AI {exec.split(' ')[1]} 着任</span>
                </div>
                {i <= onboardingStep && (
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-6">AI執行チームを組成中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col max-w-sm mx-auto"
      style={{ backgroundColor: '#F5F0EB', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold" style={{ color: '#C0392B' }}>始</span>
          <span className="text-xs text-gray-500">AIカンパニー創業支援</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-gray-300" />
          <div className="w-2 h-2 rounded-full bg-gray-300" />
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: turn >= 1 ? '#C0392B' : '#ddd' }} />
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: turn >= 2 ? '#C0392B' : '#ddd' }} />
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: turn >= 3 ? '#C0392B' : '#ddd' }} />
        </div>
      </div>

      <div className="px-4 pb-2">
        <p className="text-xs text-gray-600 bg-white rounded-xl px-3 py-2 shadow-sm">
          あなたは代表取締役です。AI執行チームがあなたの下で事業を動かします。
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
            placeholder="メッセージを入力..."
            rows={1}
            className="flex-1 resize-none outline-none text-sm text-gray-800 bg-transparent placeholder-gray-400"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || isLoading}
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-40"
            style={{ backgroundColor: '#C0392B' }}>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
