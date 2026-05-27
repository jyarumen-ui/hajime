'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { activatePro, getPlan } from '@/lib/usage'

function UpgradeContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'already'>('processing')

  useEffect(() => {
    const success = params.get('success')
    if (success === '1') {
      activatePro()
      setStatus('success')
      setTimeout(() => router.push('/'), 2500)
    } else if (getPlan() === 'pro') {
      setStatus('already')
      setTimeout(() => router.push('/'), 1500)
    }
  }, [params, router])

  return (
    <div className="text-center max-w-xs">
      {status === 'processing' && (
        <>
          <div className="text-4xl mb-3 animate-pulse">⏳</div>
          <p className="text-sm text-gray-600">処理中...</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Pro 有効化完了！</h1>
          <p className="text-sm text-gray-500 mb-1">AI役員との対話が無制限になりました</p>
          <p className="text-xs text-gray-400">ダッシュボードに戻ります...</p>
        </>
      )}
      {status === 'already' && (
        <>
          <div className="text-4xl mb-3">✅</div>
          <p className="text-sm text-gray-600">すでにProプランです</p>
        </>
      )}
    </div>
  )
}

export default function UpgradePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#F5F0EB', fontFamily: 'system-ui, sans-serif' }}>
      <Suspense fallback={<div className="text-sm text-gray-500">読み込み中...</div>}>
        <UpgradeContent />
      </Suspense>
    </div>
  )
}
