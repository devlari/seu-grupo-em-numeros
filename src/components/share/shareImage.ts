import { toBlob } from 'html-to-image'

/** Gera o PNG do elemento no tamanho real dele (ignora a redução aplicada na tela) */
export async function renderPng(node: HTMLElement, width: number, height: number): Promise<Blob> {
  const blob = await toBlob(node, {
    width,
    height,
    pixelRatio: 1,
    cacheBust: true,
    // O card aparece reduzido com transform no pai; a imagem sai sem ele
    style: { transform: 'none', margin: '0' },
  })
  if (!blob) throw new Error('Não deu pra gerar a imagem')
  return blob
}

/**
 * No celular, abre o menu de compartilhar (WhatsApp, Instagram...).
 * Onde não dá pra compartilhar arquivo (computador), baixa o PNG.
 */
export async function shareOrDownload(blob: Blob, fileName: string, title: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], fileName, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return 'shared'
    } catch (err) {
      // Pessoa fechou o menu de compartilhar: não é erro
      if (err instanceof DOMException && err.name === 'AbortError') return 'shared'
      throw err
    }
  }
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  return 'downloaded'
}

/** Nome de arquivo sem acento nem símbolo ("Família Sucos!" -> "familia-sucos") */
export function fileSlug(text: string): string {
  // Tira os acentos antes ("mamão" -> "mamao"), senão o til vira hífen
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
}
