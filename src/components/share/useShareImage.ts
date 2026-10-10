import { useState, type RefObject } from 'react'
import { SHARE_HEIGHT, SHARE_WIDTH } from './ShareCard.tsx'
import { renderPng, shareOrDownload } from './shareImage.ts'

export type ShareStatus = 'idle' | 'working' | 'done' | 'error'

/** Gera o PNG do card e abre o menu de compartilhar (ou baixa, no computador) */
export function useShareImage(card: RefObject<HTMLDivElement | null>) {
  const [status, setStatus] = useState<ShareStatus>('idle')

  async function share(fileName: string, title: string) {
    if (!card.current) return
    setStatus('working')
    try {
      const blob = await renderPng(card.current, SHARE_WIDTH, SHARE_HEIGHT)
      await shareOrDownload(blob, fileName, title)
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return { status, share }
}
