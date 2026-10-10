import type { MessageKind } from '../whatsapp/types.ts'
import { countBy, type Prepared, top } from './prepare.ts'
import { toLocalDate, toLocalDateTime } from './text.ts'
import type { AnalysisOptions, Overview } from './types.ts'

const DAY_MS = 24 * 60 * 60 * 1000

// 'Tati criou o grupo "Clube do Livro"' / 'Tati created group "Book Club"'
const GROUP_CREATED = /criou (?:o|este) grupo(?: "(.*)")?|created (?:this )?group(?: "(.*)")?/i
// 'Tati mudou o nome do grupo de "Clube do Livro" para "Rolê de sexta"' / 'Tati changed the group name from "a" to "b"'
const NAME_CHANGE = [
  /mudou o nome (?:do grupo |deste grupo )?(?:de "(.*)" )?para "(.*)"/i,
  /changed (?:the group name|the subject|this group's name)(?: from "(.*)")? to "(.*)"/i,
]

export function overview({ messages, system, people }: Prepared, options: AnalysisOptions = {}): Overview {
  const byKind: Record<MessageKind, number> = {
    text: 0, media: 0, deleted: 0, poll: 0, contact: 0, file: 0, location: 0, system: system.length,
  }
  for (const m of messages) byKind[m.kind]++

  const perPersonCounts = countBy(messages, (m) => m.author)
  const perDay = countBy(messages, (m) => toLocalDate(m.at))
  const [busiest] = top(perDay, 1)

  const first = messages[0]?.at ?? null
  const last = messages.at(-1)?.at ?? null

  const createdMsg = system.find((m) => GROUP_CREATED.test(m.text))
  const nameChanges: Overview['group']['nameChanges'] = []
  for (const m of system) {
    for (const pattern of NAME_CHANGE) {
      const match = m.text.match(pattern)
      if (match) {
        nameChanges.push({ at: toLocalDateTime(m.timestamp), from: match[1] ?? null, to: match[2] })
        break
      }
    }
  }

  const createdMatch = createdMsg?.text.match(GROUP_CREATED)
  const createdName = createdMatch?.[1] ?? createdMatch?.[2] ?? null

  return {
    totalMessages: messages.length,
    firstMessageAt: first && toLocalDateTime(first),
    lastMessageAt: last && toLocalDateTime(last),
    spanDays: first && last ? Math.round((last.getTime() - first.getTime()) / DAY_MS) + 1 : 0,
    activeDays: perDay.size,
    byKind,
    perPerson: people.map((name) => {
      const count = perPersonCounts.get(name) ?? 0
      return { name, messages: count, share: messages.length ? count / messages.length : 0 }
    }),
    busiestDay: busiest ? { date: busiest.name, count: busiest.count } : null,
    group: {
      name: options.groupName?.trim() || nameChanges.at(-1)?.to || createdName || null,
      createdAt: createdMsg ? toLocalDateTime(createdMsg.timestamp) : null,
      nameChanges,
    },
  }
}
