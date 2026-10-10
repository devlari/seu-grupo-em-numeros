import { countBy, median, type Prepared, rank, rateMinMessages } from './prepare.ts'
import { charCount, DEFAULT_SWEAR_WORDS, fold, isLaugh, isOnlyLaughs, removeLinks, toLocalDateTime, tokenize } from './text.ts'
import type { AnalysisOptions, Rankings } from './types.ts'

function countTerms(text: string, terms: Set<string>): number {
  let n = 0
  for (const token of tokenize(text)) if (terms.has(fold(token))) n++
  return n
}

export function rankings({ messages, texts, people }: Prepared, options: AnalysisOptions): Rankings {
  const swearSet = new Set((options.swearWords ?? DEFAULT_SWEAR_WORDS).map(fold))

  const laughs = rank(people, countBy(texts, (m) => m.author, (m) => tokenize(m.text).filter(isLaugh).length))
  const swears = rank(people, countBy(texts, (m) => m.author, (m) => countTerms(m.text, swearSet)))
  const custom = (options.customRankings ?? []).map(({ label, terms }) => {
    const set = new Set(terms.map(fold))
    return { label, ranking: rank(people, countBy(texts, (m) => m.author, (m) => countTerms(m.text, set))) }
  })

  // Tamanho médio: ignora links, mensagens vazias e mensagens que são só risada
  const lengths = new Map<string, { total: number; messages: number }>()
  let longest: Rankings['longestMessage'] = null
  for (const m of texts) {
    const clean = removeLinks(m.text).trim()
    if (!clean) continue
    const chars = charCount(clean)
    if (!longest || chars > longest.chars) {
      longest = { author: m.author, text: m.text, at: toLocalDateTime(m.at), chars }
    }
    if (isOnlyLaughs(clean)) continue
    const acc = lengths.get(m.author) ?? { total: 0, messages: 0 }
    acc.total += chars
    acc.messages++
    lengths.set(m.author, acc)
  }

  const messageCounts = countBy(messages, (m) => m.author)
  const media = rank(people, countBy(messages, (m) => (m.kind === 'media' ? m.author : null)))

  // Proporção: a cada 100 mensagens da pessoa, uma casa decimal
  const minMessages = rateMinMessages(messages.length)
  const perHundred = (list: { name: string; count: number }[]) =>
    list
      .filter((c) => (messageCounts.get(c.name) ?? 0) >= minMessages)
      .map((c) => ({ name: c.name, count: Math.round((c.count / messageCounts.get(c.name)!) * 1000) / 10 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  const profilePeople = people.map((name) => {
    const acc = lengths.get(name)
    return {
      name,
      messages: messageCounts.get(name) ?? 0,
      avgChars: acc ? Math.round((acc.total / acc.messages) * 100) / 100 : 0,
    }
  })

  return {
    laughs,
    swears,
    custom,
    media,
    deleted: rank(people, countBy(messages, (m) => (m.kind === 'deleted' ? m.author : null))),
    edited: rank(people, countBy(messages, (m) => (m.edited ? m.author : null))),
    perHundred: { laughs: perHundred(laughs), swears: perHundred(swears), media: perHundred(media), minMessages },
    profile: {
      people: profilePeople.sort((a, b) => b.avgChars - a.avgChars),
      medianMessages: median(profilePeople.map((p) => p.messages)),
      medianAvgChars: median(profilePeople.map((p) => p.avgChars)),
    },
    longestMessage: longest,
  }
}
