import { describe, expect, it } from 'vitest'
import { parseChat } from '../whatsapp/parseChat.ts'
import { analyzeChat } from './index.ts'
import { parsePoll } from './polls.ts'

const L = '‎'

const CHAT = [
  '01/03/2025 10:00 - Tati: ENQUETE:',
  'Onde vai ser o rolê?',
  `OPÇÃO: Bar (${L}3 votos)`,
  `OPÇÃO: Casa da Cami (${L}1 voto)`,
  '02/03/2025 10:00 - Luana: ENQUETE:',
  'Sexta ou sábado?',
  `OPÇÃO: Sexta (${L}2 votos)`,
  `OPÇÃO: Sábado (${L}2 votos)`,
  '03/03/2025 10:00 - Tati: ENQUETE:',
  'Alguém lembra do aniversário?',
  `OPÇÃO: Sim (${L}0 voto)`,
  `OPÇÃO: Não (${L}0 voto)`,
  '04/03/2025 10:00 - Cami: oi',
].join('\n')

describe('parsePoll', () => {
  it('separa pergunta, opções e votos (com LRM antes do número)', () => {
    expect(parsePoll(`ENQUETE:\nOnde?\nOPÇÃO: Bar (${L}3 votos)\nOPÇÃO: Casa (${L}1 voto)`)).toEqual({
      question: 'Onde?',
      options: [{ text: 'Bar', votes: 3 }, { text: 'Casa', votes: 1 }],
    })
  })

  it('aceita o formato em inglês e opções com parênteses', () => {
    expect(parsePoll('POLL:\nWhere?\nOPTION: Bar (the cheap one) (2 votes)\nOPTION: Home (1 vote)').options).toEqual([
      { text: 'Bar (the cheap one)', votes: 2 },
      { text: 'Home', votes: 1 },
    ])
  })

  it('pergunta com várias linhas', () => {
    expect(parsePoll('ENQUETE:\nlinha 1\nlinha 2\nOPÇÃO: a (1 voto)').question).toBe('linha 1\nlinha 2')
  })
})

describe('seção de enquetes', () => {
  const { polls } = analyzeChat(parseChat(CHAT))

  it('lista as enquetes com vencedores', () => {
    expect(polls.total).toBe(3)
    expect(polls.list[0]).toMatchObject({ author: 'Tati', question: 'Onde vai ser o rolê?', totalVotes: 4, winners: ['Bar'] })
  })

  it('quem mais cria enquete', () => {
    expect(polls.creators).toEqual([
      { name: 'Tati', count: 2 },
      { name: 'Luana', count: 1 },
      { name: 'Cami', count: 0 },
    ])
  })

  it('mais votada, ignoradas, empates e média', () => {
    expect(polls.mostVoted?.question).toBe('Onde vai ser o rolê?')
    expect(polls.ignored.map((p) => p.question)).toEqual(['Alguém lembra do aniversário?'])
    expect(polls.ties.map((p) => p.winners)).toEqual([['Sexta', 'Sábado']])
    expect(polls.avgVotes).toBe(2.7)
  })

  it('respeita exclusões e apelidos', () => {
    const r = analyzeChat(parseChat(CHAT), { excludeAuthors: ['Tati'], aliases: { Luana: 'Lulu' } })
    expect(r.polls.total).toBe(1)
    expect(r.polls.list[0].author).toBe('Lulu')
  })
})
