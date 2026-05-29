'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Company } from '@/types'
import { getCompanies, saveCompany } from '@/lib/store'
import { initSync, pushSync, pullSync, getSyncId, setSyncId } from '@/lib/sync'
import { getFounderProfile, isProfileComplete } from '@/lib/profile'
import type { FounderProfile } from '@/lib/profile'
import CompanyCard from '@/components/CompanyCard'

export default function DashboardPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [hour, setHour] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncId, setSyncIdState] = useState<string | null>(null)
  const [importInput, setImportInput] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'ok' | 'err'>('idle')
  const [profile, setProfile] = useState<FounderProfile | null>(null)

  useEffect(() => {
    if (!isProfileComplete()) {
      router.push('/profile')
      return
    }
    setHour(new Date().getHours())
    setCompanies(getCompanies())
    setSyncIdState(getSyncId())
    setProfile(getFounderProfile())

    const id = getSyncId()
    if (id) {
      pullSync(id).then(remote => {
        if (remote && remote.length > 0) {
          remote.forEach(c => saveCompany(c))
          setCompanies(getCompanies())
        }
      })
    } else {
      initSync(getCompanies()).then(newId => {
        setSyncIdState(newId)
        setSyncStatus('ok')
        setTimeout(() => setSyncStatus('idle'), 3000)
      }).catch(() => {})
    }
  }, [router])

  const greeting = hour < 12 ? 'おはよう' : hour < 18 ? 'よ' : 'お疲れ'
  const totalArr = companies.reduce((s, c) => s + c.arr, 0)
  const totalDailySales = companies.reduce((s, c) => s + c.dailySales, 0)
  const totalAgents = companies.reduce((s, c) => s + c.agentCount, 0)

  async function handleSync() {
    setSyncing(true)
    try {
      const id = await initSync(companies)
      setSyncIdState(id)
      await pushSync(getCompanies())
      setSyncStatus('ok')
    } catch {
      setSyncStatus('err')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncStatus('idle'), 3000)
    }
  }

  async function handleImport() {
    if (!importInput.trim()) return
    setSyncing(true)
    try {
      const remote = await pullSync(importInput.trim())
      if (remote) {
        remote.forEach(c => saveCompany(c))
        setCompanies(getCompanies())
        setSyncId(importInput.trim())
        setSyncIdState(importInput.trim())
        setSyncStatus('ok')
        setShowImport(false)
        setImportInput('')
      } else {
        setSyncStatus('err')
      }
    } catch {
      setSyncStatus('err')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncStatus('idle'), 3000)
    }
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-10 max-w-sm mx-auto"
      style={{ backgroundColor: '#0A0A12', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-2xl">😎</span>
            <span className="text-base font-bold" style={{ color: '#F5C518' }}>マダオカンパニーズ</span>
          </div>
          <p className="text-[10px] tracking-widest" style={{ color: '#8080A0' }}>下克上、はじめるぞ。/ {companies.length} COMPANIES</p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: '#8080A0' }}>{greeting}{profile?.name ? `、${profile.name}` : ''}</p>
          <p className="text-xs font-bold" style={{ color: '#F0F0F0' }}>代表取締役</p>
        </div>
      </div>

      {/* Founder Profile Card */}
      {profile && (
        <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: '#1A1A28' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">👤</span>
              <span className="text-xs font-bold" style={{ color: '#F5C518' }}>お前のプロフィール</span>
            </div>
            <Link href="/profile">
              <span className="text-[10px] underline" style={{ color: '#8080A0' }}>編集</span>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {[
              { label: '立場', value: profile.position },
              { label: 'ステージ', value: profile.stage },
              { label: '時間', value: profile.weeklyHours },
              { label: '資金', value: profile.budget },
              { label: '得意', value: profile.skills },
              { label: '目標', value: profile.goal },
            ].map(({ label, value }) => value ? (
              <div key={label}>
                <p className="text-[9px] uppercase tracking-wide" style={{ color: '#8080A0' }}>{label}</p>
                <p className="text-[11px] font-medium leading-tight truncate" style={{ color: '#F0F0F0' }}>{value}</p>
              </div>
            ) : null)}
          </div>
          {profile.challenge && (
            <div className="mt-2 pt-2" style={{ borderTop: '1px solid #2A2A3A' }}>
              <p className="text-[9px] mb-0.5" style={{ color: '#8080A0' }}>今の課題</p>
              <p className="text-[11px]" style={{ color: '#F0F0F0' }}>{profile.challenge}</p>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: '#1A1A28' }}>
          <p className="text-[9px] uppercase tracking-wide mb-1" style={{ color: '#8080A0' }}>累計ARR</p>
          <p className="text-xs font-bold" style={{ color: '#F5C518' }}>
            ¥{(totalArr / 10000).toFixed(0)}万
          </p>
        </div>
        <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: '#1A1A28' }}>
          <p className="text-[9px] uppercase tracking-wide mb-1" style={{ color: '#8080A0' }}>本日売上</p>
          <p className="text-xs font-bold" style={{ color: '#E63946' }}>
            ¥{totalDailySales.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: '#1A1A28' }}>
          <p className="text-[9px] uppercase tracking-wide mb-1" style={{ color: '#8080A0' }}>AGENT</p>
          <p className="text-xs font-bold" style={{ color: '#F0F0F0' }}>
            {totalAgents}名
          </p>
        </div>
      </div>

      {/* Sync Panel */}
      <div className="rounded-2xl p-3 mb-4" style={{ backgroundColor: '#1A1A28' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">☁️</span>
            <span className="text-xs font-medium" style={{ color: '#F0F0F0' }}>デバイス同期</span>
            {syncId && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#F5C518' }} />}
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => setShowImport(v => !v)}
              className="text-[10px] px-2 py-1 rounded-lg border"
              style={{ borderColor: '#2A2A3A', color: '#8080A0' }}>
              インポート
            </button>
            <button onClick={handleSync} disabled={syncing}
              className="text-[10px] px-2 py-1 rounded-lg font-bold disabled:opacity-50"
              style={{ backgroundColor: '#F5C518', color: '#0A0A12' }}>
              {syncing ? '同期中…' : syncStatus === 'ok' ? '✓ 完了' : syncStatus === 'err' ? '✗ エラー' : '同期'}
            </button>
          </div>
        </div>
        {syncId && (
          <div className="flex items-center gap-2 mt-1">
            <div className="text-[9px] break-all flex-1" style={{ color: '#8080A0' }}>同期ID: {syncId}</div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(syncId)
                setSyncStatus('ok')
                setTimeout(() => setSyncStatus('idle'), 2000)
              }}
              className="text-[9px] px-2 py-0.5 rounded-md border flex-shrink-0"
              style={{ borderColor: '#2A2A3A', color: '#8080A0' }}>
              コピー
            </button>
          </div>
        )}
        {showImport && (
          <div className="mt-2 flex gap-1.5">
            <input value={importInput} onChange={e => setImportInput(e.target.value)}
              placeholder="同期IDを入力..."
              className="flex-1 text-xs border rounded-lg px-2 py-1 outline-none"
              style={{ borderColor: '#2A2A3A', backgroundColor: '#0A0A12', color: '#F0F0F0' }} />
            <button onClick={handleImport} disabled={syncing}
              className="text-xs px-3 py-1 rounded-lg font-bold"
              style={{ backgroundColor: '#E63946', color: '#fff' }}>
              取込
            </button>
          </div>
        )}
      </div>

      {/* Company Grid */}
      <div className="mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#8080A0' }}>ポートフォリオ</h2>
        {companies.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-2xl mb-2">😎</p>
            <p className="text-sm" style={{ color: '#8080A0' }}>まだ会社がない</p>
            <p className="text-xs" style={{ color: '#2A2A3A' }}>最初の下克上を始めろ</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {companies.map(company => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        )}
      </div>

      {/* New Session Button */}
      <Link href="/new">
        <div className="border-2 border-dashed rounded-2xl p-4 text-center transition-colors cursor-pointer"
          style={{ borderColor: '#F5C51840' }}>
          <span className="text-2xl block mb-1">＋</span>
          <span className="text-sm font-bold" style={{ color: '#F5C518' }}>新規セッション</span>
          <p className="text-xs mt-0.5" style={{ color: '#8080A0' }}>新しい事業を始める</p>
        </div>
      </Link>
    </div>
  )
}
