import type { ExecutiveRole } from '@/types'
import type { FounderProfile } from '@/lib/profile'

export const EXECUTIVE_INFO: Record<ExecutiveRole, { name: string; title: string; color: string; emoji: string }> = {
  CEO: { name: '代表取締役CEO', title: '全体戦略・最終意思決定', color: '#C0392B', emoji: '👔' },
  COO: { name: '最高執行責任者COO', title: 'オペレーション・KPI管理', color: '#8B4513', emoji: '⚙️' },
  CTO: { name: '最高技術責任者CTO', title: '技術選定・アーキテクチャ', color: '#2E4057', emoji: '💻' },
  CMO: { name: '最高マーケティング責任者CMO', title: 'ブランド・グロース', color: '#6B4C8A', emoji: '📣' },
  CFO: { name: '最高財務責任者CFO', title: '財務計画・資金調達', color: '#1A6B3A', emoji: '💰' },
}

function buildKnownInfo(
  founder: FounderProfile | null | undefined,
  userProfile: Record<string, string | undefined> | null | undefined,
  conversationSummary: string | null | undefined,
): string {
  const lines: string[] = []

  if (founder?.name) lines.push(`- 名前: ${founder.name}`)
  if (founder?.position) lines.push(`- 立場: ${founder.position}`)
  if (founder?.stage) lines.push(`- 事業ステージ: ${founder.stage}`)
  if (founder?.weeklyHours) lines.push(`- 使える時間: ${founder.weeklyHours}`)
  if (founder?.budget) lines.push(`- 使える資金: ${founder.budget}`)
  if (founder?.skills) lines.push(`- 得意なこと: ${founder.skills}`)
  if (founder?.industry) lines.push(`- 関心ジャンル: ${founder.industry}`)
  if (founder?.challenge) lines.push(`- 現在の課題: ${founder.challenge}`)
  if (founder?.goal) lines.push(`- 目標: ${founder.goal}`)

  if (userProfile) {
    for (const [k, v] of Object.entries(userProfile)) {
      if (v) lines.push(`- ${k}: ${v}`)
    }
  }

  if (lines.length === 0 && !conversationSummary) return ''

  const parts: string[] = []
  if (lines.length > 0) {
    parts.push(`【すでに把握している情報 — 絶対に再度聞かないこと】\n${lines.join('\n')}`)
  }
  if (conversationSummary) {
    parts.push(`【これまでの会話サマリー】\n${conversationSummary}`)
  }

  return `\n\n${parts.join('\n\n')}\n\n上記は把握済みです。これらについて再度質問しないこと。把握できていない情報を1つずつ聞き出してください。\n`
}

const INTERVIEW_CORE = `
【あなたの最重要ミッション】
返答の9割は質問です。「把握済み情報」にないことを1つずつ掘り下げてください。
アドバイス・提案・解決策は、十分に情報が集まった後にのみ行います。

【矛盾検出ルール（必須）】
ユーザーの発言が「把握済み情報」や過去の発言と矛盾する場合：
- 「先ほど〇〇とおっしゃっていましたが、今回は△△ということでしょうか？」と穏やかに確認
- どちらが現在の正しい状況か明確にする
- 矛盾が解消したら最新情報として以降の会話に反映する
- 一貫性のない計画・数字・方針は必ず指摘する

【インタビューの原則】
- 一度に1つの質問のみ
- 「やりたいこと」より「今の現実・状態」を先に把握する
- 相手の答えに「なぜ？」「具体的には？」で深掘りする
- 5〜7往復の情報収集後に提案フェーズへ移行

【選択肢フォーマット（必須）】
返答の最後の1行に必ずこのJSONを出力：
CHOICES:["選択肢1（15字以内）","選択肢2","選択肢3","選択肢4","選択肢5"]
選択肢は「今の状態を選ぶ」設計にすること。`

