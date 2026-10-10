import { describe, expect, it } from 'vitest'
import { parseChat } from '../whatsapp/parseChat.ts'
import { analyzeChat } from './index.ts'
import { isLaugh, isOnlyLaughs } from './text.ts'

const L = '‎'

// 14/10/2024 é segunda-feira
const CHAT = [
  `11/02/2023 21:13 - ${L}Tati criou o grupo "Clube do Livro"`,
  `14/10/2024 09:00 - ${L}Tati mudou o nome do grupo de "Clube do Livro" para "Rolê de sexta"`,
  '14/10/2024 10:00 - Tati: gente bora no cinema',
  '14/10/2024 10:01 - Luana: KKKKKK porra bora',
  '14/10/2024 10:02 - Tati: kkkk ok mandei o link https://exemplo.com/kkkk',
  '14/10/2024 10:03 - Cami: <Mídia oculta>',
  '14/10/2024 10:30 - Luana: caralho que demora',
  '15/10/2024 02:00 - Tati: alguém acordado? cinema amanhã',
  '15/10/2024 02:01 - Tati: hahaha',
  '15/10/2024 23:00 - Fofinho: Mensagem apagada',
  '20/12/2024 12:00 - Luana: uma mensagem bem comprida sobre o cinema de ontem <Mensagem editada>',
  '20/12/2024 12:00 - Meta AI: oi, sou um robô',
].join('\n')

const result = analyzeChat(parseChat(CHAT), {
  excludeAuthors: ['Meta AI'],
  aliases: { Fofinho: 'Bruna' },
  trackedWords: ['cinema'],
  customRankings: [{ label: 'Bora', terms: ['bora'] }],
})

const byName = (list: { name: string; count: number }[]) => Object.fromEntries(list.map((c) => [c.name, c.count]))

describe('risadas', () => {
  it.each([
    'kkkk', 'KKKKKK', 'kkkjjj', 'kakaka', 'hahaha', 'hehe', 'rsrs', 'huehue', 'ksksks', 'kk',
    'dkskskskksk', 'ksgksgksg', 'kxkxkxkx', 'elekkkkkk', 'caraiokkkk', 'kmkkkk',
  ])('%s é risada', (t) => {
    expect(isLaugh(t)).toBe(true)
  })
  it.each(['ok', 'link', 'tiktok', 'k', 'casa', 'ha', 'aha', 'karaoke', 'karaokê', 'jungkook', 'ekko', 'kick', 'kicks', 'knock'])('%s não é risada', (t) => {
    expect(isLaugh(t)).toBe(false)
  })
  it('detecta mensagem que é só risada', () => {
    expect(isOnlyLaughs('KKKKK kkkk!!')).toBe(true)
    expect(isOnlyLaughs('kkkk que isso')).toBe(false)
  })
})

