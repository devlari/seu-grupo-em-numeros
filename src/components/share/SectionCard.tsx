import { forwardRef, type ReactNode } from 'react'
import type { AnalysisResult, Counted } from '../../lib/analysis/index.ts'
import { BASIS_LABEL } from '../awardBasis.ts'
import { SHARE_HEIGHT, SHARE_WIDTH, ShareFooter } from './ShareCard.tsx'
import './SectionCard.css'

/** Seções do relatório que viram imagem */
export type SectionKind = 'awards' | 'highlights' | 'who' | 'when' | 'words' | 'rankings' | 'interactions' | 'polls'

interface Props {
  kind: SectionKind
  /** Número e título da seção, os mesmos do relatório */
  n: string
  title: string
  result: AnalysisResult
}

const n = (v: number) => v.toLocaleString('pt-BR')
const pct = (v: number) => `${Math.round(v * 100)}%`
const WEEKDAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const month = (m: string) => `${MONTHS[Number(m.slice(5)) - 1]}/${m.slice(0, 4)}`

/** Fundo de cada card, pra não ficarem todos iguais quando postados em sequência */
const CARD_BG: Record<SectionKind, string> = {
  awards: 'var(--yellow)',
  highlights: 'var(--cyan)',
  who: 'var(--pink)',
  when: 'var(--lime)',
  words: 'var(--orange)',
  rankings: 'var(--pink)',
  interactions: 'var(--cyan)',
  polls: 'var(--lime)',
}
/** Caixas internas alternam entre estas (só cores com texto preto) */
const BOX_BG = ['bg-white', 'bg-pink', 'bg-lime', 'bg-cyan', 'bg-orange', 'bg-yellow']

/**
 * Resumo de uma seção do relatório, pra compartilhar. Mesmo formato do resumão (1080×1920):
 * o melhor de cada seção, não a seção inteira. Gráficos em CSS puro, que saem nítidos na imagem.
 */
export const SectionCard = forwardRef<HTMLDivElement, Props>(function SectionCard({ kind, n: num, title, result }, ref) {
  const Body = BODIES[kind]
  return (
    <div ref={ref} className="share-card section-card" style={{ width: SHARE_WIDTH, height: SHARE_HEIGHT, backgroundColor: CARD_BG[kind] }}>
      <header className="scc-header">
        <span className="sc-tag scc-group">{result.overview.group.name ?? 'Retrospectiva do grupo'}</span>
        <h1 className="scc-title"><span className="scc-n">{num}</span><span>{title}</span></h1>
      </header>
      <main className="scc-body">
        <Body r={result} />
      </main>
      <ShareFooter />
    </div>
  )
})

const BODIES: Record<SectionKind, (props: { r: AnalysisResult }) => ReactNode> = {
  awards: AwardsBody,
  highlights: HighlightsBody,
  who: WhoBody,
  when: WhenBody,
  words: WordsBody,
  rankings: RankingsBody,
  interactions: InteractionsBody,
  polls: PollsBody,
}

function AwardsBody({ r }: { r: AnalysisResult }) {
  return (
    <div className="scc-awards">
      {r.insights.awards.slice(0, 8).map((a, i) => (
        <div key={a.id} className={`sc-box scc-award ${BOX_BG[i % BOX_BG.length]}`}>
          <span className="scc-award-emoji">{a.emoji}</span>
          <small className="scc-label">{a.title}{BASIS_LABEL[a.basis] && ` · ${BASIS_LABEL[a.basis]}`}</small>
          <strong className="scc-award-winner sc-ellipsis">{a.winner}</strong>
          <span className="scc-clamp scc-award-detail">{a.detail}</span>
        </div>
      ))}
    </div>
  )
}

function HighlightsBody({ r }: { r: AnalysisResult }) {
  return (
    <div className="scc-stack">
      {r.insights.highlights.slice(0, 6).map((h, i) => (
        <div key={h.id} className={`sc-box scc-highlight ${BOX_BG[i % BOX_BG.length]}`}>
          <span className="scc-highlight-emoji">{h.emoji}</span>
          <p className="scc-clamp">{h.text}</p>
        </div>
      ))}
    </div>
  )
}

