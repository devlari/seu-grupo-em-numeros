import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseChat } from './parseChat.ts'

// Confere o parser num export de verdade, que nunca entra no repositório.
// Uso: WHATSAPP_EXPORT=/caminho/da/conversa.txt npm test
// Sem a variável, o teste é pulado. Não imprime nada das mensagens.
const EXPORT_PATH = process.env.WHATSAPP_EXPORT ?? ''

describe.runIf(EXPORT_PATH !== '' && existsSync(EXPORT_PATH))('export real (WHATSAPP_EXPORT)', () => {
  it('reconhece o export sem avisos', () => {
    const content = readFileSync(EXPORT_PATH, 'utf-8')
    const chat = parseChat(content)

    // Cada linha que começa com data e hora tem que virar uma mensagem
    const headerLines = content
      .split(/\r?\n/)
      .filter((l) => /^‎?\[?\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4},?\s\d{1,2}:\d{2}/.test(l)).length

    expect(chat.warnings).toEqual([])
    expect(chat.messages.length).toBe(headerLines)
    expect(chat.participants.length).toBeGreaterThan(0)
    expect(chat.messages.every((m) => !Number.isNaN(m.timestamp.getTime()))).toBe(true)
  })
})
