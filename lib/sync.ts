import type { Company } from '@/types'

const SYNC_ID_KEY = 'hajime_sync_id'

export function getSyncId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(SYNC_ID_KEY)
}

export function setSyncId(id: string) {
  localStorage.setItem(SYNC_ID_KEY, id)
}

export async function initSync(companies: Company[]): Promise<string> {
  const existing = getSyncId()
  if (existing) return existing

  // 既存Gistを検索
  const findRes = await fetch('/api/sync')
  const findData = await findRes.json()
  if (findData.gistId) {
    setSyncId(findData.gistId)
    return findData.gistId
  }

  // 新規作成
  const createRes = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companies }),
  })
  const { gistId } = await createRes.json()
  setSyncId(gistId)
  return gistId
}

export async function pushSync(companies: Company[]): Promise<void> {
  const gistId = getSyncId()
  if (!gistId) return
  await fetch(`/api/sync/${gistId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companies }),
  })
}

export async function pullSync(gistId: string): Promise<Company[] | null> {
  const res = await fetch(`/api/sync/${gistId}`)
  if (!res.ok) return null
  const data = await res.json()
  return data.companies ?? null
}