function WhoBody({ r }: { r: AnalysisResult }) {
  const o = r.overview
  // Média de caracteres só de quem mandou o mínimo, senão uma mensagem só decide o prêmio
  const people = r.rankings.profile.people.filter((p) => p.messages >= r.rankings.perHundred.minMessages)
  const byChars = [...people].sort((a, b) => b.avgChars - a.avgChars)
  return (
    <div className="scc-stack">
      <BigNumber value={n(o.totalMessages)} label={`mensagens · ${o.perPerson.length} pessoas`} />
      <Box title="Quem mais fala" bg="bg-white">
        <Bars
          items={o.perPerson.slice(0, 10).map((p) => ({ name: p.name, count: p.messages }))}
          format={(v) => `${n(v)} · ${pct(v / Math.max(1, o.totalMessages))}`}
        />
      </Box>
      {byChars.length >= 2 && (
        <div className="scc-cols">
          <Fact label="textão" value={byChars[0].name} detail={`${n(Math.round(byChars[0].avgChars))} caracteres por mensagem`} bg="bg-cyan" />
          <Fact label="direto ao ponto" value={byChars.at(-1)!.name} detail={`${n(Math.round(byChars.at(-1)!.avgChars))} caracteres por mensagem`} bg="bg-yellow" />
        </div>
      )}
    </div>
  )
}

function WhenBody({ r }: { r: AnalysisResult }) {
  const f = r.frequency
  const bestMonth = f.byMonth.reduce<{ month: string; count: number } | null>((best, m) => (!best || m.count > best.count ? m : best), null)
  const owl = f.nightOwls.find((p) => p.count > 0)
  const peakHour = f.byHour.indexOf(Math.max(...f.byHour))
  return (
    <div className="scc-stack">
      <Box title="Dia da semana" bg="bg-white">
        <Columns values={f.byWeekday} labels={WEEKDAYS.map((d) => d.slice(0, 3))} />
      </Box>
      <Box title="Hora do dia" bg="bg-white">
        <Columns values={f.byHour} labels={f.byHour.map((_, h) => (h % 6 === 0 ? `${h}h` : ''))} thin />
      </Box>
      <Box title="Mapa do caos" bg="bg-white">
        <Heatmap heatmap={f.heatmap} />
      </Box>
      <div className="scc-cols">
        {bestMonth && bestMonth.count > 0 && (
          <Fact label="melhor mês" value={month(bestMonth.month)} detail={`${n(bestMonth.count)} mensagens`} bg="bg-pink" />
        )}
        {owl
          ? <Fact label="coruja da madrugada" value={owl.name} detail={`${n(owl.count)} mensagens entre 0h e 6h`} bg="bg-cyan" />
          : <Fact label="horário nobre" value={`${peakHour}h`} detail={`${n(f.byHour[peakHour])} mensagens`} bg="bg-cyan" />}
      </div>
    </div>
  )
}

function WordsBody({ r }: { r: AnalysisResult }) {
  const top = r.words.top.slice(0, 10)
  const max = Math.max(1, ...top.map((w) => w.count))
  // As 4 pessoas que mais falam, na ordem do relatório
  const people = r.overview.perPerson
    .map((p) => ({ name: p.name, words: r.words.perPerson[p.name] ?? [] }))
    .filter((p) => p.words.length > 0)
    .slice(0, 4)
  return (
    <div className="scc-stack">
      <Box title="As mais ditas" bg="bg-white">
        <div className="scc-chips">
          {top.map((w, i) => (
            <span key={w.name} className={`scc-chip ${BOX_BG[(i % (BOX_BG.length - 1)) + 1]}`} style={{ fontSize: 40 + 36 * (w.count / max) }}>
              {w.name} <b>{n(w.count)}</b>
            </span>
          ))}
        </div>
      </Box>
      <div className="scc-cols">
        {people.map((p, i) => (
          <Box key={p.name} title={p.name} bg={BOX_BG[(i + 2) % BOX_BG.length]} ellipsis>
            <Podium items={p.words.slice(0, 3)} plain />
          </Box>
        ))}
      </div>
    </div>
  )
}

