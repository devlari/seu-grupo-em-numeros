import type { AnalysisOptions } from '../lib/analysis/index.ts'
import type { ParsedChat } from '../lib/whatsapp/index.ts'
import { SettingsPanel } from './SettingsPanel.tsx'
import './Setup.css'

interface Props {
  fileName: string
  chat: ParsedChat
  options: AnalysisOptions
  onOptionsChange: (options: AnalysisOptions) => void
  /** false enquanto a análise das configurações atuais não termina */
  ready: boolean
  error: string | null
  onStart: () => void
  onReset: () => void
}

export function Setup({ fileName, chat, options, onOptionsChange, ready, error, onStart, onReset }: Props) {
  const people = chat.messages.filter((m) => m.author)
  const first = people.reduce((a, m) => Math.min(a, m.timestamp.getTime()), Infinity)
  const last = people.reduce((a, m) => Math.max(a, m.timestamp.getTime()), -Infinity)
  const date = (t: number) => new Date(t).toLocaleDateString('pt-BR')

  return (
    <div className="page setup">
      <header className="setup-header">
        <span className="tag pop">Antes de começar</span>
        <h1 className="pop d1">Quem é quem?</h1>
        <div className="setup-file card bg-cyan pop d2">
          <strong>{fileName}</strong>
          <span className="mono">
            {people.length.toLocaleString('pt-BR')} mensagens · {chat.participants.length} pessoas
            {people.length > 0 && ` · ${date(first)} a ${date(last)}`}
          </span>
        </div>
        <p className="pop d3">
          Confira as pessoas, junte quem aparece duplicado e tire quem não deve entrar (tipo robôs ou quem saiu do grupo).
          Se estiver tudo certo, é só seguir.
        </p>
        {chat.warnings.map((w) => (
          <p key={w} className="notice">{w}</p>
        ))}
      </header>

      <SettingsPanel chat={chat} options={options} onChange={onOptionsChange} />

      <div className="setup-bar">
        <button className="btn ghost" onClick={onReset}>← Trocar arquivo</button>
        <span className="mono setup-status">
          {error ? <span className="error">{error}</span> : ready ? 'Tudo pronto!' : 'Analisando…'}
        </span>
        <button className="btn big bg-pink" onClick={onStart} disabled={!ready}>
          Ver retrospectiva ▶
        </button>
      </div>
    </div>
  )
}
