import { useEffect, useRef } from 'react'
import type { AnalysisResult } from '../../lib/analysis/index.ts'
import { SectionCard, type SectionKind } from './SectionCard.tsx'
import { SharePreview } from './SharePreview.tsx'
import { useShareImage } from './useShareImage.ts'
import { fileSlug } from './shareImage.ts'

interface Props {
  kind: SectionKind
  /** Número, título e id da seção no relatório */
  section: { n: string; title: string; id: string }
  result: AnalysisResult
  onClose: () => void
}

/** Prévia da imagem de uma seção, com o botão de compartilhar. Aparece por cima do relatório. */
export function SectionShareDialog({ kind, section, result, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const { status, share } = useShareImage(card)
  const group = result.overview.group.name ?? 'grupo'

  // showModal prende o foco no diálogo e fecha com Esc
  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  return (
    <dialog
      ref={dialog}
      className="share-dialog"
      aria-label={`Imagem da seção ${section.title}`}
      onClose={onClose}
      // Clique fora do conteúdo (no fundo escuro) fecha
      onClick={(e) => e.target === dialog.current && dialog.current.close()}
    >
      <SharePreview>
        <SectionCard ref={card} kind={kind} n={section.n} title={section.title} result={result} />
      </SharePreview>
      <div className="share-actions">
        <button
          className="btn bg-lime"
          onClick={() => share(`${fileSlug(group) || 'grupo'}-${section.id}.png`, `${group}: ${section.title}`)}
          disabled={status === 'working'}
        >
          {status === 'working' ? 'Gerando…' : '📲 Compartilhar imagem'}
        </button>
        <button className="btn small ghost" onClick={() => dialog.current?.close()}>Fechar</button>
        {status === 'done' && <p className="share-msg mono">Pronto! 🎉</p>}
        {status === 'error' && <p className="share-msg error">Não deu pra gerar a imagem. Tenta de novo?</p>}
      </div>
    </dialog>
  )
}