function RankingsBody({ r }: { r: AnalysisResult }) {
  const k = r.rankings
  const rankings = [
    { title: '😂 Risadas', items: k.laughs },
    { title: '🤬 Palavrões', items: k.swears },
    { title: '📸 Mídia', items: k.media },
    ...k.custom.map((c) => ({ title: `🏷️ ${c.label || 'Ranking livre'}`, items: c.ranking })),
    { title: '🗑️ Apagadas', items: k.deleted },
    { title: '✏️ Editadas', items: k.edited },
  ]
    .map((x) => ({ ...x, items: x.items.filter((i) => i.count > 0) }))
    .filter((x) => x.items.length > 0)
    .slice(0, 6)
  return (
    <div className="scc-cols scc-grow">
      {rankings.map((x, i) => (
        <Box key={x.title} title={x.title} bg={BOX_BG[i % BOX_BG.length]} ellipsis>
          <Podium items={x.items.slice(0, 5)} />
        </Box>
      ))}
    </div>
  )
}

function InteractionsBody({ r }: { r: AnalysisResult }) {
  const [pair, ...pairs] = r.interactions.topPairs
  const c = r.conversations
  const roles = [
    { title: 'Puxa-assunto', items: c.starters, bg: 'bg-lime' },
    { title: 'Mata-conversa', items: c.enders, bg: 'bg-pink' },
    { title: 'No vácuo', items: c.monologues, bg: 'bg-orange' },
  ]
  return (
    <div className="scc-stack">
      {pair && (
        <div className="sc-box bg-yellow scc-pair">
          <small className="scc-label">dupla inseparável</small>
          <strong className="sc-ellipsis">{pair.a}</strong>
          <span className="scc-pair-amp">&</span>
          <strong className="sc-ellipsis">{pair.b}</strong>
          <span className="scc-detail">{n(pair.count)} respostas trocadas</span>
        </div>
      )}
      {pairs.length > 0 && (
        <Box title="Outras duplas" bg="bg-white">
          <Bars items={pairs.slice(0, 4).map((p) => ({ name: `${p.a} & ${p.b}`, count: p.count }))} wideNames />
        </Box>
      )}
      <div className="scc-cols scc-cols-3">
        {roles.map((role) => (
          <Box key={role.title} title={role.title} bg={role.bg} small>
            <Podium items={role.items.filter((i) => i.count > 0).slice(0, 3)} small />
          </Box>
        ))}
      </div>
      <p className="scc-footnote">{n(c.total)} conversas no total</p>
    </div>
  )
}

function PollsBody({ r }: { r: AnalysisResult }) {
  const p = r.polls
  const voted = p.mostVoted
  const max = Math.max(1, ...(voted?.options.map((o) => o.votes) ?? []))
  return (
    <div className="scc-stack">
      <BigNumber value={n(p.total)} label={`enquetes · média de ${p.avgVotes.toLocaleString('pt-BR')} votos`} />
      {voted && (
        <Box title="A mais votada" bg="bg-white">
          <p className="scc-question scc-clamp">{voted.question || '(sem pergunta)'}</p>
          <div className="scc-poll">
            {voted.options.slice(0, 5).map((opt, i) => (
              <div key={i} className={`scc-poll-option ${voted.winners.includes(opt.text) ? 'winner' : ''}`}>
                <div className="scc-poll-bar" style={{ width: `${(opt.votes / max) * 100}%` }} />
                <span className="sc-ellipsis">{opt.text}</span>
                <b>{n(opt.votes)}</b>
              </div>
            ))}
          </div>
        </Box>
      )}
      <div className="scc-cols">
        <Box title="Quem mais cria" bg="bg-yellow">
          <Podium items={p.creators.slice(0, 3)} small />
        </Box>
        <div className="sc-box bg-orange scc-fact">
          <span className="scc-fact-value">{n(p.ignored.length)}</span>
          <span className="scc-detail">sem nenhum voto</span>
          <span className="scc-fact-value scc-fact-gap">{n(p.ties.length)}</span>
          <span className="scc-detail">terminaram empatadas</span>
        </div>
      </div>
    </div>
  )
}

