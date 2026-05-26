'use client'

import type { ExecutiveRole } from '@/types'
import { EXECUTIVE_INFO } from '@/lib/executives'

interface Props {
  activeRole: ExecutiveRole
  onSelect: (role: ExecutiveRole) => void
}

const roles: ExecutiveRole[] = ['CEO', 'COO', 'CTO', 'CMO', 'CFO']

export default function ExecutiveBar({ activeRole, onSelect }: Props) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 px-1">
      {roles.map(role => {
        const info = EXECUTIVE_INFO[role]
        const isActive = role === activeRole
        return (
          <button
            key={role}
            onClick={() => onSelect(role)}
            className="flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all"
            style={{
              backgroundColor: isActive ? info.color : '#F5F0EB',
              color: isActive ? 'white' : '#666',
              boxShadow: isActive ? `0 2px 8px ${info.color}40` : undefined,
            }}
          >
            <span className="text-lg">{info.emoji}</span>
            <span className="text-xs font-bold">{role}</span>
            <span className="flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[9px] opacity-70">稼働中</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
