import type { Formula } from '../content'

// Fórmulas como árvore (ADR-004 §2; technical-design §3.1 e §3.3): avaliadas aqui, nunca como texto.

/** Regra que o motor recusa: id em dois livros, ciclo entre fórmulas. É invariante, não erro esperado. */
export class EngineError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EngineError'
  }
}

/** `null` é pendente: falta uma decisão, e o pendente propaga. */
export type Value = number | null

export interface Evaluated {
  value: Value
  /** A primeira referência-folha sem valor que deixou o resultado pendente. */
  pendingOn?: string
}

/** O que a fórmula precisa saber de fora: valor de atributo, de `grant:<id>` e de `self`. */
export type LeafValue = (ref: string) => Value

/**
 * Avalia fórmulas que se referem umas às outras (`characteristic:*`), em ordem de referências.
 * Referência a outra característica do conjunto é resolvida pelo próprio conjunto; ciclo lança `EngineError`.
 */
export function evaluateFormulas(
  formulas: ReadonlyMap<string, Formula>,
  leaf: LeafValue,
  nameOf: (id: string) => string = (id) => id,
): Map<string, Evaluated> {
  const results = new Map<string, Evaluated>()
  const stack: string[] = []

  const valueOf = (ref: string): Evaluated => {
    if (!formulas.has(ref)) {
      const value = leaf(ref)
      return value === null ? { value, pendingOn: ref } : { value }
    }
    const known = results.get(ref)
    if (known) return known
    if (stack.includes(ref)) {
      const cycle = [...stack.slice(stack.indexOf(ref)), ref]
      throw new EngineError(`cycle: ${cycle.map(nameOf).join(' → ')}`)
    }
    stack.push(ref)
    const result = evaluateTree(formulas.get(ref)!, valueOf)
    stack.pop()
    results.set(ref, result)
    return result
  }

  for (const id of formulas.keys()) valueOf(id)
  return results
}

/** Avalia uma fórmula isolada (ex.: modificador de atributo com `self`). */
export function evaluateFormula(formula: Formula, leaf: LeafValue): Evaluated {
  return evaluateTree(formula, (ref) => {
    const value = leaf(ref)
    return value === null ? { value, pendingOn: ref } : { value }
  })
}

function evaluateTree(formula: Formula, valueOf: (ref: string) => Evaluated): Evaluated {
  if (typeof formula === 'number') return { value: formula }
  if ('ref' in formula) return valueOf(formula.ref)

  const all = (terms: Formula[], combine: (values: number[]) => number): Evaluated => {
    const evaluated = terms.map((term) => evaluateTree(term, valueOf))
    const pending = evaluated.find((term) => term.value === null)
    if (pending) return pending
    return { value: combine(evaluated.map((term) => term.value!)) }
  }

  if ('add' in formula) return all(formula.add, (values) => values.reduce((sum, value) => sum + value, 0))
  if ('min' in formula) return all(formula.min, (values) => Math.min(...values))
  if ('max' in formula) return all(formula.max, (values) => Math.max(...values))
  if ('div' in formula) {
    return all(formula.div, ([dividend, divisor]) => {
      if (divisor === 0) throw new EngineError('division by zero in a formula')
      return dividend / divisor
    })
  }
  const round = { down: Math.floor, up: Math.ceil, nearest: Math.round }[formula.round]
  return all([formula.of], ([value]) => round(value))
}

/** O que `formatFormula` lê das regras: o nome de cada id e as concessões da entidade dona da fórmula. */
export interface FormulaNames {
  items: ReadonlyMap<string, object>
}

type Named = { name?: string; grants?: Record<string, { options?: number[] }> }

/** Número como o livro escreve: 0.5 → "1/2". */
export function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value)
  for (const denominator of [2, 3, 4]) {
    const numerator = value * denominator
    if (Math.abs(numerator - Math.round(numerator)) < 1e-9) return `${Math.round(numerator)}/${denominator}`
  }
  return String(value)
}

/**
 * Texto legível de uma fórmula (FR-CONT-009, reusado pela FEAT-008 no FR-CALC-003): `ref` vira o nome,
 * `add` com negativo vira subtração, `grant:<id>` vira as opções da vaga ("1/2 or 1").
 */
export function formatFormula(rules: FormulaNames, formula: Formula, ownerId?: string): string {
  const item = (id: string) => rules.items.get(id) as Named | undefined
  const owner = ownerId ? item(ownerId) : undefined
  const list = (terms: Formula[]) => {
    const texts = terms.map(format)
    return texts.length > 1 ? `${texts.slice(0, -1).join(', ')} and ${texts[texts.length - 1]}` : texts[0]
  }
  const grouped = (term: Formula) => (typeof term === 'object' && 'add' in term ? `(${format(term)})` : format(term))

  function format(node: Formula): string {
    if (typeof node === 'number') return formatNumber(node)
    if ('ref' in node) {
      if (node.ref === 'self') return owner?.name ?? 'score'
      if (node.ref.startsWith('grant:')) {
        const options = owner?.grants?.[node.ref.slice('grant:'.length)]?.options
        return options ? options.map(formatNumber).join(' or ') : 'a choice'
      }
      return item(node.ref)?.name ?? node.ref
    }
    if ('add' in node) {
      return node.add
        .map((term, index) => {
          if (index === 0) return format(term)
          return typeof term === 'number' && term < 0 ? ` − ${formatNumber(-term)}` : ` + ${format(term)}`
        })
        .join('')
    }
    if ('div' in node) return `${grouped(node.div[0])} / ${grouped(node.div[1])}`
    if ('min' in node) return `the lower of ${list(node.min)}`
    if ('max' in node) return `the higher of ${list(node.max)}`
    const rounding = { down: 'rounded down', up: 'rounded up', nearest: 'rounded to the nearest whole number' }[node.round]
    return `${format(node.of)}, ${rounding}`
  }

  return format(formula)
}
