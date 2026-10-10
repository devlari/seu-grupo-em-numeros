import { describe, expect, it } from 'vitest'
import { parseChat } from '../whatsapp/parseChat.ts'
import { analyzeChat } from './index.ts'

const pad = (v: number) => String(v).padStart(2, '0')

/**
 * Gera um grupo sintético: em cada mês, `count` mensagens em dias úteis às 10h,
 * revezando entre as pessoas daquele mês.
 */
function makeChat(plan: { month: string; count: number; people: [string, string][] }[], extra: string[] = []) {
  const lines: string[] = []
  for (const { month, count, people } of plan) {
    const [y, m] = month.split('-').map(Number)
    let made = 0
    for (let day = 1; made < count && day <= 28; day++) {
      const weekday = new Date(y, m - 1, day).getDay()
      if (weekday === 0 || weekday === 6) continue
      for (let k = 0; k < 4 && made < count; k++, made++) {
        const [author, text] = people[made % people.length]
        lines.push(`${pad(day)}/${pad(m)}/${y} 10:${pad(k)} - ${author}: ${text}`)
      }
    }
  }
  return parseChat([...lines, ...extra].join('\n'))
}

const ANA: [string, string] = ['Ana', 'bom dia gente, tudo certo por aí com vocês?']
const BIA: [string, string] = ['Cami', 'kkkkk']
const CAIO: [string, string] = ['Caio', 'porra']
const DUDA: [string, string] = ['Duda', 'cheguei']
const BASE = [ANA, ANA, BIA, CAIO]

const chat = makeChat(
  [
    { month: '2024-01', count: 40, people: BASE },
    { month: '2024-02', count: 40, people: BASE },
    { month: '2024-03', count: 40, people: BASE },
    { month: '2024-04', count: 8, people: BASE },
    { month: '2024-05', count: 60, people: [...BASE, DUDA] },
    { month: '2024-06', count: 8, people: BASE },
  ],
  ['20/06/2024 23:00 - Lu: oi?'],
)
const { insights } = analyzeChat(chat)
const award = (id: string) => insights.awards.find((a) => a.id === id)
const highlight = (id: string) => insights.highlights.find((h) => h.id === id)?.text

describe('prêmios', () => {
  it('tagarela e fantasma', () => {
    expect(award('chatterbox')).toMatchObject({ winner: 'Ana', title: 'Tagarela' })
    expect(award('ghost')).toMatchObject({ winner: 'Lu', value: 1 })
  })

  it('prêmios por taxa vão pra quem tem o comportamento, não pra quem fala mais', () => {
    expect(award('clown')?.winner).toBe('Cami')
    expect(award('potty-mouth')?.winner).toBe('Caio')
    expect(award('potty-mouth')?.detail).toContain('praticamente toda mensagem')
  })

  it('cada prêmio diz o critério, e os proporcionais deixam isso claro no texto', () => {
    expect(award('chatterbox')?.basis).toBe('total')
    expect(award('novelist')?.basis).toBe('average')
    for (let seed = 0; seed < 20; seed++) {
      const awards = analyzeChat(chat, { textSeed: seed }).insights.awards.filter((a) => a.basis === 'rate')
      expect(awards.length).toBeGreaterThan(0)
      for (const a of awards) expect(a.detail).toMatch(/proporc|proporç|a cada|toda mensagem/)
    }
  })

  it('rankings por proporção usam o mesmo mínimo de atividade dos prêmios', () => {
    const { rankings } = analyzeChat(chat)
    expect(rankings.perHundred.minMessages).toBe(10)
    expect(rankings.perHundred.laughs.map((c) => c.name)).not.toContain('Lu')
    expect(rankings.perHundred.laughs[0]).toEqual({ name: 'Cami', count: 100 })
  })

  it('quem mandou pouca mensagem não disputa prêmio por taxa', () => {
    // Lu tem 1 mensagem, 100% sem resposta, mas não tem atividade suficiente
    expect(award('talking-alone')?.winner).not.toBe('Lu')
  })

  it('romancista e econômico', () => {
    expect(award('novelist')?.winner).toBe('Ana')
    expect(award('telegraph')?.winner).toBe('Caio')
  })

  it('não dá prêmio sem mérito mínimo', () => {
    expect(award('night-owl')).toBeUndefined()
    expect(award('organizer')).toBeUndefined()
    expect(award('regret')).toBeUndefined()
  })

  it('ninguém leva mais de 2 prêmios individuais', () => {
    const wins = new Map<string, number>()
    for (const a of insights.awards) if (a.id !== 'inseparable') wins.set(a.winner, (wins.get(a.winner) ?? 0) + 1)
    expect(Math.max(...wins.values())).toBeLessThanOrEqual(2)
  })

  it('dupla inseparável', () => {
    expect(award('inseparable')?.winner).toMatch(/ e /)
  })
})

