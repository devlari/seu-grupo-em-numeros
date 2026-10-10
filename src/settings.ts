import type { AnalysisOptions } from './lib/analysis/index.ts'
import type { ParsedChat } from './lib/whatsapp/index.ts'

// Robôs que o WhatsApp coloca no grupo e que não fazem sentido no ranking
const BOTS = [/^meta ai$/i]

export function defaultOptions(chat: ParsedChat, fileName = ''): AnalysisOptions {
  return {
    groupName: groupNameFromFile(fileName) ?? undefined,
    excludeAuthors: chat.participants.filter((p) => BOTS.some((bot) => bot.test(p))),
    aliases: {},
    trackedWords: [],
    customRankings: [],
  }
}

/** "festa, prova,  trabalho," -> ["festa", "prova", "trabalho"] */
export function parseTerms(text: string): string[] {
  return [...new Set(text.split(/[,\n]/).map((t) => t.trim()).filter(Boolean))]
}

// Android: "Conversa do WhatsApp com Rolê de sexta.txt" / "WhatsApp Chat with Book Club.txt"
// iPhone: "WhatsApp Chat - Rolê de sexta.zip"
const EXPORT_FILE_NAME = /^(?:conversa do whatsapp|whatsapp chat)\s*(?:com|with|-)\s+(.+)$/i

/** Tira o nome do grupo do nome do arquivo do export, se o WhatsApp tiver dado o nome padrão */
export function groupNameFromFile(fileName: string): string | null {
  const base = fileName
    .replace(/\.(txt|zip)$/i, '')
    .replace(/\s*\(\d+\)$/, '') // "(1)" que o navegador põe em download repetido
    .trim()
  return base.match(EXPORT_FILE_NAME)?.[1].trim() || null
}
