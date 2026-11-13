// Textos do `ui` compartilhados pela Home e pelo construtor, fora de `src/ui/builder/` (ui-design da FEAT-001,
// Decisões entre telas): a Home não importa nada do construtor, para não puxá-lo para o chunk inicial.

/** FR-CHAR-011: sem nome, ou só com espaços, "Unnamed character". */
export const displayName = (name?: string) => name?.trim() || 'Unnamed character'
