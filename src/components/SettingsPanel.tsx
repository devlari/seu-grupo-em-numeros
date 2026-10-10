import { useMemo, useState } from 'react'
import { phoneLabels, type AnalysisOptions, type CustomRanking } from '../lib/analysis/index.ts'
import type { ParsedChat } from '../lib/whatsapp/index.ts'
import { parseTerms } from '../settings.ts'

interface Props {
  chat: ParsedChat
  options: AnalysisOptions
  onChange: (options: AnalysisOptions) => void
}

const toInputDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function SettingsPanel({ chat, options, onChange }: Props) {
  const update = (patch: Partial<AnalysisOptions>) => onChange({ ...options, ...patch })

  return (
    <section className="panel">
      <h2>Configurar análise</h2>
      <fieldset>
        <legend>Nome do grupo</legend>
        <input
          type="text"
          value={options.groupName ?? ''}
          placeholder="O grupo"
          onChange={(e) => update({ groupName: e.target.value || undefined })}
        />
        <p className="hint">Aparece nos títulos: "{options.groupName?.trim() || 'O grupo'} em números".</p>
      </fieldset>
      <People chat={chat} options={options} update={update} />
      <Period chat={chat} options={options} update={update} />

      <fieldset>
        <legend>Palavras acompanhadas ao longo do tempo</legend>
        <p className="hint">Separe por vírgula. Ex.: prova, festa, trabalho, aniversário</p>
        <TermsInput value={options.trackedWords ?? []} onChange={(trackedWords) => update({ trackedWords })} />
      </fieldset>

      <CustomRankings value={options.customRankings ?? []} onChange={(customRankings) => update({ customRankings })} />
    </section>
  )
}

type SectionProps = Pick<Props, 'chat' | 'options'> & { update: (patch: Partial<AnalysisOptions>) => void }

