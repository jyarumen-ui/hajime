import type { Company, ExecutiveRole, Message } from '@/types'
import { v4 as uuidv4 } from 'uuid'

const STORAGE_KEY = 'hajime_companies'

export function getCompanies(): Company[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    const parsed: Company[] = data ? JSON.parse(data) : []
    // 旧データにsummariesがない場合は補完
    return parsed.map(c => ({ ...c, summaries: c.summaries ?? {}, userProfile: c.userProfile ?? {}, history: c.history ?? {} }))
  } catch {
    return []
  }
}

export function getCompany(id: string): Company | null {
  return getCompanies().find(c => c.id === id) ?? null
}

export function saveCompany(company: Company): void {
  const companies = getCompanies()
  const idx = companies.findIndex(c => c.id === company.id)
  if (idx >= 0) {
    companies[idx] = company
  } else {
    companies.unshift(company)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(companies))
}

export function createCompany(name: string, concept: string, emoji: string): Company {
  const roles: ExecutiveRole[] = ['CEO', 'COO', 'CTO', 'CMO', 'CFO']
  const conversations = Object.fromEntries(roles.map(r => [r, [] as Message[]])) as Record<ExecutiveRole, Message[]>

  const company: Company = {
    id: uuidv4(),
    name,
    concept,
    emoji,
    arr: Math.floor(Math.random() * 5000000),
    dailySales: Math.floor(Math.random() * 100000),
    agentCount: Math.floor(Math.random() * 5) + 1,
    status: 'planning',
    conversations,
    history: {},
    summaries: {},
    userProfile: {},
    createdAt: Date.now(),
  }
  saveCompany(company)
  return company
}

export function addMessage(companyId: string, role: ExecutiveRole, message: Message): void {
  const company = getCompany(companyId)
  if (!company) return
  company.conversations[role] = [...company.conversations[role], message]
  company.history = company.history ?? {}
  company.history[role] = [...(company.history[role] ?? []), message]
  saveCompany(company)
}

export function updateMessageInHistory(companyId: string, role: ExecutiveRole, msgId: string, content: string, isTruncated?: boolean): void {
  const company = getCompany(companyId)
  if (!company) return
  company.history = company.history ?? {}
  company.history[role] = (company.history[role] ?? []).map(m =>
    m.id === msgId ? { ...m, content, isTruncated: isTruncated ?? m.isTruncated } : m
  )
  saveCompany(company)
}
