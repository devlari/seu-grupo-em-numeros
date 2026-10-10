export type MessageKind =
  | 'text'
  | 'media'
  | 'deleted'
  | 'poll'
  | 'contact'
  | 'file'
  | 'location'
  | 'system'

export interface ChatMessage {
  id: number
  timestamp: Date
  /** null para mensagens de sistema ("Fulano adicionou Ciclano") */
  author: string | null
  text: string
  kind: MessageKind
  edited: boolean
}

export type Platform = 'android' | 'ios'
export type DateOrder = 'DMY' | 'MDY'

export interface ParsedChat {
  messages: ChatMessage[]
  /** Autores de mensagens que não são de sistema, por ordem de aparição */
  participants: string[]
  platform: Platform
  dateOrder: DateOrder
  warnings: string[]
}