describe('analyzeChat', () => {
  it('aplica apelidos e exclusões', () => {
    expect(result.overview.perPerson.map((p) => p.name)).toEqual(['Tati', 'Luana', 'Bruna', 'Cami'])
    expect(result.overview.totalMessages).toBe(9)
  })

  it('conta por pessoa e por tipo', () => {
    const counts = Object.fromEntries(result.overview.perPerson.map((p) => [p.name, p.messages]))
    expect(counts).toEqual({ Tati: 4, Luana: 3, Cami: 1, Bruna: 1 })
    expect(result.overview.byKind).toMatchObject({ text: 7, media: 1, deleted: 1, system: 2 })
  })

  it('extrai a história do grupo das mensagens de sistema', () => {
    expect(result.overview.group.createdAt).toBe('2023-02-11T21:13:00')
    expect(result.overview.group.nameChanges).toEqual([
      { at: '2024-10-14T09:00:00', from: 'Clube do Livro', to: 'Rolê de sexta' },
    ])
  })

  it('nome do grupo: configuração > última troca de nome > nome da criação', () => {
    expect(result.overview.group.name).toBe('Rolê de sexta')
    const chat = parseChat(CHAT)
    expect(analyzeChat(chat, { groupName: '  Os cinéfilos ' }).overview.group.name).toBe('Os cinéfilos')
    const semTroca = parseChat(CHAT.split('\n').filter((l) => !l.includes('mudou o nome')).join('\n'))
    expect(analyzeChat(semTroca).overview.group.name).toBe('Clube do Livro')
    expect(analyzeChat(parseChat('14/10/2024 10:00 - Tati: oi')).overview.group.name).toBeNull()
  })

  it('período e dia mais movimentado ignoram mensagens de sistema', () => {
    expect(result.overview.firstMessageAt).toBe('2024-10-14T10:00:00')
    expect(result.overview.lastMessageAt).toBe('2024-12-20T12:00:00')
    expect(result.overview.busiestDay).toEqual({ date: '2024-10-14', count: 5 })
    expect(result.overview.activeDays).toBe(3)
  })

  it('frequência por hora, dia da semana e heatmap', () => {
    expect(result.frequency.byHour[10]).toBe(5)
    expect(result.frequency.byWeekday).toEqual([5, 3, 0, 0, 1, 0, 0]) // seg, ter, sex
    expect(result.frequency.heatmap[0][10]).toBe(5)
    expect(result.frequency.busiestSlots[0]).toEqual({ weekday: 0, hour: 10, count: 5 })
    expect(result.frequency.quietestSlots.every((s) => s.count > 0)).toBe(true)
  })

  it('preenche meses vazios', () => {
    expect(result.frequency.byMonth).toEqual([
      { month: '2024-10', count: 8 },
      { month: '2024-11', count: 0 },
      { month: '2024-12', count: 1 },
    ])
  })

  it('identifica os corujões', () => {
    expect(result.frequency.nightOwls[0]).toEqual({ name: 'Tati', count: 2 })
  })

  it('ranking de risadas não conta o k de "ok" nem de links', () => {
    expect(byName(result.rankings.laughs)).toEqual({ Tati: 2, Luana: 1, Cami: 0, Bruna: 0 })
  })

  it('palavrões e rankings livres incluem quem tem zero', () => {
    expect(byName(result.rankings.swears)).toEqual({ Luana: 2, Tati: 0, Cami: 0, Bruna: 0 })
    expect(result.rankings.custom[0].label).toBe('Bora')
    expect(byName(result.rankings.custom[0].ranking)).toMatchObject({ Tati: 1, Luana: 1 })
  })

  it('mídia, apagadas e editadas', () => {
    expect(byName(result.rankings.media).Cami).toBe(1)
    expect(byName(result.rankings.deleted).Bruna).toBe(1)
    expect(byName(result.rankings.edited).Luana).toBe(1)
  })

  it('mensagem mais longa desconta o link', () => {
    expect(result.rankings.longestMessage).toMatchObject({ author: 'Luana', at: '2024-12-20T12:00:00' })
  })

  it('tamanho médio ignora mensagens que são só risada', () => {
    const vic = result.rankings.profile.people.find((p) => p.name === 'Tati')!
    // "gente bora no cinema" (20), "kkkk ok mandei o link" (21), "alguém acordado? cinema amanhã" (30); "hahaha" fica de fora
    expect(vic.avgChars).toBeCloseTo((20 + 21 + 30) / 3, 2)
  })

  it('top palavras ignora stopwords, risadas e links', () => {
    const top = result.words.top.map((w) => w.name)
    expect(top[0]).toBe('cinema')
    expect(top).not.toContain('kkkk')
    expect(top).not.toContain('https')
    expect(top).not.toContain('que')
    expect(result.words.perPerson.Tati.map((w) => w.name)).toContain('cinema')
  })

  it('palavras acompanhadas ao longo do tempo', () => {
    const [cinema] = result.words.tracked
    expect(cinema.total).toBe(3)
    expect(cinema.byMonth.map((m) => m.count)).toEqual([2, 0, 1])
    expect(cinema.topPeople).toEqual([{ name: 'Tati', count: 2 }, { name: 'Luana', count: 1 }])
  })

  it('quem responde quem respeita a janela de 5 minutos', () => {
    const replies = Object.fromEntries(result.interactions.replies.map((r) => [`${r.from}->${r.to}`, r.count]))
    // 10:00 Tati -> 10:01 Luana -> 10:02 Tati -> 10:03 Cami; 10:30 Luana fica de fora (27 min)
    expect(replies).toEqual({ 'Tati->Luana': 1, 'Luana->Tati': 1, 'Tati->Cami': 1 })
    expect(result.interactions.topPairs[0]).toEqual({ a: 'Luana', b: 'Tati', count: 2 })
    const { people, normalized } = result.interactions.matrix
    expect(normalized[people.indexOf('Tati')][people.indexOf('Luana')]).toBe(0.5)
  })

  it('conversas separadas por mais de 30 minutos', () => {
    // [10:00-10:30], [02:00-02:01], [23:00], [20/12]
    expect(result.conversations.total).toBe(4)
    expect(result.conversations.largest).toMatchObject({ messages: 5, durationMinutes: 30 })
    expect(result.conversations.sizeBuckets.find((b) => b.label === '1-2')!.count).toBe(3)
  })

  it('resultado é JSON puro', () => {
    expect(JSON.parse(JSON.stringify(result))).toEqual(result)
  })
})

describe('analyzeChat: período', () => {
  const chat = parseChat(CHAT)

  it('filtra mensagens pelas datas, inclusive nas pontas', () => {
    const r = analyzeChat(chat, { period: { from: '2024-10-15', to: '2024-10-15' } })
    expect(r.overview.totalMessages).toBe(3)
    expect(r.overview.firstMessageAt).toBe('2024-10-15T02:00:00')
    expect(r.overview.lastMessageAt).toBe('2024-10-15T23:00:00')
  })

  it('aceita só início ou só fim', () => {
    expect(analyzeChat(chat, { period: { from: '2024-12-01' } }).overview.totalMessages).toBe(2)
    expect(analyzeChat(chat, { period: { to: '2024-10-14' } }).overview.totalMessages).toBe(5)
  })

  it('mantém a história do grupo fora do filtro', () => {
    const r = analyzeChat(chat, { period: { from: '2024-12-01' } })
    expect(r.overview.group.createdAt).toBe('2023-02-11T21:13:00')
  })

  it('pessoas sem mensagem no período somem da análise', () => {
    const r = analyzeChat(chat, { period: { from: '2024-12-01' } })
    expect(r.overview.perPerson.map((p) => p.name).sort()).toEqual(['Luana', 'Meta AI'])
  })
})

describe('analyzeChat: conversa vazia', () => {
  it('não quebra', () => {
    const empty = analyzeChat(parseChat(''))
    expect(empty.overview.totalMessages).toBe(0)
    expect(empty.overview.busiestDay).toBeNull()
    expect(empty.frequency.byMonth).toEqual([])
    expect(empty.conversations.largest).toBeNull()
    expect(empty.rankings.longestMessage).toBeNull()
  })
})
