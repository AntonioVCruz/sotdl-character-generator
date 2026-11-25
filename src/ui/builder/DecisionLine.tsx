import { dependsOnText, type LineParts } from './copy'

/**
 * A linha lida pelo conteúdo, na ordem visual ("Insanity 1d6: 4 · rolled depends on Dwarf Background"), sem
 * `aria-label` (C9). "depends on" só no dependente transitivo, numa linha abaixo. Uma escrita (ui-design da FEAT-010,
 * written-line): o título e " · written" na primeira linha, e o texto inteiro abaixo.
 */
export function DecisionLine({ parts, dependsOn }: { parts: LineParts; dependsOn?: string }) {
  return (
    <span className="decision-line">
      {parts.text === undefined ? (
        <span>
          <span className="typography-body">{`${parts.title}: `}</span>
          <span className="typography-badge">{parts.value}</span>
          {parts.mode && <span className="typography-meta">{` · ${parts.mode}`}</span>}
        </span>
      ) : (
        <>
          <span>
            <span className="typography-body">{parts.title}</span>
            <span className="typography-meta">{` · ${parts.mode}`}</span>
          </span>
          <span className="typography-body written-text">{parts.text}</span>
        </>
      )}
      {dependsOn && <span className="typography-caption decision-line__depends">{dependsOnText(dependsOn)}</span>}
    </span>
  )
}
