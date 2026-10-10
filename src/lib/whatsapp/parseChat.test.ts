import { describe, expect, it } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { parseChat } from './parseChat.ts'
import { readExport } from './readExport.ts'

const L = '‎'

const ANDROID_PT = [
  '20/10/2024 17:58 - As mensagens e ligações são protegidas com a criptografia de ponta a ponta.',
  `20/10/2024 17:55 - ${L}Tati adicionou você`,
  `20/10/2024 17:56 - ${L}Tati mudou o nome do grupo de "Clube do Livro" para "Suco: de mamão"`,
  '20/10/2024 17:57 - Tati: Toma',
  '20/10/2024 18:05 - Luana: KKKKKKKKK',
  '20/10/2024 18:06 - Luana: primeira linha',
  'segunda linha',
  '',
  'quarta linha',
  '21/10/2024 09:00 - Tati: <Mídia oculta>',
  '21/10/2024 09:01 - Camila: Mensagem apagada',
  '21/10/2024 09:02 - Luana: corrigi aqui <Mensagem editada>',
  '21/10/2024 09:03 - Tati: ENQUETE:',
  'Vamos onde?',
  'OPÇÃO: Bar (2 votos)',
  'OPÇÃO: Casa (1 voto)',
  `21/10/2024 09:04 - Dani: ${L}Contato.vcf (arquivo anexado)`,
  '21/10/2024 09:05 - Dani: localização: https://maps.google.com/?q=1,2',
].join('\n')

const IOS_PT = [
  `${L}[20/10/2024, 17:55:03] Rolê de sexta: ${L}Tati criou este grupo`,
  '[20/10/2024, 17:57:10] Tati: Toma',
  `[20/10/2024, 17:58:00] Luana: ${L}imagem ocultada`,
  `[20/10/2024, 17:59:00] Luana: ${L}<anexado: 00000012-PHOTO-2024-10-20.jpg>`,
  '[20/10/2024, 18:00:00] Camila: oi',
  'tudo bem?',
].join('\n')

const ANDROID_EN = [
  '3/7/25, 9:05 PM - Tati: evening',
  '3/7/25, 12:10 AM - Tati: midnight',
  '3/13/25, 12:30 PM - Luana: noon <This message was edited>',
  '3/13/25, 1:00 PM - Luana: <Media omitted>',
].join('\n')

describe('parseChat: Android pt-BR', () => {
  const chat = parseChat(ANDROID_PT)

  it('detecta formato', () => {
    expect(chat.platform).toBe('android')
    expect(chat.dateOrder).toBe('DMY')
  })

  it('separa mensagens de sistema (inclusive com ": " no texto)', () => {
    const system = chat.messages.filter((m) => m.kind === 'system')
    expect(system).toHaveLength(3)
    expect(system.every((m) => m.author === null)).toBe(true)
  })

  it('lista participantes só de mensagens de gente', () => {
    expect(chat.participants).toEqual(['Tati', 'Luana', 'Camila', 'Dani'])
  })

  it('junta mensagens de várias linhas', () => {
    const m = chat.messages.find((m) => m.text.startsWith('primeira'))!
    expect(m.text).toBe('primeira linha\nsegunda linha\n\nquarta linha')
  })

  it('classifica tipos especiais', () => {
    const kinds = Object.fromEntries(chat.messages.filter((m) => m.author).map((m) => [m.text.split('\n')[0], m.kind]))
    expect(kinds['<Mídia oculta>']).toBe('media')
    expect(kinds['Mensagem apagada']).toBe('deleted')
    expect(kinds['ENQUETE:']).toBe('poll')
    expect(kinds['Contato.vcf (arquivo anexado)']).toBe('contact')
    expect(kinds['localização: https://maps.google.com/?q=1,2']).toBe('location')
    expect(kinds['Toma']).toBe('text')
  })

  it('remove a marcação de editada', () => {
    const m = chat.messages.find((m) => m.text.startsWith('corrigi'))!
    expect(m.text).toBe('corrigi aqui')
    expect(m.edited).toBe(true)
  })

  it('monta datas locais corretas', () => {
    const m = chat.messages.find((m) => m.text === 'Toma')!
    expect(m.timestamp).toEqual(new Date(2024, 9, 20, 17, 57, 0))
  })
})

describe('parseChat: iOS pt-BR', () => {
  const chat = parseChat(IOS_PT)

  it('detecta formato e segundos', () => {
    expect(chat.platform).toBe('ios')
    expect(chat.messages.find((m) => m.text === 'Toma')!.timestamp).toEqual(new Date(2024, 9, 20, 17, 57, 10))
  })

  it('trata mensagem de sistema atribuída ao nome do grupo', () => {
    expect(chat.messages[0].kind).toBe('system')
    expect(chat.participants).not.toContain('Rolê de sexta')
  })

  it('reconhece mídias com LRM', () => {
    const media = chat.messages.filter((m) => m.kind === 'media')
    expect(media).toHaveLength(2)
    expect(media.every((m) => m.author === 'Luana')).toBe(true)
  })

  it('junta várias linhas', () => {
    expect(chat.messages.at(-1)!.text).toBe('oi\ntudo bem?')
  })
})

describe('parseChat: Android en-US (12h, mm/dd)', () => {
  const chat = parseChat(ANDROID_EN)

  it('detecta MDY e converte AM/PM', () => {
    expect(chat.dateOrder).toBe('MDY')
    const [evening, midnight, noon] = chat.messages
    expect(evening.timestamp).toEqual(new Date(2025, 2, 7, 21, 5))
    expect(midnight.timestamp).toEqual(new Date(2025, 2, 7, 0, 10))
    expect(noon.timestamp).toEqual(new Date(2025, 2, 13, 12, 30))
    expect(noon.edited).toBe(true)
    expect(chat.messages[3].kind).toBe('media')
  })
})

describe('parseChat: entradas ruins', () => {
  it('avisa quando nada é reconhecido', () => {
    const chat = parseChat('isso não é um export\nde jeito nenhum')
    expect(chat.messages).toHaveLength(0)
    expect(chat.warnings.length).toBeGreaterThan(0)
  })
})

describe('readExport', () => {
  it('lê .txt com BOM', async () => {
    const text = await readExport(new Blob(['﻿20/10/2024 17:57 - Tati: Toma']))
    expect(text).toBe('20/10/2024 17:57 - Tati: Toma')
  })

  it('extrai o _chat.txt de um .zip ignorando mídias', async () => {
    const zip = zipSync({
      '_chat.txt': strToU8(IOS_PT),
      '00000012-PHOTO.jpg': new Uint8Array([1, 2, 3]),
    })
    const text = await readExport(new Blob([zip]))
    expect(parseChat(text).messages).toHaveLength(5)
  })
})
