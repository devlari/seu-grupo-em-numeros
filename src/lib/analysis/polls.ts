import { countBy, type Prepared, rank } from './prepare.ts'
import { toLocalDateTime } from './text.ts'
import type { Poll, Polls } from './types.ts'

// "OPÇÃO: Sexta de noite (‎3 votos)" / "OPTION: Friday night (3 votes)". O WhatsApp põe um LRM antes do número.
const OPTION_LINE = /^(?:op[cç][aã]o|option):\s*(.*?)\s*\(‎?(\d+)\s*vot(?:os?|es?)\)\s*$/i
const HEADER = /^(?:enquete|poll):\s*/i

/** Separa pergunta, opções e votos do texto de uma mensagem de enquete */
export function parsePoll(text: string): { question: string; options: { text: string; votes: number }[] } {
  const lines = text.replace(HEADER, '').split('\n')
  const question: string[] = []
  const options: { text: string; votes: number }[] = []
  for (const line of lines) {
    const match = line.match(OPTION_LINE)
    if (match) options.push({ text: match[1], votes: Number(match[2]) })
    else if (options.length === 0 && line.trim()) question.push(line.trim())
  }
  return { question: question.join('\n'), options }
}

export function polls({ messages, people }: Prepared): Polls {
  const list: Poll[] = messages
    .filter((m) => m.kind === 'poll')
    .map((m) => {
      const { question, options } = parsePoll(m.text)
      const totalVotes = options.reduce((sum, o) => sum + o.votes, 0)
      const max = Math.max(0, ...options.map((o) => o.votes))
      const winners = max > 0 ? options.filter((o) => o.votes === max).map((o) => o.text) : []
      return { author: m.author, at: toLocalDateTime(m.at), question, options, totalVotes, winners }
    })

  const byVotes = [...list].sort((a, b) => b.totalVotes - a.totalVotes)

  return {
    total: list.length,
    list,
    creators: rank(people, countBy(list, (p) => p.author)),
    mostVoted: byVotes[0] && byVotes[0].totalVotes > 0 ? byVotes[0] : null,
    ignored: list.filter((p) => p.totalVotes === 0),
    ties: list.filter((p) => p.winners.length > 1),
    avgVotes: list.length ? Math.round((list.reduce((s, p) => s + p.totalVotes, 0) / list.length) * 10) / 10 : 0,
  }
}
