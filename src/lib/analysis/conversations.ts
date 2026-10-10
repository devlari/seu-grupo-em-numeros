import { countBy, type Prepared, rank, top } from './prepare.ts'
import { toLocalDateTime } from './text.ts'
import type { AnalysisOptions, Conversations } from './types.ts'

const MINUTE_MS = 60 * 1000

const SIZE_BUCKETS: { label: string; max: number }[] = [
  { label: '1-2', max: 2 },
  { label: '3-5', max: 5 },
  { label: '6-10', max: 10 },
  { label: '11-20', max: 20 },
  { label: '21-50', max: 50 },
  { label: '51-100', max: 100 },
  { label: '100+', max: Infinity },
]

/** Conversas: blocos de mensagens separados por mais de `conversationGapMinutes` de silêncio */
export function conversations({ messages, people }: Prepared, options: AnalysisOptions): Conversations {
  const gapMs = (options.conversationGapMinutes ?? 30) * MINUTE_MS
  const blocks: { start: number; end: number }[] = []

  messages.forEach((m, i) => {
    if (i === 0 || m.at.getTime() - messages[i - 1].at.getTime() > gapMs) blocks.push({ start: i, end: i })
    else blocks[blocks.length - 1].end = i
  })

  const sizeBuckets = SIZE_BUCKETS.map(({ label }) => ({ label, count: 0 }))
  for (const b of blocks) {
    const size = b.end - b.start + 1
    sizeBuckets[SIZE_BUCKETS.findIndex((bucket) => size <= bucket.max)].count++
  }

  const biggest = blocks.reduce<(typeof blocks)[number] | null>(
    (best, b) => (!best || b.end - b.start > best.end - best.start ? b : best),
    null,
  )

  let largest: Conversations['largest'] = null
  if (biggest) {
    const slice = messages.slice(biggest.start, biggest.end + 1)
    const start = slice[0].at
    const end = slice.at(-1)!.at
    largest = {
      start: toLocalDateTime(start),
      end: toLocalDateTime(end),
      messages: slice.length,
      durationMinutes: Math.round((end.getTime() - start.getTime()) / MINUTE_MS),
      participants: top(countBy(slice, (m) => m.author), Infinity),
    }
  }

  // Quem abre e quem fecha conversas com mais de uma pessoa; e quem fala sozinho (ninguém respondeu)
  const starters = new Map<string, number>()
  const enders = new Map<string, number>()
  const monologues = new Map<string, number>()
  const inc = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1)
  for (const b of blocks) {
    const first = messages[b.start].author
    let alone = true
    for (let i = b.start + 1; i <= b.end && alone; i++) if (messages[i].author !== first) alone = false
    if (alone) {
      inc(monologues, first)
      continue
    }
    inc(starters, first)
    inc(enders, messages[b.end].author)
  }

  return {
    total: blocks.length,
    sizeBuckets,
    largest,
    starters: rank(people, starters),
    enders: rank(people, enders),
    monologues: rank(people, monologues),
  }
}
