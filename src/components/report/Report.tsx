import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import type { AnalysisResult, Counted, Poll } from '../../lib/analysis/index.ts'
import {
  ActivityHeatmap,
  ConversationBuckets,
  HourBars,
  InteractionGraph,
  MonthBars,
  ProfileScatter,
  RankingBars,
  ReplyMatrix,
  TrackedWordsLines,
  WeekdayBars,
} from '../charts/charts.tsx'
import { COLORS } from '../charts/theme.ts'
import { BASIS_LABEL } from '../awardBasis.ts'
import { groupName } from '../stories/slides.tsx'
import type { SectionKind } from '../share/SectionCard.tsx'
import { SectionShareDialog } from '../share/SectionShareDialog.tsx'
import './Report.css'
import { SiteFooter } from '../SiteFooter.tsx'

interface Props {
  result: AnalysisResult
  fileName: string
  /** true enquanto uma nova análise (ex.: depois de mudar as configurações) está rodando */
  updating: boolean
  onStories: () => void
  onSettings: () => void
  onReset: () => void
}

const n = (v: number) => v.toLocaleString('pt-BR')
const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '–')
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const month = (m: string) => `${MONTHS[Number(m.slice(5)) - 1]}/${m.slice(0, 4)}`

/** Seções do relatório, na ordem da página. O menu fixo é montado a partir delas. */
const SECTIONS: Record<SectionKind, { id: string; n: string; title: string }> = {
  awards: { id: 'premios', n: '★', title: 'Prêmios' },
  highlights: { id: 'destaques', n: '!', title: 'Destaques' },
  who: { id: 'quem-fala', n: '1', title: 'Quem fala' },
  when: { id: 'quando', n: '2', title: 'Quando' },
  words: { id: 'o-que-se-fala', n: '3', title: 'O que se fala' },
  rankings: { id: 'rankings', n: '4', title: 'Rankings' },
  interactions: { id: 'quem-fala-com-quem', n: '5', title: 'Quem fala com quem' },
  polls: { id: 'enquetes', n: '6', title: 'Enquetes' },
}
type SectionInfo = (typeof SECTIONS)[SectionKind]