/* ---------- Peças ---------- */

function Box({ title, bg, ellipsis, small, children }: {
  title: string
  bg: string
  /** Título numa linha só (nomes de pessoas podem ser longos) */
  ellipsis?: boolean
  small?: boolean
  children: ReactNode
}) {
  return (
    <div className={`sc-box scc-box ${bg} ${small ? 'small' : ''}`}>
      <h2 className={ellipsis ? 'sc-ellipsis' : undefined}>{title}</h2>
      {children}
    </div>
  )
}

function BigNumber({ value, label }: { value: string; label: string }) {
  return (
    <div className="sc-box bg-white scc-big">
      <span className="scc-big-n">{value}</span>
      <span className="scc-detail">{label}</span>
    </div>
  )
}

function Fact({ label, value, detail, bg }: { label: string; value: string; detail: string; bg: string }) {
  return (
    <div className={`sc-box scc-fact ${bg}`}>
      <small className="scc-label">{label}</small>
      <span className="scc-fact-value sc-ellipsis">{value}</span>
      <span className="scc-detail">{detail}</span>
    </div>
  )
}

/** Barras horizontais: nome, barra e valor */
function Bars({ items, format = n, wideNames }: { items: Counted[]; format?: (v: number) => string; wideNames?: boolean }) {
  const max = Math.max(1, ...items.map((i) => i.count))
  return (
    <div className={`scc-bars ${wideNames ? 'wide' : ''}`}>
      {items.map((item) => (
        <div key={item.name} className="scc-bar-row">
          <span className="sc-ellipsis">{item.name}</span>
          <div className="scc-bar-track"><div className="scc-bar" style={{ width: `${(item.count / max) * 100}%` }} /></div>
          <b>{format(item.count)}</b>
        </div>
      ))}
    </div>
  )
}

/** Barras verticais, com a maior em destaque */
function Columns({ values, labels, thin }: { values: number[]; labels: string[]; thin?: boolean }) {
  const max = Math.max(1, ...values)
  return (
    <div className={`scc-columns ${thin ? 'thin' : ''}`}>
      {values.map((v, i) => (
        <div key={i} className="scc-column">
          <div className="scc-column-track">
            <div className={`scc-column-bar ${v === max ? 'peak' : ''}`} style={{ height: `${(v / max) * 100}%` }} />
          </div>
          <span>{labels[i]}</span>
        </div>
      ))}
    </div>
  )
}

function Heatmap({ heatmap }: { heatmap: number[][] }) {
  const max = Math.max(1, ...heatmap.flat())
  return (
    <div className="scc-heatmap">
      {heatmap.map((row, day) => (
        <div key={day} className="scc-heatmap-row">
          <span>{WEEKDAYS[day].slice(0, 3)}</span>
          {row.map((v, hour) => (
            // Rosa com opacidade pelo volume; horário sem mensagem fica branco
            <i key={hour} style={{ background: v ? `rgba(255, 79, 163, ${0.15 + 0.85 * (v / max)})` : undefined }} />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Top 3 com medalhas */
function Podium({ items, plain, small }: { items: Counted[]; plain?: boolean; small?: boolean }) {
  if (items.length === 0) return <p className="scc-detail">Ninguém ainda.</p>
  return (
    <ol className={`scc-podium ${small ? 'small' : ''}`}>
      {items.map((item, i) => (
        <li key={item.name}>
          <span className="scc-medal">{plain ? `${i + 1}.` : ['🥇', '🥈', '🥉'][i]}</span>
          <span className="sc-ellipsis">{item.name}</span>
          <b>{n(item.count)}</b>
        </li>
      ))}
    </ol>
  )
}
