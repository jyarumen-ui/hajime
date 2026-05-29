export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')?.replace('@', '').trim()
  if (!username) return Response.json({ error: 'username required' }, { status: 400 })

  const token = process.env.X_BEARER_TOKEN
  if (!token) return Response.json({ error: 'X_BEARER_TOKEN が設定されていません' }, { status: 500 })

  const headers = { Authorization: `Bearer ${token}` }

  // ユーザー情報取得
  const userRes = await fetch(
    `https://api.twitter.com/2/users/by/username/${username}?user_fields=description,public_metrics,profile_image_url,created_at`,
    { headers }
  )
  if (!userRes.ok) {
    const err = await userRes.json().catch(() => ({}))
    const status = userRes.status
    if (status === 404 || (err as { title?: string }).title === 'Not Found Error') {
      return Response.json({ error: `@${username} が見つかりません` }, { status: 404 })
    }
    if (status === 401) return Response.json({ error: 'X API 認証エラー' }, { status: 401 })
    if (status === 429) return Response.json({ error: 'レート制限中。しばらく待ってください' }, { status: 429 })
    return Response.json({ error: 'X API エラー' }, { status: status })
  }
  const userData = await userRes.json()
  const u = userData.data
  if (!u) return Response.json({ error: `@${username} が見つかりません` }, { status: 404 })

  // 投稿取得（リツイート・リプライ除く）
  const tweetsRes = await fetch(
    `https://api.twitter.com/2/users/${u.id}/tweets?max_results=20&tweet.fields=public_metrics,created_at&exclude=retweets,replies`,
    { headers }
  )

  type TweetRaw = { id: string; text: string; public_metrics?: { like_count: number; retweet_count: number; impression_count: number } }
  let topPosts: { id: string; text: string; likes: number; retweets: number; impressions: number }[] = []
  if (tweetsRes.ok) {
    const tweetsData = await tweetsRes.json()
    topPosts = ((tweetsData.data ?? []) as TweetRaw[])
      .map(t => ({
        id: t.id,
        text: t.text,
        likes: t.public_metrics?.like_count ?? 0,
        retweets: t.public_metrics?.retweet_count ?? 0,
        impressions: t.public_metrics?.impression_count ?? 0,
      }))
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 5)
  }

  const metrics = u.public_metrics ?? {}
  return Response.json({
    user: {
      id: u.id,
      username: u.username,
      name: u.name,
      bio: u.description ?? '',
      followers: metrics.followers_count ?? 0,
      following: metrics.following_count ?? 0,
      tweetCount: metrics.tweet_count ?? 0,
      profileImageUrl: u.profile_image_url ?? null,
    },
    topPosts,
  })
}
