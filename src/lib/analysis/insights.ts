import { rateMinMessages } from './prepare.ts'
import { AWARD_TEXTS, HIGHLIGHT_TEXTS, monthLabel, pickText } from './texts.ts'
import type { AnalysisResult, Award, Counted, Insight, InsightTopic, MonthCount } from './types.ts'

type Result = Omit<AnalysisResult, 'insights'>
type Write = <P>(variants: ((p: P) => string)[], params: P, key: string) => string

const MAX_AWARDS_PER_PERSON = 2

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)
const avg = (values: number[]) => (values.length ? sum(values) / values.length : 0)

/**
 * Prêmios e frases prontas, gerados por regras a partir dos números.
 * `seed` troca as versões dos textos sem mudar os fatos.
 */
export function insights(r: Result, seed = 0) {
  const write: Write = (variants, params, key) => pickText(variants, params, key, seed)
  return {
    awards: awards(r, write),
    highlights: [...overviewInsights(r, write), ...timeInsights(r, write), ...activityInsights(r, write), ...extraInsights(r, write)],
  }
}

// ---------------------------------------------------------------------------
// Prêmios
// ---------------------------------------------------------------------------

function awards(r: Result, write: Write): Award[] {
  const people = r.overview.perPerson
  if (people.length < 2) return []

  const messagesBy = new Map(people.map((p) => [p.name, p.messages]))
  // Mesmo mínimo de atividade dos rankings por proporção
  const minMessages = rateMinMessages(r.overview.totalMessages)
  const eligible = (name: string) => (messagesBy.get(name) ?? 0) >= minMessages

  // Ninguém leva mais que MAX_AWARDS_PER_PERSON: o prêmio passa pro próximo da fila
  const wins = new Map<string, number>()
  const available = (name: string) => (wins.get(name) ?? 0) < MAX_AWARDS_PER_PERSON

  /** Maior taxa por mensagem entre quem tem atividade suficiente */
  const byRate = (list: Counted[], minCount: number) =>
    list
      .filter(({ name, count }) => count >= minCount && eligible(name))
      .map(({ name, count }) => ({ name, count, rate: count / messagesBy.get(name)! }))
      .sort((a, b) => b.rate - a.rate)
      .find((c) => available(c.name)) ?? null
  const byCount = (list: Counted[], minCount: number) =>
    list.find((c) => c.count >= minCount && available(c.name)) ?? null

  // A ordem é a prioridade: com o limite por pessoa, os prêmios de cima escolhem primeiro.
  // Títulos sem flexão de gênero, porque valem pra qualquer pessoa.
  const list: Award[] = []
  const add = (award: Award | null) => {
    if (!award) return
    list.push(award)
    wins.set(award.winner, (wins.get(award.winner) ?? 0) + 1)
  }

  const top = people[0]
  add({
    id: 'chatterbox', basis: 'total', emoji: '🗣️', title: 'Tagarela', winner: top.name, value: top.messages,
    detail: write(AWARD_TEXTS.chatterbox, { messages: top.messages, share: top.share }, top.name),
  })

  const ghost = people.at(-1)!
  if (people.length >= 3 && ghost.share < 0.05 && available(ghost.name)) {
    add({
      id: 'ghost', basis: 'total', emoji: '👻', title: 'Fantasma', winner: ghost.name, value: ghost.messages,
      detail: write(AWARD_TEXTS.ghost, { messages: ghost.messages, days: r.overview.spanDays }, ghost.name),
    })
  }

  const clown = byRate(r.rankings.laughs, 5)
  add(clown && {
    id: 'clown', basis: 'rate', emoji: '🤡', title: 'Máquina de kkkk', winner: clown.name, value: clown.count,
    detail: write(AWARD_TEXTS.clown, clown, clown.name),
  })

  const potty = byRate(r.rankings.swears, 5)
  add(potty && {
    id: 'potty-mouth', basis: 'rate', emoji: '🤬', title: 'Boca suja', winner: potty.name, value: potty.count,
    detail: write(AWARD_TEXTS.pottyMouth, potty, potty.name),
  })

  const owl = byCount(r.frequency.nightOwls, 3)
  add(owl && {
    id: 'night-owl', basis: 'total', emoji: '🦉', title: 'Coruja', winner: owl.name, value: owl.count,
    detail: write(AWARD_TEXTS.nightOwl, owl, owl.name),
  })

  const organizer = byCount(r.polls.creators, 2)
  add(organizer && {
    id: 'organizer', basis: 'total', emoji: '📊', title: 'Urna eletrônica', winner: organizer.name, value: organizer.count,
    detail: write(AWARD_TEXTS.organizer, organizer, organizer.name),
  })

  const writers = r.rankings.profile.people
    .filter((p) => eligible(p.name) && p.avgChars > 0)
    .sort((a, b) => b.avgChars - a.avgChars)
  const longest = writers.find((p) => available(p.name))
  if (writers.length >= 2 && longest) {
    add({
      id: 'novelist', basis: 'average', emoji: '📜', title: 'Romancista', winner: longest.name, value: longest.avgChars,
      detail: write(AWARD_TEXTS.novelist, { avg: Math.round(longest.avgChars) }, longest.name),
    })
    const shortest = [...writers].reverse().find((p) => available(p.name) && p.name !== longest.name)
    if (writers.length >= 3 && shortest) {
      add({
        id: 'telegraph', basis: 'average', emoji: '✂️', title: 'Poucas palavras', winner: shortest.name, value: shortest.avgChars,
        detail: write(AWARD_TEXTS.telegraph, { avg: Math.round(shortest.avgChars) }, shortest.name),
      })
    }
  }

  const paparazzi = byRate(r.rankings.media, 5)
  add(paparazzi && {
    id: 'paparazzi', basis: 'rate', emoji: '📸', title: 'Paparazzi', winner: paparazzi.name, value: paparazzi.count,
    detail: write(AWARD_TEXTS.paparazzi, paparazzi, paparazzi.name),
  })

  const starter = byRate(r.conversations.starters, 3)
  add(starter && {
    id: 'starter', basis: 'rate', emoji: '💬', title: 'Puxa-assunto', winner: starter.name, value: starter.count,
    detail: write(AWARD_TEXTS.starter, starter, starter.name),
  })

  const ender = byRate(r.conversations.enders, 3)
  add(ender && {
    id: 'conversation-killer', basis: 'rate', emoji: '🔇', title: 'Mata-conversa', winner: ender.name, value: ender.count,
    detail: write(AWARD_TEXTS.conversationKiller, ender, ender.name),
  })

  const alone = byRate(r.conversations.monologues, 3)
  add(alone && {
    id: 'talking-alone', basis: 'rate', emoji: '🦗', title: 'No vácuo', winner: alone.name, value: alone.count,
    detail: write(AWARD_TEXTS.talkingAlone, alone, alone.name),
  })

  const regret = byCount(r.rankings.deleted, 2)
  add(regret && {
    id: 'regret', basis: 'total', emoji: '🫣', title: 'Apaga-mensagem', winner: regret.name, value: regret.count,
    detail: write(AWARD_TEXTS.regret, regret, regret.name),
  })

  const editor = byCount(r.rankings.edited, 3)
  add(editor && {
    id: 'editor', basis: 'total', emoji: '✏️', title: 'Corrige-tudo', winner: editor.name, value: editor.count,
    detail: write(AWARD_TEXTS.editor, editor, editor.name),
  })

  const pair = r.interactions.topPairs[0]
  if (pair && pair.count >= 10) {
    const winner = `${pair.a} e ${pair.b}`
    add({
      id: 'inseparable', basis: 'total', emoji: '👯', title: 'Dupla inseparável', winner, value: pair.count,
      detail: write(AWARD_TEXTS.inseparable, pair, winner),
    })
  }

  return list
}

