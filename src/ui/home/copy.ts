import type { CharacterSummary } from '../../app'

// Textos da Home (ui-design da FEAT-001, Textos; NFR-L10N-001). `{name}` é sempre `displayName(name)`.

export const HOME_TEXT = {
  title: 'My characters',
  newCharacter: 'New character',
  browserOnly: "Characters are saved in this browser only. Clearing your browser's data for this site deletes them.",
  listLabel: 'Saved characters',
  loading: 'Loading characters…',
  emptyTitle: 'No characters yet',
  emptyWhat:
    'This generator guides you through creating a level 0 character for Shadow of the Demon Lord, one step at a time, and shows how each number is calculated.',
  emptyBooks: 'For each rule, it shows the mechanics and the book and page they come from. The full rules text is in the books.',
  emptyStart: 'To start, choose New character.',
  continue: 'Continue',
  moreActionsFor: 'More actions for',
  delete: 'Delete',
  cancel: 'Cancel',
  deletePermanently: 'Delete permanently',
} as const

export const deleteTitle = (name: string) => `Delete ${name}?`
export const deleteConsequence = (name: string) =>
  `This permanently deletes ${name} and its creation log from this browser. You can't undo this.`
export const deleteFailed = (name: string) =>
  `${name} wasn't deleted. It's still saved in this browser. Try again, and if it keeps failing, reload the page.`
export const deleted = (name: string) => `${name} was deleted.`

/** Ids do cartão: o nome rotula o cartão e entra no nome acessível das ações (ui-design, Nomes acessíveis). */
export const cardIds = (id: string) => ({
  name: `character-${id}-name`,
  continue: `character-${id}-continue`,
  more: `character-${id}-more`,
})

/** FR-CHAR-005, 006: "Creating · N open", "Creating" sem contagem (metadado antigo) ou "Complete". */
export function statusText({ status, openDecisions }: Pick<CharacterSummary, 'status' | 'openDecisions'>): string {
  if (status === 'complete') return 'Complete'
  return openDecisions === null ? 'Creating' : `Creating · ${openDecisions} open`
}

/** "{Ancestry} · Level 0", ou "Level 0" sem ancestralidade (o nível 0 é implícito no documento v1). */
export const contextLine = (ancestry: string | null) => [ancestry, 'Level 0'].filter(Boolean).join(' · ')

export const sourcesLine = (sources: CharacterSummary['sources']) =>
  sources.length ? `Sources: ${sources.map((source) => source.name).join(' › ')}` : null

/** Data da última edição em inglês, no fuso do navegador ("Nov 12, 2026"); inválida ou vazia, `null`. */
export function formatEdited(iso: string): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date)
}