export function Report({ result: r, fileName, updating, onStories, onSettings, onReset }: Props) {
  const o = r.overview
  const name = groupName(r)
  // Seção cuja imagem está aberta na prévia
  const [sharing, setSharing] = useState<SectionKind | null>(null)
  const share = (kind: SectionKind) => ({ ...SECTIONS[kind], onShare: () => setSharing(kind) })
  // Só entram no menu as seções que aparecem na página
  const sections = useMemo(() => [
    r.insights.awards.length > 0 && SECTIONS.awards,
    r.insights.highlights.length > 0 && SECTIONS.highlights,
    SECTIONS.who,
    SECTIONS.when,
    SECTIONS.words,
    SECTIONS.rankings,
    SECTIONS.interactions,
    r.polls.total > 0 && SECTIONS.polls,
  ].filter((section) => section !== false), [r])

  function downloadJson() {
    const blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = fileName.replace(/\.(txt|zip)$/i, '') + '.analise.json'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className={`page report ${updating ? 'updating' : ''}`}>
      <header className="report-header">
        <span className="tag">Relatório completo</span>
        <h1>{name ?? 'O grupo'} <span className="report-h1-sub">em números</span></h1>
        <p className="mono">{dt(o.firstMessageAt)} → {dt(o.lastMessageAt)}</p>
        <div className="report-actions">
          <button className="btn bg-pink" onClick={onStories}>▶ Ver stories</button>
          <button className="btn ghost" onClick={onSettings}>⚙️ Ajustar pessoas e filtros</button>
          <button className="btn ghost" onClick={downloadJson}>⬇ Baixar JSON</button>
          <button className="btn ghost" onClick={onReset}>📂 Outro arquivo</button>
        </div>
      </header>

      <ReportNav sections={sections} />

      <div className="stat-row">
        <Stat label="mensagens" value={n(o.totalMessages)} bg="bg-lime" />
        <Stat label="pessoas" value={n(o.perPerson.length)} bg="bg-cyan" />
        <Stat label="dias com mensagem" value={`${n(o.activeDays)}/${n(o.spanDays)}`} bg="bg-yellow" />
        <Stat label="por dia, em média" value={n(Math.round(o.totalMessages / Math.max(1, o.spanDays)))} bg="bg-orange" />
      </div>

      {r.insights.awards.length > 0 && (
        <Section {...share('awards')}>
          <p className="hint">
            Alguns prêmios vão pra quem tem mais no total; os marcados como <b>proporcional</b> comparam quanto aquilo pesa
            nas mensagens de cada pessoa (só entra quem mandou {n(r.rankings.perHundred.minMessages)} mensagens ou mais),
            pra quem fala muito não ganhar tudo.
          </p>
          <div className="award-grid">
            {r.insights.awards.map((a, i) => (
              <div key={a.id} className={`card award-tile ${['bg-pink', 'bg-lime', 'bg-cyan', 'bg-yellow', 'bg-orange'][i % 5]}`}>
                <span className="award-tile-emoji" aria-hidden>{a.emoji}</span>
                <span className="tag">{a.title}</span>
                {BASIS_LABEL[a.basis] && <span className="tag basis-tag">{BASIS_LABEL[a.basis]}</span>}
                <strong className="award-tile-winner">{a.winner}</strong>
                <span className="award-tile-detail">{a.detail}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {r.insights.highlights.length > 0 && (
        <Section {...share('highlights')}>
          <div className="highlight-grid">
            {r.insights.highlights.map((h) => (
              <div key={h.id} className="card highlight-tile">
                <span aria-hidden>{h.emoji}</span>
                <p>{h.text}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section {...share('who')}>
        <div className="grid-2">
          <Card title="Mensagens por pessoa">
            <RankingBars items={o.perPerson.map((p) => ({ name: p.name, count: p.messages }))} color={COLORS.pink} />
          </Card>
          <Card title="Perfil de comunicação" hint="Quem fala muito × quem escreve muito. As linhas tracejadas são as medianas.">
            <ProfileScatter profile={r.rankings.profile} />
          </Card>
        </div>
        <div className="chips">
          {Object.entries(o.byKind).filter(([, v]) => v > 0).map(([kind, v]) => (
            <span key={kind} className="tag">{KIND_LABELS[kind] ?? kind}: {n(v)}</span>
          ))}
        </div>
      </Section>

      <Section {...share('when')}>
        <div className="grid-2">
          <Card title="Dia da semana"><WeekdayBars byWeekday={r.frequency.byWeekday} /></Card>
          <Card title="Hora do dia"><HourBars byHour={r.frequency.byHour} /></Card>
        </div>
        <Card title="Mapa do caos (dia × hora)"><ActivityHeatmap heatmap={r.frequency.heatmap} /></Card>
        <Card title="Mensagens por mês"><MonthBars byMonth={r.frequency.byMonth} /></Card>
        <div className="grid-2">
          <Card title="Horários mais movimentados">
            <SlotList slots={r.frequency.busiestSlots} />
          </Card>
          <RankingCard title="Mensagens de madrugada (0h às 6h)" items={r.frequency.nightOwls} color={COLORS.violet} />
        </div>
      </Section>

      <Section {...share('words')}>
        <Card title="Top palavras do grupo">
          <div className="chips big">
            {r.words.top.map((w) => <span key={w.name} className="tag">{w.name} <b>{n(w.count)}</b></span>)}
          </div>
        </Card>
        <div className="grid-3">
          {Object.entries(r.words.perPerson).map(([person, words]) => (
            <Card key={person} title={person}>
              <ol className="word-list">
                {words.slice(0, 5).map((w) => <li key={w.name}><span>{w.name}</span><span className="mono">{n(w.count)}</span></li>)}
              </ol>
            </Card>
          ))}
        </div>
        {r.words.tracked.length > 0 && (
          <Card title="Palavras acompanhadas ao longo do tempo">
            <TrackedWordsLines tracked={r.words.tracked} />
            <div className="chips">
              {r.words.tracked.map((t) => (
                <span key={t.word} className="tag">
                  {t.word}: {t.topPeople.map((p) => `${p.name} (${n(p.count)})`).join(', ') || '–'}
                </span>
              ))}
            </div>
          </Card>
        )}
      </Section>

      <Section {...share('rankings')}>
        <div className="grid-2">
          <RankingCard title="Risadas" items={r.rankings.laughs} perHundred={r.rankings.perHundred.laughs} color={COLORS.lime} />
          <RankingCard title="Palavrões" items={r.rankings.swears} perHundred={r.rankings.perHundred.swears} color={COLORS.pink} />
          {r.rankings.custom.map((c, i) => (
            <RankingCard key={i} title={c.label || 'Ranking livre'} items={c.ranking} color={COLORS.violet} />
          ))}
          <RankingCard title="Fotos, vídeos, áudios e figurinhas" items={r.rankings.media} perHundred={r.rankings.perHundred.media} color={COLORS.cyan} />
          <RankingCard title="Mensagens apagadas" items={r.rankings.deleted} color={COLORS.orange} />
          <RankingCard title="Mensagens editadas" items={r.rankings.edited} color={COLORS.yellow} />
          <RankingCard
            title="Caracteres por mensagem (média)"
            items={r.rankings.profile.people.map((p) => ({ name: p.name, count: Math.round(p.avgChars) }))}
            color={COLORS.blue}
          />
        </div>
        {r.rankings.longestMessage && (
          <div className="card dot bg-blue longest">
            <span className="tag">A mensagem mais longa: {n(r.rankings.longestMessage.chars)} caracteres</span>
            <blockquote>{r.rankings.longestMessage.text}</blockquote>
            <p className="mono">— {r.rankings.longestMessage.author}, {dt(r.rankings.longestMessage.at)}</p>
          </div>
        )}
      </Section>

      <Section {...share('interactions')}>
        <div className="grid-2">
          <Card title="Rede de respostas" hint="Linha mais grossa = mais respostas entre as duas pessoas.">
            <InteractionGraph result={r} />
          </Card>
          <Card title="Quem responde quem" hint="Cada linha soma 100%: pra quem respondeu cada pessoa.">
            <ReplyMatrix matrix={r.interactions.matrix} />
          </Card>
        </div>
        <div className="grid-3">
          <RankingCard title="Puxa-assunto (começou conversas)" items={r.conversations.starters} color={COLORS.lime} />
          <RankingCard title="Mata-conversa (última mensagem)" items={r.conversations.enders} color={COLORS.pink} />
          <RankingCard title="No vácuo (ninguém respondeu)" items={r.conversations.monologues} color={COLORS.orange} />
        </div>
        <div className="grid-2">
          <Card title={`Conversas por tamanho (${n(r.conversations.total)} no total)`}>
            <ConversationBuckets buckets={r.conversations.sizeBuckets} />
          </Card>
          <Card title="Quando cada pessoa apareceu">
            <ol className="word-list">
              {r.interactions.firstSeen.map((p) => <li key={p.name}><span>{p.name}</span><span className="mono">{month(p.month)}</span></li>)}
            </ol>
          </Card>
        </div>
      </Section>

      {r.polls.total > 0 && (
        <Section {...share('polls')}>
          <div className="grid-2">
            <RankingCard title="Quem mais cria enquete" items={r.polls.creators} color={COLORS.yellow} />
            <Card title={`${n(r.polls.total)} enquetes`}>
              <p>Média de {r.polls.avgVotes.toLocaleString('pt-BR')} votos por enquete.</p>
              <p>{r.polls.ignored.length} sem nenhum voto, {r.polls.ties.length} terminaram empatadas.</p>
              <p className="hint">O WhatsApp não exporta quem votou, só o total de cada opção.</p>
            </Card>
          </div>
          <PollList polls={r.polls.list} />
        </Section>
      )}

      <footer className="report-footer">
        <button className="btn big bg-pink" onClick={onStories}>▶ Ver os stories de novo</button>
        <p className="hint">Tudo foi calculado no seu navegador. Nada foi enviado pra lugar nenhum.</p>
      </footer>

      <SiteFooter />

      {sharing && (
        <SectionShareDialog kind={sharing} section={SECTIONS[sharing]} result={r} onClose={() => setSharing(null)} />
      )}
    </div>
  )
}

const KIND_LABELS: Record<string, string> = {
  text: 'Texto', media: 'Mídia', deleted: 'Apagadas', poll: 'Enquetes', contact: 'Contatos',
  file: 'Arquivos', location: 'Localizações', system: 'Sistema',
}
/**
 * Menu que gruda no topo ao rolar, com atalho pra cada seção.
 * Marca a seção que está na tela e, no celular, rola sozinho pra deixar ela visível.
 */
function ReportNav({ sections }: { sections: SectionInfo[] }) {
  const [active, setActive] = useState<string | null>(null)
  const nav = useRef<HTMLElement>(null)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      // A seção ativa é a última cujo título já passou por baixo do menu
      const line = (nav.current?.getBoundingClientRect().bottom ?? 0) + 24
      let current: string | null = null
      for (const { id } of sections) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= line) current = id
      }
      // No fim da página a última seção pode ser curta demais pra chegar no topo
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      if (atBottom && current) current = sections.at(-1)!.id
      setActive(current)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [sections])

  // Mantém o atalho ativo visível quando o menu rola pro lado (celular)
  useEffect(() => {
    const list = nav.current
    const link = active ? list?.querySelector<HTMLElement>(`[href="#${active}"]`) : null
    if (!list || !link) return
    list.scrollTo({ left: link.offsetLeft - (list.clientWidth - link.offsetWidth) / 2, behavior: 'smooth' })
  }, [active])

  function go(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
    history.replaceState(null, '', `#${id}`)
  }

  return (
    <nav ref={nav} className="report-nav" aria-label="Seções do relatório">
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className={s.id === active ? 'active' : undefined}
          aria-current={s.id === active ? 'true' : undefined}
          onClick={(e) => go(e, s.id)}
        >
          <span className="report-nav-n">{s.n}</span>
          {s.title}
        </a>
      ))}
    </nav>
  )
}

/** Enquetes que aparecem antes de "Ver todas" */
const POLLS_PREVIEW = 3

function PollList({ polls }: { polls: Poll[] }) {
  const [expanded, setExpanded] = useState(false)
  const hidden = polls.length - POLLS_PREVIEW
  const visible = expanded || hidden <= 0 ? polls : polls.slice(0, POLLS_PREVIEW)

  return (
    <>
      <div className="poll-list">
        {visible.map((p) => <PollCard key={p.at + p.author} poll={p} />)}
      </div>
      {hidden > 0 && (
        <button className="btn ghost poll-toggle" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded}>
          {expanded ? '▲ Mostrar menos' : `▼ Ver todas as ${n(polls.length)} enquetes`}
        </button>
      )}
    </>
  )
}

function PollCard({ poll: p }: { poll: Poll }) {
  const max = Math.max(1, ...p.options.map((o) => o.votes))
  return (
    <div className="card poll">
      <strong>{p.question || '(sem pergunta)'}</strong>
      <span className="hint">{p.author}, {dt(p.at)}</span>
      {p.options.map((opt, i) => (
        <div key={i} className={`poll-option ${p.winners.includes(opt.text) ? 'winner' : ''}`}>
          <div className="poll-bar" style={{ width: `${(opt.votes / max) * 100}%` }} />
          <span>{opt.text}</span>
          <span className="mono">{n(opt.votes)}</span>
        </div>
      ))}
    </div>
  )
}

const WEEKDAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

function Section({ id, n, title, onShare, children }: SectionInfo & { onShare: () => void; children: ReactNode }) {
  return (
    <section id={id} className="report-section">
      <div className="section-head">
        <h2 className="section-title"><span className="section-n">{n}</span>{title}</h2>
        <button className="btn small ghost" onClick={onShare} aria-label={`Gerar imagem da seção ${title}`}>📸 Imagem</button>
      </div>
      {children}
    </section>
  )
}

function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="card report-card">
      <h3>{title}</h3>
      {hint && <p className="hint">{hint}</p>}
      {children}
    </div>
  )
}

function Stat({ label, value, bg }: { label: string; value: string; bg: string }) {
  return (
    <div className={`card stat ${bg}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label mono">{label}</span>
    </div>
  )
}

function RankingCard({ title, items, color, perHundred }: {
  title: string
  items: Counted[]
  color: string
  /** Se vier, mostra o seletor Total / A cada 100 mensagens */
  perHundred?: Counted[]
}) {
  const [mode, setMode] = useState<'total' | 'rate'>('total')
  const shown = (mode === 'rate' && perHundred ? perHundred : items).filter((i) => i.count > 0)
  return (
    <Card title={title}>
      {perHundred && (
        <div className="toggle" role="group" aria-label="Como contar">
          <button className={mode === 'total' ? 'on' : ''} onClick={() => setMode('total')}>Total</button>
          <button className={mode === 'rate' ? 'on' : ''} onClick={() => setMode('rate')}>A cada 100 msgs</button>
        </div>
      )}
      {shown.length === 0 ? <p className="hint">Ninguém ainda.</p> : <RankingBars items={shown.slice(0, 8)} color={color} />}
    </Card>
  )
}

function SlotList({ slots }: { slots: { weekday: number; hour: number; count: number }[] }) {
  return (
    <ol className="word-list">
      {slots.map((s) => (
        <li key={`${s.weekday}-${s.hour}`}><span>{WEEKDAYS[s.weekday]}, {s.hour}h</span><span className="mono">{n(s.count)}</span></li>
      ))}
    </ol>
  )
}
