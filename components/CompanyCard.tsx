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
  planning: '#8080A0',
  beta: '#1DA1F2',
  launched: '#F5C518',
}

export default function CompanyCard({ company }: Props) {
  return (
    <Link href={`/company/${company.id}`}>
      <div className="rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
        style={{ backgroundColor: '#1A1A28', border: '1px solid #2A2A3A' }}>
        <div className="flex items-start justify-between mb-2">
          <span className="text-3xl">{company.emoji}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
            style={{ backgroundColor: statusColor[company.status] + '22', color: statusColor[company.status] }}>
            {statusLabel[company.status]}
          </span>
        </div>
        <h3 className="font-bold text-sm mb-1 truncate" style={{ color: '#F0F0F0' }}>{company.name}</h3>
        <p className="text-xs line-clamp-2 mb-3" style={{ color: '#8080A0' }}>{company.concept}</p>
        <div className="pt-2" style={{ borderTop: '1px solid #2A2A3A' }}>
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: '#8080A0' }}>ARR</span>
            <span className="text-sm font-bold" style={{ color: '#F5C518' }}>
              ¥{company.arr.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
