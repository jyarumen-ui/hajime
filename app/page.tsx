'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Company } from '@/types'
import { getCompanies } from '@/lib/store'
import CompanyCard from '@/components/CompanyCard'

export default function DashboardPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [hour, setHour] = useState(0)

  useEffect(() => {
    setCompanies(getCompanies())
    setHour(new Date().getHours())
  }, [])

  const greeting = hour < 12 ? 'おはようございます' : hour < 18 ? 'こんにちは' : 'こんばんは'

  const totalArr = companies.reduce((s, c) => s + c.arr, 0)
  const totalDailySales = companies.reduce((s, c) => s + c.dailySales, 0)
  const totalAgents = companies.reduce((s, c) => s + c.agentCount, 0)

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
