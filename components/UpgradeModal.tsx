'use client'

interface Props {
  onClose: () => void
}

const STRIPE_LINK = 'https://buy.stripe.com/your_link_here'

export default function UpgradeModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">🔒</div>
          <h2 className="text-lg font-bold text-gray-800 mb-1">無料枠を使い切りました</h2>
          <p className="text-xs text-gray-500">
            Proにアップグレードすると<br />
            AI役員と無制限に対話できます
          </p>
        </div>

        <div className="bg-amber-50 rounded-2xl p-4 mb-4 border border-amber-100">
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-gray-800">Pro プラン</span>
            <div className="text-right">
              <span className="text-2xl font-bold" style={{ color: '#C0392B' }}>¥2,980</span>
              <span className="text-xs text-gray-500">/月</span>
            </div>
          </div>
          <ul className="space-y-1.5 text-xs text-gray-700">
            {[
              'AI役員との対話 無制限',
              '会社ポートフォリオ 無制限',
              '事業計画書・PDF出力',
              'デバイス間同期',
              '会話の自動要約・記憶',
            ].map(f => (
              <li key={f} className="flex items-center gap-2">
                <span style={{ color: '#C0392B' }}>✓</span>{f}
              </li>
            ))}
          </ul>
        </div>

        <a href={STRIPE_LINK} target="_blank" rel="noopener noreferrer"
          className="block w-full text-center py-3 rounded-2xl text-white font-bold text-sm mb-3 transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#C0392B' }}>
          Proにアップグレード →
        </a>

        <button onClick={onClose}
          className="block w-full text-center py-2 text-xs text-gray-400 hover:text-gray-600">
          あとで
        </button>
      </div>
    </div>
  )
}
