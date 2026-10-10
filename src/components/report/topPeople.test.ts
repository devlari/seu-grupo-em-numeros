import { describe, expect, it } from 'vitest'
import { analyzeChat } from '../../lib/analysis/index.ts'
import { parseChat } from '../../lib/whatsapp/parseChat.ts'
import { topPeople } from './topPeople.ts'

// Pessoa N manda N mensagens, todas respondendo a anterior: quem tem número maior fala mais
const lines: string[] = []
for (let n = 1; n <= 6; n++) {
  for (let k = 0; k < n; k++) lines.push(`14/10/2024 10:${String(lines.length).padStart(2, '0')} - P${n}: oi`)
}
const result = analyzeChat(parseChat(lines.join('\n')))

describe('topPeople', () => {
  it('recorta tudo pras pessoas que mais falam', () => {
    const top = topPeople(result, 3)
    const names = ['P6', 'P5', 'P4']
    expect(top.hidden).toBe(3)
    expect(top.total).toBe(6)
    expect(top.messages.map((p) => p.name)).toEqual(names)
    expect(top.profile.people.map((p) => p.name).sort()).toEqual([...names].sort())
    expect(top.firstSeen.every((p) => names.includes(p.name))).toBe(true)
    expect(top.words.map(([name]) => name)).toEqual(names)
    expect(top.pairs.every((p) => names.includes(p.a) && names.includes(p.b))).toBe(true)
  })

  it('a matriz recortada mantém os números de cada par', () => {
    const top = topPeople(result, 3)
    const m = result.interactions.matrix
    expect([...top.matrix.people].sort()).toEqual(['P4', 'P5', 'P6'])
    top.matrix.people.forEach((a, i) => top.matrix.people.forEach((b, j) => {
      expect(top.matrix.counts[i][j]).toBe(m.counts[m.people.indexOf(a)][m.people.indexOf(b)])
    }))
  })

  it('com poucas pessoas não esconde ninguém', () => {
    const top = topPeople(result, 12)
    expect(top.hidden).toBe(0)
    expect(top.matrix).toEqual(result.interactions.matrix)
    expect(top.pairs).toEqual(result.interactions.topPairs)
  })
})

describe('topPeople: perfil de comunicação', () => {
  it('recortado, as medianas são de quem aparece no gráfico', () => {
    const top = topPeople(result, 3)
    // P4, P5 e P6 mandaram 4, 5 e 6 mensagens
    expect(top.profile.medianMessages).toBe(5)
  })
})