function People({ chat, options, update }: SectionProps) {
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of chat.messages) if (m.author) map.set(m.author, (map.get(m.author) ?? 0) + 1)
    return map
  }, [chat])
  const people = [...chat.participants].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))
  const excluded = new Set(options.excludeAuthors ?? [])
  const aliases = options.aliases ?? {}
  const phones = useMemo(() => phoneLabels(chat.participants), [chat])
  const unnamed = people.filter((p) => phones.has(p) && !aliases[p] && !excluded.has(p))

  function toggle(name: string, include: boolean) {
    const next = new Set(excluded)
    if (include) next.delete(name)
    else next.add(name)
    update({ excludeAuthors: [...next] })
  }

  function rename(name: string, value: string) {
    const next = { ...aliases }
    const alias = value.trim()
    if (alias && alias !== name) next[name] = alias
    else delete next[name]
    update({ aliases: next })
  }

  return (
    <fieldset>
      <legend>Pessoas</legend>
      <p className="hint">
        Desmarque quem não deve entrar na análise. Para juntar duas pessoas (ex.: número antigo e novo),
        dê o mesmo nome às duas em "Aparece como".
      </p>
      {unnamed.length > 0 && (
        <p className="notice">
          📵 {unnamed.length === 1 ? '1 contato aparece' : `${unnamed.length} contatos aparecem`} só como número, porque
          não {unnamed.length === 1 ? 'está salvo' : 'estão salvos'} no celular de quem exportou (o WhatsApp não exporta o
          nome do perfil). Nos resultados, o número fica escondido, tipo "{phones.get(unnamed[0])}". Dê um nome em
          "Aparece como" pra aparecer bonito.
        </p>
      )}
      <table>
        <thead>
          <tr><th>Incluir</th><th>Nome no export</th><th>Mensagens</th><th>Aparece como</th></tr>
        </thead>
        <tbody>
          {people.map((name) => (
            <tr key={name} className={excluded.has(name) ? 'muted' : unnamed.includes(name) ? 'unnamed' : undefined}>
              <td>
                <input
                  type="checkbox"
                  aria-label={`Incluir ${name}`}
                  checked={!excluded.has(name)}
                  onChange={(e) => toggle(name, e.target.checked)}
                />
              </td>
              <td>
                {name}
                {phones.has(name) && <span className="badge">sem nome</span>}
              </td>
              <td className="num">{(counts.get(name) ?? 0).toLocaleString('pt-BR')}</td>
              <td>
                <input
                  type="text"
                  list="participants"
                  placeholder={phones.get(name) ?? name}
                  defaultValue={aliases[name] ?? ''}
                  disabled={excluded.has(name)}
                  onBlur={(e) => rename(name, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <datalist id="participants">
        {chat.participants.filter((p) => !phones.has(p)).map((p) => <option key={p} value={p} />)}
      </datalist>
    </fieldset>
  )
}

function Period({ chat, options, update }: SectionProps) {
  const range = useMemo(() => {
    const times = chat.messages.filter((m) => m.author).map((m) => m.timestamp.getTime())
    if (times.length === 0) return null
    return {
      min: toInputDate(new Date(times.reduce((a, b) => Math.min(a, b)))),
      max: toInputDate(new Date(times.reduce((a, b) => Math.max(a, b)))),
    }
  }, [chat])
  if (!range) return null

  const period = options.period ?? {}
  const set = (patch: { from?: string; to?: string }) => {
    const next = { ...period, ...patch }
    update({ period: next.from || next.to ? next : undefined })
  }

  return (
    <fieldset>
      <legend>Período</legend>
      <label>
        De <input type="date" min={range.min} max={period.to ?? range.max} value={period.from ?? ''}
          onChange={(e) => set({ from: e.target.value || undefined })} />
      </label>{' '}
      <label>
        até <input type="date" min={period.from ?? range.min} max={range.max} value={period.to ?? ''}
          onChange={(e) => set({ to: e.target.value || undefined })} />
      </label>{' '}
      {options.period && <button type="button" onClick={() => update({ period: undefined })}>Conversa toda</button>}
      <p className="hint">Sem datas, analisa a conversa toda ({range.min.split('-').reverse().join('/')} a {range.max.split('-').reverse().join('/')}).</p>
    </fieldset>
  )
}

function CustomRankings({ value, onChange }: { value: CustomRanking[]; onChange: (v: CustomRanking[]) => void }) {
  const set = (i: number, patch: Partial<CustomRanking>) => onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  return (
    <fieldset>
      <legend>Rankings livres</legend>
      <p className="hint">Crie um ranking com as palavras que quiser. Ex.: "Ranking do rolê" com bar, festa, cerveja.</p>
      {value.map((ranking, i) => (
        <div key={i} className="ranking-row">
          <input
            type="text"
            placeholder="Nome do ranking"
            value={ranking.label}
            onChange={(e) => set(i, { label: e.target.value })}
          />
          <TermsInput value={ranking.terms} onChange={(terms) => set(i, { terms })} placeholder="palavras, separadas, por vírgula" />
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}>Remover</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, { label: '', terms: [] }])}>Adicionar ranking</button>
    </fieldset>
  )
}

/**
 * Campo de lista separada por vírgula. Guarda o texto digitado localmente
 * pra não reformatar enquanto a pessoa escreve ("festa, " não vira "festa").
 */
function TermsInput({ value, onChange, placeholder }: {
  value: string[]
  onChange: (terms: string[]) => void
  placeholder?: string
}) {
  const [text, setText] = useState(() => value.join(', '))
  const [lastValue, setLastValue] = useState(value)
  // Valor trocado por fora: sincroniza o texto
  if (value !== lastValue && parseTerms(text).join() !== value.join()) {
    setLastValue(value)
    setText(value.join(', '))
  }

  const handle = (next: string) => {
    setText(next)
    const terms = parseTerms(next)
    setLastValue(terms)
    onChange(terms)
  }

  return <input type="text" value={text} placeholder={placeholder} onChange={(e) => handle(e.target.value)} />
}
