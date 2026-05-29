'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveFounderProfile, getFounderProfile } from '@/lib/profile'

type StepKey = 'name' | 'position' | 'stage' | 'weeklyHours' | 'budget' | 'skills' | 'industry' | 'challenge' | 'goal'

interface Step {
  key: StepKey
  question: string
  choices: string[]
  freeInput?: boolean
  placeholder?: string
}

const STEPS: Step[] = [
  {
    key: 'name',
    question: 'まず、なんて呼べばいい？',
    choices: [],
    freeInput: true,
    placeholder: '例：田中、たなか社長、Tanakaさん など',
  },
  {
    key: 'position',
    question: '今の立場を教えろ',
    choices: ['会社員（副業検討中）', 'フリーランス・個人事業主', '起業家（法人あり）', '学生', '無職・転職中'],
  },
  {
    key: 'stage',
    question: '事業の現在地はどのあたりだ？',
    choices: ['アイデアだけある', '動き始めたばかり（売上なし）', '売上は少しある（月10万円未満）', '月10〜100万円規模', '月100万円以上'],
  },
  {
    key: 'weeklyHours',
    question: '事業に使える時間は週どのくらいだ？',
    choices: ['週5時間未満', '週5〜15時間', '週15〜30時間', '週30〜50時間', 'ほぼフルタイム（週40時間以上）'],
  },
  {
    key: 'budget',
    question: '事業に使える資金の感覚を教えろ',
    choices: ['ほぼ0円（無料でやる）', '〜10万円', '10〜50万円', '50〜200万円', '200万円以上'],
  },
  {
    key: 'skills',
    question: 'お前の強みはなんだ？',
    choices: ['営業・対人コミュニケーション', '技術・プログラミング', 'デザイン・クリエイティブ', '企画・マーケティング', '専門知識・資格'],
  },
  {
    key: 'industry',
    question: '狙ってる事業ジャンルはどれだ？',
    choices: ['IT・SaaS・アプリ', 'コンサル・コーチング', 'EC・物販・D2C', 'コンテンツ・メディア', '飲食・店舗・サービス業'],
  },
  {
    key: 'challenge',
    question: '今一番詰まってることはなんだ？',
    choices: ['何から始めればいいかわからない', '集客・お客さんの集め方', '収益化・どうお金を取るか', '時間・リソース不足', '自信がない・続けられるか不安'],
  },
  {
    key: 'goal',
    question: '3ヶ月後、どうなってれば「下克上」だ？',
    choices: ['初めての売上を立てる', '月10万円を安定して稼ぐ', '月100万円を達成する', '本業を辞められる状態にする', '仕組みを作って自動化する'],
  },
]

export default function ProfilePage() {
  const router = useRouter()
  const existing = getFounderProfile()
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Partial<Record<StepKey, string>>>(existing ?? {})
  const [freeInput, setFreeInput] = useState('')
  const [done, setDone] = useState(false)

  const step = STEPS[stepIndex]
  const progress = Math.round((stepIndex / STEPS.length) * 100)

  function select(choice: string) {
    const next = { ...answers, [step.key]: choice }
    setAnswers(next)
    advance(next)
  }

  function submitFree() {
    const val = freeInput.trim()
    if (!val) return
    const next = { ...answers, [step.key]: val }
    setAnswers(next)
    setFreeInput('')
    advance(next)
  }

  function advance(next: Partial<Record<StepKey, string>>) {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(i => i + 1)
    } else {
      saveFounderProfile({
        name: next.name ?? '',
        position: next.position ?? '',
        stage: next.stage ?? '',
        weeklyHours: next.weeklyHours ?? '',
        budget: next.budget ?? '',
        skills: next.skills ?? '',
        industry: next.industry ?? '',
        challenge: next.challenge ?? '',
        goal: next.goal ?? '',
      })
      setDone(true)
      setTimeout(() => router.push('/'), 1800)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: '#0A0A12', fontFamily: 'system-ui, sans-serif' }}>
        <div className="text-center">
          <div className="text-5xl mb-4">😎</div>
          <h2 className="text-lg font-bold mb-1" style={{ color: '#F5C518' }}>登録完了</h2>
          <p className="text-xs" style={{ color: '#8080A0' }}>マダオAI執行チームに共有したぞ</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col max-w-sm mx-auto px-4 pt-8 pb-10"
      style={{ backgroundColor: '#0A0A12', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xl">😎</span>
          <span className="text-sm font-bold" style={{ color: '#F5C518' }}>お前のプロフィール</span>
        </div>
        <span className="text-xs" style={{ color: '#8080A0' }}>{stepIndex + 1} / {STEPS.length}</span>
      </div>

      {/* Progress */}
      <div className="w-full h-1.5 rounded-full mb-8" style={{ backgroundColor: '#1A1A28' }}>
        <div className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: '#F5C518' }} />
      </div>

      {/* Question */}
      <div className="mb-6">
        <h2 className="text-base font-bold leading-snug" style={{ color: '#F0F0F0' }}>{step.question}</h2>
      </div>

      {step.freeInput ? (
        <div className="space-y-3">
          <div className="flex gap-2 items-center rounded-2xl px-3 py-3" style={{ backgroundColor: '#1A1A28' }}>
            <input
              autoFocus
              value={freeInput}
              onChange={e => setFreeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitFree()}
              placeholder={step.placeholder}
              className="flex-1 outline-none text-sm bg-transparent"
              style={{ color: '#F0F0F0' }}
            />
          </div>
          <button
            onClick={submitFree}
            disabled={!freeInput.trim()}
            className="w-full py-3 rounded-2xl text-sm font-bold disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: '#F5C518', color: '#0A0A12' }}>
            次へ →
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {step.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => select(choice)}
              className="text-left px-4 py-3 rounded-2xl text-sm transition-all active:scale-[0.98]"
              style={{ backgroundColor: '#1A1A28', color: '#F0F0F0', border: '1px solid #2A2A3A' }}>
              <span className="font-bold mr-2 text-xs" style={{ color: '#F5C518' }}>{i + 1}</span>
              {choice}
            </button>
          ))}
          <div className="mt-1 flex gap-2 items-center rounded-2xl px-3 py-2.5 border border-dashed"
            style={{ backgroundColor: '#1A1A28', borderColor: '#2A2A3A' }}>
            <input
              value={freeInput}
              onChange={e => setFreeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && freeInput.trim() && select(freeInput.trim())}
              placeholder="その他（自由入力）"
              className="flex-1 outline-none text-sm bg-transparent"
              style={{ color: '#F0F0F0' }}
            />
            {freeInput.trim() && (
              <button onClick={() => { select(freeInput.trim()); setFreeInput('') }}
                className="text-xs px-2 py-1 rounded-lg font-bold"
                style={{ backgroundColor: '#F5C518', color: '#0A0A12' }}>
                決定
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
