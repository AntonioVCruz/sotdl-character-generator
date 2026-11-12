import type { Book, CharacterDocument, StepItem } from '../content'

// Esqueleto técnico (plano §2): `resolve` e `evaluate` são stubs.
// A FEAT-007 os substitui pelas regras vigentes e pela visão do personagem da ADR-003 e da ADR-004.

export interface Rules {
  steps: StepItem[]
}

export type StepStatus = 'not-started'

export interface StepView extends StepItem {
  status: StepStatus
}

export interface CharacterView {
  steps: StepView[]
}

/** Stub (FEAT-007): o procedimento é o do primeiro livro da ordem de fontes que declara etapas. */
export function resolve(books: Book[], order: string[]): Rules {
  const items = order.flatMap((id) => books.find((book) => book.id === id)?.components.flatMap((c) => c.items) ?? [])
  const procedure = items.find((item) => item.id.startsWith('procedure:'))
  const steps = procedure && 'steps' in procedure ? procedure.steps : []
  return { steps: steps.flatMap((id) => items.filter((item): item is StepItem => item.id === id && 'name' in item)) }
}

/** Stub (FEAT-007): toda etapa aparece como "Not started"; nenhuma regra é calculada. */
export function evaluate(rules: Rules, character: CharacterDocument): CharacterView {
  void character
  return { steps: rules.steps.map((step) => ({ ...step, status: 'not-started' })) }
}
