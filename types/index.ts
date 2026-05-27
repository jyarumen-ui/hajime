export type ExecutiveRole = 'CEO' | 'COO' | 'CTO' | 'CMO' | 'CFO'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  executiveRole?: ExecutiveRole
  timestamp: number
  isTruncated?: boolean
}

export interface UserProfile {
  売上規模?: string
  事業ステージ?: string
  リソース?: string
  主な課題?: string
  試したこと?: string
  ターゲット顧客?: string
  収益モデル?: string
  目標?: string
  強み?: string
  業種?: string
  [key: string]: string | undefined
}

export interface Company {
  id: string
  name: string
  concept: string
  emoji: string
  arr: number
  dailySales: number
  agentCount: number
  status: 'planning' | 'beta' | 'launched'
  conversations: Record<ExecutiveRole, Message[]>
  summaries: Partial<Record<ExecutiveRole, string>>
  userProfile: UserProfile
  createdAt: number
}
