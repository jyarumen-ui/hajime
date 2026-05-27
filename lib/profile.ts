export interface FounderProfile {
  name: string
  position: string
  stage: string
  weeklyHours: string
  budget: string
  skills: string
  industry: string
  challenge: string
  goal: string
  completedAt?: number
}

const KEY = 'hajime_founder_profile'

export function getFounderProfile(): FounderProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const d = localStorage.getItem(KEY)
    return d ? JSON.parse(d) : null
  } catch { return null }
}

export function saveFounderProfile(profile: FounderProfile): void {
  localStorage.setItem(KEY, JSON.stringify({ ...profile, completedAt: Date.now() }))
}

export function isProfileComplete(): boolean {
  const p = getFounderProfile()
  return !!p?.completedAt
}

export function profileToContext(p: FounderProfile): string {
  return `【創業者プロフィール】
- 名前・呼び方: ${p.name}
- 現在の立場: ${p.position}
- 事業ステージ: ${p.stage}
- 使える時間: ${p.weeklyHours}
- 使える資金: ${p.budget}
- 得意なこと: ${p.skills}
- 事業ジャンル: ${p.industry}
- 今の課題: ${p.challenge}
- 目標: ${p.goal}`
}