describe('frases sobre tempo', () => {
  it('grupo comercial e fim de semana morto', () => {
    expect(highlight('office-hours')).toContain('99%') // só a mensagem da Lu, às 23h, fica de fora
    expect(highlight('weekend-drop')).toContain('100%')
    expect(highlight('dead-weekday')?.toLowerCase()).toContain('sábado')
    expect(highlight('prime-time')).toMatch(/10h.*11h/)
    expect(highlight('night-group')).toBeUndefined()
  })
})

describe('picos e quedas', () => {
  it('melhor e pior mês ignoram o primeiro e o último (meses pela metade)', () => {
    expect(highlight('best-month')?.toLowerCase()).toContain('mai/2024')
    expect(highlight('best-month')).toContain('60 mensagens')
    expect(highlight('worst-month')?.toLowerCase()).toContain('abr/2024')
    expect(highlight('worst-month')).toContain('8 mensagens')
  })

  it('detecta a queda brusca', () => {
    expect(highlight('drop')?.toLowerCase()).toContain('abr/2024')
    expect(highlight('drop')).toContain('80%')
  })

  it('liga a volta depois da queda à chegada de alguém novo', () => {
    expect(highlight('revival')).toMatch(/mai\/2024/)
    expect(highlight('revival')).toContain('650% mais mensagens que abr/2024')
    expect(highlight('revival')).toContain('Duda')
  })

  it('sem queda, usa o maior salto', () => {
    const growing = makeChat([
      { month: '2024-01', count: 20, people: BASE },
      { month: '2024-02', count: 20, people: BASE },
      { month: '2024-03', count: 20, people: BASE },
      { month: '2024-04', count: 60, people: BASE },
      { month: '2024-05', count: 60, people: BASE },
    ])
    expect(analyzeChat(growing).insights.highlights.find((h) => h.id === 'revival')?.text).toMatch(
      /abr\/2024.*200% mais mensagens que nos dois meses anteriores/,
    )
  })

  it('compara o último mês completo com a média', () => {
    expect(highlight('trend-up')).toContain('mai/2024')
  })
})

describe('casos pequenos', () => {
  it('conversa vazia ou de uma pessoa não gera prêmio', () => {
    expect(analyzeChat(parseChat('')).insights).toEqual({ awards: [], highlights: [] })
    const solo = analyzeChat(parseChat('01/01/2024 10:00 - Ana: oi'))
    expect(solo.insights.awards).toEqual([])
  })
})

describe('variação dos textos', () => {
  const texts = (seed: number) => {
    const { insights: i } = analyzeChat(chat, { textSeed: seed })
    return [...i.awards.map((a) => `${a.id}: ${a.detail}`), ...i.highlights.map((h) => `${h.id}: ${h.text}`)]
  }

  it('mesma semente, mesmos textos', () => {
    expect(texts(7)).toEqual(texts(7))
  })

  it('sementes diferentes trocam as frases, mas não os prêmios', () => {
    const variety = new Set(Array.from({ length: 20 }, (_, seed) => texts(seed).join('\n')))
    expect(variety.size).toBeGreaterThan(1)
    const winners = (seed: number) => analyzeChat(chat, { textSeed: seed }).insights.awards.map((a) => `${a.id}:${a.winner}`)
    expect(winners(3)).toEqual(winners(0))
  })

  it('toda versão de todo texto sai completa e com os fatos', () => {
    for (let seed = 0; seed < 40; seed++) {
      const all = texts(seed)
      for (const t of all) expect(t).not.toMatch(/undefined|NaN|\[object/)
      const revival = all.find((t) => t.startsWith('revival:'))!
      expect(revival).toContain('650%')
      expect(revival).toContain('Duda')
      expect(revival).toMatch(/mai\/2024/)
    }
  })
})
