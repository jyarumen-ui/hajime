export type ExecutiveRole = 'CEO' | 'COO' | 'CTO' | 'CMO' | 'CFO'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  executiveRole?: ExecutiveRole
  timestamp: number
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
  createdAt: number
}
