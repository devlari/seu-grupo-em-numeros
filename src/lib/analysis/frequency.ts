import { countBy, type Prepared, rank } from './prepare.ts'
import { monthRange, toMonth, weekdayMondayFirst } from './text.ts'
import type { Frequency, MonthCount, Slot } from './types.ts'

const NIGHT_END_HOUR = 6

export function frequency({ messages, people }: Prepared): Frequency {
  const byHour = Array<number>(24).fill(0)
  const byWeekday = Array<number>(7).fill(0)
  const heatmap = Array.from({ length: 7 }, () => Array<number>(24).fill(0))

  for (const { at } of messages) {
    const hour = at.getHours()
    const weekday = weekdayMondayFirst(at)
    byHour[hour]++
    byWeekday[weekday]++
    heatmap[weekday][hour]++
  }

  const slots: Slot[] = heatmap.flatMap((hours, weekday) => hours.map((count, hour) => ({ weekday, hour, count })))
  const busiestSlots = [...slots].sort((a, b) => b.count - a.count).slice(0, 5)
  const quietestSlots = slots.filter((s) => s.count > 0).sort((a, b) => a.count - b.count).slice(0, 5)

  const nightOwls = rank(people, countBy(messages, (m) => (m.at.getHours() < NIGHT_END_HOUR ? m.author : null)))

  return { byHour, byWeekday, heatmap, busiestSlots, quietestSlots, byMonth: monthly(messages), nightOwls }
}

/** Contagem por mês preenchendo os meses vazios com zero, do primeiro ao último da conversa toda */
export function monthly(items: { at: Date }[], range?: { from: Date; to: Date }): MonthCount[] {
  const from = range?.from ?? items[0]?.at
  const to = range?.to ?? items.at(-1)?.at
  if (!from || !to) return []
  const counts = countBy(items, (m) => toMonth(m.at))
  return monthRange(from, to).map((month) => ({ month, count: counts.get(month) ?? 0 }))
}