// ---------------------------------------------------------------------------
// Destaques
// ---------------------------------------------------------------------------

const insight = (id: string, topic: InsightTopic, emoji: string, text: string): Insight => ({ id, topic, emoji, text })

function overviewInsights({ overview: o }: Result, write: Write): Insight[] {
  const out: Insight[] = []
  const { createdAt, nameChanges } = o.group
  const firstName = nameChanges[0]?.from
  if (createdAt && firstName) {
    const names = new Set([firstName, ...nameChanges.map((c) => c.to)]).size
    out.push(insight('origin', 'overview', '🏷️', write(HIGHLIGHT_TEXTS.originWithName, { createdAt, firstName, names }, createdAt)))
  } else if (createdAt) {
    out.push(insight('origin', 'overview', '🏷️', write(HIGHLIGHT_TEXTS.origin, { createdAt }, createdAt)))
  }
  if (o.busiestDay) {
    out.push(insight('busiest-day', 'overview', '🌪️', write(HIGHLIGHT_TEXTS.busiestDay, o.busiestDay, o.busiestDay.date)))
  }
  if (o.spanDays >= 30) {
    const params = { active: o.activeDays, span: o.spanDays }
    out.push(insight('active-days', 'overview', '📆', write(HIGHLIGHT_TEXTS.activeDays, params, 'active-days')))
  }
  return out
}

