'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import type { Company, ExecutiveRole, Message } from '@/types'
import { getCompany, addMessage, saveCompany } from '@/lib/store'
import { EXECUTIVE_INFO } from '@/lib/executives'
import { getFounderProfile } from '@/lib/profile'
import { getSyncId, pullSync, pushSync } from '@/lib/sync'
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
  const [syncing, setSyncing] = useState(false)
  const [showXSearch, setShowXSearch] = useState(false)
  const [xSearchInput, setXSearchInput] = useState('')
  const [xSearching, setXSearching] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const xInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const syncId = getSyncId()
      if (syncId) {
        setSyncing(true)
        try {
          const remote = await pullSync(syncId)
          if (remote) {
            const { saveCompany: sc } = await import('@/lib/store')
            remote.forEach(c => sc(c))
          }
        } catch { /* ignore */ } finally {
          setSyncing(false)
        }
      }
      const c = getCompany(id)
      if (!c) { router.push('/'); return }
      setCompany(c)
    }
    load()
  }, [id, router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [company?.history, company?.conversations, activeRole])

  // 表示はhistory（全履歴）、APIはconversations（直近+要約）
  const messages = company?.history?.[activeRole] ?? company?.conversations[activeRole] ?? []
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
          return {
            ...prev,
            conversations: {
              ...prev.conversations,
              [activeRole]: prev.conversations[activeRole].map(m =>
                m.id === assistantMsg.id ? { ...m, content: assistantContent } : m
              ),
            },
            history: {
              ...prev.history,
              [activeRole]: (prev.history?.[activeRole] ?? []).map(m =>
                m.id === assistantMsg.id ? { ...m, content: assistantContent } : m
              ),
            },
          }
        })
      }

      const isTruncated = assistantContent.endsWith('__TRUNCATED__')
      const cleanContent = isTruncated
        ? assistantContent.slice(0, -'__TRUNCATED__'.length).trimEnd()
        : assistantContent

      const finalCompany = getCompany(company.id)!
      finalCompany.conversations[activeRole] = finalCompany.conversations[activeRole].map(m =>
        m.id === assistantMsg.id ? { ...m, content: cleanContent, isTruncated } : m
      )
      finalCompany.history = finalCompany.history ?? {}
      finalCompany.history[activeRole] = (finalCompany.history[activeRole] ?? []).map(m =>
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
          history: {
            ...prev.history,
            [activeRole]: (prev.history?.[activeRole] ?? []).map(m =>
              m.id === assistantMsg.id ? { ...m, content: cleanContent, isTruncated } : m
            ),
          },
        }
      })
      const { saveCompany: sc, getCompanies } = await import('@/lib/store')
      sc(finalCompany)

      // 16件超えたら古いメッセージを自動要約（historyは保持）
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
          // historyはそのまま保持（全履歴は消さない）
          sc(finalCompany)
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
            const { saveCompany: sc2, getCompany: gc } = await import('@/lib/store')
            const latest = gc(company.id)
            if (latest) { latest.userProfile = profile; sc2(latest) }
          }
        }).catch(() => {})
      }

      // バックグラウンドで同期（毎回自動push）
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
    if (choice === '') { inputRef.current?.focus(); return }
    send(choice)
  }

  function handleContinue() {
    send('続きをお願いします')
  }

  async function doXSearch() {
    const username = xSearchInput.replace('@', '').trim()
    if (!username) return
    setXSearching(true)
    setShowXSearch(false)
    try {
      const res = await fetch(`/api/x-research?username=${encodeURIComponent(username)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'X調査に失敗しました')

      const { user, topPosts } = data as {
        user: { username: string; name: string; bio: string; followers: number; following: number; tweetCount: number }
        topPosts: { text: string; likes: number; retweets: number; impressions: number }[]
      }

      const avgLikes = topPosts.length > 0
        ? Math.round(topPosts.reduce((s, p) => s + p.likes, 0) / topPosts.length)
        : 0
      const engRate = user.followers > 0
        ? ((avgLikes / user.followers) * 100).toFixed(2)
        : '0'

      let msg = `【X調査結果: @${user.username}】\n`
      msg += `名前: ${user.name} / フォロワー: ${user.followers.toLocaleString()}人 / 投稿数: ${user.tweetCount.toLocaleString()}件\n`
      if (user.bio) msg += `バイオ: ${user.bio}\n`
      msg += `平均いいね: ${avgLikes.toLocaleString()} / 推定エンゲージメント率: ${engRate}%\n`

      if (topPosts.length > 0) {
        msg += `\nTOP投稿（いいね順）:\n`
        topPosts.forEach((p, i) => {
          const preview = p.text.slice(0, 100) + (p.text.length > 100 ? '…' : '')
          msg += `${i + 1}. "${preview}"\n   ❤️${p.likes.toLocaleString()} 🔁${p.retweets.toLocaleString()} 👁${p.impressions.toLocaleString()}\n`
        })
      }

      msg += `\nこのXアカウントのSNS戦略・コンテンツパターン・改善点を分析してください。`
      send(msg)
    } catch (err) {
      send(`X調査エラー: ${err instanceof Error ? err.message : '不明なエラー'}`)
    } finally {
      setXSearching(false)
      setXSearchInput('')
    }
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A0A12' }}>
        <p className="text-sm animate-pulse" style={{ color: '#F5C518' }}>{syncing ? '最新データを取得中…' : '読み込み中…'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col max-w-sm mx-auto"
      style={{ backgroundColor: '#0A0A12', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <button onClick={() => router.push('/')}
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: '#8080A0' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            マダオカンパニーズ
          </button>
          <div className="flex items-center gap-2">
            {syncing && <span className="text-[10px] animate-pulse" style={{ color: '#F5C518' }}>同期中…</span>}
            <span className="text-lg">😎</span>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{company.emoji}</span>
          <div>
            <h1 className="font-bold text-base leading-tight" style={{ color: '#F0F0F0' }}>{company.name}</h1>
            <p className="text-xs line-clamp-1" style={{ color: '#8080A0' }}>{company.concept}</p>
          </div>
        </div>
        <ExecutiveBar activeRole={activeRole} onSelect={setActiveRole} />
      </div>

      {/* Active executive indicator */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: '#1A1A28' }}>
          <span>{execInfo.emoji}</span>
          <span className="text-xs font-medium" style={{ color: '#F5C518' }}>{execInfo.name}</span>
          <span className="text-xs" style={{ color: '#8080A0' }}>— {execInfo.title}</span>
          {messages.length > 0 && (
            <span className="ml-auto text-[10px]" style={{ color: '#8080A0' }}>{messages.length}件</span>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {messages.length === 0 && (
          <div className="flex justify-center py-8">
            <p className="text-xs text-center" style={{ color: '#8080A0' }}>
              {execInfo.emoji} {execInfo.name}に話しかけろ
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
            <div className="rounded-2xl px-4 py-3 flex items-center gap-1" style={{ backgroundColor: '#1A1A28' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: '#F5C518', animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: '#F5C518', animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: '#F5C518', animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* X Research */}
      {showXSearch ? (
        <div className="px-4 pb-2">
          <div className="flex gap-2 items-center rounded-2xl px-3 py-2 border" style={{ backgroundColor: '#1A1A28', borderColor: '#1DA1F2' }}>
            <span className="text-sm flex-shrink-0">🔍</span>
            <input
              ref={xInputRef}
              value={xSearchInput}
              onChange={e => setXSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') doXSearch(); if (e.key === 'Escape') { setShowXSearch(false); setXSearchInput('') } }}
              placeholder="@ユーザー名を入力..."
              className="flex-1 outline-none text-sm bg-transparent"
              style={{ color: '#F0F0F0' }}
              autoFocus
            />
            <button onClick={doXSearch}
              className="text-[11px] px-2 py-1 rounded-lg font-bold flex-shrink-0"
              style={{ backgroundColor: '#1DA1F2', color: '#fff' }}>
              調査
            </button>
            <button onClick={() => { setShowXSearch(false); setXSearchInput('') }}
              className="text-sm flex-shrink-0" style={{ color: '#8080A0' }}>✕</button>
          </div>
        </div>
      ) : (
        <div className="px-4 pb-1">
          <button onClick={() => { setShowXSearch(true); setTimeout(() => xInputRef.current?.focus(), 50) }}
            disabled={xSearching || isLoading}
            className="text-[10px] flex items-center gap-1 transition-colors disabled:opacity-40"
            style={{ color: xSearching ? '#F5C518' : '#8080A0' }}>
            {xSearching ? '🔍 X調査中…' : '🔍 Xアカウントを調査する'}
          </button>
        </div>
      )}

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
            placeholder={`${activeRole}に話しかけろ...`}
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
