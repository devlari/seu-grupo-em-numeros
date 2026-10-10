import type { ChatMessage, DateOrder, MessageKind, ParsedChat, Platform } from './types.ts'

const LRM = '‎'

// Data e hora comuns aos dois formatos: "20/10/2024 17:57", "3/7/25, 9:05 PM", "20.10.24, 17:57:03"
const DATE_TIME =
  String.raw`(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4}),?\s(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s?([ap])\.?\s?m\.?)?`

// Android: "20/10/2024 17:57 - Tati: Toma"
const ANDROID_HEADER = new RegExp(String.raw`^${DATE_TIME}\s[-–]\s(.*)$`, 'is')
// iOS: "[20/10/2024, 17:57:03] Tati: Toma"
const IOS_HEADER = new RegExp(String.raw`^\[${DATE_TIME}\]\s(.*)$`, 'is')

const EDITED_SUFFIX = /\s*<(mensagem editada|this message was edited)>$/i

const MEDIA_PATTERNS = [
  /^<(m[ií]dia oculta|media omitted|video note omitted|arquivo de m[ií]dia oculto)>$/i,
  /^<(anexado|attached): .*>$/i,
  /^(imagem|v[ií]deo|video|[aá]udio|figurinha|sticker|gif|image|documento|document|cart[aã]o de contato) (omitid[oa]|ocultad[oa]|omitted)$/i,
  /^null$/,
]
const DELETED_PATTERN =
  /^(mensagem apagada|esta mensagem foi apagada|voc[eê] apagou esta mensagem|this message was deleted|you deleted this message)$/i
const POLL_PATTERN = /^(enquete|poll):/i
const LOCATION_PATTERN = /^(localiza[cç][aã]o|location): https?:\/\//i
const CONTACT_PATTERN = /\.vcf \((arquivo anexado|file attached)\)$/i
const FILE_PATTERN = /\((arquivo anexado|file attached)\)$/i

/** Caracteres invisíveis que o WhatsApp espalha pelo export */
function normalizeSpaces(s: string): string {
  return s.replace(/[  ]/g, ' ').replace(/[‪-‮‏]/g, '')
}

function classify(text: string): MessageKind {
  if (MEDIA_PATTERNS.some((p) => p.test(text))) return 'media'
  if (DELETED_PATTERN.test(text)) return 'deleted'
  if (POLL_PATTERN.test(text)) return 'poll'
  if (LOCATION_PATTERN.test(text)) return 'location'
  if (CONTACT_PATTERN.test(text)) return 'contact'
  if (FILE_PATTERN.test(text)) return 'file'
  return 'text'
}

interface RawMessage {
  a: number
  b: number
  year: number
  hour: number
  minute: number
  second: number
  meridiem: string | undefined
  body: string
}

function matchHeader(line: string): { platform: Platform; match: RegExpMatchArray } | null {
  const clean = normalizeSpaces(line).replace(/^‎+/, '')
  const ios = clean.match(IOS_HEADER)
  if (ios) return { platform: 'ios', match: ios }
  const android = clean.match(ANDROID_HEADER)
  if (android) return { platform: 'android', match: android }
  return null
}

function detectDateOrder(raws: RawMessage[]): DateOrder {
  if (raws.some((r) => r.a > 12)) return 'DMY'
  if (raws.some((r) => r.b > 12)) return 'MDY'
  return 'DMY'
}

function toDate(raw: RawMessage, order: DateOrder): Date | null {
  const day = order === 'DMY' ? raw.a : raw.b
  const month = order === 'DMY' ? raw.b : raw.a
  const year = raw.year < 100 ? 2000 + raw.year : raw.year
  let hour = raw.hour
  if (raw.meridiem) {
    const pm = raw.meridiem.toLowerCase() === 'p'
    if (hour === 12) hour = pm ? 12 : 0
    else if (pm) hour += 12
  }
  const date = new Date(year, month - 1, day, hour, raw.minute, raw.second)
  // Rejeita datas que "transbordam" (ex.: 31/02 virando 03/03)
  if (date.getMonth() !== month - 1 || date.getDate() !== day || hour > 23) return null
  return date
}

/** Separa "Autor: texto" de mensagens de sistema */
function splitAuthor(body: string, platform: Platform): { author: string | null; text: string } {
  // Android marca mensagens de sistema com LRM logo no início
  if (platform === 'android' && body.startsWith(LRM)) return { author: null, text: body.slice(1) }

  const sep = body.indexOf(': ')
  if (sep <= 0 || sep > 80 || body.slice(0, sep).includes('\n')) return { author: null, text: body }

  const author = body.slice(0, sep).replace(/^‎+/, '').trim()
  let text = body.slice(sep + 2)

  // Anexos vêm com LRM no início do texto nas duas plataformas.
  // No iOS, mensagens de sistema também, atribuídas ao nome do grupo.
  if (text.startsWith(LRM)) {
    text = text.replace(/^‎+/, '')
    if (platform === 'ios' && classify(text) === 'text') return { author: null, text: `${author}: ${text}` }
  }
  return { author, text }
}

export function parseChat(content: string): ParsedChat {
  const lines = content.replace(/^﻿/, '').split(/\r?\n/)
  const warnings: string[] = []
  const raws: RawMessage[] = []
  const platformVotes = { android: 0, ios: 0 }
  let orphanLines = 0

  for (const line of lines) {
    const header = matchHeader(line)
    if (header) {
      const m = header.match
      platformVotes[header.platform]++
      raws.push({
        a: Number(m[1]),
        b: Number(m[2]),
        year: Number(m[3]),
        hour: Number(m[4]),
        minute: Number(m[5]),
        second: m[6] ? Number(m[6]) : 0,
        meridiem: m[7],
        // Mantém o LRM inicial do corpo: é ele que marca mensagens de sistema
        body: normalizeSpaces(m[8]),
      })
    } else if (raws.length > 0) {
      raws[raws.length - 1].body += '\n' + normalizeSpaces(line)
    } else if (line.trim() !== '') {
      orphanLines++
    }
  }

  if (orphanLines > 0) warnings.push(`${orphanLines} linha(s) antes da primeira mensagem foram ignoradas`)

  const platform: Platform = platformVotes.ios > platformVotes.android ? 'ios' : 'android'
  const dateOrder = detectDateOrder(raws)
  const messages: ChatMessage[] = []
  const participants = new Set<string>()
  let invalidDates = 0

  for (const raw of raws) {
    const timestamp = toDate(raw, dateOrder)
    if (!timestamp) {
      invalidDates++
      continue
    }

    const { author, text: rawText } = splitAuthor(raw.body, platform)
    const edited = EDITED_SUFFIX.test(rawText)
    const text = rawText.replace(EDITED_SUFFIX, '').trimEnd()
    const kind: MessageKind = author === null ? 'system' : classify(text)

    if (author !== null) participants.add(author)
    messages.push({ id: messages.length, timestamp, author, text, kind, edited })
  }

  if (invalidDates > 0) warnings.push(`${invalidDates} mensagem(ns) com data inválida foram ignoradas`)
  if (messages.length === 0) warnings.push('Nenhuma mensagem reconhecida. Esse arquivo é mesmo um export do WhatsApp?')

  return { messages, participants: [...participants], platform, dateOrder, warnings }
}