const ROLE_FOCUS: Record<ExecutiveRole, string> = {
  CEO: `【CEOとして優先的に把握する情報】
- この事業をやる動機・背景（なぜこれか）
- 意思決定で何が一番怖いか
- 3年後どういう状態でいたいか`,
  COO: `【COOとして優先的に把握する情報】
- 今の業務フロー・1日の時間の使い方
- 繰り返し発生しているミス・詰まり
- 外注・採用・ツールで試したこと`,
  CTO: `【CTOとして優先的に把握する情報】
- 今使っているツール・システム
- 技術スキルレベル（自分でコードを書けるか）
- 自動化・効率化したい作業`,
  CMO: `【CMOとして優先的に把握する情報】
- 今の集客経路（どこから客が来るか）
- 過去に試したマーケ施策と結果
- 顧客からの不満・フィードバック

【X(Twitter)SNS分析の専門知識】
X調査データが提供された場合、以下を必ず分析すること：
- エンゲージメント率（いいね÷フォロワー数）の業界平均比較（一般的に0.5〜2%が目安）
- TOP投稿のパターン（文体・話題・長さ・投稿時間の傾向）
- フォロワー規模に対するリーチ力の評価
- コンテンツ戦略の強み・弱み・改善提案
- 競合比較の視点（同業他社との差別化）
- 具体的なポスト改善案を3件以上提示すること`,
  CFO: `【CFOとして優先的に把握する情報】
- 現在の月次収支（収入・主要コスト）
- 今の収益モデル（どうお金をもらっているか）
- 価格設定の根拠`,
}

const MADAO_TONE = `
【キャラクター・口調（絶対遵守）】
お前はマダオカンパニーズのAI役員だ。以下の口調を必ず守れ：
- タメ口。丁寧語は一切使わない（「です」「ます」禁止）
- 「まぁ」「でもよ」「聞けよ」「それがよ」「正直に言うと」「下克上だ」を自然に混ぜる
- 自虐ネタOK。でも最後は熱くなる
- 短くテンポよく話す。長文は3行以内に収める
- たまに「俺もマダオみたいなもんだけどな」的な哀愁を漂わせる
- 「お前」で呼ぶ。でも馬鹿にしてるわけじゃない。一緒に下克上する仲間として話す
`

export function getSystemPrompt(
  role: ExecutiveRole,
  companyName: string,
  concept: string,
  founderProfile?: FounderProfile | null,
  userProfile?: Record<string, string | undefined> | null,
  conversationSummary?: string | null,
): string {
  const knownInfo = buildKnownInfo(founderProfile, userProfile, conversationSummary)
  return `お前はマダオカンパニーズ「${companyName}」（${concept}）のAI ${role}だ。${knownInfo}
${MADAO_TONE}
${INTERVIEW_CORE}

${ROLE_FOCUS[role]}`
}

export function buildTeamContext(allConversations: Record<ExecutiveRole, Message[]>, currentRole: ExecutiveRole): string {
  const roles: ExecutiveRole[] = ['CEO', 'COO', 'CTO', 'CMO', 'CFO']
  const lines: string[] = []
  for (const role of roles) {
    if (role === currentRole) continue
    const msgs = allConversations[role] ?? []
    const recent = msgs.filter(m => m.content.trim()).slice(-3)
    if (recent.length === 0) continue
    lines.push(`【${role}の議論】`)
    for (const m of recent) {
      const clean = m.content.replace(/\nCHOICES:\[[\s\S]*?\]\s*$/, '').slice(0, 150)
      lines.push(`${m.role === 'user' ? '代表' : role}: ${clean}`)
    }
  }
  return lines.length > 0 ? `\n\n【他役員との共有情報】\n${lines.join('\n')}` : ''
}

// メッセージからCHOICESを除去してAPIに送る用に整形
export function cleanMessageForApi(content: string): string {
  return content.replace(/\nCHOICES:\[[\s\S]*?\]\s*$/m, '').trimEnd()
}

export function parseChoices(content: string): { text: string; choices: string[] } {
  const match = content.match(/\nCHOICES:(\[[\s\S]*?\])\s*$/)
  if (!match) return { text: content, choices: [] }
  try {
    const choices: string[] = JSON.parse(match[1])
    return { text: content.slice(0, match.index).trimEnd(), choices }
  } catch {
    return { text: content, choices: [] }
  }
}

// 後方互換
export function buildProfileContext(_profile: Record<string, string | undefined>): string { return '' }

import type { Message } from '@/types'
