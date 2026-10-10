import { AUTHOR } from '../siteConfig.ts'
import './SiteFooter.css'

// rel="noreferrer": o site de destino não fica sabendo de qual página a pessoa veio
const EXTERNAL = { target: '_blank', rel: 'noopener noreferrer' } as const

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p className="site-footer-credit">
        Desenvolvido por{' '}
        {AUTHOR.portfolioUrl ? (
          <a href={AUTHOR.portfolioUrl} {...EXTERNAL} className="site-footer-author">{AUTHOR.name}</a>
        ) : (
          <strong className="site-footer-author">{AUTHOR.name}</strong>
        )}
      </p>
      <a href="/privacidade" className="site-footer-link">Privacidade</a>
      {AUTHOR.buyMeACoffeeUrl && (
        <a href={AUTHOR.buyMeACoffeeUrl} {...EXTERNAL} className="btn bg-yellow">
          ☕ Me paga um café
        </a>
      )}
    </footer>
  )
}
