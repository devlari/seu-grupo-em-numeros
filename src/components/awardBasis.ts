import type { Award } from '../lib/analysis/index.ts'

/** Etiqueta do critério do prêmio, quando não é o total simples */
export const BASIS_LABEL: Record<Award['basis'], string | null> = {
  total: null,
  rate: 'proporcional',
  average: 'média',
}
