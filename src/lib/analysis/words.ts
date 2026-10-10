import { monthly } from './frequency.ts'
import { countBy, type PersonMessage, type Prepared, top } from './prepare.ts'
import { fold, isLaugh, isStopword, tokenize } from './text.ts'
import type { AnalysisOptions, Counted, Words } from './types.ts'

const MIN_WORD_LENGTH = 3

function isMeaningful(token: string): boolean {
  return token.length >= MIN_WORD_LENGTH && !/^\d+$/.test(token) && !isStopword(token) && !isLaugh(token)
}

/**
 * Conta palavras agrupando variações de acento ("voce" e "você"),
 * e exibe a grafia mais usada de cada uma.
 */
class WordCounter {
  private counts = new Map<string, number>()
  private spellings = new Map<string, Map<string, number>>()

  add(token: string) {
    const key = fold(token)
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1)
    const forms = this.spellings.get(key) ?? new Map<string, number>()
    forms.set(token, (forms.get(token) ?? 0) + 1)
    this.spellings.set(key, forms)
  }

  top(n: number): Counted[] {
    return top(this.counts, n).map(({ name, count }) => ({ name: this.bestSpelling(name), count }))
  }

  private bestSpelling(key: string): string {
    const forms = this.spellings.get(key)
    if (!forms) return key
    return [...forms].reduce((a, b) => (b[1] > a[1] ? b : a))[0]
  }
}

export function words({ texts, messages, people }: Prepared, options: AnalysisOptions): Words {
  const n = options.topWords ?? 10
  const all = new WordCounter()
  const perPersonCounters = new Map(people.map((p) => [p, new WordCounter()]))

  for (const m of texts) {
    const personCounter = perPersonCounters.get(m.author)
    for (const token of tokenize(m.text)) {
      if (!isMeaningful(token)) continue
      all.add(token)
      personCounter?.add(token)
    }
  }

  const perPerson: Record<string, Counted[]> = {}
  for (const [person, counter] of perPersonCounters) perPerson[person] = counter.top(n)

  const range = messages.length ? { from: messages[0].at, to: messages.at(-1)!.at } : undefined
  const tracked = (options.trackedWords ?? []).map((word) => {
    // Conta mensagens que citam a palavra, como o notebook fazia
    const key = fold(word)
    const hits: PersonMessage[] = texts.filter((m) => tokenize(m.text).some((t) => fold(t) === key))
    return {
      word,
      total: hits.length,
      byMonth: monthly(hits, range),
      topPeople: top(countBy(hits, (m) => m.author), 3),
    }
  })

  return { top: all.top(n), perPerson, tracked }
}
