// Textos do `ui` compartilhados pela Home e pelo construtor, fora de `src/ui/builder/` (ui-design da FEAT-001,
// Decisões entre telas): a Home não importa nada do construtor, para não puxá-lo para o chunk inicial.

/** FR-CHAR-011: sem nome, ou só com espaços, "Unnamed character". */
export const displayName = (name?: string) => name?.trim() || 'Unnamed character'

/** Falha de leitura do armazenamento (FR-HELP-005): a lista da Home e a abertura do construtor (ui-design, Textos). */
export const STORAGE_UNAVAILABLE =
  "This browser didn't let the generator read your saved characters. Nothing was changed. Reload the page to try again. If it keeps happening, check that this site is allowed to store data."
