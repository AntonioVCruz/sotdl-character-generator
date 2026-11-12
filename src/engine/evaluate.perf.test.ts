import { describe, expect, it } from 'vitest'
import type { Book, CharacterDocument, DecisionValue, Formula } from '../content'
import core from '../../packs/sotdl.core.json'
import { evaluate, resolve, type Rules } from '.'

// Guarda unitária da NFR-PERF-002 (technical-design §5; ADR-008): `evaluate`, 200 execuções, p95 ≤ 20 ms, um quinto
// do limite do notebook. Os números saem no console, para o relatório de aceite.

const RUNS = 200
const LIMIT_MS = 20

/** p95 pelo posto mais próximo: a 190ª de 200 amostras em ordem. */
function p95(rules: Rules, document: CharacterDocument): number {
  const samples: number[] = []
  for (let run = 0; run < RUNS; run++) {
    const start = performance.now()
    evaluate(rules, document)
    samples.push(performance.now() - start)
  }
  samples.sort((a, b) => a - b)
  return samples[Math.ceil(0.95 * RUNS) - 1]
}

function character(order: string[], decisions: Record<string, DecisionValue>): CharacterDocument {
  return {
    schema: 1,
    id: 'c1',
    contentVersion: '0.0.0',
    revision: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    sources: { order },
    decisions: Object.fromEntries(Object.entries(decisions).map(([key, value]) => [key, { mode: 'chosen' as const, value }])),
    text: {},
    log: [],
  }
}

/**
 * Pacote fictício do porte de um nível 0 completo (§5): 1 ancestralidade; 25 vagas `choose-value` concedidas por ela,
 * lidas pelas fórmulas por `grant:`; 10 vagas `attribute-shift` em 3 etapas (20 efeitos); 4 atributos com modificador;
 * 10 características com fórmula em cadeias de profundidade 3; 4 limites.
 */
function sizedFixture() {
  const steps = ['step:origin', 'step:a', 'step:b', 'step:c']
  const attributes = ['might', 'wits', 'grace', 'nerve'].map((name) => `attribute:${name}`)
  const shiftSlots = Array.from({ length: 10 }, (_, i) => ({ step: steps[1 + (i % 3)], key: `shift-${i}` }))
  const grants = Array.from({ length: 25 }, (_, i) => `g${i}`)
  const trait = (i: number) => `characteristic:trait-${i}`

  // Cadeias 0←1←2←3, 4←5←6←7 e 8←9: cada característica soma um atributo, as concessões dela e a anterior da cadeia.
  const formula = (i: number): Formula => ({
    add: [
      { ref: attributes[i % 4] },
      ...grants.filter((_, g) => g % 10 === i).map((g) => ({ ref: `grant:${g}` })),
      ...(i % 4 === 0 ? [] : [{ ref: trait(i - 1) }]),
    ],
  })
  const limits: Record<number, object> = { 0: { max: 25 }, 3: { max: 25 }, 5: { min: 1 }, 9: { max: { ref: attributes[3] } } }

  const book: Book = {
    format: 1,
    id: 'test.sized',
    name: 'Sized',
    abbr: 'SZ',
    layer: 'core',
    published: '2001',
    components: [
      {
        id: 'base',
        type: 'adds',
        default: 'on',
        items: [
          { id: 'procedure:test', steps },
          { id: 'step:origin', name: 'Origin', page: 1, slots: { ancestry: { kind: 'choose-entity', of: 'ancestry' } } },
          ...steps.slice(1).map((id) => ({
            id,
            name: id,
            page: 2,
            requires: ['step:origin'],
            slots: Object.fromEntries(
              shiftSlots.filter((slot) => slot.step === id).map((slot) => [slot.key, { kind: 'attribute-shift' as const, amount: 1, optional: true as const }]),
            ),
          })),
          ...attributes.map((id) => ({ id, name: id, page: 3, modifier: { add: [{ ref: 'self' }, -10] } as Formula })),
          ...Array.from({ length: 10 }, (_, i) => ({ id: trait(i), name: `Trait ${i}`, page: 3, formula: 0 as Formula, ...(limits[i] && { limits: limits[i] }) })),
          {
            id: 'ancestry:sized',
            name: 'Sized',
            page: 4,
            attributes: Object.fromEntries(attributes.map((id) => [id, 10])),
            characteristics: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [trait(i), formula(i)])),
            grants: Object.fromEntries(
              grants.map((g, i) => [g, { kind: 'choose-value' as const, step: steps[i % 4], target: trait(i % 10), options: [1, 2] }]),
            ),
          },
        ],
      },
    ],
  } as Book
  const decisions: Record<string, DecisionValue> = { ancestry: 'ancestry:sized' }
  for (const g of grants) decisions[`ancestry=sized/${g}`] = 2
  shiftSlots.forEach((slot, i) => {
    decisions[slot.key] = { decrease: attributes[i % 4], increase: attributes[(i + 1) % 4] }
  })
  return { rules: resolve([book], ['test.sized']), document: character(['test.sized'], decisions) }
}

describe('evaluate: time guard', () => {
  it('NFR-PERF-002: evaluate of the most complete core character stays under 20 ms at p95', () => {
    const rules = resolve([core as unknown as Book], ['sotdl.core'])
    const document = character(['sotdl.core'], {
      ancestry: 'ancestry:human',
      'ancestry=human/size': 1,
      adjustment: { decrease: 'attribute:strength', increase: 'attribute:intellect' },
    })
    expect(evaluate(rules, document).slots.filter((slot) => slot.decided)).toHaveLength(3)
    const time = p95(rules, document)
    console.info(`NFR-PERF-002 evaluate p95, core (Human, Size, adjustment): ${time.toFixed(3)} ms over ${RUNS} runs`)
    expect(time).toBeLessThanOrEqual(LIMIT_MS)
  })

  it('NFR-PERF-002: evaluate of a complete level 0 sized fixture (36 decisions, 20 effects, 14 formulas and 4 limits) stays under 20 ms at p95', () => {
    const { rules, document } = sizedFixture()
    // O porte declarado no nome do teste.
    const view = evaluate(rules, document)
    expect(view.slots.filter((slot) => slot.decided)).toHaveLength(36)
    expect(view.summary.attributes.flatMap((a) => a.composition).filter((stage) => stage.stage === 'modifier')).toHaveLength(20)
    expect(rules.attributes).toHaveLength(4)
    expect(view.summary.characteristics.filter((c) => c.formula !== '' && c.value !== null)).toHaveLength(10)
    expect(view.summary.characteristics.flatMap((c) => c.limits)).toHaveLength(4)

    const time = p95(rules, document)
    console.info(`NFR-PERF-002 evaluate p95, sized fixture: ${time.toFixed(3)} ms over ${RUNS} runs`)
    expect(time).toBeLessThanOrEqual(LIMIT_MS)
  })
})
