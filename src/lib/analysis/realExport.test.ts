import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseChat } from '../whatsapp/parseChat.ts'
import { analyzeChat } from './index.ts'

// Roda a análise inteira num export de verdade, que nunca entra no repositório.
// Uso: WHATSAPP_EXPORT=/caminho/da/conversa.txt npm test
// Sem a variável, o teste é pulado. Não imprime nada das mensagens.
const EXPORT_PATH = process.env.WHATSAPP_EXPORT ?? ''

describe.runIf(EXPORT_PATH !== '' && existsSync(EXPORT_PATH))('análise de export real (WHATSAPP_EXPORT)', () => {
  it('analisa rápido e gera um resultado coerente', () => {
    const chat = parseChat(readFileSync(EXPORT_PATH, 'utf-8'))
    const start = performance.now()
    const r = analyzeChat(chat, { trackedWords: ['festa', 'trabalho'] })
    const ms = performance.now() - start

    expect(ms).toBeLessThan(2000)
    expect(JSON.parse(JSON.stringify(r))).toEqual(r)

    // As contagens por pessoa somam o total
    const sum = r.overview.perPerson.reduce((s, p) => s + p.messages, 0)
    expect(sum).toBe(r.overview.totalMessages)
    expect(r.frequency.byHour.reduce((a, b) => a + b, 0)).toBe(r.overview.totalMessages)

    // Toda enquete sai com pergunta e opções
    expect(r.polls.list.every((p) => p.question !== '' && p.options.length >= 2)).toBe(true)

    // Nenhum texto de prêmio ou destaque com buraco
    const texts = [...r.insights.awards.map((a) => a.detail), ...r.insights.highlights.map((h) => h.text)]
    for (const t of texts) expect(t).not.toMatch(/undefined|NaN|\[object/)
  })
})
