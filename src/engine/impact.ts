import type { CharacterDocument, Decision } from '../content'
import {
  candidatesOf,
  evaluate,
  parentKey,
  unmarked,
  type CharacterView,
  type SetAsideRef,
  type SlotView,
  type StoredRef,
  type ValueChange,
} from './evaluate'
import type { Rules } from './resolve'

// Impacto de uma mudança e marca de registro (FEAT-011 §3.1; ADR-004 §1, §4). Funções puras: não rolam, não gravam e
// não leem o log. `settle` é a única que lê a marca `setAside`, e só para comparar.

/** Uma decisão guardada e a vaga da visão em que ela é ativa. */
export interface ImpactItem extends StoredRef {
  slot: SlotView
}

export interface Impact {
  /**
   * FR-CHG-003: a vaga que muda, antes e depois; sem `to`, a vaga ficou limpa ou deixou de ser gerada. Sem `change`, a
   * mudança não é de uma vaga só, como o Roll all undecided (FEAT-010 D8).
   */
  change?: { key: string; from?: SlotView; to?: SlotView }
  /** A ativa que sai da própria vaga: vai ao log como desfeita, nunca a `setAside` (D40 (4)). */
  undone?: Decision
  /** FR-CHG-004, 005: ativas antes, guardadas e não ativas depois, na ordem das vagas de antes. */
  setAside: ImpactItem[]
  /** FR-CHG-004, 018: guardadas e não ativas antes, ativas depois, na ordem das vagas de depois. */
  restored: ImpactItem[]
  /** FR-CHG-006: antigo → novo, atributos pelo score e características pelo valor. */
  recalculated: { attributes: ValueChange[]; characteristics: ValueChange[] }
  /** FR-CHG-012: obrigatórias, vivas e abertas depois, decididas antes. */
  reopened: string[]
  /** Ativas e iguais antes e depois, fora a vaga da mudança; com `key` nulo, todas. */
  stays: ImpactItem[]
  /** FR-CHG-001, 002: `setAside` ou `restored` não vazios. */
  needsDialog: boolean
  before: CharacterView
  after: CharacterView
}

export interface Settled {
  /** Cada guardada com `setAside: true` se não é ativa, sem a marca se é; o mesmo objeto se nada muda. */
  document: CharacterDocument
  /** Derivada suspensa e marca ausente. */
  setAside: SetAsideRef[]
  /** Derivada ativa e marca presente. */
  restored: ImpactItem[]
}

/** Texto canônico de um valor, com as chaves em ordem, para comparar decisões. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value).filter(([, field]) => field !== undefined)
    entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([field, inner]) => `${JSON.stringify(field)}:${canonical(inner)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

/**
 * Identidade de uma decisão guardada (FEAT-011 §3.1): a vaga e a decisão, iguais sem a marca. Com o `logged`, que faz
 * parte da decisão, a igualdade é exata.
 */
const identity = (key: string, decision: Decision) => `${key}\n${canonical(unmarked(decision))}`

/** As ativas da visão, na ordem das vagas, por identidade. */
function activesOf(document: CharacterDocument, view: CharacterView): Map<string, ImpactItem> {
  const actives = new Map<string, ImpactItem>()
  for (const slot of view.slots) {
    if (!slot.decided || slot.candidate === undefined) continue
    const decision = candidatesOf(document, slot.key)[slot.candidate]
    if (decision === undefined) continue
    actives.set(identity(slot.key, decision), {
      key: slot.key,
      index: slot.candidate,
      decision: unmarked(decision),
      parent: parentKey(slot.key),
      slot,
    })
  }
  return actives
}

/** As identidades de todas as decisões guardadas do documento. */
function storedIn(document: CharacterDocument): Set<string> {
  const stored = new Set<string>()
  for (const key of Object.keys(document.decisions)) {
    for (const decision of candidatesOf(document, key)) stored.add(identity(key, decision))
  }
  return stored
}

/** Antigo → novo por id (FR-CHG-006), como o `diff` do `preview`; com outras regras, um valor novo vem de `null`. */
function changed<T extends { id: string; name: string }>(from: T[], to: T[], pick: (item: T) => ValueChange['from']): ValueChange[] {
  const old = new Map(from.map((item) => [item.id, pick(item)]))
  return to.flatMap((item) => {
    const was = old.get(item.id) ?? null
    const now = pick(item)
    return was === now ? [] : [{ id: item.id, name: item.name, from: was, to: now }]
  })
}

