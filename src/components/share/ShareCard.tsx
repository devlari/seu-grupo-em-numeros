import { forwardRef } from 'react'
import type { AnalysisResult } from '../../lib/analysis/index.ts'
import { AUTHOR } from '../../siteConfig.ts'
import './ShareCard.css'

const WEEKDAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
const n = (v: number) => v.toLocaleString('pt-BR')
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '')

/** No card vai o endereço do portfólio, se tiver (é o que circula nos stories); senão, o nome */
function authorCredit(): string {
  if (!AUTHOR.portfolioUrl) return AUTHOR.name
  try {
    return new URL(AUTHOR.portfolioUrl).hostname.replace(/^www\./, '')
  } catch {
    return AUTHOR.name
  }
}

/** Tamanho real do card: formato de story (Instagram/WhatsApp) */
export const SHARE_WIDTH = 1080
export const SHARE_HEIGHT = 1920

/**
 * O resumão de uma tela só, pra compartilhar. Desenhado em 1080×1920 px;
 * na tela aparece reduzido, e a imagem exportada sai no tamanho real.
 */
export const ShareCard = forwardRef<HTMLDivElement, { result: AnalysisResult }>(function ShareCard({ result: r }, ref) {
  const o = r.overview
  const name = o.group.name ?? 'O grupo'
  const people = o.perPerson.slice(0, 5)
  const words = r.words.top.slice(0, 5)
  const busiestDay = r.frequency.byWeekday.indexOf(Math.max(...r.frequency.byWeekday))
  const peakHour = r.frequency.byHour.indexOf(Math.max(...r.frequency.byHour))
  const awards = r.insights.awards.slice(0, 6)

  return (
    <div ref={ref} className="share-card" style={{ width: SHARE_WIDTH, height: SHARE_HEIGHT }}>
      <header className="sc-header">
        <span className="sc-tag">Retrospectiva do grupo</span>
        <h1 className="sc-name">{name}</h1>
        <div className="sc-sub">em números</div>
        <p className="sc-period">{date(o.firstMessageAt)} → {date(o.lastMessageAt)}</p>
      </header>

      <div className="sc-total sc-box bg-lime">
        <span className="sc-total-n">{n(o.totalMessages)}</span>
        <span className="sc-total-label">mensagens · {o.perPerson.length} pessoas · {n(o.spanDays)} dias</span>
      </div>

      <div className="sc-cols">
        <div className="sc-box bg-white">
          <h2>Quem mais fala</h2>
          <ol>
            {people.map((p) => (
              <li key={p.name}><span className="sc-ellipsis">{p.name}</span><b>{n(p.messages)}</b></li>
            ))}
          </ol>
        </div>
        <div className="sc-box bg-cyan">
          <h2>Mais ditas</h2>
          <ol>
            {words.map((w) => (
              <li key={w.name}><span className="sc-ellipsis">{w.name}</span><b>{n(w.count)}</b></li>
            ))}
          </ol>
        </div>
      </div>

      <div className="sc-facts">
        <div className="sc-box bg-orange">
          <span className="sc-fact-label">dia mais agitado</span>
          <span className="sc-fact">{WEEKDAYS[busiestDay]}</span>
        </div>
        <div className="sc-box bg-yellow">
          <span className="sc-fact-label">horário nobre</span>
          <span className="sc-fact">{peakHour}h</span>
        </div>
      </div>

      {awards.length > 0 && (
        <div className="sc-box bg-white sc-awards">
          <h2>Prêmios</h2>
          <ul>
            {awards.map((a) => (
              <li key={a.id}>
                <span className="sc-award-emoji">{a.emoji}</span>
                <span className="sc-award-text">
                  <small>{a.title}</small>
                  <span className="sc-ellipsis">{a.winner}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ShareFooter />
    </div>
  )
})

/** Rodapé dos cards: crédito e o lembrete de privacidade */
export function ShareFooter() {
  return (
    <footer className="sc-footer">
      <span className="sc-credit">por {authorCredit()}</span>
      <span className="sc-note">nada saiu do aparelho</span>
    </footer>
  )
}
