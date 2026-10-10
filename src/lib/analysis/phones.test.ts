import { describe, expect, it } from 'vitest'
import { parseChat } from '../whatsapp/parseChat.ts'
import { analyzeChat } from './index.ts'
import { isPhoneNumber, phoneLabels } from './phones.ts'

describe('isPhoneNumber', () => {
  it.each(['+55 11 98765-4321', '+55 11 98765‑4321', '(11) 98765-4321', '+1 (555) 123-4567', '‪+55 21 99999-0000‬'])(
    '%s é número',
    (name) => expect(isPhoneNumber(name)).toBe(true),
  )
  it.each(['Tati', 'Zé B', 'Fofinho ♥️', '123', 'Ana 2', '+55'])('%s não é número', (name) => {
    expect(isPhoneNumber(name)).toBe(false)
  })
})

describe('phoneLabels', () => {
  it('esconde o número mostrando só o final', () => {
    expect(phoneLabels(['+55 11 98765-4321', 'Tati'])).toEqual(new Map([['+55 11 98765-4321', 'Contato •4321']]))
  })

  it('usa mais dígitos quando dois números terminam igual', () => {
    const labels = phoneLabels(['+55 11 98765-4321', '+55 21 91234-4321'])
    expect(labels.get('+55 11 98765-4321')).toBe('Contato •54321')
    expect(labels.get('+55 21 91234-4321')).toBe('Contato •44321')
  })
})

describe('números na análise', () => {
  const CHAT = [
    '01/03/2025 10:00 - Tati: oi gente',
    '01/03/2025 10:01 - +55 11 98765-4321: oi Tati kkkk',
    '01/03/2025 10:02 - +55 21 99999-0000: bom dia',
    '01/03/2025 10:03 - +55 11 98765-4321: ENQUETE:\nbora?\nOPÇÃO: sim (1 voto)\nOPÇÃO: não (0 voto)',
  ].join('\n')
  const chat = parseChat(CHAT)

  it('nenhum número aparece no resultado por padrão', () => {
    const json = JSON.stringify(analyzeChat(chat))
    expect(json).not.toContain('98765')
    expect(json).not.toContain('99999')
    expect(json).toContain('Contato •4321')
    expect(json).toContain('Contato •0000')
  })

  it('o nome dado pela pessoa vale mais que o rótulo', () => {
    const r = analyzeChat(chat, { aliases: { '+55 11 98765-4321': 'Cami' } })
    expect(r.overview.perPerson.map((p) => p.name)).toEqual(['Cami', 'Contato •0000', 'Tati'])
    expect(r.polls.list[0].author).toBe('Cami')
  })

  it('excluir pelo número continua funcionando', () => {
    const r = analyzeChat(chat, { excludeAuthors: ['+55 21 99999-0000'] })
    expect(r.overview.perPerson.map((p) => p.name)).toEqual(['Contato •4321', 'Tati'])
  })

  it('dá pra desligar', () => {
    const r = analyzeChat(chat, { maskPhoneNumbers: false })
    expect(r.overview.perPerson.map((p) => p.name)).toContain('+55 11 98765-4321')
  })
})
