import { href } from './router'

/** app-header (design.md §3): marca que volta à Home, contexto do personagem e link para About (FR-HELP-001). */
export function AppHeader({ context }: { context?: string }) {
  return (
    <header className="app-header">
      <span className="app-header__start">
        <a className="app-header__brand typography-title" href={href.home}>
          SotDL Generator
        </a>
        {context && <span className="app-header__context typography-meta">{context}</span>}
      </span>
      <nav aria-label="Site">
        <a className="app-header__link typography-label" href={href.about}>
          About
        </a>
      </nav>
    </header>
  )
}
