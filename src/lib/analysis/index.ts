import type { ParsedChat } from '../whatsapp/types.ts'
import { frequency } from './frequency.ts'
import { conversations } from './conversations.ts'
import { insights } from './insights.ts'
import { interactions } from './interactions.ts'
import { overview } from './overview.ts'
import { polls } from './polls.ts'
import { prepare } from './prepare.ts'
import { rankings } from './rankings.ts'
import type { AnalysisOptions, AnalysisResult } from './types.ts'
import { words } from './words.ts'

export type * from './types.ts'
export { DEFAULT_SWEAR_WORDS } from './text.ts'
export { isPhoneNumber, phoneLabels } from './phones.ts'

/** Roda todas as análises. O resultado é JSON puro (datas como texto no horário local). */
export function analyzeChat(chat: ParsedChat, options: AnalysisOptions = {}): AnalysisResult {
  const prepared = prepare(chat, options)
  const result = {
    overview: overview(prepared, options),
    frequency: frequency(prepared),
    words: words(prepared, options),
    rankings: rankings(prepared, options),
    interactions: interactions(prepared, options),
    conversations: conversations(prepared, options),
    polls: polls(prepared),
  }
  return { ...result, insights: insights(result, options.textSeed) }
}
