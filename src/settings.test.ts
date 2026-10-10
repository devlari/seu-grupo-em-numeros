import { describe, expect, it } from 'vitest'
import { groupNameFromFile } from './settings.ts'

describe('groupNameFromFile', () => {
  it('lê o nome padrão do Android e do iPhone', () => {
    expect(groupNameFromFile('Conversa do WhatsApp com Rolê de sexta.txt')).toBe('Rolê de sexta')
    expect(groupNameFromFile('WhatsApp Chat with Book Club.txt')).toBe('Book Club')
    expect(groupNameFromFile('WhatsApp Chat - Rolê de sexta.zip')).toBe('Rolê de sexta')
  })

  it('ignora o "(1)" de download repetido', () => {
    expect(groupNameFromFile('Conversa do WhatsApp com Família (2).txt')).toBe('Família')
  })

  it('arquivo renomeado não tem nome', () => {
    expect(groupNameFromFile('sucos.txt')).toBeNull()
    expect(groupNameFromFile('_chat.txt')).toBeNull()
  })
})
