import { analyzeChat } from '../analysis/index.ts'
import type { AnalysisOptions, AnalysisResult } from '../analysis/types.ts'
import { parseChat } from './parseChat.ts'
import { readExport } from './readExport.ts'
import type { ParsedChat } from './types.ts'

export type WorkerRequest =
  /** Lê o arquivo; com opções, já analisa também */
  | { file: Blob; options?: AnalysisOptions }
  /** Reanalisa uma conversa já lida, ex.: quando a pessoa muda as configurações */
  | { chat: ParsedChat; options: AnalysisOptions }

export type WorkerResponse =
  | { ok: true; chat: ParsedChat; analysis: AnalysisResult | null }
  | { ok: false; error: string }

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  let response: WorkerResponse
  try {
    const request = event.data
    const chat = 'file' in request ? parseChat(await readExport(request.file)) : request.chat
    response = { ok: true, chat, analysis: request.options ? analyzeChat(chat, request.options) : null }
  } catch (err) {
    response = { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
  self.postMessage(response)
}
