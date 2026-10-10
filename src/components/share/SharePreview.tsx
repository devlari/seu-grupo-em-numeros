import { useEffect, useRef, useState, type ReactNode } from 'react'
import { SHARE_HEIGHT, SHARE_WIDTH } from './ShareCard.tsx'

/** Mostra um card de 1080×1920 reduzido pra caber no espaço disponível */
export function SharePreview({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.3)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setScale(Math.min(width / SHARE_WIDTH, height / SHARE_HEIGHT))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={box} className="share-preview">
      <div className="share-scaler" style={{ width: SHARE_WIDTH * scale, height: SHARE_HEIGHT * scale }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>{children}</div>
      </div>
    </div>
  )
}
