import type { ReactNode } from 'react'
import type { AnalysisResult, Counted } from '../../lib/analysis/index.ts'
import { ActivityHeatmap, HourBars, MonthBars, WeekdayBars } from '../charts/charts.tsx'
import { COLORS } from '../charts/theme.ts'
import { ShareSlide } from '../share/ShareSlide.tsx'
import { AwardCard, BigNumber, HighlightCard, RankingSlide } from './parts.tsx'

export interface Slide {
  key: string
  /** Classe de cor de fundo (bg-pink, bg-lime...) */
  bg: string
  content: ReactNode
}

const WEEKDAYS = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo']
const n = (v: number) => v.toLocaleString('pt-BR')
const date = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')
const AWARD_BGS = ['bg-pink', 'bg-lime', 'bg-cyan', 'bg-yellow', 'bg-orange']

export function groupName(r: AnalysisResult): string | null {
  return r.overview.group.name
}

/** Monta a sequência de stories. Telas sem dado suficiente ficam de fora. */
export function buildSlides(r: AnalysisResult, actions: { onReport: () => void; onRestart: () => void }): Slide[] {
  const h = (id: string) => r.insights.highlights.find((x) => x.id === id)
  const slides: Slide[] = []
  const add = (key: string, bg: string, content: ReactNode) => slides.push({ key, bg, content })
  const o = r.overview
  const name = groupName(r)

  add('intro', 'bg-pink', (
    <div className="slide center">
      <span className="tag pop">Retrospectiva</span>
      <h1 className="slide-giant pop d1">{name ?? 'O grupo'}</h1>
      <p className="slide-sub pop d2">em números</p>
      {o.firstMessageAt && o.lastMessageAt && (
        <p className="mono pop d3">{date(o.firstMessageAt)} → {date(o.lastMessageAt)}</p>
      )}
      <p className="slide-hint pop d4">toque pra avançar →</p>
    </div>
  ))

  add('total', 'bg-lime', (
    <div className="slide center">
      <p className="slide-lead pop">Em {n(o.spanDays)} dias, vocês mandaram</p>
      <BigNumber value={o.totalMessages} className="pop d1" />
      <p className="slide-lead pop d2">mensagens</p>
      <p className="sticker-card pop d3">
        Uma média de <strong>{n(Math.round(o.totalMessages / Math.max(1, o.spanDays)))}</strong> por dia
      </p>
      {h('active-days') && <p className="pop d4">{h('active-days')!.text}</p>}
    </div>
  ))

  const origin = h('origin')
  const busiest = h('busiest-day')
  if (origin || busiest) {
    add('origin', 'bg-cyan', (
      <div className="slide">
        <h2 className="slide-title pop">Como tudo começou</h2>
        {origin && <HighlightCard emoji={origin.emoji} text={origin.text} className="pop d1" />}
        {busiest && <HighlightCard emoji={busiest.emoji} text={busiest.text} className="pop d2 tilt-r" />}
      </div>
    ))
  }

  if (o.perPerson.length >= 2) {
    const [first, second, third] = o.perPerson
    const rest = o.perPerson.slice(3, 8)
    add('people', 'bg-white', (
      <div className="slide">
        <h2 className="slide-title pop">Quem mais fala</h2>
        <div className="podium">
          {[second, first, third].map((p, i) =>
            p ? (
              <div key={p.name} className={`podium-step step-${[2, 1, 3][i]} pop d${i + 1}`}>
                <span className="podium-name">{p.name}</span>
                <span className="mono">{n(p.messages)}</span>
                <div className="podium-block">{[2, 1, 3][i]}º</div>
              </div>
            ) : <div key={i} />,
          )}
        </div>
        {rest.length > 0 && (
          <ol className="rest-list pop d4" start={4}>
            {rest.map((p) => (
              <li key={p.name}><span>{p.name}</span><span className="mono">{n(p.messages)}</span></li>
            ))}
          </ol>
        )}
        <p className="pop d5">
          {Math.round(first.share * 100)}% de tudo saiu do teclado de <strong>{first.name}</strong>.
        </p>
      </div>
    ))
  }

  if (o.totalMessages >= 50) {
    add('weekday', 'bg-orange', (
      <div className="slide">
        <h2 className="slide-title pop">O ritmo da semana</h2>
        <div className="chart-card pop d1"><WeekdayBars byWeekday={r.frequency.byWeekday} height={200} /></div>
        {['busiest-weekday', 'dead-weekday', 'weekend-drop', 'weekend-group'].map((id, i) =>
          h(id) ? <p key={id} className={`slide-line pop d${i + 2}`}>{h(id)!.emoji} {h(id)!.text}</p> : null,
        )}
      </div>
    ))

    add('hours', 'bg-blue', (
      <div className="slide">
        <h2 className="slide-title pop">Que horas o grupo acorda</h2>
        <div className="chart-card pop d1"><HourBars byHour={r.frequency.byHour} height={200} /></div>
        {['prime-time', 'office-hours', 'night-group'].map((id, i) =>
          h(id) ? <p key={id} className={`slide-line pop d${i + 2}`}>{h(id)!.emoji} {h(id)!.text}</p> : null,
        )}
      </div>
    ))

    const hot = r.frequency.busiestSlots[0]
    add('heatmap', 'bg-yellow', (
      <div className="slide">
        <h2 className="slide-title pop">O mapa do caos</h2>
        <div className="chart-card pop d1"><ActivityHeatmap heatmap={r.frequency.heatmap} height={300} /></div>
        {hot && (
          <p className="slide-line pop d2">
            🔥 {cap(WEEKDAYS[hot.weekday])} às {hot.hour}h é o horário mais quente: {n(hot.count)} mensagens.
          </p>
        )}
      </div>
    ))
  }

  if (r.frequency.byMonth.length >= 3) {
    add('months', 'bg-white', (
      <div className="slide">
        <h2 className="slide-title pop">A história do grupo</h2>
        <div className="chart-card pop d1"><MonthBars byMonth={r.frequency.byMonth} height={200} /></div>
        {['best-month', 'drop', 'revival', 'trend-down', 'trend-up'].map((id, i) =>
          h(id) ? <p key={id} className={`slide-line small pop d${Math.min(5, i + 2)}`}>{h(id)!.emoji} {h(id)!.text}</p> : null,
        )}
      </div>
    ))
  }

  if (r.words.top.length >= 3) {
    const max = r.words.top[0].count
    add('words', 'bg-violet', (
      <div className="slide">
        <h2 className="slide-title pop">O vocabulário do grupo</h2>
        <div className="word-cloud">
          {r.words.top.map((w, i) => (
            <span
              key={w.name}
              className={`word-chip pop d${Math.min(5, i)}`}
              style={{ fontSize: `${1 + 1.6 * (w.count / max)}rem`, rotate: `${(i % 3) * 3 - 3}deg` }}
            >
              {w.name}
              <small className="mono">{n(w.count)}</small>
            </span>
          ))}
        </div>
      </div>
    ))
  }

  const hasCount = (list: Counted[]) => list.some((c) => c.count > 0)
  const award = (id: string) => r.insights.awards.find((a) => a.id === id)

  // Risadas e palavrões em proporção, igual aos prêmios: senão quem fala mais ganha tudo
  const per100 = r.rankings.perHundred
  const per100Subtitle = `Risadas a cada 100 mensagens de cada pessoa (quem mandou ${n(per100.minMessages)}+)`
  if (hasCount(per100.laughs)) {
    add('laughs', 'bg-lime', (
      <RankingSlide title="Quem mais ri" subtitle={per100Subtitle} items={per100.laughs} color={COLORS.pink} award={award('clown')} />
    ))
  }

  if (hasCount(per100.swears)) {
    add('swears', 'bg-pink', (
      <RankingSlide
        title="Boca suja"
        subtitle={per100Subtitle.replace('Risadas', 'Palavrões')}
        items={per100.swears}
        color={COLORS.yellow}
        award={award('potty-mouth')}
      />
    ))
  }

  for (const custom of r.rankings.custom) {
    if (!hasCount(custom.ranking)) continue
    add(`custom-${custom.label}`, 'bg-cyan', (
      <RankingSlide title={custom.label || 'Ranking livre'} items={custom.ranking} color={COLORS.violet} />
    ))
  }

  const pair = r.interactions.topPairs[0]
  const longest = h('longest-conversation')
  if (pair || longest) {
    add('pair', 'bg-cyan', (
      <div className="slide center">
        {pair && (
          <>
            <span className="tag pop">A dupla do grupo</span>
            <h1 className="slide-big pop d1">{pair.a}<br />+<br />{pair.b}</h1>
            <p className="sticker-card pop d2">{n(pair.count)} respostas trocadas</p>
          </>
        )}
        {longest && <HighlightCard emoji={longest.emoji} text={longest.text} className="pop d3" />}
      </div>
    ))
  }

  if (r.polls.total > 0) {
    const organizer = r.polls.creators[0]
    const voted = h('most-voted-poll')
    const ignored = h('ignored-polls')
    add('polls', 'bg-orange', (
      <div className="slide center">
        <span className="tag pop">Democracia</span>
        <BigNumber value={r.polls.total} className="pop d1" />
        <p className="slide-lead pop d2">{r.polls.total === 1 ? 'enquete' : 'enquetes'}</p>
        {organizer && organizer.count > 0 && (
          <p className="sticker-card pop d3"><strong>{organizer.name}</strong> criou {n(organizer.count)}</p>
        )}
        {voted && <HighlightCard emoji={voted.emoji} text={voted.text} className="pop d4" />}
        {ignored && <p className="pop d5">{ignored.emoji} {ignored.text}</p>}
      </div>
    ))
  }

  const awards = r.insights.awards
  if (awards.length > 0) {
    add('awards-intro', 'bg-ink', (
      <div className="slide center">
        <p className="drumroll pop">🥁</p>
        <h1 className="slide-big pop d1">E os prêmios vão para…</h1>
      </div>
    ))
    for (let i = 0; i < awards.length; i += 3) {
      const chunk = awards.slice(i, i + 3)
      add(`awards-${i}`, AWARD_BGS[(i / 3) % AWARD_BGS.length], (
        <div className="slide awards">
          {chunk.map((a, j) => <AwardCard key={a.id} award={a} className={`pop d${j * 2}`} />)}
        </div>
      ))
    }
  }

  // Último story: o resumão de uma tela só, pra compartilhar (tipo o card final do Wrapped)
  add('share', 'bg-ink', <ShareSlide result={r} onReport={actions.onReport} onRestart={actions.onRestart} />)

  return slides
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
