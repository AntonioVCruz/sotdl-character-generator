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

/**
 * Pacote fictício com tabelas (FEAT-009 §5): 6 tabelas d20 de 20 entradas concedidas na Story, decididas por rolagem;
 * na entrada rolada, 10 efeitos `add`, 4 `set` e 2 `add.dice`, com as 2 vagas `roll-effect` decididas.
 */
function tableFixture() {
  const attributes = ['might', 'wits', 'grace', 'nerve'].map((name) => `attribute:${name}`)
  const trait = (i: number) => `characteristic:trait-${i}`
  const tables = Array.from({ length: 6 }, (_, i) => `t${i}`)
  const ROLLED = '7'
  type Effect = { target: string; add: number } | { target: string; set: number } | { target: string; add: { dice: { count: number; sides: number } } }
  const effects: Effect[] = [
    ...Array.from({ length: 10 }, (_, k) => ({ target: k % 2 ? attributes[k % 4] : trait(k % 4), add: 1 })),
    ...Array.from({ length: 4 }, (_, k) => ({ target: trait(k), set: 5 + k })),
    { target: trait(0), add: { dice: { count: 1, sides: 6 } } },
    { target: attributes[0], add: { dice: { count: 1, sides: 6 } } },
  ]
  const effectsOf = (table: number) =>
    Object.fromEntries(effects.flatMap((effect, k) => (k % tables.length === table ? [[`e${k}`, effect]] : [])))

  const book = {
    format: 1,
    id: 'test.tabled',
    name: 'Tabled',
    abbr: 'TT',
    layer: 'core',
    published: '2001',
    components: [
      {
        id: 'base',
        type: 'adds',
        default: 'on',
        items: [
          { id: 'procedure:test', steps: ['step:origin', 'step:story'] },
          { id: 'step:origin', name: 'Origin', page: 1, slots: { ancestry: { kind: 'choose-entity', of: 'ancestry' } } },
          { id: 'step:story', name: 'Story', page: 2, requires: ['step:origin'] },
          ...attributes.map((id) => ({ id, name: id, page: 3, modifier: { add: [{ ref: 'self' }, -10] } })),
          ...Array.from({ length: 4 }, (_, i) => ({
            id: trait(i),
            name: `Trait ${i}`,
            page: 3,
            formula: { add: [{ ref: attributes[i] }, ...(i === 0 ? [] : [{ ref: trait(i - 1) }])] },
            ...(i === 3 && { limits: { max: 25 } }),
          })),
          ...tables.map((t, i) => ({
            id: `table:${t}`,
            name: `Table ${i}`,
            page: 4,
            dice: { count: 1, sides: 20 },
            regime: 'roll-or-choose',
            entries: Object.fromEntries(
              Array.from({ length: 20 }, (_, e) => [String(e + 1), String(e + 1) === ROLLED ? { effects: effectsOf(i) } : {}]),
            ),
          })),
          {
            id: 'ancestry:tabled',
            name: 'Tabled',
            page: 5,
            attributes: Object.fromEntries(attributes.map((id) => [id, 10])),
            grants: Object.fromEntries(tables.map((t) => [t, { kind: 'table', step: 'step:story', table: `table:${t}` }])),
          },
        ],
      },
    ],
  } as unknown as Book

  const document = character(['test.tabled'], { ancestry: 'ancestry:tabled' })
  for (const t of tables) {
    document.decisions[`ancestry=tabled/${t}`] = { mode: 'rolled', dice: [7], modifier: 0, total: 7, entry: ROLLED, rolls: 1, book: 'test.tabled' }
  }
  effects.forEach((effect, k) => {
    if (typeof (effect as { add?: unknown }).add !== 'object') return
    document.decisions[`ancestry=tabled/${tables[k % tables.length]}=${ROLLED}/e${k}`] = { mode: 'rolled', dice: [3], modifier: 0, total: 3 }
  })
  return { rules: resolve([book], ['test.tabled']), document }
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

  it('NFR-PERF-002: evaluate of a Dwarf with the six tables decided, Background 1 and the adjustment stays under 20 ms at p95', () => {
    const rules = resolve([core as unknown as Book], ['sotdl.core'])
    const document = character(['sotdl.core'], {
      ancestry: 'ancestry:dwarf',
      adjustment: { decrease: 'attribute:strength', increase: 'attribute:intellect' },
    })
    const entries = { 'hated-creature': '1-2', age: '8-12', build: '9-12', appearance: '9-11', background: '1', personality: '9-12' }
    for (const [grant, entry] of Object.entries(entries)) {
      document.decisions[`ancestry=dwarf/${grant}`] = { mode: 'chosen', value: entry, book: 'sotdl.core' }
    }
    const view = evaluate(rules, document)
    expect(view.slots.filter((slot) => slot.kind === 'table' && slot.decided)).toHaveLength(6)
    expect(view.summary.characteristics.find((c) => c.name === 'Corruption')?.value).toBe(1)
    expect(view.slots.find((slot) => slot.key === 'adjustment')?.decided).toBe(true)

    const time = p95(rules, document)
    console.info(`NFR-PERF-002 evaluate p95, core (Dwarf, six tables, Background 1, adjustment): ${time.toFixed(3)} ms over ${RUNS} runs`)
    expect(time).toBeLessThanOrEqual(LIMIT_MS)
  })

  it('NFR-PERF-002: evaluate of a table fixture (6 rolled tables of 20 entries, 10 add, 4 set, 2 add.dice decided) stays under 20 ms at p95', () => {
    const { rules, document } = tableFixture()
    // O porte declarado no nome do teste.
    const view = evaluate(rules, document)
    const tables = view.slots.filter((slot) => slot.kind === 'table')
    expect(tables.filter((slot) => slot.decided)).toHaveLength(6)
    expect(tables.every((slot) => slot.kind === 'table' && slot.table.entries.length === 20 && slot.result?.mode === 'rolled')).toBe(true)
    const stages = [...view.summary.attributes, ...view.summary.characteristics].flatMap((value) => value.composition)
    const fromTables = stages.filter((stage) => (stage.stage === 'sum' || stage.stage === 'define') && stage.value !== null)
    expect(fromTables.filter((stage) => stage.stage === 'define')).toHaveLength(4)
    expect(fromTables.filter((stage) => stage.stage === 'sum')).toHaveLength(12)
    expect(view.slots.filter((slot) => slot.kind === 'roll-effect' && slot.decided)).toHaveLength(2)
    expect(view.openDecisions).toEqual([])

    const time = p95(rules, document)
    console.info(`NFR-PERF-002 evaluate p95, table fixture: ${time.toFixed(3)} ms over ${RUNS} runs`)
    expect(time).toBeLessThanOrEqual(LIMIT_MS)
  })
})
