'use client'

import Link from 'next/link'
import type { Company } from '@/types'

interface Props {
  company: Company
}

const statusLabel: Record<Company['status'], string> = {
  planning: '計画中',
  beta: 'ベータ',
  launched: '稼働中',
}

const statusColor: Record<Company['status'], string> = {
  planning: '#8B4513',
  beta: '#2E4057',
  launched: '#1A6B3A',
}

export default function CompanyCard({ company }: Props) {
  return (
    <Link href={`/company/${company.id}`}>
      <div className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-amber-100">
        <div className="flex items-start justify-between mb-2">
          <span className="text-3xl">{company.emoji}</span>
          <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
            style={{ backgroundColor: statusColor[company.status] }}>
            {statusLabel[company.status]}
          </span>
        </div>
        <h3 className="font-bold text-gray-800 text-sm mb-1 truncate">{company.name}</h3>
        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{company.concept}</p>
        <div className="border-t border-amber-50 pt-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">ARR</span>
            <span className="text-sm font-bold" style={{ color: '#C0392B' }}>
              ¥{company.arr.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
