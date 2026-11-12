import { describe, expect, it } from 'vitest'
import { bookIndexSchema, bookSchema, characterDocumentSchema } from './schemas'

// Pacotes fictícios: nenhum dado dos livros nos testes.
function testBook() {
  return {
    format: 1,
    id: 'test.book',
    name: 'Test Book',
    abbr: 'TB',
    layer: 'core',
    published: '2001-02-03',
    components: [
      {
        id: 'base',
        type: 'adds',
        default: 'on',
        items: [
          { id: 'procedure:test', steps: ['step:origin', 'step:traits', 'step:end'] },
          { id: 'step:origin', name: 'Origin', page: 1, regime: 'choice', slots: { origin: { kind: 'choose-entity', of: 'ancestry' } } },
          { id: 'step:traits', name: 'Traits', page: 2, requires: ['step:origin'] },
          { id: 'step:end', name: 'End', requires: ['step:origin'] },
          { id: 'attribute:might', name: 'Might', page: 3, modifier: { add: [{ ref: 'self' }, -10] } },
          { id: 'characteristic:vigor', name: 'Vigor', page: 3, formula: { ref: 'attribute:might' } },
          { id: 'characteristic:recovery', name: 'Recovery', page: 3, formula: { round: 'down', of: { div: [{ ref: 'characteristic:vigor' }, 4] } } },
          { id: 'characteristic:stature', name: 'Stature', page: 3 },
          { id: 'talent:stubborn', name: 'Stubborn', page: 4 },
          { id: 'language:trade', name: 'Trade', page: 4 },
          {
            id: 'ancestry:gnome',
            name: 'Gnome',
            page: 5,
            attributes: { 'attribute:might': 8 },
            characteristics: { 'characteristic:vigor': { add: [{ ref: 'attribute:might' }, 2] }, 'characteristic:stature': { ref: 'grant:stature' } },
            languages: { 'language:trade': ['speak'] },
            talents: ['talent:stubborn'],
            level4: { characteristics: { 'characteristic:vigor': 3 }, oneOf: [{ spells: 1 }, { talent: 'talent:stubborn' }] },
            grants: { stature: { kind: 'choose-value', step: 'step:origin', target: 'characteristic:stature', options: [0.5, 1] } },
          },
          { id: 'ancestry:troll', name: 'Troll', page: 6, attributes: { 'attribute:might': 12 } },
        ],
      },
    ],
  }
}
type TestBook = ReturnType<typeof testBook>
const items = (book: TestBook) => book.components[0].items as Record<string, unknown>[]
const issues = (book: unknown) => {
  const parsed = bookSchema.safeParse(book)
  return parsed.success ? [] : parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
}

describe('pack schema', () => {
  it('FR-CONT-001: accepts a book in the documented format', () => {
    const book = testBook()
    expect(bookSchema.parse(book)).toEqual(book)
  })

  it('FR-CONT-010: rejects a book or index entry without a publication date', () => {
    expect(bookSchema.safeParse({ ...testBook(), published: undefined }).success).toBe(false)
    const index = { format: 1, books: [{ id: 'test.book', name: 'Test', abbr: 'TB', layer: 'core' }] }
    expect(bookIndexSchema.safeParse(index).success).toBe(false)
  })

  it('FR-CONT-004: rejects a text field in a book or in an item, with the path in the error', () => {
    expect(bookSchema.safeParse({ ...testBook(), description: 'Prose' }).success).toBe(false)
    const book = testBook()
    items(book)[8].description = 'Prose from a book'
    expect(issues(book)).toEqual([expect.objectContaining({ path: 'components.0.items.8' })])
    expect(issues(book)[0].message).toMatch(/description/)
  })

  it('FR-CONT-004: rejects an item whose id prefix is not a known kind', () => {
    const book = testBook()
    items(book).push({ id: 'spell:spark', name: 'Spark', page: 7 })
    expect(issues(book)).toEqual([{ path: 'components.0.items.12.id', message: expect.stringMatching(/unknown item kind/) }])
  })

  it('FR-FLOW-002: rejects a step that requires a later step of the procedure', () => {
    const book = testBook()
    items(book)[2].requires = ['step:end']
    expect(issues(book)).toEqual([{ path: 'components.0.items.2.requires.0', message: expect.stringMatching(/before it/) }])
  })

  it('ADR-004: rejects a root slot name used twice in the procedure', () => {
    const book = testBook()
    items(book)[2].slots = { origin: { kind: 'choose-entity', of: 'ancestry' } }
    expect(issues(book)).toEqual([{ path: 'components.0.items.2.slots.origin', message: expect.stringMatching(/already used/) }])
  })

  it('ADR-004: rejects a grant on a step outside the procedure and an unresolved formula reference', () => {
    const book = testBook()
    ;(items(book)[10] as { grants: Record<string, { step: string }> }).grants.stature.step = 'step:nowhere'
    ;(items(book)[5] as { formula: unknown }).formula = { ref: 'attribute:luck' }
    expect(issues(book)).toEqual([
      { path: 'components.0.items.5.formula', message: 'unknown reference attribute:luck' },
      { path: 'components.0.items.10.grants.stature.step', message: expect.stringMatching(/not a step/) },
    ])
  })

  it('ADR-004: rejects a formula cycle in one ancestry (default plus what it replaces), pointing at the closing formula', () => {
    const book = testBook()
    const troll = items(book)[11]
    troll.characteristics = { 'characteristic:vigor': { add: [{ ref: 'characteristic:recovery' }, 1] } }
    expect(issues(book)).toEqual([
      { path: 'components.0.items.11.characteristics.characteristic:vigor', message: 'cycle: Vigor → Recovery → Vigor' },
    ])
  })

  it('ADR-004: two ancestries with crossed formulas are not a cycle', () => {
    const book = testBook()
    // Gnome: Vigor depende de Stature; Troll: Stature depende de Vigor. Nenhum dos dois grafos fecha ciclo.
    items(book)[10].characteristics = { 'characteristic:vigor': { ref: 'characteristic:stature' }, 'characteristic:stature': 1 }
    items(book)[11].characteristics = { 'characteristic:stature': { ref: 'characteristic:vigor' } }
    expect(issues(book)).toEqual([])
  })
})

describe('character document v1', () => {
  const document = {
    schema: 1,
    id: 'c1',
    contentVersion: '0.0.0',
    revision: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    sources: { order: ['test.book'] },
    decisions: { origin: { mode: 'chosen', value: 'ancestry:gnome' }, 'origin=gnome/stature': { mode: 'chosen', value: 0.5 } },
    text: { name: 'Nim' },
    log: [],
  }

  it('FR-CALC-001: accepts the v1 layers (sources, decisions, text, log) and nothing derived', () => {
    expect(characterDocumentSchema.parse(document)).toEqual(document)
    expect(characterDocumentSchema.safeParse({ ...document, health: 10 }).success).toBe(false)
  })

  it('ADR-004: rejects a document saved by the technical skeleton (name on top, level, no text)', () => {
    const skeleton = { ...document, name: '', level: 0, decisions: {}, text: undefined }
    expect(characterDocumentSchema.safeParse(skeleton).success).toBe(false)
  })
})
