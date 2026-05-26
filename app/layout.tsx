import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '始 — AIカンパニー創業支援サービス',
  description: 'AI執行役員があなたの事業を動かす',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
