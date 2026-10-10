import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Landing } from './components/Landing.tsx'
import { Setup } from './components/Setup.tsx'
import type { AnalysisOptions, AnalysisResult } from './lib/analysis/index.ts'
import { analyzeChatInWorker, parseExportInWorker, type ParsedChat } from './lib/whatsapp/index.ts'
import { defaultOptions } from './settings.ts'

// Stories e relatório trazem o ECharts, que é pesado: só carregam depois do upload
const Report = lazy(() => import('./components/report/Report.tsx').then((m) => ({ default: m.Report })))
const Stories = lazy(() => import('./components/stories/Stories.tsx').then((m) => ({ default: m.Stories })))
// Já começa a baixar enquanto a pessoa confere as configurações
const preloadResults = () => {
  void import('./components/report/Report.tsx')
  void import('./components/stories/Stories.tsx')
}

// Espera a pessoa parar de mexer nas configurações antes de reanalisar
const REANALYZE_DELAY_MS = 300

type Upload =
  | { status: 'idle' }
  | { status: 'loading'; fileName: string }
  | { status: 'done'; fileName: string; chat: ParsedChat }
  | { status: 'error'; message: string }

type Step = 'setup' | 'stories' | 'report'

/** Última análise terminada, com as entradas que a geraram */
type Analysis = { chat: ParsedChat; options: AnalysisOptions } & (
  | { result: AnalysisResult; error?: undefined }
  | { result?: undefined; error: string }
)

export default function App() {
  const [upload, setUpload] = useState<Upload>({ status: 'idle' })
  const [step, setStep] = useState<Step>('setup')
  const [options, setOptions] = useState<AnalysisOptions>({})
  const [analysis, setAnalysis] = useState<Analysis | null>(null)

  const chat = upload.status === 'done' ? upload.chat : null

  const goTo = useCallback((next: Step) => {
    setStep(next)
    window.scrollTo(0, 0)
  }, [])
  const showReport = useCallback(() => goTo('report'), [goTo])

  async function handleFile(file: File) {
    setUpload({ status: 'loading', fileName: file.name })
    setAnalysis(null)
    try {
      const parsed = await parseExportInWorker(file)
      if (parsed.messages.length === 0) {
        setUpload({ status: 'error', message: 'Não achei nenhuma mensagem nesse arquivo. É mesmo um export do WhatsApp?' })
        return
      }
      setOptions(defaultOptions(parsed, file.name))
      setUpload({ status: 'done', fileName: file.name, chat: parsed })
      goTo('setup')
      preloadResults()
    } catch (err) {
      setUpload({ status: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }

  function reset() {
    setUpload({ status: 'idle' })
    setAnalysis(null)
    window.scrollTo(0, 0)
  }

  // Reanalisa quando a conversa ou as configurações mudam, cancelando a análise anterior
  useEffect(() => {
    if (!chat) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      analyzeChatInWorker(chat, options, controller.signal)
        .then((result) => setAnalysis({ chat, options, result }))
        .catch((err) => {
          if (controller.signal.aborted) return
          setAnalysis({ chat, options, error: err instanceof Error ? err.message : String(err) })
        })
    }, REANALYZE_DELAY_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [chat, options])

  const running = chat !== null && (analysis?.chat !== chat || analysis.options !== options)
  // Enquanto a análise nova não chega, as telas mostram a anterior
  const result = analysis?.chat === chat ? analysis?.result : undefined

  if (upload.status !== 'done') {
    return (
      <Landing
        onFile={handleFile}
        loading={upload.status === 'loading' ? upload.fileName : null}
        error={upload.status === 'error' ? upload.message : null}
      />
    )
  }

  if (step === 'setup' || !result) {
    return (
      <Setup
        fileName={upload.fileName}
        chat={upload.chat}
        options={options}
        onOptionsChange={setOptions}
        ready={!running && !!result}
        error={!running && analysis?.error ? analysis.error : null}
        onStart={() => goTo('stories')}
        onReset={reset}
      />
    )
  }

  return (
    <Suspense fallback={<p className="page mono">Carregando…</p>}>
      <Report
        result={result}
        fileName={upload.fileName}
        updating={running}
        onStories={() => goTo('stories')}
        onSettings={() => goTo('setup')}
        onReset={reset}
      />
      {step === 'stories' && <Stories result={result} onClose={showReport} />}
    </Suspense>
  )
}
