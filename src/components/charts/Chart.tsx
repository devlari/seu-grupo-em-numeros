// Versão ESM: a de lib/ é CommonJS e chega embrulhada no build de produção (erro #130 do React)
import ReactEChartsCore from 'echarts-for-react/esm/core'
import { BarChart, GraphChart, HeatmapChart, LineChart, ScatterChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import type { CSSProperties } from 'react'

// Só os pedaços do ECharts que o site usa, pra o pacote ficar menor
echarts.use([
  BarChart, GraphChart, HeatmapChart, LineChart, ScatterChart,
  GridComponent, LegendComponent, MarkLineComponent, TooltipComponent, VisualMapComponent,
  SVGRenderer,
])

export type ChartOption = echarts.EChartsCoreOption

export function Chart({ option, height = 280, style }: { option: ChartOption; height?: number; style?: CSSProperties }) {
  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      notMerge
      lazyUpdate
      // SVG fica nítido em qualquer tamanho e sai bem na exportação de imagem (Fase 6)
      opts={{ renderer: 'svg' }}
      style={{ height, width: '100%', ...style }}
    />
  )
}
