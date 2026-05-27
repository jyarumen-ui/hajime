'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Company } from '@/types'
import { getCompanies, saveCompany } from '@/lib/store'
import { initSync, pushSync, pullSync, getSyncId, setSyncId } from '@/lib/sync'
import CompanyCard from '@/components/CompanyCard'

export default function DashboardPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [hour, setHour] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncId, setSyncIdState] = useState<string | null>(null)
  const [importInput, setImportInput] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'ok' | 'err'>('idle')

  useEffect(() => {
    setHour(new Date().getHours())
    const stored = getCompanies()
    setCompanies(stored)
    setSyncIdState(getSyncId())

    // 既存のsyncIdがあれば自動プル
    const id = getSyncId()
    if (id) {
      pullSync(id).then(remote => {
        if (remote && remote.length > 0) {
          remote.forEach(c => saveCompany(c))
          setCompanies(getCompanies())
        }
      })
    }
  }, [])

  const greeting = hour < 12 ? 'おはようございます' : hour < 18 ? 'こんにちは' : 'こんばんは'
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
      style={{ backgroundColor: '#F5F0EB', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-2xl font-bold" style={{ color: '#C0392B' }}>始</span>
            <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
              style={{ backgroundColor: '#C0392B' }}>
              {companies.length} ACTIVE
            </span>
          </div>
          <p className="text-[10px] tracking-widest text-gray-400 uppercase">01 / SOVEREIGN DASHBOARD</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">{greeting}</p>
          <p className="text-xs font-bold text-gray-800">創業主権者</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
          <p className="text-[9px] text-gray-500 uppercase tracking-wide mb-1">累計ARR</p>
          <p className="text-xs font-bold" style={{ color: '#C0392B' }}>
            ¥{(totalArr / 10000).toFixed(0)}万
          </p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
          <p className="text-[9px] text-gray-500 uppercase tracking-wide mb-1">本日売上</p>
          <p className="text-xs font-bold" style={{ color: '#8B4513' }}>
            ¥{totalDailySales.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
          <p className="text-[9px] text-gray-500 uppercase tracking-wide mb-1">AGENT数</p>
          <p className="text-xs font-bold" style={{ color: '#2E4057' }}>
            {totalAgents}名
          </p>
        </div>
      </div>

      {/* Sync Panel */}
      <div className="bg-white rounded-2xl p-3 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">☁️</span>
            <span className="text-xs font-medium text-gray-700">デバイス同期</span>
            {syncId && (
              <span className="w-2 h-2 rounded-full bg-green-400" />
            )}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setShowImport(v => !v)}
              className="text-[10px] px-2 py-1 rounded-lg border text-gray-600 hover:bg-gray-50"
              style={{ borderColor: '#ddd' }}>
              インポート
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="text-[10px] px-2 py-1 rounded-lg text-white disabled:opacity-50"
              style={{ backgroundColor: '#C0392B' }}>
              {syncing ? '同期中…' : syncStatus === 'ok' ? '✓ 完了' : syncStatus === 'err' ? '✗ エラー' : '同期'}
            </button>
          </div>
        </div>
        {syncId && (
          <div className="text-[9px] text-gray-400 break-all">
            同期ID: {syncId}
          </div>
        )}
        {showImport && (
          <div className="mt-2 flex gap-1.5">
            <input
              value={importInput}
              onChange={e => setImportInput(e.target.value)}
              placeholder="同期IDを入力..."
              className="flex-1 text-xs border rounded-lg px-2 py-1 outline-none"
              style={{ borderColor: '#ddd' }}
            />
            <button
              onClick={handleImport}
              disabled={syncing}
              className="text-xs px-3 py-1 rounded-lg text-white"
              style={{ backgroundColor: '#8B4513' }}>
              取込
            </button>
          </div>
        )}
      </div>

      {/* Company Grid */}
      <div className="mb-4">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
          ポートフォリオ
        </h2>
        {companies.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">🌱</p>
            <p className="text-sm text-gray-500">まだ会社がありません</p>
            <p className="text-xs text-gray-400">最初の事業を始めましょう</p>
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
        <div className="border-2 border-dashed rounded-2xl p-4 text-center transition-colors hover:border-red-300 cursor-pointer"
          style={{ borderColor: '#C0392B20' }}>
          <span className="text-2xl block mb-1">＋</span>
          <span className="text-sm font-medium" style={{ color: '#C0392B' }}>新規セッション</span>
          <p className="text-xs text-gray-400 mt-0.5">新しい事業を始める</p>
        </div>
      </Link>
    </div>
  )
}
