import { useRef } from 'react'
import type { AnalysisResult } from '../../lib/analysis/index.ts'
import { ShareCard } from './ShareCard.tsx'
import { SharePreview } from './SharePreview.tsx'
import { useShareImage } from './useShareImage.ts'
import { fileSlug } from './shareImage.ts'

interface Props {
  result: AnalysisResult
  onReport: () => void
  onRestart: () => void
}

/** Último story: o resumão reduzido pra caber na tela, com os botões de compartilhar */
export function ShareSlide({ result, onReport, onRestart }: Props) {
  const card = useRef<HTMLDivElement>(null)
  const { status, share } = useShareImage(card)
  const name = result.overview.group.name ?? 'grupo'

  return (
    <div className="slide share-slide">
      <SharePreview>
        <ShareCard ref={card} result={result} />
      </SharePreview>
      <div className="share-actions">
        <button
          className="btn bg-lime"
          onClick={() => share(`retrospectiva-${fileSlug(name) || 'grupo'}.png`, `${name} em números`)}
          disabled={status === 'working'}
        >
          {status === 'working' ? 'Gerando…' : '📲 Compartilhar resumão'}
        </button>
        <div className="share-secondary">
          <button className="btn small ghost" onClick={onReport}>Relatório completo</button>
          <button className="btn small ghost" onClick={onRestart}>↺ Ver de novo</button>
        </div>
        {status === 'done' && <p className="share-msg mono">Pronto! 🎉</p>}
        {status === 'error' && <p className="share-msg error">Não deu pra gerar a imagem. Tenta de novo?</p>}
      </div>
    </div>
  )
}