/**
 * O que muda de `before` para `after` (ADR-004 §4): avalia os dois documentos e compara as ativas. Mudança de fontes
 * (FEAT-004) passa `afterRules`. Com `key` nulo (FEAT-010 D8), sem `change` nem `undone`, e `stays` com todas as ativas
 * iguais.
 */
export function impact(
  rules: Rules,
  before: CharacterDocument,
  after: CharacterDocument,
  key: string | null,
  afterRules: Rules = rules,
): Impact {
  const beforeView = evaluate(rules, before)
  const afterView = evaluate(afterRules, after)
  const was = activesOf(before, beforeView)
  const now = activesOf(after, afterView)
  const storedBefore = storedIn(before)
  const storedAfter = storedIn(after)

  const from = key === null ? undefined : beforeView.slots.find((slot) => slot.key === key)
  const to = key === null ? undefined : afterView.slots.find((slot) => slot.key === key && slot.decided)
  const leaving = [...was.entries()].find(([id, item]) => item.key === key && !storedAfter.has(id))

  const setAside: ImpactItem[] = []
  const stays: ImpactItem[] = []
  for (const [id, item] of was) {
    const kept = now.get(id)
    if (kept) {
      if (item.key !== key) stays.push(kept)
    } else if (storedAfter.has(id)) {
      // O desfeito não fica guardado depois, então nunca entra aqui (D40 (4)).
      setAside.push(item)
    }
  }
  const restored = [...now.entries()].filter(([id]) => !was.has(id) && storedBefore.has(id)).map(([, item]) => item)

  const decidedBefore = new Set(beforeView.slots.filter((slot) => slot.decided).map((slot) => slot.key))
  const reopened = afterView.openDecisions.map((open) => open.key).filter((open) => decidedBefore.has(open))

  return {
    ...(key !== null && { change: { key, ...(from && { from }), ...(to && { to }) } }),
    ...(leaving && { undone: leaving[1].decision }),
    setAside,
    restored,
    recalculated: {
      attributes: changed(beforeView.summary.attributes, afterView.summary.attributes, (attribute) => attribute.score),
      characteristics: changed(beforeView.summary.characteristics, afterView.summary.characteristics, (c) => c.value),
    },
    reopened,
    stays,
    needsDialog: setAside.length > 0 || restored.length > 0,
    before: beforeView,
    after: afterView,
  }
}

/**
 * A marca de registro (ADR-004 §1): cada guardada leva `setAside: true` se não é a ativa da vaga, e sai sem a marca se é.
 * Devolve as transições contra a marca gravada. Nada muda → o mesmo documento.
 */
export function settle(rules: Rules, document: CharacterDocument, view: CharacterView = evaluate(rules, document)): Settled {
  const active = new Map(view.slots.flatMap((slot) => (slot.decided && slot.candidate !== undefined ? [[slot.key, slot.candidate] as const] : [])))
  const isMarked = (decision: Decision) => decision.setAside === true

  const setAside = view.setAside.filter((item) => {
    const stored = candidatesOf(document, item.key)[item.index]
    return stored !== undefined && !isMarked(stored)
  })
  const restored = [...activesOf(document, view).values()].filter((item) => isMarked(candidatesOf(document, item.key)[item.index]))
  if (setAside.length === 0 && restored.length === 0) return { document, setAside, restored }

  const marked = (key: string, index: number, decision: Decision): Decision => {
    const shouldMark = active.get(key) !== index
    if (shouldMark === isMarked(decision)) return decision
    return shouldMark ? { ...decision, setAside: true } : unmarked(decision)
  }
  const decisions = Object.fromEntries(Object.entries(document.decisions).map(([key, decision]) => [key, marked(key, 0, decision)]))
  const earlier =
    document.earlier &&
    Object.fromEntries(Object.entries(document.earlier).map(([key, list]) => [key, list.map((decision, i) => marked(key, i + 1, decision))]))
  return { document: { ...document, decisions, ...(earlier && { earlier }) }, setAside, restored }
}
