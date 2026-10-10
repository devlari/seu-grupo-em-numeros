// Tema neobrutalista pros gráficos: contorno preto em tudo, sem grade, rótulos em mono

export const INK = '#000000'
export const PAPER = '#fffdf5'
export const COLORS = {
  pink: '#ff4fa3',
  lime: '#d7ff3a',
  blue: '#2f5bff',
  orange: '#ff6b1a',
  cyan: '#3de0ff',
  violet: '#9b5cff',
  yellow: '#ffd60a',
}
/** Ordem das cores quando cada pessoa ou série precisa de uma */
export const SERIES = [COLORS.pink, COLORS.blue, COLORS.lime, COLORS.orange, COLORS.cyan, COLORS.violet, COLORS.yellow]

export const MONO = 'Space Mono, ui-monospace, monospace'
export const DISPLAY = 'Archivo Black, Arial Black, sans-serif'

export const axis = {
  axisLine: { show: true, lineStyle: { color: INK, width: 2 } },
  axisTick: { show: false },
  axisLabel: { color: INK, fontFamily: MONO, fontSize: 11 },
  splitLine: { show: false },
}

export const barItem = (color: string) => ({
  color,
  borderColor: INK,
  borderWidth: 2,
  borderRadius: 4,
})

export const tooltip = {
  trigger: 'item' as const,
  backgroundColor: '#ffffff',
  borderColor: INK,
  borderWidth: 2,
  textStyle: { color: INK, fontFamily: MONO, fontSize: 12 },
  extraCssText: 'box-shadow: 3px 3px 0 #000; border-radius: 8px;',
}

export const fmt = (v: number) => v.toLocaleString('pt-BR')
