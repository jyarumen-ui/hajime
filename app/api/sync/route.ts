const GITHUB_TOKEN = process.env.GITHUB_TOKEN!
const GIST_DESCRIPTION = 'hajime-ai-company-data'

export async function POST(request: Request) {
  const body = await request.json()

  const res = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
    },
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false,
      files: {
        'hajime.json': { content: JSON.stringify(body) },
      },
    }),
  })

  if (!res.ok) return Response.json({ error: 'Gist作成失敗' }, { status: 500 })
  const gist = await res.json()
  return Response.json({ gistId: gist.id })
}

export async function GET() {
  const res = await fetch('https://api.github.com/gists', {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  })
  if (!res.ok) return Response.json({ error: '取得失敗' }, { status: 500 })
  const gists = await res.json()
  const hajime = gists.find((g: { description: string; id: string }) => g.description === GIST_DESCRIPTION)
  return Response.json({ gistId: hajime?.id ?? null })
}
