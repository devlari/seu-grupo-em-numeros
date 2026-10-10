import type { AnalysisResult, Counted, MonthCount, TrackedWord } from '../../lib/analysis/index.ts'
import { Chart } from './Chart.tsx'
import { axis, barItem, COLORS, fmt, INK, MONO, PAPER, SERIES, tooltip } from './theme.ts'

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const monthShort = (m: string) => `${MONTHS[Number(m.slice(5)) - 1]}/${m.slice(2, 4)}`

const valueLabel = { show: true, color: INK, fontFamily: MONO, fontWeight: 700 as const, fontSize: 12 }

/** Ranking horizontal: quem tem mais em cima */
export function RankingBars({ items, color = COLORS.pink, height, suffix = '' }: {
  items: Counted[]
  color?: string
  height?: number
  suffix?: string
}) {
  const data = [...items].reverse()
  return (
    <Chart
      height={height ?? Math.max(120, data.length * 38 + 24)}
      option={{
        grid: { left: 8, right: 56, top: 8, bottom: 8, containLabel: true },
        xAxis: { type: 'value', show: false },
        yAxis: { type: 'category', data: data.map((d) => d.name), ...axis, axisLabel: { ...axis.axisLabel, fontSize: 12, fontWeight: 700 } },
        tooltip: { ...tooltip, valueFormatter: (v: number) => fmt(v) + suffix },
        series: [{
          type: 'bar',
          data: data.map((d) => d.count),
          barWidth: 22,
          itemStyle: barItem(color),
          label: { ...valueLabel, position: 'right', formatter: (p: { value: number }) => fmt(p.value) + suffix },
        }],
      }}
    />
  )
}

/** Barras verticais com destaque no maior valor */
function ColumnBars({ labels, values, color, highlight, height = 240 }: {
  labels: string[]
  values: number[]
  color: string
  highlight: string
  height?: number
}) {
  const max = Math.max(...values)
  return (
    <Chart
      height={height}
      option={{
        grid: { left: 8, right: 8, top: 16, bottom: 8, containLabel: true },
        xAxis: { type: 'category', data: labels, ...axis },
        yAxis: { type: 'value', show: false },
        tooltip: { ...tooltip, valueFormatter: (v: number) => `${fmt(v)} mensagens` },
        series: [{
          type: 'bar',
          data: values.map((v) => ({ value: v, itemStyle: barItem(v === max ? highlight : color) })),
          barCategoryGap: '20%',
        }],
      }}
    />
  )
}

export function WeekdayBars({ byWeekday, height }: { byWeekday: number[]; height?: number }) {
  return <ColumnBars labels={WEEKDAYS} values={byWeekday} color="#ffffff" highlight={COLORS.pink} height={height} />
}

export function HourBars({ byHour, height }: { byHour: number[]; height?: number }) {
  return <ColumnBars labels={byHour.map((_, h) => String(h))} values={byHour} color="#ffffff" highlight={COLORS.lime} height={height} />
}

export function MonthBars({ byMonth, height = 260 }: { byMonth: MonthCount[]; height?: number }) {
  return (
    <ColumnBars
      labels={byMonth.map((m) => monthShort(m.month))}
      values={byMonth.map((m) => m.count)}
      color="#ffffff"
      highlight={COLORS.pink}
      height={height}
    />
  )
}

/** Mapa de calor dia da semana × hora */
export function ActivityHeatmap({ heatmap, height = 300 }: { heatmap: number[][]; height?: number }) {
  const data = heatmap.flatMap((hours, d) => hours.map((v, h) => [h, d, v]))
  const max = Math.max(1, ...data.map((d) => d[2]))
  return (
    <Chart
      height={height}
      option={{
        grid: { left: 8, right: 8, top: 8, bottom: 40, containLabel: true },
        xAxis: { type: 'category', data: Array.from({ length: 24 }, (_, h) => `${h}h`), ...axis, axisLabel: { ...axis.axisLabel, interval: 2 } },
        yAxis: { type: 'category', data: WEEKDAYS, inverse: true, ...axis },
        visualMap: {
          min: 0,
          max,
          calculable: false,
          orient: 'horizontal',
          left: 'center',
          bottom: 0,
          itemHeight: 120,
          textStyle: { fontFamily: MONO, color: INK },
          inRange: { color: [PAPER, COLORS.yellow, COLORS.orange, COLORS.pink] },
        },
        tooltip: {
          ...tooltip,
          formatter: (p: { value: number[] }) => `${WEEKDAYS[p.value[1]]} ${p.value[0]}h<br/><b>${fmt(p.value[2])}</b> mensagens`,
        },
        series: [{ type: 'heatmap', data, itemStyle: { borderColor: INK, borderWidth: 1, borderRadius: 2 } }],
      }}
    />
  )
}

