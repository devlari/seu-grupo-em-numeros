// Textos dos prêmios e destaques. Cada um tem várias versões; todas citam os mesmos fatos (números, meses, nomes).
// As regras de quando cada um aparece ficam em insights.ts.
// Os textos falam da pessoa sem flexão de gênero ("essa pessoa", nunca "ele"/"ela").

type Variants<P> = ((p: P) => string)[]

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const WEEKDAYS = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo']

export const n = (v: number) => v.toLocaleString('pt-BR')
export const pct = (v: number) => `${Math.round(v * 100)}%`
export const plural = (count: number, one: string, many: string) => `${n(count)} ${count === 1 ? one : many}`
export const monthLabel = (month: string) => {
  const [y, m] = month.split('-')
  return `${MONTHS[Number(m) - 1]}/${y}`
}
export const dateLabel = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/')
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const weekday = (d: number) => WEEKDAYS[d]
/** "na terça", "no sábado" */
const onWeekday = (d: number) => `${d >= 5 ? 'no' : 'na'} ${WEEKDAYS[d]}`
const msgs = (count: number) => plural(count, 'mensagem', 'mensagens')
const listNames = (names: string[]) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} e ${names.at(-1)}`

// ---------------------------------------------------------------------------
// Prêmios (detalhe embaixo do nome de quem ganhou)
// ---------------------------------------------------------------------------

/** "uma a cada 14 mensagens" / "praticamente toda mensagem" (o sujeito é a mensagem: "...tem risada") */
export function every(rate: number): string {
  const each = Math.round(1 / rate)
  return each <= 1 ? 'praticamente toda mensagem' : `uma a cada ${each} mensagens`
}

export const AWARD_TEXTS = {
  chatterbox: [
    (p) => `${msgs(p.messages)}, ${pct(p.share)} de tudo que foi dito no grupo`,
    (p) => `${pct(p.share)} das mensagens saíram desse teclado, ${n(p.messages)} no total`,
    (p) => `${msgs(p.messages)}: o grupo é quase um monólogo com plateia`,
    (p) => `se o grupo fosse um podcast, ${pct(p.share)} do microfone seria dessa pessoa: ${msgs(p.messages)}`,
  ] as Variants<{ messages: number; share: number }>,

  ghost: [
    (p) => `só ${msgs(p.messages)} em ${plural(p.days, 'dia', 'dias')} de grupo`,
    (p) => `${msgs(p.messages)} em ${plural(p.days, 'dia', 'dias')}: visualiza tudo, responde quase nada`,
    (p) => `${msgs(p.messages)} em ${plural(p.days, 'dia', 'dias')}. Alguém confirma se ainda tem sinal de vida?`,
  ] as Variants<{ messages: number; days: number }>,

  clown: [
    (p) => `proporcionalmente, quem mais ri: ${plural(p.count, 'risada', 'risadas')}, em ${every(p.rate)}`,
    (p) => `${every(p.rate)} tem risada: o kkkk virou pontuação (${plural(p.count, 'risada', 'risadas')} no total)`,
    (p) => `riu em ${every(p.rate)}, mais que qualquer pessoa proporcionalmente. Tudo é piada`,
  ] as Variants<{ count: number; rate: number }>,

  pottyMouth: [
    (p) => `proporcionalmente, a boca mais suja: ${every(p.rate)} tem palavrão (${n(p.count)} no total)`,
    (p) => `${every(p.rate)} tem palavrão. A família sabe disso?`,
    (p) => `${every(p.rate)} tem palavrão, a maior proporção do grupo. Esse teclado precisa de um banho`,
  ] as Variants<{ count: number; rate: number }>,

  nightOwl: [
    (p) => `${msgs(p.count)} entre meia-noite e 6h`,
    (p) => `${msgs(p.count)} de madrugada. Dormir é opcional`,
    (p) => `mandou ${msgs(p.count)} entre meia-noite e 6h, enquanto o resto do grupo dormia`,
  ] as Variants<{ count: number }>,

  organizer: [
    (p) => `criou ${plural(p.count, 'enquete', 'enquetes')}`,
    (p) => `${plural(p.count, 'enquete criada', 'enquetes criadas')}. A democracia agradece`,
    (p) => `${plural(p.count, 'enquete', 'enquetes')}: se tem rolê, tem votação`,
  ] as Variants<{ count: number }>,

  novelist: [
    (p) => `média de ${n(p.avg)} caracteres por mensagem`,
    (p) => `${n(p.avg)} caracteres por mensagem, em média. Não manda mensagem, manda textão`,
    (p) => `cada mensagem tem ${n(p.avg)} caracteres em média: praticamente um capítulo`,
  ] as Variants<{ avg: number }>,

  telegraph: [
    (p) => `só ${n(p.avg)} caracteres por mensagem, em média`,
    (p) => `média de ${n(p.avg)} caracteres. Pra que frase, se dá pra mandar "ok"?`,
    (p) => `${n(p.avg)} caracteres por mensagem: direto ao ponto, sempre`,
  ] as Variants<{ avg: number }>,

  paparazzi: [
    (p) => `proporcionalmente, quem mais manda foto, vídeo, áudio e figurinha: ${every(p.rate)} é mídia`,
    (p) => `${every(p.rate)} é mídia (${n(p.count)} no total). Pra que escrever, né?`,
    (p) => `${every(p.rate)} é mídia, a maior proporção do grupo. A memória do celular de todo mundo sofre`,
  ] as Variants<{ count: number; rate: number }>,

  starter: [
    (p) => `começou ${plural(p.count, 'conversa', 'conversas')}, proporcionalmente mais que qualquer pessoa`,
    (p) => `tirou o grupo do silêncio ${plural(p.count, 'vez', 'vezes')}: ${every(p.rate)} abre conversa`,
    (p) => `quebrou o gelo ${plural(p.count, 'vez', 'vezes')}, a maior proporção do grupo`,
  ] as Variants<{ count: number; rate: number }>,

  conversationKiller: [
    (p) => `mandou a última mensagem antes do silêncio ${plural(p.count, 'vez', 'vezes')}, proporcionalmente mais que qualquer pessoa`,
    (p) => `${every(p.rate)} é a última antes do silêncio. Coincidência?`,
    (p) => `encerrou ${plural(p.count, 'conversa', 'conversas')}, a maior proporção do grupo. Depois dessa mensagem, silêncio`,
  ] as Variants<{ count: number; rate: number }>,

  talkingAlone: [
    (p) => `${plural(p.count, 'vez', 'vezes')} mandou mensagem e ninguém respondeu, a maior proporção do grupo`,
    (p) => `${every(p.rate)} fica sem resposta (${n(p.count)} no total)`,
    (p) => `falou com as paredes ${plural(p.count, 'vez', 'vezes')}, proporcionalmente mais que qualquer pessoa`,
  ] as Variants<{ count: number; rate: number }>,

  regret: [
    (p) => `apagou ${msgs(p.count)}`,
    (p) => `${plural(p.count, 'mensagem apagada', 'mensagens apagadas')}. O que será que dizia?`,
    (p) => `apagou ${msgs(p.count)}. Alguém tirou print?`,
  ] as Variants<{ count: number }>,

  editor: [
    (p) => `editou ${msgs(p.count)} depois de mandar`,
    (p) => `${plural(p.count, 'mensagem editada', 'mensagens editadas')}. Revisão é tudo`,
    (p) => `editou ${msgs(p.count)}: errou, corrigiu, segue o jogo`,
  ] as Variants<{ count: number }>,

  inseparable: [
    (p) => `${plural(p.count, 'resposta trocada', 'respostas trocadas')} na dupla`,
    (p) => `${plural(p.count, 'resposta trocada', 'respostas trocadas')}. O resto do grupo é figurante`,
    (p) => `${n(p.count)} respostas entre as duas pessoas. Já pensaram num grupo só de vocês?`,
  ] as Variants<{ count: number }>,
}

// ---------------------------------------------------------------------------
// Destaques
// ---------------------------------------------------------------------------

export const HIGHLIGHT_TEXTS = {
  originWithName: [
    (p) => `O grupo nasceu em ${dateLabel(p.createdAt)} como "${p.firstName}" e já teve ${plural(p.names, 'nome', 'nomes')}.`,
    (p) => `Antes de ser o que é hoje, o grupo se chamava "${p.firstName}" (desde ${dateLabel(p.createdAt)}). Já foram ${plural(p.names, 'nome', 'nomes')}.`,
    (p) => `Certidão de nascimento: ${dateLabel(p.createdAt)}, com o nome "${p.firstName}". De lá pra cá, ${plural(p.names, 'nome', 'nomes')}.`,
  ] as Variants<{ createdAt: string; firstName: string; names: number }>,

  origin: [
    (p) => `O grupo nasceu em ${dateLabel(p.createdAt)}.`,
    (p) => `Certidão de nascimento do grupo: ${dateLabel(p.createdAt)}.`,
  ] as Variants<{ createdAt: string }>,

  busiestDay: [
    (p) => `${dateLabel(p.date)} foi o dia mais caótico: ${msgs(p.count)} num dia só.`,
    (p) => `Ninguém fez mais nada em ${dateLabel(p.date)}: foram ${msgs(p.count)} no grupo.`,
    (p) => `${dateLabel(p.date)} entrou pra história com ${msgs(p.count)}. O que aconteceu nesse dia?`,
  ] as Variants<{ date: string; count: number }>,

  activeDays: [
    (p) => `Teve mensagem em ${pct(p.active / p.span)} dos dias (${n(p.active)} de ${n(p.span)}).`,
    (p) => `Em ${pct(p.active / p.span)} dos dias alguém mandou alguma coisa (${n(p.active)} de ${n(p.span)}).`,
    (p) => `${plural(p.span - p.active, 'dia', 'dias')} de silêncio total em ${n(p.span)}: teve mensagem em ${pct(p.active / p.span)} dos dias.`,
  ] as Variants<{ active: number; span: number }>,

  officeHours: [
    (p) => `Grupo comercial: ${pct(p.share)} das mensagens saem de segunda a sexta, das 9h às 18h. Alguém está trabalhando?`,
    (p) => `${pct(p.share)} das mensagens saem em horário comercial. O chefe sabe?`,
    (p) => `Expediente do grupo: segunda a sexta, das 9h às 18h, com ${pct(p.share)} das mensagens. Produtividade em alta (no grupo).`,
  ] as Variants<{ share: number }>,

  weekendDrop: [
    (p) => `Fim de semana despenca: um sábado ou domingo tem ${pct(p.drop)} menos mensagens que um dia útil.`,
    (p) => `No fim de semana o grupo descansa: ${pct(p.drop)} menos mensagens que num dia útil.`,
    (p) => `Sábado e domingo ficam ${pct(p.drop)} mais quietos que um dia útil. Todo mundo vivendo a vida (ou dormindo).`,
  ] as Variants<{ drop: number }>,

  weekendGroup: [
    (p) => `Grupo de fim de semana: sábado e domingo têm ${pct(p.gain)} mais mensagens que um dia útil.`,
    (p) => `O grupo acorda no sábado: o fim de semana tem ${pct(p.gain)} mais mensagens que um dia útil.`,
  ] as Variants<{ gain: number }>,

  busiestWeekday: [
    (p) => `${cap(weekday(p.day))} é o dia mais agitado, com ${pct(p.share)} das mensagens.`,
    (p) => `${cap(onWeekday(p.day))} o grupo pega fogo: ${pct(p.share)} das mensagens.`,
    (p) => `${cap(weekday(p.day))} é o dia oficial do grupo: ${pct(p.share)} das mensagens.`,
  ] as Variants<{ day: number; share: number }>,

  deadWeekday: [
    (p) => `${cap(weekday(p.day))} é o dia morto do grupo: só ${pct(p.share)} das mensagens.`,
    (p) => `${cap(onWeekday(p.day))} o grupo vira cemitério: só ${pct(p.share)} das mensagens.`,
    (p) => `${cap(weekday(p.day))}? Silêncio. Só ${pct(p.share)} das mensagens.`,
  ] as Variants<{ day: number; share: number }>,

  primeTime: [
    (p) => `O horário nobre é das ${p.hour}h às ${(p.hour + 1) % 24}h.`,
    (p) => `Quer que leiam? Mande entre ${p.hour}h e ${(p.hour + 1) % 24}h, o horário mais movimentado.`,
    (p) => `O pico do grupo é das ${p.hour}h às ${(p.hour + 1) % 24}h.`,
  ] as Variants<{ hour: number }>,

  nightGroup: [
    (p) => `Ninguém dorme: ${pct(p.share)} das mensagens saem entre meia-noite e 6h.`,
    (p) => `${pct(p.share)} das mensagens saem de madrugada. Insônia coletiva?`,
  ] as Variants<{ share: number }>,

  bestMonth: [
    (p) => `${cap(monthLabel(p.month))} foi o auge do grupo: ${msgs(p.count)}.`,
    (p) => `Os tempos áureos: ${monthLabel(p.month)}, com ${msgs(p.count)}.`,
    (p) => `Em ${monthLabel(p.month)} o grupo bateu recorde: ${msgs(p.count)}.`,
  ] as Variants<{ month: string; count: number }>,

  worstMonth: [
    (p) => `${cap(monthLabel(p.month))} foi o mês mais parado: ${msgs(p.count)}.`,
    (p) => `Em ${monthLabel(p.month)} o grupo hibernou: só ${msgs(p.count)}.`,
    (p) => `${cap(monthLabel(p.month))} foi tão quieto que parecia grupo de condomínio: ${msgs(p.count)}.`,
  ] as Variants<{ month: string; count: number }>,

  drop: [
    (p) => `Queda brusca em ${monthLabel(p.month)}: ${pct(p.change)} menos mensagens que nos três meses anteriores.`,
    (p) => `Em ${monthLabel(p.month)} o grupo esfriou: ${pct(p.change)} menos mensagens que nos três meses anteriores.`,
    (p) => `${cap(monthLabel(p.month))}: alguém brigou? As mensagens caíram ${pct(p.change)} em relação aos três meses anteriores.`,
  ] as Variants<{ month: string; change: number }>,

  revivalWithNewcomers: [
    (p) => `O grupo ressurgiu em ${monthLabel(p.month)}: ${pct(p.change)} mais mensagens que ${p.comparedTo}, logo quando ${listNames(p.newcomers)} ${p.newcomers.length === 1 ? 'chegou' : 'chegaram'}.`,
    (p) => `${listNames(p.newcomers)} ${p.newcomers.length === 1 ? 'chegou' : 'chegaram'} e o grupo voltou à vida: em ${monthLabel(p.month)}, ${pct(p.change)} mais mensagens que ${p.comparedTo}.`,
    (p) => `Coincidência? ${listNames(p.newcomers)} ${p.newcomers.length === 1 ? 'entrou' : 'entraram'} e, em ${monthLabel(p.month)}, o grupo teve ${pct(p.change)} mais mensagens que ${p.comparedTo}.`,
  ] as Variants<{ month: string; change: number; comparedTo: string; newcomers: string[] }>,

  revival: [
    (p) => `O grupo ressurgiu em ${monthLabel(p.month)}: ${pct(p.change)} mais mensagens que ${p.comparedTo}.`,
    (p) => `Em ${monthLabel(p.month)} o grupo voltou à vida: ${pct(p.change)} mais mensagens que ${p.comparedTo}.`,
  ] as Variants<{ month: string; change: number; comparedTo: string }>,

  trendDown: [
    (p) => `Estamos numa queda: ${monthLabel(p.month)} teve ${pct(p.change)} menos mensagens que a média. Hora de chamar gente nova pro grupo?`,
    (p) => `Sinal de alerta: ${monthLabel(p.month)} teve ${pct(p.change)} menos mensagens que a média. Alguém puxa um assunto?`,
    (p) => `O grupo anda quieto: ${monthLabel(p.month)} ficou ${pct(p.change)} abaixo da média. Tá precisando de um rolê.`,
  ] as Variants<{ month: string; change: number }>,

  trendUp: [
    (p) => `Fase boa: ${monthLabel(p.month)} teve ${pct(p.change)} mais mensagens que a média.`,
    (p) => `O grupo está on fire: ${monthLabel(p.month)} teve ${pct(p.change)} mais mensagens que a média.`,
  ] as Variants<{ month: string; change: number }>,

  longestConversation: [
    (p) => `A maior conversa teve ${n(p.messages)} mensagens sem pausa, em ${p.duration}, no dia ${dateLabel(p.date)}.`,
    (p) => `Em ${dateLabel(p.date)} rolou uma maratona: ${n(p.messages)} mensagens seguidas em ${p.duration}.`,
    (p) => `Recorde de papo: ${n(p.messages)} mensagens em ${p.duration}, no dia ${dateLabel(p.date)}, sem ninguém respirar.`,
  ] as Variants<{ messages: number; duration: string; date: string }>,

  mostVotedPoll: [
    (p) => `A enquete mais votada foi "${p.question}", com ${plural(p.votes, 'voto', 'votos')}.`,
    (p) => `"${p.question}" mobilizou o grupo: ${plural(p.votes, 'voto', 'votos')}, recorde entre as enquetes.`,
  ] as Variants<{ question: string; votes: number }>,

  ignoredPolls: [
    (p) => `${plural(p.count, 'enquete ficou', 'enquetes ficaram')} sem nenhum voto.`,
    (p) => `${plural(p.count, 'enquete ficou', 'enquetes ficaram')} no vácuo, com zero votos.`,
    (p) => `Democracia em crise: ${plural(p.count, 'enquete teve', 'enquetes tiveram')} zero votos.`,
  ] as Variants<{ count: number }>,
}

// ---------------------------------------------------------------------------
// Escolha da versão
// ---------------------------------------------------------------------------

/** FNV-1a: hash simples e estável, pra mesma entrada dar sempre a mesma versão */
function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * Escolhe uma versão de texto. A escolha depende da semente e de uma chave do fato
 * (ex.: quem ganhou, o mês), então o mesmo grupo vê sempre a mesma frase até sortear de novo.
 */
export function pickText<P>(variants: Variants<P>, params: P, key: string, seed: number): string {
  return variants[hash(`${seed}|${key}`) % variants.length](params)
}