function timeInsights({ frequency: f, overview: o }: Result, write: Write): Insight[] {
  const total = o.totalMessages
  if (total < 50) return []
  const out: Insight[] = []

  // Segunda a sexta, das 9h às 18h
  const workHours = sum(f.heatmap.slice(0, 5).flatMap((hours) => hours.slice(9, 18)))
  if (workHours / total >= 0.55) {
    out.push(insight('office-hours', 'time', '💼', write(HIGHLIGHT_TEXTS.officeHours, { share: workHours / total }, 'office-hours')))
  }

  const weekdayAvg = avg(f.byWeekday.slice(0, 5))
  const weekendAvg = avg(f.byWeekday.slice(5))
  if (weekdayAvg > 0) {
    const ratio = weekendAvg / weekdayAvg
    if (ratio < 0.6) {
      out.push(insight('weekend-drop', 'time', '📉', write(HIGHLIGHT_TEXTS.weekendDrop, { drop: 1 - ratio }, 'weekend')))
    } else if (ratio > 1.2) {
      out.push(insight('weekend-group', 'time', '🎉', write(HIGHLIGHT_TEXTS.weekendGroup, { gain: ratio - 1 }, 'weekend')))
    }
  }

  const busiest = f.byWeekday.indexOf(Math.max(...f.byWeekday))
  const dead = f.byWeekday.indexOf(Math.min(...f.byWeekday))
  out.push(insight('busiest-weekday', 'time', '🔥',
    write(HIGHLIGHT_TEXTS.busiestWeekday, { day: busiest, share: f.byWeekday[busiest] / total }, `busiest-${busiest}`)))
  out.push(insight('dead-weekday', 'time', '💀',
    write(HIGHLIGHT_TEXTS.deadWeekday, { day: dead, share: f.byWeekday[dead] / total }, `dead-${dead}`)))

  const hour = f.byHour.indexOf(Math.max(...f.byHour))
  out.push(insight('prime-time', 'time', '⏰', write(HIGHLIGHT_TEXTS.primeTime, { hour }, `hour-${hour}`)))

  const night = sum(f.byHour.slice(0, 6))
  if (night / total >= 0.05) {
    out.push(insight('night-group', 'time', '🌙', write(HIGHLIGHT_TEXTS.nightGroup, { share: night / total }, 'night')))
  }
  return out
}

/** Picos e quedas mês a mês, cruzando com a chegada de gente nova */
function activityInsights({ frequency: f, interactions: i }: Result, write: Write): Insight[] {
  const months = f.byMonth
  if (months.length < 4) return []
  const out: Insight[] = []

  // O primeiro e o último mês costumam estar pela metade (grupo criado / export feito no meio do mês)
  const full = months.slice(1, -1)
  const best = full.reduce((a, b) => (b.count > a.count ? b : a))
  const worst = full.reduce((a, b) => (b.count < a.count ? b : a))
  out.push(insight('best-month', 'activity', '🚀', write(HIGHLIGHT_TEXTS.bestMonth, best, best.month)))
  if (worst.month !== best.month) {
    out.push(insight('worst-month', 'activity', '🧊', write(HIGHLIGHT_TEXTS.worstMonth, worst, worst.month)))
  }

  const arrivals = new Map<string, string[]>()
  for (const { name, month } of i.firstSeen.slice(1)) arrivals.set(month, [...(arrivals.get(month) ?? []), name])

  const drop = biggestDrop(months)
  if (drop) out.push(insight('drop', 'activity', '📉', write(HIGHLIGHT_TEXTS.drop, drop, drop.month)))

  // Ressurgimento: de preferência a volta depois da maior queda; senão, o maior salto
  const revival = (drop && recoveryAfter(months, drop.month)) ?? biggestRevival(months)
  if (revival) {
    const newcomers = revival.months.flatMap((m) => arrivals.get(m) ?? [])
    const text = newcomers.length
      ? write(HIGHLIGHT_TEXTS.revivalWithNewcomers, { ...revival, newcomers }, revival.month)
      : write(HIGHLIGHT_TEXTS.revival, revival, revival.month)
    out.push(insight('revival', 'activity', '📈', text))
  }

  // Último mês completo comparado com a média
  const lastFull = months.at(-2)!
  const average = avg(full.map((m) => m.count))
  if (average > 0) {
    const ratio = lastFull.count / average
    if (ratio < 0.7) {
      out.push(insight('trend-down', 'activity', '⚠️', write(HIGHLIGHT_TEXTS.trendDown, { month: lastFull.month, change: 1 - ratio }, lastFull.month)))
    } else if (ratio > 1.3) {
      out.push(insight('trend-up', 'activity', '✨', write(HIGHLIGHT_TEXTS.trendUp, { month: lastFull.month, change: ratio - 1 }, lastFull.month)))
    }
  }
  return out
}

