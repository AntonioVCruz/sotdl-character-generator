import { describe, expect, it } from 'vitest'
import type { Book, CharacterDocument, Decision, DecisionValue, Formula } from '../content'
import core from '../../packs/sotdl.core.json'
import { evaluate, impact, resolve, settle, type Rules } from '.'

// Guarda unitária da NFR-PERF-002 (technical-design §5; ADR-008): `evaluate`, 200 execuções, p95 ≤ 20 ms, um quinto
// do limite do notebook. Os números saem no console, para o relatório de aceite.
// Guarda unitária da NFR-PERF-003 (FEAT-011 §5): `impact`, 200 execuções, p95 ≤ 60 ms, um quinto de 300 ms.

const RUNS = 200
const LIMIT_MS = 20
const IMPACT_LIMIT_MS = 60

/** p95 pelo posto mais próximo: a 190ª de 200 amostras em ordem. */
function p95Of(run: () => unknown): number {
  const samples: number[] = []
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now()
    run()
    samples.push(performance.now() - start)
  }
  samples.sort((a, b) => a - b)
  return samples[Math.ceil(0.95 * RUNS) - 1]
}

function p95(rules: Rules, document: CharacterDocument): number {
  return p95Of(() => evaluate(rules, document))
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

/**
 * Pacote fictício com suspensas acumuladas (FEAT-011 §5): 10 ancestralidades, cada uma com as mesmas 6 tabelas d20 de
 * 20 entradas decididas, e só a primeira escolhida: 54 suspensas de vagas não geradas. As 6 tabelas da escolhida têm 5
 * candidatos em `earlier`: 3 de outro livro (`invalid`) e 2 válidos e mais antigos (`superseded`), 30 suspensas com
 * conferência de validade. Toda decisão tem `logged`, e o documento sai assentado por `settle`, como a sessão o grava.
 */
function setAsideFixture() {
  const BOOK = 'test.accumulated'
  const attributes = ['might', 'wits', 'grace', 'nerve'].map((name) => `attribute:${name}`)
  const trait = (i: number) => `characteristic:trait-${i}`
  const ancestries = Array.from({ length: 10 }, (_, i) => `a${i}`)
  const tables = Array.from({ length: 6 }, (_, i) => `t${i}`)
  const ROLLED = '7'

  const book = {
    format: 1,
    id: BOOK,
    name: 'Accumulated',
    abbr: 'AC',
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
          })),
          ...tables.map((t, i) => ({
            id: `table:${t}`,
            name: `Table ${i}`,
            page: 4,
            dice: { count: 1, sides: 20 },
            regime: 'roll-or-choose',
            entries: Object.fromEntries(
              Array.from({ length: 20 }, (_, e) => [
                String(e + 1),
                String(e + 1) === ROLLED ? { effects: { bonus: { target: trait(i % 4), add: 1 } } } : {},
              ]),
            ),
          })),
          ...ancestries.map((a, i) => ({
            id: `ancestry:${a}`,
            name: `Ancestry ${i}`,
            page: 5,
            attributes: Object.fromEntries(attributes.map((id) => [id, 10])),
            grants: Object.fromEntries(tables.map((t) => [t, { kind: 'table', step: 'step:story', table: `table:${t}` }])),
          })),
        ],
      },
    ],
  } as unknown as Book

  let logged = 0
  const next = () => ++logged
  const rolled = (entry: string, book: string): Decision => ({ mode: 'rolled', dice: [Number(entry)], modifier: 0, total: Number(entry), entry, rolls: 1, book, logged: next() })
  const chosen = (value: string): Decision => ({ mode: 'chosen', value, book: BOOK, logged: next() })

  const document = character([BOOK], {})
  document.decisions.ancestry = { mode: 'chosen', value: 'ancestry:a0', logged: next() }
  document.earlier = {}
  for (const [i, a] of ancestries.entries()) {
    for (const [j, t] of tables.entries()) {
      const key = `ancestry=${a}/${t}`
      if (i > 0) {
        document.decisions[key] = chosen(String(1 + j))
        continue
      }
      // Da mais antiga para a mais recente, como as regras de escrita as empilham; `earlier` vai da mais recente à mais antiga.
      const older = [1, 2, 3, 4, 5].map((k) => (k % 2 ? rolled(String(k + 1), 'test.other') : chosen(String(10 + k))))
      document.earlier[key] = older.reverse()
      document.decisions[key] = rolled(ROLLED, BOOK)
    }
  }
  const rules = resolve([book], [BOOK])
  return { rules, document: settle(rules, document).document, next }
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

  it('NFR-PERF-002: evaluate of a fixture with accumulated set-aside decisions (54 not generated, 30 with a validity check) stays under 20 ms at p95', () => {
    const { rules, document } = setAsideFixture()
    // O porte da §5, conferido na própria fixture.
    const view = evaluate(rules, document)
    const reasons = view.setAside.reduce<Record<string, number>>((count, item) => ({ ...count, [item.reason]: (count[item.reason] ?? 0) + 1 }), {})
    expect(reasons).toEqual({ 'not-generated': 54, invalid: 18, superseded: 12 })
    expect(view.slots.filter((slot) => slot.kind === 'table' && slot.decided && slot.candidate === 0)).toHaveLength(6)

    const time = p95(rules, document)
    console.info(`NFR-PERF-002 evaluate p95, set-aside fixture (54 not generated, 18 invalid, 12 superseded): ${time.toFixed(3)} ms over ${RUNS} runs`)
    expect(time).toBeLessThanOrEqual(LIMIT_MS)
  })
})

