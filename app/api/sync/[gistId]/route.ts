const GITHUB_TOKEN = process.env.GITHUB_TOKEN!

export async function GET(_req: Request, { params }: { params: Promise<{ gistId: string }> }) {
  const { gistId } = await params
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  })
  if (!res.ok) return Response.json({ error: '取得失敗' }, { status: 500 })
  const gist = await res.json()
  const raw = gist.files?.['hajime.json']?.content
  if (!raw) return Response.json({ error: 'データなし' }, { status: 404 })
  return Response.json(JSON.parse(raw))
}

export async function PATCH(request: Request, { params }: { params: Promise<{ gistId: string }> }) {
  const { gistId } = await params
  const body = await request.json()
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
    },
    body: JSON.stringify({
      files: { 'hajime.json': { content: JSON.stringify(body) } },
    }),
  })
  if (!res.ok) return Response.json({ error: '更新失敗' }, { status: 500 })
  return Response.json({ ok: true })
}
