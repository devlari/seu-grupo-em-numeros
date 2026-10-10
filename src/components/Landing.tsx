import { useRef, useState, type DragEvent } from 'react'
import './Landing.css'
import { SiteFooter } from './SiteFooter.tsx'

interface Props {
  onFile: (file: File) => void
  loading: string | null
  error: string | null
}

const STICKERS = [
  { text: '🤡 quem é a máquina de kkkk?', className: 'bg-lime', rotate: '-3deg' },
  { text: '🦉 quem não dorme?', className: 'bg-cyan', rotate: '2deg' },
  { text: '👻 quem sumiu?', className: 'bg-orange', rotate: '-1deg' },
]

const STEPS = {
  android: [
    'Abra o grupo no WhatsApp',
    'Toque nos três pontinhos ⋮ no canto de cima',
    'Vá em Mais → Exportar conversa',
    'Escolha SEM MÍDIA',
    'Salve o arquivo (Drive, e-mail ou "Salvar no dispositivo")',
    'Solte o arquivo aqui do lado',
  ],
  iphone: [
    'Abra o grupo no WhatsApp',
    'Toque no nome do grupo, lá em cima',
    'Role até o fim e toque em Exportar conversa',
    'Escolha SEM MÍDIA',
    'Salve em Arquivos (ou mande pra você mesmo)',
    'Solte o .zip aqui do lado',
  ],
}

export function Landing({ onFile, loading, error }: Props) {
  const [platform, setPlatform] = useState<'android' | 'iphone'>('android')

  return (
    <div className="page landing">
      <header className="hero">
        <div className="hero-title">
          <span className="tag bg-white pop">Retrospectiva de grupo do WhatsApp</span>
          <h1 className="pop d1">
            Seu grupo
            <br />
            <span className="hero-highlight">em números</span>
          </h1>
          <p className="hero-sub pop d2">
            Quem fala mais, quem ri de tudo, quem some, quem manda mensagem às 3 da manhã. Prêmios, rankings e
            gráficos do seu grupo, em formato de stories.
          </p>
          <div className="stickers pop d3" aria-hidden>
            {STICKERS.map((s, i) => (
              <span key={s.text} className={`sticker ${s.className}`} style={{ rotate: s.rotate, animationDelay: `${i * 0.7}s` }}>
                {s.text}
              </span>
            ))}
          </div>
        </div>

        <Dropzone onFile={onFile} loading={loading} error={error} />
      </header>

      <section className="how">
        <div className="card dot bg-yellow how-steps">
          <h2>Como exportar o grupo</h2>
          <div className="tabs" role="tablist">
            {(['android', 'iphone'] as const).map((p) => (
              <button
                key={p}
                role="tab"
                aria-selected={platform === p}
                className={`btn small ${platform === p ? 'bg-ink' : 'ghost'}`}
                onClick={() => setPlatform(p)}
              >
                {p === 'android' ? 'Android' : 'iPhone'}
              </button>
            ))}
          </div>
          <ol>
            {STEPS[platform].map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="hint">
            Tem que ser pelo celular: o WhatsApp Web não exporta conversas. Com mídia também funciona, mas o arquivo fica
            enorme e não muda nada no resultado.
          </p>
          <p className="hint">
            <b>O histórico começa tarde demais?</b> Se você trocou de celular ou perdeu as conversas, peça pra alguém do
            grupo exportar: o arquivo de qualquer pessoa do grupo serve, com as mensagens de todo mundo.
          </p>
        </div>

        <div className="card dot bg-blue privacy">
          <h2>Nada sai do seu celular</h2>
          <p>
            A análise roda inteira no seu navegador. O arquivo não é enviado pra servidor nenhum, nem guardado em lugar
            nenhum. Fechou a aba, sumiu.
          </p>
          <p>
            Contatos que não estão salvos aparecem só como número no arquivo. Aqui eles viram "Contato •1234" até você
            dar um nome.
          </p>
          <a href="/privacidade" className="privacy-more">Como funciona a privacidade →</a>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}

function Dropzone({ onFile, loading, error }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <div
      className={`card dropzone bg-pink pop d3 ${dragging ? 'dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <div className="dropzone-icon" aria-hidden>
        📂
      </div>
      {loading ? (
        <>
          <h2>Lendo…</h2>
          <p className="mono">{loading}</p>
        </>
      ) : (
        <>
          <h2>Solte o arquivo aqui</h2>
          <p>O .txt ou o .zip que o WhatsApp gerou</p>
          <button className="btn big" onClick={() => input.current?.click()}>
            Escolher arquivo
          </button>
        </>
      )}
      {error && <p className="error dropzone-error">{error}</p>}
      <input
        ref={input}
        type="file"
        accept=".txt,.zip"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
