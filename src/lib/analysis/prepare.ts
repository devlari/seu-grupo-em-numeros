import type { ChatMessage, MessageKind, ParsedChat } from '../whatsapp/types.ts'
import { phoneLabels } from './phones.ts'
import type { AnalysisOptions, Counted } from './types.ts'

export interface PersonMessage {
  author: string
  at: Date
  text: string
  kind: Exclude<MessageKind, 'system'>
  edited: boolean
}

export interface Prepared {
  /** Mensagens de pessoas, já com apelidos aplicados e excluídos removidos, em ordem cronológica */
  messages: PersonMessage[]
  /** Só as de texto, que são as que entram nas análises de palavras */
  texts: PersonMessage[]
  system: ChatMessage[]
  /** Pessoas da análise, de quem mais mandou mensagem pra quem menos */
  people: string[]
}

export function prepare(chat: ParsedChat, options: AnalysisOptions): Prepared {
  // Números sem nome viram "Contato •4321", a não ser que a pessoa tenha dado um nome
  const masked = options.maskPhoneNumbers === false ? new Map<string, string>() : phoneLabels(chat.participants)
  const aliases = options.aliases ?? {}
  const excluded = new Set(options.excludeAuthors ?? [])
  const from = options.period?.from ? new Date(`${options.period.from}T00:00:00`).getTime() : -Infinity
  const to = options.period?.to ? new Date(`${options.period.to}T23:59:59.999`).getTime() : Infinity
  const messages: PersonMessage[] = []
  const system: ChatMessage[] = []

  for (const m of chat.messages) {
    // Mensagens de sistema contam a história do grupo, então ficam fora do filtro de período
    if (m.author === null || m.kind === 'system') {
      system.push(m)
      continue
    }
    const time = m.timestamp.getTime()
    if (time < from || time > to) continue
    const author = aliases[m.author] ?? masked.get(m.author) ?? m.author
    if (excluded.has(m.author) || excluded.has(author)) continue
    messages.push({ author, at: m.timestamp, text: m.text, kind: m.kind, edited: m.edited })
  }

  // O export quase sempre está em ordem, mas não é garantido. sort é estável no JS.
  messages.sort((a, b) => a.at.getTime() - b.at.getTime())
  system.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  const people = rank([...new Set(messages.map((m) => m.author))], countBy(messages, (m) => m.author))
    .map((c) => c.name)

  return { messages, texts: messages.filter((m) => m.kind === 'text'), system, people }
}

/**
 * Mínimo de mensagens pra entrar em rankings por proporção e disputar prêmios por taxa.
 * Evita que quem mandou 3 mensagens, uma com kkk, vire a máquina de kkkk.
 */
export function rateMinMessages(totalMessages: number): number {
  return Math.max(10, Math.min(50, Math.round(totalMessages * 0.02)))
}

export function countBy<T>(items: Iterable<T>, key: (item: T) => string | null, weight: (item: T) => number = () => 1) {
  const counts = new Map<string, number>()
  for (const item of items) {
    const k = key(item)
    if (k === null) continue
    const w = weight(item)
    if (w !== 0) counts.set(k, (counts.get(k) ?? 0) + w)
  }
  return counts
}

/** Ranking com todo mundo (inclusive quem tem zero), do maior pro menor */
export function rank(names: Iterable<string>, counts: Map<string, number>): Counted[] {
  return [...names]
    .map((name) => ({ name, count: counts.get(name) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

/** Os N maiores de um Map, sem incluir zeros */
export function top(counts: Map<string, number>, n: number): Counted[] {
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, n)
}

export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