function biggestDrop(months: MonthCount[]) {
  let best: { month: string; change: number } | null = null
  for (let k = 3; k < months.length - 1; k++) {
    const before = avg(months.slice(k - 3, k).map((m) => m.count))
    if (before < 20) continue
    const change = 1 - months[k].count / before
    if (change >= 0.5 && (!best || change > best.change)) best = { month: months[k].month, change }
  }
  return best
}

interface Revival {
  month: string
  change: number
  comparedTo: string
  /** Meses em que a chegada de alguém explicaria a volta */
  months: string[]
}

/** Primeiro mês depois da queda que pelo menos dobra o fundo do poço */
function recoveryAfter(months: MonthCount[], dropMonth: string): Revival | null {
  const start = months.findIndex((m) => m.month === dropMonth)
  let bottom = start
  for (let k = start + 1; k < months.length - 1; k++) {
    if (months[k].count < months[bottom].count) bottom = k
    else if (months[bottom].count > 0 && months[k].count >= months[bottom].count * 2 && months[k].count >= 20) {
      return {
        month: months[k].month,
        change: months[k].count / months[bottom].count - 1,
        comparedTo: monthLabel(months[bottom].month),
        months: months.slice(start, k + 1).map((m) => m.month),
      }
    }
  }
  return null
}

function biggestRevival(months: MonthCount[]): Revival | null {
  let best: Revival | null = null
  for (let k = 2; k < months.length - 1; k++) {
    const before = avg(months.slice(k - 2, k).map((m) => m.count))
    if (before === 0) continue
    const change = months[k].count / before - 1
    if (change >= 0.8 && months[k].count >= 20 && (!best || change > best.change)) {
      best = {
        month: months[k].month,
        change,
        comparedTo: 'nos dois meses anteriores',
        months: [previousMonth(months[k].month), months[k].month],
      }
    }
  }
  return best
}

function extraInsights({ conversations: c, polls: p }: Result, write: Write): Insight[] {
  const out: Insight[] = []
  if (c.largest && c.largest.messages >= 20) {
    const h = Math.floor(c.largest.durationMinutes / 60)
    const m = c.largest.durationMinutes % 60
    const duration = h ? `${h}h${m ? String(m).padStart(2, '0') : ''}` : `${m} min`
    const params = { messages: c.largest.messages, duration, date: c.largest.start }
    out.push(insight('longest-conversation', 'interactions', '🗯️', write(HIGHLIGHT_TEXTS.longestConversation, params, c.largest.start)))
  }
  if (p.mostVoted) {
    const params = { question: p.mostVoted.question.split('\n')[0], votes: p.mostVoted.totalVotes }
    out.push(insight('most-voted-poll', 'polls', '🗳️', write(HIGHLIGHT_TEXTS.mostVotedPoll, params, p.mostVoted.at)))
  }
  if (p.ignored.length > 0) {
    out.push(insight('ignored-polls', 'polls', '🦗', write(HIGHLIGHT_TEXTS.ignoredPolls, { count: p.ignored.length }, 'ignored-polls')))
  }
  return out
}

function previousMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}
