import { ArrowLeft, Ellipsis } from 'lucide-react'
import { Button, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components'
import { href } from './router'

/**
 * app-header (design.md §3). Desktop: marca que volta à Home e contexto do personagem. Celular: no construtor,
 * voltar só de ícone + nome; em toda tela, o menu "···" com About (FR-HELP-001), que no desktop fica no rodapé.
 */
export function AppHeader({ character }: { character?: { name: string; detail: string } }) {
  return (
    <header className="app-header">
      <span className={`app-header__start${character ? ' app-header__start--character' : ''}`}>
        <a className="app-header__brand typography-title" href={href.home}>
          SotDL Generator
        </a>
        {character && (
          <>
            <span className="app-header__context typography-meta">{`${character.name} · ${character.detail}`}</span>
            <a className="button-icon app-header__back" href={href.home} aria-label="Back to My characters">
              <ArrowLeft className="icon icon--md" aria-hidden="true" />
            </a>
            <span className="app-header__character">
              <span className="typography-title-sm">{character.name}</span>
              <span className="typography-meta">{character.detail}</span>
            </span>
          </>
        )}
      </span>
      <MenuTrigger>
        <Button className="button-secondary button-icon app-header__more" aria-label="More">
          <Ellipsis className="icon icon--md" aria-hidden="true" />
        </Button>
        <Popover className="menu-popover" placement="bottom end">
          <Menu className="menu" aria-label="More">
            <MenuItem className="menu__item typography-label" href={href.about}>
              About
            </MenuItem>
          </Menu>
        </Popover>
      </MenuTrigger>
    </header>
  )
}

/** Rodapé da página (≥ `--bp-md`): o About (FR-HELP-001). Abaixo disso, ele mora no menu "···". */
export function PageFooter() {
  return (
    <footer className="page-footer">
      <a className="link typography-meta" href={href.about}>
        About
      </a>
    </footer>
  )
}
