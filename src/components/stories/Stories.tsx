import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import type { AnalysisResult } from '../../lib/analysis/index.ts'
import { buildSlides } from './slides.tsx'
import './Stories.css'

/** Tempo de cada story antes de avançar sozinho */
const SLIDE_MS = 7000
/** Segurar mais que isso pausa; menos que isso é toque */
const TAP_MS = 250

interface Props {
  result: AnalysisResult
  onClose: () => void
}

export function Stories({ result, onClose }: Props) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const slides = useMemo(
    () => buildSlides(result, { onReport: onClose, onRestart: () => setIndex(0) }),
    [result, onClose],
  )
  const pressedAt = useRef(0)
  const slide = slides[Math.min(index, slides.length - 1)]
  const isLast = index >= slides.length - 1

  const next = () => setIndex((i) => Math.min(i + 1, slides.length - 1))
  const prev = () => setIndex((i) => Math.max(i - 1, 0))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, slides.length - 1))
      else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0))
      else if (e.key === 'Escape') onClose()
      else if (e.key === ' ') {
        e.preventDefault()
        setPaused((p) => !p)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slides.length, onClose])

  // Toque na esquerda volta, no resto avança; segurar pausa (igual stories do Instagram)
  const isInteractive = (e: PointerEvent) => (e.target as HTMLElement).closest('button, a, input, [data-interactive]')
  const onPointerDown = (e: PointerEvent) => {
    if (isInteractive(e)) return
    pressedAt.current = performance.now()
    setPaused(true)
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (isInteractive(e) || !pressedAt.current) return
    const held = performance.now() - pressedAt.current
    pressedAt.current = 0
    setPaused(false)
    if (held > TAP_MS) return
    const rect = e.currentTarget.getBoundingClientRect()
    if (e.clientX - rect.left < rect.width * 0.3) prev()
    else next()
  }

  return (
    <div className="stories-overlay" role="dialog" aria-label="Retrospectiva do grupo">
      <div
        className={`story ${slide.bg}`}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
          pressedAt.current = 0
          setPaused(false)
        }}
      >
        <div className="story-progress" aria-hidden>
          {slides.map((s, i) => (
            <div key={s.key} className="story-segment">
              <div
                key={i === index ? `active-${index}` : undefined}
                className={`story-fill ${i < index ? 'done' : i === index ? 'active' : ''}`}
                style={i === index ? { animationDuration: `${SLIDE_MS}ms`, animationPlayState: paused ? 'paused' : 'running' } : undefined}
                onAnimationEnd={() => !isLast && next()}
              />
            </div>
          ))}
        </div>

        <div className="story-top">
          <span className="mono story-count">{index + 1}/{slides.length}</span>
          <button className="story-close" onClick={onClose} aria-label="Fechar e ver o relatório">
            ✕
          </button>
        </div>

        <div key={slide.key} className="story-content">
          {slide.content}
        </div>

        {paused && <div className="story-paused mono" aria-hidden>❚❚ pausado</div>}
      </div>
    </div>
  )
}
