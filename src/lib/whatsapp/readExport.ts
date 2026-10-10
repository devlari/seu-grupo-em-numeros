import { unzipSync } from 'fflate'

/**
 * Lê o arquivo enviado pelo usuário e devolve o texto da conversa.
 * Aceita o .txt direto ou o .zip que o WhatsApp gera ao exportar com mídia.
 */
export async function readExport(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b // "PK"

  if (!isZip) return decode(bytes)

  // Descompacta só os .txt, ignorando fotos e vídeos
  const entries = unzipSync(bytes, { filter: (f) => f.name.toLowerCase().endsWith('.txt') })
  const names = Object.keys(entries)
  if (names.length === 0) throw new Error('O .zip não tem nenhum arquivo .txt de conversa')

  // Android costuma usar "Conversa do WhatsApp com X.txt"; iOS usa "_chat.txt"
  const chatName = names.find((n) => /(^|\/)_chat\.txt$/i.test(n)) ??
    names.reduce((a, b) => (entries[a].length >= entries[b].length ? a : b))
  return decode(entries[chatName])
}

function decode(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes).replace(/^﻿/, '')
}
