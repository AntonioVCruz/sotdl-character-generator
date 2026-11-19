import { dependsOnText, type LineParts } from './copy'

/**
 * A linha lida pelo conteúdo, na ordem visual ("Insanity 1d6: 4 · rolled depends on Dwarf Background"), sem
 * `aria-label` (C9). "depends on" só no dependente transitivo, numa linha abaixo.
 */
export function DecisionLine({ parts, dependsOn }: { parts: LineParts; dependsOn?: string }) {
  return (
    <span className="decision-line">
      <span>
        <span className="typography-body">{`${parts.title}: `}</span>
        <span className="typography-badge">{parts.value}</span>
        {parts.mode && <span className="typography-meta">{` · ${parts.mode}`}</span>}
      </span>
      {dependsOn && <span className="typography-caption decision-line__depends">{dependsOnText(dependsOn)}</span>}
    </span>
  )
}
