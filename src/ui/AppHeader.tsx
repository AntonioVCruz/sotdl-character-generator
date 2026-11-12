import { href } from './router'

/** app-header (design.md §3): marca que volta à Home e link para About (FR-HELP-001). */
export function AppHeader() {
  return (
    <header className="app-header">
      <a className="app-header__brand typography-title" href={href.home}>
        SotDL Generator
      </a>
      <nav aria-label="Site">
        <a className="app-header__link typography-label" href={href.about}>
          About
        </a>
      </nav>
    </header>
  )
}
