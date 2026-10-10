import type { Prepared } from './prepare.ts'
import { toMonth } from './text.ts'
import type { AnalysisOptions, Interactions } from './types.ts'

const MINUTE_MS = 60 * 1000

/**
 * Quem responde quem: duas mensagens seguidas de pessoas diferentes,
 * com até `replyWindowMinutes` entre elas, contam como resposta.
 */
export function interactions({ messages, people }: Prepared, options: AnalysisOptions): Interactions {
  const windowMs = (options.replyWindowMinutes ?? 5) * MINUTE_MS
  const index = new Map(people.map((p, i) => [p, i]))
  const counts = people.map(() => Array<number>(people.length).fill(0))

  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1]
    const curr = messages[i]
    if (prev.author === curr.author) continue
    if (curr.at.getTime() - prev.at.getTime() > windowMs) continue
    counts[index.get(prev.author)!][index.get(curr.author)!]++
  }

  const replies: Interactions['replies'] = []
  const pairs = new Map<string, { a: string; b: string; count: number }>()
  counts.forEach((row, i) =>
    row.forEach((count, j) => {
      if (count === 0) return
      replies.push({ from: people[i], to: people[j], count })
      const [a, b] = [people[i], people[j]].sort()
      const key = `${a}\u0000${b}`
      const pair = pairs.get(key) ?? { a, b, count: 0 }
      pair.count += count
      pairs.set(key, pair)
    }),
  )

  const normalized = counts.map((row) => {
    const total = row.reduce((s, n) => s + n, 0)
    return row.map((n) => (total ? Math.round((n / total) * 1000) / 1000 : 0))
  })

  const firstSeen = new Map<string, string>()
  for (const m of messages) if (!firstSeen.has(m.author)) firstSeen.set(m.author, toMonth(m.at))

  return {
    replies: replies.sort((a, b) => b.count - a.count),
    matrix: { people, counts, normalized },
    topPairs: [...pairs.values()].sort((a, b) => b.count - a.count),
    firstSeen: [...firstSeen].map(([name, month]) => ({ name, month })),
  }
}
