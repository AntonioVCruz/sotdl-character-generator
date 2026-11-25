import { describe, expect, it } from 'vitest'
import core from '../../packs/sotdl.core.json'
import type { Book, CharacterDocument, Decision } from '../content'
import { evaluate, impact, resolve, rollAllKeys, type SlotView } from '../engine'
import { rollAllChange, type RolledSlot } from './changes'

// Guarda unitária da NFR-PERF-002 para o Roll all undecided (FEAT-010 §5, AC-13; D10): o candidato com faces fixas,
// o `settle` dele e o `impact` com `key` nulo, 200 execuções, p95 ≤ 20 ms, um quinto de 100 ms, como as guardas da
// FEAT-008 e da FEAT-011. O número sai no console, para o relatório de aceite.

const RUNS = 200
const LIMIT_MS = 20
const AT = '2026-01-02T00:00:00.000Z'

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

type TableSlot = Extract<SlotView, { kind: 'table' }>

/** A decisão rolada e a entrada dela, como a sessão as monta (FEAT-009 §3.2, §3.3), com as faces dadas. */
function rolledIn(slot: TableSlot, faces: number[]): RolledSlot {
  const { table } = slot
  const modifier = table.dice.modifier ?? 0
  const total = faces.reduce((sum, face) => sum + face, modifier)
  const entry = table.entries.find(({ range: [start, end] }) => start <= total && total <= end)!
  const decision: Decision = { mode: 'rolled', dice: faces, modifier, total, entry: entry.key, rolls: 1, book: table.provenance.book }
  const draft: RolledSlot['draft'] = {
    kind: 'decision',
    slot: slot.key,
    slotKind: 'table',
    step: { id: slot.stepId, name: 'Story' },
    origin: slot.source,
    mode: 'rolled',
    subject: { id: table.id, name: table.name },
    source: { book: entry.provenance.book, abbr: entry.provenance.abbr, ...(entry.provenance.page !== undefined && { page: entry.provenance.page }) },
    result: { entry: entry.key },
    roll: { count: table.dice.count, sides: table.dice.sides, modifier, total, rolls: 1, faces },
  }
  return { slot, decision, draft }
}

describe('Roll all undecided: time guard (FEAT-010)', () => {
  it('NFR-PERF-002: the Roll all candidate of a core Dwarf with the six tables undecided, with settle and impact with a null key, stays under 20 ms at p95 (AC-13)', () => {
    const rules = resolve([core as unknown as Book], ['sotdl.core'])
    const before: CharacterDocument = {
      schema: 1,
      id: 'c1',
      contentVersion: '0.0.0',
      revision: 2,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      sources: { order: ['sotdl.core'] },
      decisions: { ancestry: { mode: 'chosen', value: 'ancestry:dwarf', logged: 1 } },
      text: {},
      log: [],
    }
    // A visão de antes é a do snapshot: fica fora da medida, como na sessão.
    const view = evaluate(rules, before)
    const keys = rollAllKeys(view, 'step:story')
    expect(keys).toHaveLength(6)
    const slots = keys.map((key) => view.slots.find((slot) => slot.key === key) as TableSlot)
    // Faces fixas: a mais alta de cada dado, para cair numa entrada de qualquer tabela.
    const faces = slots.map((slot) => Array.from({ length: slot.table.dice.count }, () => slot.table.dice.sides))

    const run = () => {
      const candidate = rollAllChange(rules, before, slots.map((slot, i) => rolledIn(slot, faces[i])), AT)
      return impact(rules, before, candidate.document, null)
    }
    // O que a medida cobre: seis decisões, seis entradas, nenhuma marca, e o diálogo não abre.
    const result = run()
    expect(result.after.slots.filter((slot) => slot.kind === 'table' && slot.decided)).toHaveLength(6)
    expect(result.after.steps.find((step) => step.id === 'step:story')?.status).toBe('done')
    expect(result).not.toHaveProperty('change')
    expect(result.needsDialog).toBe(false)

    const time = p95Of(run)
    console.info(`NFR-PERF-002 Roll all candidate + settle + impact(null) p95, core (Dwarf, six tables): ${time.toFixed(3)} ms over ${RUNS} runs`)
    expect(time).toBeLessThanOrEqual(LIMIT_MS)
  })
})
