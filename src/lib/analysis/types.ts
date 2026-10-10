import type { MessageKind } from '../whatsapp/types.ts'

export interface CustomRanking {
  label: string
  /** Termos contados como palavra inteira, sem diferenciar acentos e maiúsculas */
  terms: string[]
}

export interface AnalysisOptions {
  /** Pessoas que ficam fora da análise (nome original ou apelido final) */
  excludeAuthors?: string[]
  /** Junta nomes: { "Fofinho ♥️": "Bruna" } */
  aliases?: Record<string, string>
  /** Mostra contatos sem nome como "Contato •4321" em vez do número. Padrão: true */
  maskPhoneNumbers?: boolean
  /** Palavras acompanhadas ao longo do tempo (ex.: prova, festa, trabalho) */
  trackedWords?: string[]
  /** Rankings livres: a pessoa escolhe um nome e os termos contados */
  customRankings?: CustomRanking[]
  /** Só analisa mensagens dentro do período (datas inclusivas, "2025-01-31") */
  period?: { from?: LocalDate; to?: LocalDate }
  /** Substitui a lista padrão de palavrões */
  swearWords?: string[]
  /** Uma mensagem conta como resposta se vier até X minutos depois da anterior. Padrão: 5 */
  replyWindowMinutes?: number
  /** Silêncio maior que X minutos começa uma conversa nova. Padrão: 30 */
  conversationGapMinutes?: number
  /** Troca as versões dos textos de prêmios e destaques (os fatos continuam os mesmos). Padrão: 0 */
  textSeed?: number
  /** Nome do grupo nos títulos. Vazio = usa o nome lido das mensagens de sistema */
  groupName?: string
  /** Tamanho dos tops de palavras. Padrão: 10 */
  topWords?: number
}

/** Datas viram texto no horário local pra o resultado ser JSON puro */
export type LocalDateTime = string // "2024-10-20T17:57:00"
export type LocalDate = string // "2024-10-20"
export type Month = string // "2024-10"

export interface Counted {
  name: string
  count: number
}

export interface MonthCount {
  month: Month
  count: number
}

export interface Slot {
  /** 0 = segunda ... 6 = domingo */
  weekday: number
  hour: number
  count: number
}

export interface Overview {
  totalMessages: number
  firstMessageAt: LocalDateTime | null
  lastMessageAt: LocalDateTime | null
  /** Dias corridos entre a primeira e a última mensagem */
  spanDays: number
  /** Dias com pelo menos uma mensagem */
  activeDays: number
  byKind: Record<MessageKind, number>
  perPerson: { name: string; messages: number; share: number }[]
  busiestDay: { date: LocalDate; count: number } | null
  group: {
    /** O nome escolhido nas configurações, o da última troca de nome ou o da criação */
    name: string | null
    createdAt: LocalDateTime | null
    nameChanges: { at: LocalDateTime; from: string | null; to: string }[]
  }
}

export interface Frequency {
  /** 24 posições, 0h a 23h */
  byHour: number[]
  /** 7 posições, segunda a domingo */
  byWeekday: number[]
  /** [dia da semana][hora] */
  heatmap: number[][]
  busiestSlots: Slot[]
  /** Só horários com pelo menos 1 mensagem */
  quietestSlots: Slot[]
  /** Meses contínuos, inclusive os sem mensagem */
  byMonth: MonthCount[]
  /** Mensagens entre 0h e 5h59 por pessoa */
  nightOwls: Counted[]
}

export interface TrackedWord {
  word: string
  total: number
  byMonth: MonthCount[]
  topPeople: Counted[]
}

export interface Words {
  top: Counted[]
  perPerson: Record<string, Counted[]>
  tracked: TrackedWord[]
}

export interface Rankings {
  laughs: Counted[]
  swears: Counted[]
  custom: { label: string; ranking: Counted[] }[]
  media: Counted[]
  deleted: Counted[]
  edited: Counted[]
  /**
   * Os mesmos rankings em proporção: quantas a cada 100 mensagens da pessoa.
   * Só entra quem mandou pelo menos `minMessages` (a mesma regra dos prêmios).
   */
  perHundred: {
    laughs: Counted[]
    swears: Counted[]
    media: Counted[]
    minMessages: number
  }
  /** Perfil de comunicação: quantidade × tamanho médio, com as medianas pra traçar os quadrantes */
  profile: {
    people: { name: string; messages: number; avgChars: number }[]
    medianMessages: number
    medianAvgChars: number
  }
  longestMessage: { author: string; text: string; at: LocalDateTime; chars: number } | null
}

export interface Interactions {
  /** from = quem falou antes, to = quem respondeu */
  replies: { from: string; to: string; count: number }[]
  /** matrix[i][j] = quantas vezes people[j] respondeu people[i] */
  matrix: { people: string[]; counts: number[][]; normalized: number[][] }
  /** Somando os dois sentidos */
  topPairs: { a: string; b: string; count: number }[]
  /** Mês da primeira mensagem de cada pessoa */
  firstSeen: { name: string; month: Month }[]
}

export interface Conversations {
  total: number
  sizeBuckets: { label: string; count: number }[]
  largest: {
    start: LocalDateTime
    end: LocalDateTime
    messages: number
    durationMinutes: number
    participants: Counted[]
  } | null
  /** Quem manda a primeira mensagem de conversas em que alguém respondeu */
  starters: Counted[]
  /** Quem manda a última mensagem antes do silêncio ("mata-conversa") */
  enders: Counted[]
  /** Conversas em que só uma pessoa falou (ninguém respondeu) */
  monologues: Counted[]
}

export interface Poll {
  author: string
  at: LocalDateTime
  question: string
  options: { text: string; votes: number }[]
  totalVotes: number
  /** Opções com mais votos; mais de uma = empate; vazio = ninguém votou */
  winners: string[]
}

/** O export só traz o total de votos de cada opção, não quem votou */
export interface Polls {
  total: number
  list: Poll[]
  /** Quem mais cria enquete */
  creators: Counted[]
  mostVoted: Poll | null
  /** Enquetes sem nenhum voto */
  ignored: Poll[]
  ties: Poll[]
  /** Média de votos por enquete (enquetes de múltipla escolha deixam votar em mais de uma opção) */
  avgVotes: number
}

export interface Award {
  id: string
  emoji: string
  title: string
  winner: string
  /** O número que justifica o prêmio */
  value: number
  detail: string
  /** Critério: maior total, maior proporção (a cada X mensagens) ou maior média */
  basis: 'total' | 'rate' | 'average'
}

export type InsightTopic = 'overview' | 'time' | 'activity' | 'interactions' | 'polls'

export interface Insight {
  id: string
  topic: InsightTopic
  emoji: string
  text: string
}

export interface Insights {
  awards: Award[]
  highlights: Insight[]
}

export interface AnalysisResult {
  overview: Overview
  frequency: Frequency
  words: Words
  rankings: Rankings
  interactions: Interactions
  conversations: Conversations
  polls: Polls
  insights: Insights
}
