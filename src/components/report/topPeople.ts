import type { AnalysisResult, Counted } from '../../lib/analysis/index.ts'
import { median } from '../../lib/analysis/prepare.ts'

/**
 * Recorta os dados por pessoa pras N que mais mandaram mensagem.
 * Com centenas de pessoas, gráficos com todo mundo travavam a página (a matriz de 300×300 tinha 90 mil células).
 * O resultado completo continua no JSON baixado.
 */
export function topPeople(r: AnalysisResult, limit: number) {
  const names = r.overview.perPerson.slice(0, limit).map((p) => p.name)
  const keep = new Set(names)
  const m = r.interactions.matrix
  const idx = m.people.map((name, i) => (keep.has(name) ? i : -1)).filter((i) => i >= 0)
  const profilePeople = r.rankings.profile.people.filter((p) => keep.has(p.name))
  const trimmed = r.overview.perPerson.length > limit

  return {
    /** Quantas pessoas ficaram de fora dos gráficos (0 = ninguém) */
    hidden: Math.max(0, r.overview.perPerson.length - limit),
    total: r.overview.perPerson.length,
    messages: r.overview.perPerson.slice(0, limit).map((p): Counted => ({ name: p.name, count: p.messages })),
    // Medianas de quem aparece no gráfico: com todo mundo, a linha ficaria colada no eixo (a maioria manda pouco)
    profile: trimmed
      ? {
          people: profilePeople,
          medianMessages: median(profilePeople.map((p) => p.messages)),
          medianAvgChars: median(profilePeople.map((p) => p.avgChars)),
        }
      : r.rankings.profile,
    /** Só as ligações entre duas pessoas que aparecem no gráfico */
    pairs: r.interactions.topPairs.filter((p) => keep.has(p.a) && keep.has(p.b)),
    matrix: {
      people: idx.map((i) => m.people[i]),
      counts: idx.map((i) => idx.map((j) => m.counts[i][j])),
      normalized: idx.map((i) => idx.map((j) => m.normalized[i][j])),
    },
    words: names.filter((name) => r.words.perPerson[name]).map((name) => [name, r.words.perPerson[name]] as const),
    firstSeen: r.interactions.firstSeen.filter((p) => keep.has(p.name)),
  }
}
