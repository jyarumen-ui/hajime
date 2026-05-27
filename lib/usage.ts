const KEY = 'hajime_usage'

export const LIMITS = {
  free: { messages: 15, companies: 1 },
  pro: { messages: Infinity, companies: Infinity },
}

export type Plan = 'free' | 'pro'

interface Usage {
  plan: Plan
  messageCount: number
  proActivatedAt?: number
}

function load(): Usage {
  if (typeof window === 'undefined') return { plan: 'free', messageCount: 0 }
  try {
    const d = localStorage.getItem(KEY)
    return d ? JSON.parse(d) : { plan: 'free', messageCount: 0 }
  } catch {
    return { plan: 'free', messageCount: 0 }
  }
}

function save(u: Usage) {
  localStorage.setItem(KEY, JSON.stringify(u))
}

export function getUsage(): Usage {
  return load()
}

export function getPlan(): Plan {
  return load().plan
}

export function getMessageCount(): number {
  return load().messageCount
}

export function incrementMessage(): void {
  const u = load()
  u.messageCount += 1
  save(u)
}

export function isLimitReached(): boolean {
  const u = load()
  if (u.plan === 'pro') return false
  return u.messageCount >= LIMITS.free.messages
}

export function getRemainingMessages(): number {
  const u = load()
  if (u.plan === 'pro') return Infinity
  return Math.max(0, LIMITS.free.messages - u.messageCount)
}

// Stripe決済完了後に呼ぶ（webhookの代わりにURLパラメータで受け取る）
export function activatePro(): void {
  const u = load()
  u.plan = 'pro'
  u.proActivatedAt = Date.now()
  save(u)
}
