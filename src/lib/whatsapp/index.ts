import type { AnalysisOptions, AnalysisResult } from '../analysis/types.ts'
import type { WorkerRequest, WorkerResponse } from './parser.worker.ts'
import type { ParsedChat } from './types.ts'

export { parseChat } from './parseChat.ts'
export { readExport } from './readExport.ts'
export type * from './types.ts'

type WorkerSuccess = Extract<WorkerResponse, { ok: true }>

/** Roda um pedido num worker novo. Abortar mata o worker na hora. */
function runWorker(request: WorkerRequest, signal?: AbortSignal): Promise<WorkerSuccess> {
  const worker = new Worker(new URL('./parser.worker.ts', import.meta.url), { type: 'module' })
  return new Promise<WorkerSuccess>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason)
    signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.ok) resolve(event.data)
      else reject(new Error(event.data.error))
    }
    worker.onerror = (event) => reject(new Error(event.message))
    worker.postMessage(request)
  }).finally(() => worker.terminate())
}

/** Lê e parseia o export num Web Worker, sem travar a interface */
export async function parseExportInWorker(file: Blob, signal?: AbortSignal): Promise<ParsedChat> {
  return (await runWorker({ file }, signal)).chat
}

/** Analisa uma conversa já lida num Web Worker */
export async function analyzeChatInWorker(
  chat: ParsedChat,
  options: AnalysisOptions,
  signal?: AbortSignal,
): Promise<AnalysisResult> {
  return (await runWorker({ chat, options }, signal)).analysis!
}
