import type {
  AncestryItem,
  AttributeItem,
  Book,
  CharacteristicItem,
  Item,
  ItemKind,
  ItemOf,
  ProcedureItem,
  StepItem,
} from '../content'
import { EngineError } from './formula'

// Regras vigentes (ADR-003; technical-design §3.3 `Rules`). `revises`, `replaces` e a exceção por
// personagem são da FEAT-005: aqui, só componentes ligados por padrão e nenhum id repetido.

/** De onde veio o item (FR-SRC-010). O tipo sai da camada do livro; `replaces` é da FEAT-005. */
export interface Provenance {
  book: string
  abbr: string
  page?: number
  type: 'core' | 'adds'
}

export type Resolved<T extends Item = Item> = T & { provenance: Provenance }

export interface Rules {
  order: string[]
  /** Livros na ordem de `order`, para o resumo das fontes (FR-CHAR-003; FEAT-001 D7). */
  books: { id: string; name: string; abbr: string }[]
  items: ReadonlyMap<string, Resolved>
  procedure: Resolved<ProcedureItem>
  /** Na ordem do procedimento (FR-FLOW-002). */
  steps: Resolved<StepItem>[]
  /** Na ordem do pacote. */
  attributes: Resolved<AttributeItem>[]
  characteristics: Resolved<CharacteristicItem>[]
  ancestries: Resolved<AncestryItem>[]
}

/** Tipo do item pelo prefixo do id (D4). */
export function kindOf(id: string): string {
  return id.slice(0, id.indexOf(':'))
}

export function isKind<K extends ItemKind>(item: Item, kind: K): item is ItemOf<K> {
  return kindOf(item.id) === kind
}

export function resolve(books: Book[], order: string[]): Rules {
  const items = new Map<string, Resolved>()
  const active: Rules['books'] = []
  for (const bookId of order) {
    const book = books.find((candidate) => candidate.id === bookId)
    if (!book) throw new EngineError(`${bookId} is in the source order but was not loaded`)
    active.push({ id: book.id, name: book.name, abbr: book.abbr })
    for (const component of book.components) {
      if (component.default !== 'on') continue
      for (const item of component.items) {
        const existing = items.get(item.id)
        // ADR-003 §2: um id em dois livros só vale com `revises` ou `replaces` (FEAT-005).
        if (existing) throw new EngineError(`${item.id} is defined in both ${existing.provenance.book} and ${book.id}`)
        const page = 'page' in item ? item.page : undefined
        const provenance: Provenance = { book: book.id, abbr: book.abbr, page, type: book.layer === 'core' ? 'core' : 'adds' }
        items.set(item.id, { ...item, provenance })
      }
    }
  }

  const all = [...items.values()]
  const ofKind = <K extends ItemKind>(kind: K) => all.filter((item) => isKind(item, kind)) as Resolved<ItemOf<K>>[]

  const procedure = ofKind('procedure')[0]
  if (!procedure) throw new EngineError('no creation procedure in the active sources')
  const steps = procedure.steps.map((id) => {
    const step = items.get(id)
    if (!step || !isKind(step, 'step')) throw new EngineError(`${procedure.id} lists ${id}, which is not an active step`)
    return step as Resolved<StepItem>
  })

  return {
    order,
    books: active,
    items,
    procedure,
    steps,
    attributes: ofKind('attribute'),
    characteristics: ofKind('characteristic'),
    ancestries: ofKind('ancestry'),
  }
}
