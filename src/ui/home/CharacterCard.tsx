import { Ellipsis } from 'lucide-react'
import { Button, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components'
import type { CharacterSummary } from '../../app'
import { displayName } from '../copy'
import { PillCounter } from '../parts'
import { href } from '../router'
import { cardIds, contextLine, formatEdited, HOME_TEXT, sourcesLine, statusText } from './copy'

/** `character-card` (design.md §4; FR-CHAR-003): nome, contexto, estado, fontes, ações e data. */
export function CharacterCard({ summary, onDelete }: { summary: CharacterSummary; onDelete: (summary: CharacterSummary) => void }) {
  const ids = cardIds(summary.id)
  const sources = sourcesLine(summary.sources)
  const edited = formatEdited(summary.updatedAt)
  return (
    <li>
      <article className="card character-card" aria-labelledby={ids.name}>
        <h2 id={ids.name} className="typography-title character-card__name" tabIndex={-1}>
          {displayName(summary.name)}
        </h2>
        <p className="typography-meta character-card__secondary">{contextLine(summary.ancestry)}</p>
        <p>
          <PillCounter done={summary.status === 'complete'}>{statusText(summary)}</PillCounter>
        </p>
        {sources && <p className="typography-meta character-card__secondary">{sources}</p>}
        <div className="character-card__divider" aria-hidden="true" />
        <div className="character-card__actions">
          <a
            id={ids.continue}
            className="button-primary typography-label"
            href={href.builder(summary.id)}
            aria-labelledby={`${ids.continue} ${ids.name}`}
          >
            {HOME_TEXT.continue}
          </a>
          <MenuTrigger>
            <Button
              id={ids.more}
              className="button-secondary button-icon"
              aria-label={HOME_TEXT.moreActionsFor}
              aria-labelledby={`${ids.more} ${ids.name}`}
            >
              <Ellipsis className="icon icon--md" aria-hidden="true" />
            </Button>
            <Popover className="menu-popover" placement="bottom start">
              <Menu className="menu" onAction={() => onDelete(summary)}>
                <MenuItem id="delete" className="menu__item typography-label">
                  {HOME_TEXT.delete}
                </MenuItem>
              </Menu>
            </Popover>
          </MenuTrigger>
        </div>
        {edited && (
          <p className="typography-caption character-card__date">
            Edited <time dateTime={summary.updatedAt}>{edited}</time>
          </p>
        )}
      </article>
    </li>
  )
}
