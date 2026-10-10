import type { LocalDate, LocalDateTime, Month } from './types.ts'

const URL_PATTERN = /(https?:\/\/|www\.)\S+/gi

export function removeLinks(text: string): string {
  return text.replace(URL_PATTERN, '')
}

/** Minúsculas e sem acento, pra comparar "Você" com "voce" */
export function fold(word: string): string {
  return word.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
}

/** Palavras de um texto, sem links, pontuação nem emoji, em minúsculas */
export function tokenize(text: string): string[] {
  return removeLinks(text).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
}

/** Conta caracteres visíveis (emoji conta 1) */
export function charCount(text: string): number {
  return [...text].length
}

// kkkk, kkkjjj, kakaka, hahaha, hehe, huehue, rsrs, ksksks, jajaja
const LAUGH_PATTERNS = [
  /^(?=(?:[^k]*k){2})[kjsahç]+$/,
  /^a?(?:ha){2,}h?$/,
  /^e?(?:he){2,}h?$/,
  /^(?:hue){2,}$/,
  /^(?:rs)+$/,
  /^(?:ja){2,}$/,
]

export function isLaugh(token: string): boolean {
  const t = fold(token)
  if (t.length < 2) return false
  if (LAUGH_PATTERNS.some((p) => p.test(t))) return true
  // Risada grudada no fim da palavra: "elekkkkk", "caraiokkkk"
  if (/k{3,}$/.test(t)) return true
  return isKeyboardSmash(t)
}

/**
 * Teclado esmagado com k: "dkskskskksk", "ksgksgksg", "kxkxkx".
 * Quase sem vogal, o que separa de palavras como "tiktok" e "karaoke".
 */
function isKeyboardSmash(t: string): boolean {
  if (t.length < 5 || !/^[a-z]+$/.test(t)) return false
  const ks = t.split('k').length - 1
  const vowels = t.match(/[aeiou]/g)?.length ?? 0
  return ks >= 2 && vowels / t.length < 0.2
}

export function isOnlyLaughs(text: string): boolean {
  const tokens = tokenize(text)
  return tokens.length > 0 && tokens.every(isLaugh)
}

export const DEFAULT_SWEAR_WORDS = [
  'porra', 'caralho', 'krl', 'crl', 'merda', 'bosta', 'puta', 'puto', 'putaria', 'foda', 'fodase',
  'foder', 'fuder', 'fodido', 'vsf', 'fdp', 'pqp', 'tnc', 'cacete', 'desgraça', 'desgraçado',
  'desgraçada', 'cu', 'cuzão', 'buceta', 'arrombado', 'arrombada', 'piranha', 'otário', 'otária',
]

// Artigos, pronomes, preposições, conjunções, verbos auxiliares e vícios de chat.
// Comparação feita sem acento, então "voce" cobre "você".
const STOPWORDS_PT = `
a o as os um uma uns umas de da do das dos dum duma em na no nas nos num numa por pra pro pras
pros para pelo pela pelos pelas com sem sob sobre ate apos ante entre contra desde perante
e ou mas porem pois porque por que quem qual quais quanto quanta quantos quantas cujo cuja como
onde quando se nem ja nao sim tambem so entao mais menos muito muita muitos muitas pouco pouca
tao tanto tanta bem mal la ali aqui ai aquele aquela aqueles aquelas aquilo este esta estes estas
isto esse essa esses essas isso tudo todo toda todos todas nada algo alguem ninguem cada outro
outra outros outras mesmo mesma mesmos mesmas proprio propria
eu tu ele ela nos vos eles elas voce voces vc vcs me te lhe lhes se mim ti si comigo contigo
conosco meu minha meus minhas teu tua teus tuas seu sua seus suas nosso nossa nossos nossas dele
dela deles delas
ser sou es e somos sao era eram fui foi fomos foram seja sejam sera serao seria
estar estou esta estamos estao estava estavam estive esteve estivemos estiveram esteja
ter tenho tem temos tinha tinham tive teve tivemos tiveram tenha tera teria
haver ha havia houve hei
ir vou vai vamos vao ia iam
fazer faz fez faco
poder pode posso podia pude
q pq tb tbm ne n eh oq td mt mto msm vdd pfv pls blz vlw obg
`
const STOPWORDS_EN = `
the a an and or but of to in on at for with is are was were be been it this that i you he she we
they my your his her our their me him us them not no yes so just do does did have has had will
`

export const STOPWORDS = new Set(`${STOPWORDS_PT} ${STOPWORDS_EN}`.split(/\s+/).filter(Boolean))

export function isStopword(token: string): boolean {
  return STOPWORDS.has(fold(token))
}

const pad = (n: number) => String(n).padStart(2, '0')

export function toMonth(d: Date): Month {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function toLocalDate(d: Date): LocalDate {
  return `${toMonth(d)}-${pad(d.getDate())}`
}

export function toLocalDateTime(d: Date): LocalDateTime {
  return `${toLocalDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** Todos os meses de `from` até `to`, inclusive */
export function monthRange(from: Date, to: Date): Month[] {
  const months: Month[] = []
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1)
  const end = new Date(to.getFullYear(), to.getMonth(), 1)
  while (cursor <= end) {
    months.push(toMonth(cursor))
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return months
}

/** Segunda = 0 ... domingo = 6 (o JS começa no domingo) */
export function weekdayMondayFirst(d: Date): number {
  return (d.getDay() + 6) % 7
}