/** Quadrante "perfil de comunicação": quantidade × tamanho médio */
export function ProfileScatter({ profile, height = 340 }: { profile: AnalysisResult['rankings']['profile']; height?: number }) {
  return (
    <Chart
      height={height}
      option={{
        grid: { left: 8, right: 24, top: 24, bottom: 8, containLabel: true },
        xAxis: {
          type: 'value', name: 'mensagens', nameLocation: 'end', nameTextStyle: { fontFamily: MONO, color: INK }, ...axis,
          axisLabel: { ...axis.axisLabel, formatter: (v: number) => fmt(v) },
        },
        yAxis: { type: 'value', name: 'caracteres/msg', nameTextStyle: { fontFamily: MONO, color: INK }, ...axis, scale: true },
        tooltip: {
          ...tooltip,
          formatter: (p: { value: [number, number, string] }) => `<b>${p.value[2]}</b><br/>${fmt(p.value[0])} mensagens<br/>${p.value[1].toFixed(1)} caracteres/msg`,
        },
        series: [{
          type: 'scatter',
          symbolSize: 22,
          data: profile.people.map((p, i) => ({
            value: [p.messages, p.avgChars, p.name],
            itemStyle: { color: SERIES[i % SERIES.length], borderColor: INK, borderWidth: 2 },
          })),
          label: { show: true, position: 'right', formatter: (p: { value: [number, number, string] }) => p.value[2], fontFamily: MONO, fontWeight: 700, color: INK },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: INK, type: 'dashed', width: 2 },
            label: { show: false },
            data: [{ xAxis: profile.medianMessages }, { yAxis: profile.medianAvgChars }],
          },
        }],
      }}
    />
  )
}

/** Rede de quem responde quem: espessura da linha = quantidade de respostas */
export function InteractionGraph({ people, pairs, height = 420 }: {
  people: Counted[]
  pairs: AnalysisResult['interactions']['topPairs']
  height?: number
}) {
  const maxMsgs = Math.max(1, ...people.map((p) => p.count))
  const maxPair = Math.max(1, ...pairs.map((p) => p.count))
  return (
    <Chart
      height={height}
      option={{
        tooltip: {
          ...tooltip,
          formatter: (p: { dataType: string; data: { name?: string; source?: string; target?: string; value: number } }) =>
            p.dataType === 'edge'
              ? `${p.data.source} ↔ ${p.data.target}<br/><b>${fmt(p.data.value)}</b> respostas`
              : `<b>${p.data.name}</b><br/>${fmt(p.data.value)} mensagens`,
        },
        series: [{
          type: 'graph',
          layout: 'circular',
          circular: { rotateLabel: false },
          roam: false,
          label: { show: true, position: 'bottom', fontFamily: MONO, fontWeight: 700, color: INK, distance: 6 },
          data: people.map((p, i) => ({
            name: p.name,
            value: p.count,
            symbolSize: 18 + 42 * Math.sqrt(p.count / maxMsgs),
            itemStyle: { color: SERIES[i % SERIES.length], borderColor: INK, borderWidth: 3 },
          })),
          links: pairs.map((p) => ({
            source: p.a,
            target: p.b,
            value: p.count,
            lineStyle: { width: 1 + 9 * (p.count / maxPair), color: INK, opacity: 0.25 + 0.75 * (p.count / maxPair), curveness: 0.15 },
          })),
          emphasis: { focus: 'adjacency', lineStyle: { opacity: 1 } },
        }],
      }}
    />
  )
}

/** Matriz "quem responde quem" (linhas: quem falou antes; colunas: quem respondeu) */
export function ReplyMatrix({ matrix, height }: { matrix: AnalysisResult['interactions']['matrix']; height?: number }) {
  const { people, counts, normalized } = matrix
  const data = normalized.flatMap((row, i) => row.map((v, j) => [j, i, Math.round(v * 100), counts[i][j]]))
  return (
    <Chart
      height={height ?? Math.max(240, people.length * 44 + 80)}
      option={{
        grid: { left: 8, right: 8, top: 8, bottom: 8, containLabel: true },
        xAxis: { type: 'category', data: people, position: 'top', ...axis, axisLabel: { ...axis.axisLabel, rotate: 35 } },
        yAxis: { type: 'category', data: people, inverse: true, ...axis },
        visualMap: { show: false, min: 0, max: 100, inRange: { color: [PAPER, COLORS.cyan, COLORS.blue] } },
        tooltip: {
          ...tooltip,
          formatter: (p: { value: number[] }) => `${people[p.value[0]]} respondeu ${people[p.value[1]]}<br/><b>${fmt(p.value[3])}</b> vezes (${p.value[2]}%)`,
        },
        series: [{
          type: 'heatmap',
          data,
          label: { show: true, fontFamily: MONO, fontSize: 11, color: INK, formatter: (p: { value: number[] }) => (p.value[2] ? `${p.value[2]}%` : '') },
          itemStyle: { borderColor: INK, borderWidth: 1 },
        }],
      }}
    />
  )
}

/** Palavras acompanhadas ao longo do tempo */
export function TrackedWordsLines({ tracked, height = 300 }: { tracked: TrackedWord[]; height?: number }) {
  const months = tracked[0]?.byMonth.map((m) => monthShort(m.month)) ?? []
  return (
    <Chart
      height={height}
      option={{
        grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
        legend: { top: 0, textStyle: { fontFamily: MONO, color: INK }, itemStyle: { borderColor: INK, borderWidth: 2 } },
        xAxis: { type: 'category', data: months, ...axis },
        yAxis: { type: 'value', ...axis, minInterval: 1 },
        tooltip: { ...tooltip, trigger: 'axis' },
        series: tracked.map((t, i) => ({
          type: 'line',
          name: t.word,
          data: t.byMonth.map((m) => m.count),
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { width: 3, color: SERIES[i % SERIES.length] },
          itemStyle: { color: SERIES[i % SERIES.length], borderColor: INK, borderWidth: 2 },
        })),
      }}
    />
  )
}

/** Faixas de tamanho das conversas */
export function ConversationBuckets({ buckets, height = 220 }: { buckets: { label: string; count: number }[]; height?: number }) {
  return (
    <ColumnBars
      labels={buckets.map((b) => b.label)}
      values={buckets.map((b) => b.count)}
      color="#ffffff"
      highlight={COLORS.cyan}
      height={height}
    />
  )
}
