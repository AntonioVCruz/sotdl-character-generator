import type { Book, CharacterDocument, Step } from '../content'

// Esqueleto técnico (plano §2): `resolve` e `evaluate` são stubs.
// A FEAT-007 os substitui pelas regras vigentes e pela visão do personagem da ADR-003 e da ADR-004.

export interface Rules {
  steps: Step[]
}

export type StepStatus = 'not-started'

export interface StepView extends Step {
  status: StepStatus
}

export interface CharacterView {
  steps: StepView[]
}

/** Stub (FEAT-007): o procedimento é o do primeiro livro da ordem de fontes que declara etapas. */
export function resolve(books: Book[], order: string[]): Rules {
  const procedure = order.map((id) => books.find((book) => book.id === id)).find((book) => book?.steps)
  return { steps: procedure?.steps ?? [] }
}

/** Stub (FEAT-007): toda etapa aparece como "Not started"; nenhuma regra é calculada. */
export function evaluate(rules: Rules, character: CharacterDocument): CharacterView {
  void character
  return { steps: rules.steps.map((step) => ({ ...step, status: 'not-started' })) }
}