describe('impact: time guard', () => {
  it('NFR-PERF-003: impact of switching a core Dwarf with the six tables and the adjustment to Human stays under 60 ms at p95', () => {
    const rules = resolve([core as unknown as Book], ['sotdl.core'])
    let logged = 0
    const before = character(['sotdl.core'], {})
    before.decisions.ancestry = { mode: 'chosen', value: 'ancestry:dwarf', logged: ++logged }
    const entries = { 'hated-creature': '1-2', age: '8-12', build: '9-12', appearance: '9-11', background: '1', personality: '9-12' }
    for (const [grant, entry] of Object.entries(entries)) {
      before.decisions[`ancestry=dwarf/${grant}`] = { mode: 'chosen', value: entry, book: 'sotdl.core', logged: ++logged }
    }
    before.decisions.adjustment = { mode: 'chosen', value: { decrease: 'attribute:strength', increase: 'attribute:intellect' }, logged: ++logged }
    const after = settle(rules, { ...before, decisions: { ...before.decisions, ancestry: { mode: 'chosen', value: 'ancestry:human', logged: logged + 1 } } }).document

    const result = impact(rules, before, after, 'ancestry')
    expect(result.setAside).toHaveLength(6)
    expect(result.recalculated.characteristics.find((c) => c.name === 'Corruption')).toMatchObject({ from: 1, to: 0 })
    expect(result.stays.map((item) => item.key)).toEqual(['adjustment'])

    const time = p95Of(() => impact(rules, before, after, 'ancestry'))
    console.info(`NFR-PERF-003 impact p95, core (Dwarf, six tables, Background 1, adjustment → Human): ${time.toFixed(3)} ms over ${RUNS} runs`)
    expect(time).toBeLessThanOrEqual(IMPACT_LIMIT_MS)
  })

  it('NFR-PERF-003: impact of switching the chosen ancestry of the set-aside fixture stays under 60 ms at p95', () => {
    const { rules, document: before, next } = setAsideFixture()
    const after = settle(rules, { ...before, decisions: { ...before.decisions, ancestry: { mode: 'chosen', value: 'ancestry:a1', logged: next() } } }).document

    const result = impact(rules, before, after, 'ancestry')
    expect(result.setAside).toHaveLength(6)
    expect(result.restored).toHaveLength(6)

    const time = p95Of(() => impact(rules, before, after, 'ancestry'))
    console.info(`NFR-PERF-003 impact p95, set-aside fixture (a0 → a1): ${time.toFixed(3)} ms over ${RUNS} runs`)
    expect(time).toBeLessThanOrEqual(IMPACT_LIMIT_MS)
  })
})
