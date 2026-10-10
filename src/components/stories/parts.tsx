import { useCountUp } from '../../hooks/useCountUp.ts'
import type { Award, Counted } from '../../lib/analysis/index.ts'
import { BASIS_LABEL } from '../awardBasis.ts'
import { RankingBars } from '../charts/charts.tsx'

const n = (v: number) => v.toLocaleString('pt-BR')

export function BigNumber({ value, className = '' }: { value: number; className?: string }) {
  const shown = useCountUp(value)
  return <p className={`slide-number ${className}`}>{n(shown)}</p>
}

export function HighlightCard({ emoji, text, className = '' }: { emoji: string; text: string; className?: string }) {
  return (
    <div className={`card highlight-card ${className}`}>
      <span className="highlight-emoji" aria-hidden>{emoji}</span>
      <p>{text}</p>
    </div>
  )
}

export function AwardCard({ award, className = '' }: { award: Award; className?: string }) {
  return (
    <div className={`card award-card ${className}`}>
      <span className="award-emoji" aria-hidden>{award.emoji}</span>
      <div>
        <span className="tag">{award.title}</span>
        {BASIS_LABEL[award.basis] && <span className="tag basis-tag">{BASIS_LABEL[award.basis]}</span>}
        <p className="award-winner">{award.winner}</p>
        <p className="award-detail">{award.detail}</p>
      </div>
    </div>
  )
}

export function RankingSlide({ title, subtitle, items, color, award }: {
  title: string
  /** Explica o que o número significa (ex.: "a cada 100 mensagens de cada pessoa") */
  subtitle?: string
  items: Counted[]
  color: string
  award?: Award
}) {
  const top = items.filter((i) => i.count > 0).slice(0, 6)
  return (
    <div className="slide">
      <h2 className="slide-title pop">{title}</h2>
      {subtitle && <p className="slide-subtitle pop">{subtitle}</p>}
      <div className="chart-card pop d1"><RankingBars items={top} color={color} /></div>
      {award && (
        <p className="sticker-card pop d2">
          {award.emoji} <strong>{award.winner}</strong>: {award.detail}
        </p>
      )}
    </div>
  )
}
