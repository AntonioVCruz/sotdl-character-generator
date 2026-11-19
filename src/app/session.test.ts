import { describe, expect, it, vi } from 'vitest'
import core from '../../packs/sotdl.core.json'
import type { CharacterDocument, Decision } from '../content'
import { createApp, type CharacterSummary, type Repository } from '.'

// Pacotes fictícios servidos por um fetch falso; repositório em memória.
const items = [
  { id: 'procedure:test', steps: ['step:origin', 'step:traits'] },
  { id: 'step:origin', name: 'Origin', page: 1, regime: 'choice', slots: { ancestry: { kind: 'choose-entity', of: 'ancestry' } } },
  { id: 'step:traits', name: 'Traits', page: 2, requires: ['step:origin'] },
  { id: 'attribute:might', name: 'Might', page: 3, modifier: { add: [{ ref: 'self' }, -10] } },
  { id: 'characteristic:stature', name: 'Stature', page: 3 },
  {
    id: 'ancestry:gnome',
    name: 'Gnome',
    page: 5,
    attributes: { 'attribute:might': 8 },
    characteristics: { 'characteristic:stature': { ref: 'grant:stature' } },
    grants: {
      stature: { kind: 'choose-value', step: 'step:origin', target: 'characteristic:stature', options: [0.5, 1] },
      boost: { kind: 'attribute-increase', step: 'step:traits', amount: 1 },
    },
  },
  { id: 'ancestry:troll', name: 'Troll', page: 6, attributes: { 'attribute:might': 12 } },
  { id: 'ancestry:sprite', name: 'Sprite', page: 7, attributes: { 'attribute:might': 6 } },
]
const book = (id: string, bookItems: unknown[]) => ({
  format: 1,
  id,
  name: id,
  abbr: 'TB',
  layer: 'core',
  published: '2001',
  components: [{ id: 'base', type: 'adds', default: 'on', items: bookItems }],
})
const files: Record<string, unknown> = {
  '/packs/index.json': { format: 1, books: [{ id: 'test.core', name: 'Core', abbr: 'TB', layer: 'core', published: '2001' }] },
  '/packs/test.core.json': book('test.core', items),
  // Define de novo uma ancestralidade do core: o motor recusa (EngineError).
  '/packs/test.clash.json': book('test.clash', [{ id: 'ancestry:troll', name: 'Troll', page: 1, attributes: {} }]),
}
const fetch = vi.fn(async (url: string) => ({ ok: url in files, status: url in files ? 200 : 404, json: async () => files[url] }))

function memoryRepository(options: { failGet?: boolean } = {}) {
  const docs = new Map<string, unknown>()
  const metas = new Map<string, CharacterSummary>()
  const control = { failSave: false }
  const repository: Repository = {
    list: async () => [...metas.values()],
    get: async (id) => {
      if (options.failGet) throw new DOMException('blocked', 'UnknownError')
      return docs.get(id) as CharacterDocument | undefined
    },
    save: vi.fn(async (doc, meta) => {
      if (control.failSave) throw new Error('quota exceeded')
      docs.set(doc.id, doc)
      metas.set(meta.id, meta)
    }),
    delete: async (id) => {
      docs.delete(id)
      metas.delete(id)
    },
  }
  return { repository, docs, metas, control }
}

const deps = { packs: { baseUrl: '/', fetch }, now: () => new Date('2026-01-02T00:00:00Z'), newId: () => 'id-1' }

function stored(decisions: Record<string, string | number> = {}, order = ['test.core']) {
  return {
    schema: 1,
    id: 'id-1',
    contentVersion: '0.0.0',
    revision: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    sources: { order },
    decisions: Object.fromEntries(Object.entries(decisions).map(([key, value]) => [key, { mode: 'chosen', value }])),
    text: {},
    log: [],
  }
}

function memoryLastStep(initial: Record<string, string> = {}) {
  const steps = new Map(Object.entries(initial))
  return {
    steps,
    get: (id: string) => steps.get(id),
    set: vi.fn((id: string, slug: string) => void steps.set(id, slug)),
    forget: (id: string) => void steps.delete(id),
  }
}

async function opened(document: unknown = stored(), options?: { failGet?: boolean; lastStep?: ReturnType<typeof memoryLastStep> }) {
  const memory = memoryRepository(options)
  if (document) memory.docs.set('id-1', document)
  const session = createApp({ repository: memory.repository, ...deps, lastStep: options?.lastStep ?? memoryLastStep() }).createSession()
  await session.open('id-1')
  vi.mocked(memory.repository.save).mockClear()
  return { ...memory, session }
}
const ready = (session: Awaited<ReturnType<typeof opened>>['session']) => {
  const snapshot = session.getSnapshot()
  if (snapshot.status !== 'ready') throw new Error(`not ready: ${JSON.stringify(snapshot)}`)
  return snapshot
}

describe('character session: open', () => {
  it('FR-FLOW-001: opens a saved character with its rules and view', async () => {
    const { session } = await opened()
    expect(ready(session)).toMatchObject({ id: 'id-1', save: 'saved', view: { ancestry: null } })
    expect(ready(session).view.steps.map((step) => step.status)).toEqual(['not-started', 'locked'])
  })

  it('FR-HELP-005: a repository that rejects on get gives storage-unavailable, never staying in loading', async () => {
    const { session } = await opened(stored(), { failGet: true })
    expect(session.getSnapshot()).toEqual({ status: 'error', id: 'id-1', reason: 'storage-unavailable' })
  })

  it('FR-HELP-005: a character that is not saved gives not-found', async () => {
    const { session } = await opened(null)
    expect(session.getSnapshot()).toEqual({ status: 'error', id: 'id-1', reason: 'not-found' })
  })

  it('FR-HELP-005: an invalid document (like one saved by the skeleton) gives unreadable', async () => {
    const skeleton = { ...stored(), name: '', level: 0, text: undefined }
    const { session } = await opened(skeleton)
    expect(session.getSnapshot()).toEqual({ status: 'error', id: 'id-1', reason: 'unreadable' })
  })

  it('FR-HELP-004: a pack that does not load gives pack-load-failed and saves nothing', async () => {
    const { session, repository } = await opened(stored({}, ['test.missing']))
    expect(session.getSnapshot()).toEqual({ status: 'error', id: 'id-1', reason: 'pack-load-failed' })
    expect(repository.save).not.toHaveBeenCalled()
  })

  it('FR-HELP-004: rules the engine refuses (an id in two books) give pack-load-failed, save nothing and leave loading', async () => {
    const { session, repository } = await opened(stored({}, ['test.core', 'test.clash']))
    expect(session.getSnapshot()).toEqual({ status: 'error', id: 'id-1', reason: 'pack-load-failed' })
    expect(repository.save).not.toHaveBeenCalled()
  })
})

describe('character session: last step', () => {
  it('FR-CHAR-007: open brings the last visited step of the character', async () => {
    const { session } = await opened(stored(), { lastStep: memoryLastStep({ 'id-1': 'traits', 'id-2': 'origin' }) })
    expect(ready(session).lastStep).toBe('traits')
    const fresh = await opened(stored(), { lastStep: memoryLastStep() })
    expect(ready(fresh.session).lastStep).toBeUndefined()
  })

  it('FR-CHAR-007: visit writes the step to the store without saving, changing updatedAt, revision or the snapshot', async () => {
    const lastStep = memoryLastStep()
    const { session, repository, docs } = await opened(stored(), { lastStep })
    const before = ready(session)
    const listener = vi.fn()
    session.subscribe(listener)
    session.visit('traits')
    expect(lastStep.set).toHaveBeenCalledWith('id-1', 'traits')
    expect(lastStep.steps.get('id-1')).toBe('traits')
    expect(repository.save).not.toHaveBeenCalled()
    expect(session.getSnapshot()).toBe(before)
    expect(listener).not.toHaveBeenCalled()
    expect(docs.get('id-1')).toMatchObject({ revision: 1, updatedAt: '2026-01-01T00:00:00.000Z' })
  })
})

describe('character session: list metadata', () => {
  it('FR-CHAR-005: a required slot left open saves creating with the number of open decisions', async () => {
    const { session, metas } = await opened()
    await session.decide('ancestry', 'ancestry:gnome')
    // Size (stature) e o boost em Traits: as duas vagas obrigatórias do Gnome.
    expect(metas.get('id-1')).toMatchObject({ status: 'creating', openDecisions: 2 })
    await session.decide('ancestry=gnome/stature', 1)
    expect(metas.get('id-1')).toMatchObject({ status: 'creating', openDecisions: 1 })
  })

  it('FR-CHAR-005: the optional score adjustment does not count as an open decision', async () => {
    const { session, metas } = await opened(adjustable({}))
    await session.decide('ancestry', 'ancestry:troll')
    expect(ready(session).view.slots.find((slot) => slot.key === 'adjust')).toMatchObject({ decided: false })
    expect(metas.get('id-1')).toMatchObject({ status: 'complete', openDecisions: 0 })
  })

  it('FR-CHAR-006: no required slot open saves complete', async () => {
    const { session, metas } = await opened()
    await session.decide('ancestry', 'ancestry:troll')
    expect(metas.get('id-1')).toMatchObject({ status: 'complete', openDecisions: 0 })
  })

  it('FR-CHAR-003: the metadata saved by decide carries the ancestry name, the named sources and the content version', async () => {
    const { session, metas } = await opened()
    await session.decide('ancestry', 'ancestry:troll')
    expect(metas.get('id-1')).toEqual({
      id: 'id-1',
      name: '',
      ancestry: 'Troll',
      status: 'complete',
      openDecisions: 0,
      sources: [{ id: 'test.core', name: 'test.core', abbr: 'TB' }],
      contentVersion: '0.0.0',
      updatedAt: '2026-01-02T00:00:00.000Z',
    })
  })
})

describe('character session: decide', () => {
  it('FR-FLOW-013, NFR-REL-001: a valid decision updates the view first, then saves the document and its metadata', async () => {
    const { session, docs, metas } = await opened()
    const result = session.decide('ancestry', 'ancestry:troll')
    expect(ready(session)).toMatchObject({ save: 'saving', view: { ancestry: 'ancestry:troll' } })
    await expect(result).resolves.toEqual({ ok: true })
    expect(ready(session).save).toBe('saved')
    expect(docs.get('id-1')).toMatchObject({
      revision: 2,
      updatedAt: '2026-01-02T00:00:00.000Z',
      decisions: { ancestry: { mode: 'chosen', value: 'ancestry:troll' } },
    })
    expect(metas.get('id-1')).toMatchObject({ ancestry: 'Troll', name: '', updatedAt: '2026-01-02T00:00:00.000Z' })
  })

  it('FR-CALC-001: the saved document holds only inputs, never a derived value', async () => {
    const { session, docs } = await opened(stored({ ancestry: 'ancestry:gnome' }))
    await session.decide('ancestry=gnome/stature', 0.5)
    expect(docs.get('id-1')).toEqual({
      ...stored(),
      revision: 2,
      updatedAt: '2026-01-02T00:00:00.000Z',
      decisions: {
        ancestry: { mode: 'chosen', value: 'ancestry:gnome' },
        'ancestry=gnome/stature': { mode: 'chosen', value: 0.5, logged: 1 },
      },
      // FEAT-009 §7: o log, registro e não valor derivado, ganha a entrada da decisão.
      log: [
        {
          id: 1,
          at: '2026-01-02T00:00:00.000Z',
          kind: 'decision',
          slot: 'ancestry=gnome/stature',
          slotKind: 'choose-value',
          step: { id: 'step:origin', name: 'Origin' },
          origin: { id: 'ancestry:gnome', name: 'Gnome' },
          mode: 'chosen',
          subject: { id: 'characteristic:stature', name: 'Stature' },
          source: { book: 'test.core', abbr: 'TB', page: 5 },
          result: { value: 0.5 },
        },
      ],
    })
  })

  it('FR-CONT-006: renaming the entity in the pack, keeping its id, keeps the saved decision after reopening', async () => {
    const { session, docs, repository } = await opened()
    await session.decide('ancestry', 'ancestry:gnome')
    await session.decide('ancestry=gnome/stature', 1)

    // O mesmo personagem, reaberto com um pacote em que a entidade mudou de nome e manteve o id.
    const renamed = book('test.core', items.map((item) => (item.id === 'ancestry:gnome' ? { ...item, name: 'Hill Gnome' } : item)))
    const renamedFetch = vi.fn(async (url: string) => {
      const body = url === '/packs/test.core.json' ? renamed : files[url]
      return { ok: body !== undefined, status: body === undefined ? 404 : 200, json: async () => body }
    })
    const reopened = createApp({ ...deps, repository, packs: { baseUrl: '/', fetch: renamedFetch } }).createSession()
    await reopened.open('id-1')

    const view = ready(reopened).view
    expect(view.ancestry).toBe('ancestry:gnome')
    expect(view.slots.map((slot) => [slot.key, slot.decided])).toEqual([
      ['ancestry', true],
      ['ancestry=gnome/stature', true],
      ['ancestry=gnome/boost', false],
    ])
    expect(view.summary.attributes[0].composition[0].origin).toMatchObject({ id: 'ancestry:gnome', name: 'Hill Gnome' })
    expect(view.summary.characteristics[0].value).toBe(1)
    // O boost do Gnome, concedido em Traits, abre a etapa (FEAT-008 technical-design §3.3 e §7).
    expect(view.steps.map((step) => step.status)).toEqual(['done', 'open'])
    expect(docs.get('id-1')).toMatchObject({ decisions: { ancestry: { value: 'ancestry:gnome' } } })
  })

  it('FR-STEP-003: Size is decided through the same command', async () => {
    const { session } = await opened(stored({ ancestry: 'ancestry:gnome' }))
    await expect(session.decide('ancestry=gnome/stature', 0.5)).resolves.toEqual({ ok: true })
    expect(ready(session).view.summary.characteristics[0].value).toBe(0.5)
  })

  it('FR-FLOW-014: refuses an unknown slot or a value outside its options, changing nothing', async () => {
    const { session, repository } = await opened(stored({ ancestry: 'ancestry:gnome' }))
    const before = ready(session)
    await expect(session.decide('ancestry=troll/stature', 1)).resolves.toEqual({ ok: false, reason: 'unknown-slot' })
    await expect(session.decide('ancestry', 'ancestry:ghost')).resolves.toEqual({ ok: false, reason: 'invalid-value' })
    await expect(session.decide('ancestry=gnome/stature', 2)).resolves.toEqual({ ok: false, reason: 'invalid-value' })
    await expect(session.decide('ancestry=gnome/boost', 1)).resolves.toEqual({ ok: false, reason: 'invalid-value' })
    expect(session.getSnapshot()).toBe(before)
    expect(repository.save).not.toHaveBeenCalled()
  })

  it('FR-STEP-005, FR-CHG-001, FR-CHG-009: a switch with a decided dependent gives needs-confirmation with it set aside in pending, and nothing is applied or saved', async () => {
    const { session, repository } = await opened(stored({ ancestry: 'ancestry:gnome', 'ancestry=gnome/stature': 1 }))
    const before = ready(session)
    await expect(session.decide('ancestry', 'ancestry:troll')).resolves.toEqual({ ok: false, reason: 'needs-confirmation' })
    const after = ready(session)
    expect(after.document).toBe(before.document)
    expect(after.view).toBe(before.view)
    expect(after.pending).toMatchObject({ kind: 'decide', key: 'ancestry' })
    expect(after.pending!.impact.setAside.map((item) => item.key)).toEqual(['ancestry=gnome/stature'])
    expect(repository.save).not.toHaveBeenCalled()
  })

  it('FR-FLOW-003: a switch with no decided dependents applies directly', async () => {
    const { session } = await opened(stored({ ancestry: 'ancestry:gnome' }))
    await expect(session.decide('ancestry', 'ancestry:troll')).resolves.toEqual({ ok: true })
    expect(ready(session).view.ancestry).toBe('ancestry:troll')
  })

  it('FR-FLOW-003: a decision that was already an orphan before the change does not block it', async () => {
    const { session } = await opened(stored({ ancestry: 'ancestry:troll', 'ancestry=gnome/stature': 1 }))
    await expect(session.decide('ancestry', 'ancestry:sprite')).resolves.toEqual({ ok: true })
  })

  it('FR-CHAR-010: a failed save keeps the new state on screen with save failed, and retrySave saves it', async () => {
    const { session, docs, control } = await opened()
    control.failSave = true
    await expect(session.decide('ancestry', 'ancestry:troll')).resolves.toEqual({ ok: false, reason: 'save-failed' })
    expect(ready(session)).toMatchObject({ save: 'failed', view: { ancestry: 'ancestry:troll' } })
    expect(docs.get('id-1')).toMatchObject({ revision: 1 })

    control.failSave = false
    const retry = session.retrySave()
    expect(ready(session).save).toBe('saving')
    await expect(retry).resolves.toEqual({ ok: true })
    expect(ready(session).save).toBe('saved')
    expect(docs.get('id-1')).toMatchObject({ revision: 2, decisions: { ancestry: { value: 'ancestry:troll' } } })
  })

  it('NFR-REL-001: saves run in order and the last decision wins', async () => {
    const { session, docs } = await opened(stored({ ancestry: 'ancestry:gnome' }))
    const first = session.decide('ancestry=gnome/stature', 0.5)
    const second = session.decide('ancestry=gnome/stature', 1)
    await Promise.all([first, second])
    expect(docs.get('id-1')).toMatchObject({ revision: 3, decisions: { 'ancestry=gnome/stature': { value: 1 } } })
    expect(ready(session).save).toBe('saved')
  })
})

// O mesmo pacote com um segundo atributo e a vaga opcional do ajuste em Traits (FEAT-008).
files['/packs/test.adjust.json'] = book('test.adjust', [
  ...items.map((item) =>
    item.id === 'step:traits'
      ? { ...item, slots: { adjust: { kind: 'attribute-shift', amount: 1, optional: true } } }
      : 'attributes' in item
        ? { ...item, attributes: { ...item.attributes, 'attribute:wits': 10 } }
        : item,
  ),
  { id: 'attribute:wits', name: 'Wits', page: 3, modifier: { add: [{ ref: 'self' }, -10] } },
])
const pair = { decrease: 'attribute:might', increase: 'attribute:wits' }
const adjustable = (decisions: Record<string, string | number> = { ancestry: 'ancestry:troll' }) => stored(decisions, ['test.adjust'])
const adjusted = () => {
  const document = adjustable()
  return { ...document, decisions: { ...document.decisions, adjust: { mode: 'chosen', value: pair } } }
}
const attributeScores = (session: Awaited<ReturnType<typeof opened>>['session']) =>
  ready(session).view.summary.attributes.map((attribute) => [attribute.name, attribute.score])

describe('character session: score adjustment and clear', () => {
  it('FR-STEP-009: applying saves only the pair, and the view changes before the save', async () => {
    const { session, docs } = await opened(adjustable())
    const result = session.decide('adjust', pair)
    expect(ready(session).save).toBe('saving')
    expect(attributeScores(session)).toEqual([
      ['Might', 11],
      ['Wits', 11],
    ])
    await expect(result).resolves.toEqual({ ok: true })
    expect(docs.get('id-1')).toEqual({
      ...adjustable(),
      revision: 2,
      updatedAt: '2026-01-02T00:00:00.000Z',
      decisions: { ancestry: { mode: 'chosen', value: 'ancestry:troll' }, adjust: { mode: 'chosen', value: pair, logged: 1 } },
      // FEAT-009 §7: com a entrada de log da decisão.
      log: [
        {
          id: 1,
          at: '2026-01-02T00:00:00.000Z',
          kind: 'decision',
          slot: 'adjust',
          slotKind: 'attribute-shift',
          step: { id: 'step:traits', name: 'Traits' },
          origin: null,
          mode: 'chosen',
          subject: null,
          source: { book: 'test.adjust', abbr: 'TB', page: 2 },
          result: { shift: { decrease: { id: 'attribute:might', name: 'Might' }, increase: { id: 'attribute:wits', name: 'Wits' } } },
        },
      ],
    })
  })

  it('FR-STEP-010: a second adjustment gives already-decided, changing and saving nothing; an invalid pair gives invalid-value', async () => {
    const { session, repository } = await opened(adjusted())
    const before = ready(session)
    await expect(session.decide('adjust', { decrease: 'attribute:wits', increase: 'attribute:might' })).resolves.toEqual({
      ok: false,
      reason: 'already-decided',
    })
    expect(session.getSnapshot()).toBe(before)

    const fresh = await opened(adjustable())
    const freshBefore = ready(fresh.session)
    for (const invalid of [
      { decrease: 'attribute:might', increase: 'attribute:might' },
      { decrease: 'characteristic:stature', increase: 'attribute:wits' },
      'attribute:wits',
    ]) {
      await expect(fresh.session.decide('adjust', invalid)).resolves.toEqual({ ok: false, reason: 'invalid-value' })
    }
    expect(fresh.session.getSnapshot()).toBe(freshBefore)
    expect(repository.save).not.toHaveBeenCalled()
    expect(fresh.repository.save).not.toHaveBeenCalled()
  })

  it('FR-STEP-011: clear restores both attributes, saves the document without the key, and a new adjustment applies', async () => {
    const { session, docs } = await opened(adjusted())
    expect(attributeScores(session)).toEqual([
      ['Might', 11],
      ['Wits', 11],
    ])
    await expect(session.clear('adjust')).resolves.toEqual({ ok: true })
    expect(attributeScores(session)).toEqual([
      ['Might', 12],
      ['Wits', 10],
    ])
    expect(docs.get('id-1')).toMatchObject({ revision: 2, decisions: { ancestry: { value: 'ancestry:troll' } } })
    expect(Object.keys((docs.get('id-1') as CharacterDocument).decisions)).toEqual(['ancestry'])

    await expect(session.decide('adjust', { decrease: 'attribute:wits', increase: 'attribute:might' })).resolves.toEqual({ ok: true })
    expect(attributeScores(session)).toEqual([
      ['Might', 13],
      ['Wits', 9],
    ])
    await expect(session.clear('adjust')).resolves.toEqual({ ok: true })
    await expect(session.clear('adjust')).resolves.toEqual({ ok: false, reason: 'not-decided' })
    await expect(session.clear('nowhere')).resolves.toEqual({ ok: false, reason: 'unknown-slot' })
  })

  it('FR-STEP-011: clear of a slot with decided children gives needs-confirmation; after keep, clearing Size, then switching ancestry, applies (AC-11)', async () => {
    const { session, repository } = await opened(adjustable({ ancestry: 'ancestry:gnome', 'ancestry=gnome/stature': 1 }))
    const before = ready(session)
    await expect(session.clear('ancestry')).resolves.toEqual({ ok: false, reason: 'needs-confirmation' })
    expect(ready(session).document).toBe(before.document)
    expect(ready(session).pending!.impact.setAside.map((item) => item.key)).toEqual(['ancestry=gnome/stature'])
    expect(repository.save).not.toHaveBeenCalled()
    await expect(session.keep()).resolves.toEqual({ ok: true })

    await expect(session.clear('ancestry=gnome/stature')).resolves.toEqual({ ok: true })
    expect(ready(session).view.slots.find((slot) => slot.key === 'ancestry=gnome/stature')).toMatchObject({ decided: false })
    await expect(session.decide('ancestry', 'ancestry:troll')).resolves.toEqual({ ok: true })
    expect(ready(session).view.ancestry).toBe('ancestry:troll')
  })

  it('FR-STEP-011: a failed save on clear keeps the new state, and retrySave saves it', async () => {
    const { session, docs, control } = await opened(adjusted())
    control.failSave = true
    await expect(session.clear('adjust')).resolves.toEqual({ ok: false, reason: 'save-failed' })
    expect(ready(session).save).toBe('failed')
    expect(attributeScores(session)).toEqual([
      ['Might', 12],
      ['Wits', 10],
    ])
    expect(docs.get('id-1')).toMatchObject({ revision: 1, decisions: { adjust: { value: pair } } })

    control.failSave = false
    await expect(session.retrySave()).resolves.toEqual({ ok: true })
    expect(docs.get('id-1')).toMatchObject({ revision: 2 })
    expect(Object.keys((docs.get('id-1') as CharacterDocument).decisions)).toEqual(['ancestry'])
  })
})

// Pacote fictício com tabelas (FEAT-009): o Gnome concede o Size e cinco tabelas na Story. Age: 3d6 com uma entrada de
// página própria; Fate: 3d6 de regime `roll`; Omen: 3d6+1; Past: d6 com efeito de dado na entrada 4; Foe: d20 com
// entidades.
files['/packs/test.tables.json'] = book('test.tables', [
  { id: 'procedure:test', steps: ['step:origin', 'step:story'] },
  { id: 'step:origin', name: 'Origin', page: 1, slots: { ancestry: { kind: 'choose-entity', of: 'ancestry' } } },
  { id: 'step:story', name: 'Story', page: 2, requires: ['step:origin'] },
  { id: 'attribute:might', name: 'Might', page: 3, modifier: { add: [{ ref: 'self' }, -10] } },
  { id: 'characteristic:stature', name: 'Stature', page: 3 },
  { id: 'characteristic:madness', name: 'Madness', page: 3, formula: 0 },
  { id: 'creature-type:wolf', name: 'Wolves', page: 7 },
  { id: 'creature-type:bear', name: 'Bears', page: 7 },
  { id: 'table:gnome-age', name: 'Gnome Age', page: 7, dice: { count: 3, sides: 6 }, regime: 'roll-or-choose', entries: { '3-7': {}, '8-12': { page: 8 }, '13-18': {} } },
  { id: 'table:gnome-fate', name: 'Gnome Fate', page: 7, dice: { count: 3, sides: 6 }, regime: 'roll', entries: { '3-10': {}, '11-18': {} } },
  { id: 'table:gnome-omen', name: 'Gnome Omen', page: 7, dice: { count: 3, sides: 6, modifier: 1 }, regime: 'roll', entries: { '4-11': {}, '12-19': {} } },
  {
    id: 'table:gnome-past',
    name: 'Gnome Past',
    page: 7,
    dice: { count: 1, sides: 6 },
    regime: 'roll-or-choose',
    entries: { '1-3': {}, '4': { effects: { madness: { target: 'characteristic:madness', add: { dice: { count: 1, sides: 6 } } } } }, '5-6': {} },
  },
  {
    id: 'table:gnome-foe',
    name: 'Gnome Foe',
    page: 7,
    dice: { count: 1, sides: 20 },
    regime: 'choice',
    entries: { '1-10': { entity: 'creature-type:wolf' }, '11-20': { entity: 'creature-type:bear' } },
  },
  {
    id: 'ancestry:gnome',
    name: 'Gnome',
    page: 5,
    attributes: { 'attribute:might': 8 },
    characteristics: { 'characteristic:stature': { ref: 'grant:stature' } },
    grants: {
      stature: { kind: 'choose-value', step: 'step:origin', target: 'characteristic:stature', options: [0.5, 1] },
      age: { kind: 'table', step: 'step:story', table: 'table:gnome-age' },
      fate: { kind: 'table', step: 'step:story', table: 'table:gnome-fate' },
      omen: { kind: 'table', step: 'step:story', table: 'table:gnome-omen' },
      past: { kind: 'table', step: 'step:story', table: 'table:gnome-past' },
      foe: { kind: 'table', step: 'step:story', table: 'table:gnome-foe' },
    },
  },
  { id: 'ancestry:troll', name: 'Troll', page: 6, attributes: { 'attribute:might': 12 } },
])
const AGE = 'ancestry=gnome/age'
const FATE = 'ancestry=gnome/fate'
const OMEN = 'ancestry=gnome/omen'
const PAST = 'ancestry=gnome/past'
const FOE = 'ancestry=gnome/foe'
const MADNESS = 'ancestry=gnome/past=4/madness'
const TABLES = 'test.tables'
const AT = '2026-01-02T00:00:00.000Z'

/** Sorteio fixo: devolve os valores na ordem e falha se pedirem mais (ADR-009). Face de um dN = valor % N + 1. */
const sequence = (values: number[]) =>
  vi.fn(() => {
    if (!values.length) throw new Error('the random source was called')
    return values.shift()!
  })

async function withTables(decisions: Record<string, Decision> = {}, random = sequence([])) {
  const memory = memoryRepository()
  memory.docs.set('id-1', { ...stored({}, [TABLES]), decisions: { ancestry: { mode: 'chosen', value: 'ancestry:gnome' }, ...decisions } })
  const session = createApp({ repository: memory.repository, ...deps, random, lastStep: memoryLastStep() }).createSession()
  await session.open('id-1')
  vi.mocked(memory.repository.save).mockClear()
  return { ...memory, session, random }
}
const slotIn = (session: Awaited<ReturnType<typeof opened>>['session'], key: string) => ready(session).view.slots.find((slot) => slot.key === key)
const savedDocument = (docs: Map<string, unknown>) => docs.get('id-1') as CharacterDocument
const chosenEntry = (value: string): Decision => ({ mode: 'chosen', value, book: TABLES })
const rolledEntry = (entry: string, dice: number[], total: number): Decision => ({ mode: 'rolled', dice, modifier: 0, total, entry, rolls: 1, book: TABLES })

describe('character session: tables (Roll, Enter result, Choose)', () => {
  it('FR-DEC-005, FR-DEC-016: roll records the faces, the modifier, the total, the entry, rolls 1 and the book, and the view changes before the save (AC-4)', async () => {
    const { session, docs, random } = await withTables({}, sequence([2, 4, 1]))
    const result = session.roll(AGE)
    expect(ready(session).save).toBe('saving')
    expect(slotIn(session, AGE)).toMatchObject({
      decided: true,
      result: { mode: 'rolled', entry: '8-12', faces: [3, 5, 2], modifier: 0, total: 10, rolls: 1 },
    })
    expect(savedDocument(docs).decisions[AGE]).toBeUndefined()
    await expect(result).resolves.toEqual({ ok: true })
    // 3d6 são três sorteios (FR-DEC-005).
    expect(random).toHaveBeenCalledTimes(3)
    expect(savedDocument(docs).decisions[AGE]).toEqual({ mode: 'rolled', dice: [3, 5, 2], modifier: 0, total: 10, entry: '8-12', rolls: 1, book: TABLES, logged: 1 })
  })

  it('FR-DEC-005: the modifier of the current version of the table is added to the faces', async () => {
    const { session, docs } = await withTables({}, sequence([2, 4, 1]))
    await expect(session.roll(OMEN)).resolves.toEqual({ ok: true })
    expect(savedDocument(docs).decisions[OMEN]).toEqual({ mode: 'rolled', dice: [3, 5, 2], modifier: 1, total: 11, entry: '4-11', rolls: 1, book: TABLES, logged: 1 })
  })

  it('FR-DEC-019, FR-DEC-020: Enter result records the sum, the modifier, the total, the entry and the book (AC-7)', async () => {
    const { session, docs } = await withTables()
    const result = session.enter(FATE, 11)
    expect(slotIn(session, FATE)).toMatchObject({ decided: true, result: { mode: 'entered', entry: '11-18', sum: 11, modifier: 0, total: 11 } })
    await expect(result).resolves.toEqual({ ok: true })
    expect(savedDocument(docs).decisions[FATE]).toEqual({ mode: 'entered', sum: 11, modifier: 0, total: 11, entry: '11-18', book: TABLES, logged: 1 })
  })

  it('FR-DEC-019, FR-DEC-020: a sum outside [count, count × sides] gives out-of-range with that range, changing and saving nothing (AC-7)', async () => {
    const { session, repository } = await withTables()
    const before = ready(session)
    for (const sum of [2, 19, 10.5]) {
      await expect(session.enter(FATE, sum)).resolves.toEqual({ ok: false, reason: 'out-of-range', range: [3, 18] })
    }
    // 3d6+1: a faixa continua a da soma dos dados (D4).
    await expect(session.enter(OMEN, 19)).resolves.toEqual({ ok: false, reason: 'out-of-range', range: [3, 18] })
    expect(session.getSnapshot()).toBe(before)
    expect(repository.save).not.toHaveBeenCalled()
  })

  it('FR-DEC-019, FR-DEC-020: with 3d6+1, entering 11 gives total 12 with the modifier recorded (AC-7)', async () => {
    const { session, docs } = await withTables()
    await expect(session.enter(OMEN, 11)).resolves.toEqual({ ok: true })
    expect(savedDocument(docs).decisions[OMEN]).toEqual({ mode: 'entered', sum: 11, modifier: 1, total: 12, entry: '12-19', book: TABLES, logged: 1 })
  })

  it('FR-STEP-014: the roll-effect, rolled or entered, records the dice (or the sum), the modifier and the total, without entry or book (AC-8)', async () => {
    const rolled = await withTables({ [PAST]: chosenEntry('4') }, sequence([3]))
    await expect(rolled.session.roll(MADNESS)).resolves.toEqual({ ok: true })
    expect(savedDocument(rolled.docs).decisions[MADNESS]).toEqual({ mode: 'rolled', dice: [4], modifier: 0, total: 4, logged: 1 })
    expect(ready(rolled.session).view.summary.characteristics.find((c) => c.name === 'Madness')?.value).toBe(4)

    const entered = await withTables({ [PAST]: chosenEntry('4') })
    await expect(entered.session.enter(MADNESS, 7)).resolves.toEqual({ ok: false, reason: 'out-of-range', range: [1, 6] })
    await expect(entered.session.enter(MADNESS, 5)).resolves.toEqual({ ok: true })
    expect(savedDocument(entered.docs).decisions[MADNESS]).toEqual({ mode: 'entered', sum: 5, modifier: 0, total: 5, logged: 1 })
  })

  it('FR-DEC-024: Choose records the entry and the book, without dice; Choose → Choose replaces it (AC-6)', async () => {
    const { session, docs } = await withTables()
    await expect(session.decide(AGE, '3-7')).resolves.toEqual({ ok: true })
    expect(savedDocument(docs).decisions[AGE]).toEqual({ mode: 'chosen', value: '3-7', book: TABLES, logged: 1 })
    await expect(session.decide(AGE, '13-18')).resolves.toEqual({ ok: true })
    expect(savedDocument(docs).decisions[AGE]).toEqual({ mode: 'chosen', value: '13-18', book: TABLES, logged: 2 })
    expect(slotIn(session, AGE)).toMatchObject({ decided: true, value: '13-18', result: { mode: 'chosen', entry: '13-18' } })
  })

  it('FR-DEC-017: Choose → Choose with the roll-effect of the current entry decided gives needs-confirmation with it set aside, and nothing is applied or saved (AC-8)', async () => {
    const { session, repository } = await withTables({ [PAST]: chosenEntry('4'), [MADNESS]: { mode: 'rolled', dice: [4], modifier: 0, total: 4 } })
    const before = ready(session)
    await expect(session.decide(PAST, '5-6')).resolves.toEqual({ ok: false, reason: 'needs-confirmation' })
    expect(ready(session).document).toBe(before.document)
    expect(ready(session).view).toBe(before.view)
    expect(ready(session).pending!.impact.setAside.map((item) => item.key)).toEqual([MADNESS])
    expect(repository.save).not.toHaveBeenCalled()
  })

  it('FEAT-009 D5: roll and enter on a decided table, and Choose on a rolled or entered one, give already-decided; roll on a slot without dice and decide on a roll-effect give invalid-value (AC-11)', async () => {
    const { session, repository, random } = await withTables({
      [AGE]: rolledEntry('8-12', [3, 5, 2], 10),
      [FATE]: { mode: 'entered', sum: 11, modifier: 0, total: 11, entry: '11-18', book: TABLES },
      [FOE]: chosenEntry('1-10'),
      [PAST]: chosenEntry('4'),
    })
    const before = ready(session)
    const alreadyDecided = { ok: false, reason: 'already-decided' }
    await expect(session.roll(AGE)).resolves.toEqual(alreadyDecided)
    await expect(session.enter(AGE, 10)).resolves.toEqual(alreadyDecided)
    await expect(session.roll(FOE)).resolves.toEqual(alreadyDecided)
    await expect(session.decide(AGE, '3-7')).resolves.toEqual(alreadyDecided)
    await expect(session.decide(FATE, '3-10')).resolves.toEqual(alreadyDecided)

    const invalid = { ok: false, reason: 'invalid-value' }
    await expect(session.roll('ancestry')).resolves.toEqual(invalid)
    await expect(session.roll('ancestry=gnome/stature')).resolves.toEqual(invalid)
    await expect(session.enter('ancestry=gnome/stature', 1)).resolves.toEqual(invalid)
    await expect(session.decide(MADNESS, 4)).resolves.toEqual(invalid)
    await expect(session.decide(OMEN, '20')).resolves.toEqual(invalid)
    await expect(session.roll('ancestry=gnome/nowhere')).resolves.toEqual({ ok: false, reason: 'unknown-slot' })

    expect(session.getSnapshot()).toBe(before)
    expect(repository.save).not.toHaveBeenCalled()
    expect(random).not.toHaveBeenCalled()
  })

  it('FR-STEP-005: switching the ancestry with a decided table gives needs-confirmation with it set aside (AC-11)', async () => {
    const { session } = await withTables({ [AGE]: chosenEntry('3-7') })
    await expect(session.decide('ancestry', 'ancestry:troll')).resolves.toEqual({ ok: false, reason: 'needs-confirmation' })
    expect(ready(session).pending!.impact.setAside.map((item) => item.key)).toEqual([AGE])
  })

  it('NFR-REL-001: reopening a rolled character gives the same faces, modifier, total and entry without drawing (AC-13)', async () => {
    const { session, repository } = await withTables({}, sequence([2, 4, 1]))
    await session.roll(OMEN)
    const recorded = slotIn(session, OMEN)

    const random = sequence([])
    const reopened = createApp({ ...deps, repository, random, lastStep: memoryLastStep() }).createSession()
    await reopened.open('id-1')
    expect(slotIn(reopened, OMEN)).toEqual(recorded)
    expect(slotIn(reopened, OMEN)).toMatchObject({ result: { mode: 'rolled', faces: [3, 5, 2], modifier: 1, total: 11, entry: '4-11' } })
    expect(random).not.toHaveBeenCalled()
  })
})

describe('character session: decision log', () => {
  it('FR-LOG-001, FR-LOG-002, FR-LOG-004, FR-LOG-010: each decide, roll and enter adds one entry with the frozen names (AC-10)', async () => {
    const { session, docs } = await withTables({}, sequence([2, 4, 1, 3]))
    await session.decide('ancestry=gnome/stature', 1)
    await session.decide(FOE, '11-20')
    await session.roll(AGE)
    await session.enter(FATE, 11)
    await session.decide(PAST, '4')
    await session.roll(MADNESS)
    const gnome = { id: 'ancestry:gnome', name: 'Gnome' }
    const story = { id: 'step:story', name: 'Story' }
    const tableEntry = { at: AT, kind: 'decision', step: story, origin: gnome, slotKind: 'table' }
    expect(savedDocument(docs).log).toEqual([
      {
        id: 1,
        at: AT,
        kind: 'decision',
        slot: 'ancestry=gnome/stature',
        slotKind: 'choose-value',
        step: { id: 'step:origin', name: 'Origin' },
        origin: gnome,
        mode: 'chosen',
        subject: { id: 'characteristic:stature', name: 'Stature' },
        source: { book: TABLES, abbr: 'TB', page: 5 },
        result: { value: 1 },
      },
      {
        ...tableEntry,
        id: 2,
        slot: FOE,
        mode: 'chosen',
        subject: { id: 'table:gnome-foe', name: 'Gnome Foe' },
        source: { book: TABLES, abbr: 'TB', page: 7 },
        result: { entry: '11-20', entity: { id: 'creature-type:bear', name: 'Bears' } },
      },
      {
        ...tableEntry,
        id: 3,
        slot: AGE,
        mode: 'rolled',
        subject: { id: 'table:gnome-age', name: 'Gnome Age' },
        // A página da entrada 8-12, não a da tabela.
        source: { book: TABLES, abbr: 'TB', page: 8 },
        result: { entry: '8-12' },
        roll: { count: 3, sides: 6, modifier: 0, total: 10, rolls: 1, faces: [3, 5, 2] },
      },
      {
        ...tableEntry,
        id: 4,
        slot: FATE,
        mode: 'entered',
        subject: { id: 'table:gnome-fate', name: 'Gnome Fate' },
        source: { book: TABLES, abbr: 'TB', page: 7 },
        result: { entry: '11-18' },
        roll: { count: 3, sides: 6, modifier: 0, total: 11, sum: 11 },
      },
      {
        ...tableEntry,
        id: 5,
        slot: PAST,
        mode: 'chosen',
        subject: { id: 'table:gnome-past', name: 'Gnome Past' },
        source: { book: TABLES, abbr: 'TB', page: 7 },
        result: { entry: '4' },
      },
      {
        id: 6,
        at: AT,
        kind: 'decision',
        slot: MADNESS,
        slotKind: 'roll-effect',
        step: story,
        origin: { id: 'table:gnome-past', name: 'Gnome Past' },
        mode: 'rolled',
        subject: { id: 'characteristic:madness', name: 'Madness' },
        source: { book: TABLES, abbr: 'TB', page: 7 },
        result: { value: 4 },
        roll: { count: 1, sides: 6, modifier: 0, total: 4, faces: [4] },
      },
    ])
  })

  it('FR-LOG-001: choosing an ancestry logs the entity with the source of the entity', async () => {
    const { session, docs } = await opened()
    await session.decide('ancestry', 'ancestry:troll')
    expect(savedDocument(docs).log).toEqual([
      {
        id: 1,
        at: AT,
        kind: 'decision',
        slot: 'ancestry',
        slotKind: 'choose-entity',
        step: { id: 'step:origin', name: 'Origin' },
        origin: null,
        mode: 'chosen',
        subject: null,
        source: { book: 'test.core', abbr: 'TB', page: 6 },
        result: { entity: { id: 'ancestry:troll', name: 'Troll' } },
      },
    ])
  })

  it('FR-LOG-001, FR-LOG-007: refusals and retrySave write no entry; clear writes an undone entry (AC-10)', async () => {
    const { session, docs, control } = await withTables({ [PAST]: chosenEntry('4'), [MADNESS]: { mode: 'rolled', dice: [4], modifier: 0, total: 4 } })
    await session.decide(AGE, '3-7')
    expect(savedDocument(docs).log.map((entry) => entry.slot)).toEqual([AGE])

    await expect(session.decide(PAST, '5-6')).resolves.toEqual({ ok: false, reason: 'needs-confirmation' })
    await expect(session.keep()).resolves.toEqual({ ok: true })
    await session.enter(FATE, 30)
    await expect(session.roll('ancestry=gnome/stature')).resolves.toEqual({ ok: false, reason: 'invalid-value' })
    expect(ready(session).document.log).toHaveLength(1)

    await expect(session.clear(AGE)).resolves.toEqual({ ok: true })
    expect(savedDocument(docs).log.map((entry) => [entry.kind, entry.slot])).toEqual([
      ['decision', AGE],
      ['undone', AGE],
    ])

    control.failSave = true
    await expect(session.decide(FOE, '1-10')).resolves.toEqual({ ok: false, reason: 'save-failed' })
    control.failSave = false
    await expect(session.retrySave()).resolves.toEqual({ ok: true })
    expect(savedDocument(docs).log.map((entry) => [entry.id, entry.kind, entry.slot])).toEqual([
      [1, 'decision', AGE],
      [2, 'undone', AGE],
      [3, 'decision', FOE],
    ])
  })

  it('FEAT-009 D13: decide with the value already decided (ancestry, Size, Choose) gives ok without saving or logging (AC-10)', async () => {
    const { session, repository } = await withTables({ 'ancestry=gnome/stature': { mode: 'chosen', value: 1 }, [AGE]: chosenEntry('3-7') })
    const before = ready(session)
    await expect(session.decide('ancestry', 'ancestry:gnome')).resolves.toEqual({ ok: true })
    await expect(session.decide('ancestry=gnome/stature', 1)).resolves.toEqual({ ok: true })
    await expect(session.decide(AGE, '3-7')).resolves.toEqual({ ok: true })
    expect(session.getSnapshot()).toBe(before)
    expect(repository.save).not.toHaveBeenCalled()
    expect(before.document.log).toEqual([])
  })
})

// FEAT-011: mudança a montante pelo pipeline comum (technical-design §3.2), com o pacote do core servido pelo fetch falso.
files['/packs/sotdl.core.json'] = core
const CORE = 'sotdl.core'
const D_AGE = 'ancestry=dwarf/age'
const D_BUILD = 'ancestry=dwarf/build'
const D_BACKGROUND = 'ancestry=dwarf/background'
const H_SIZE = 'ancestry=human/size'
const LATER_AT = '2026-01-03T00:00:00.000Z'
const needsConfirmation = { ok: false, reason: 'needs-confirmation' }
const corruption = (session: Awaited<ReturnType<typeof opened>>['session']) =>
  ready(session).view.summary.characteristics.find((characteristic) => characteristic.name === 'Corruption')?.value
const ageOf = { mode: 'rolled', dice: [3, 5, 2], modifier: 0, total: 10, entry: '8-12', rolls: 1, book: CORE, logged: 3 }
const backgroundOf = { mode: 'chosen', value: '1', book: CORE, logged: 2 }

/** Dwarf do core com Background 1 escolhido e a Age rolada (3 + 5 + 2), pelos comandos: entradas 1 a 3 do log. */
async function dwarf(clock = { time: AT }, random = sequence([2, 4, 1])) {
  const memory = memoryRepository()
  memory.docs.set('id-1', stored({}, [CORE]))
  const session = createApp({ repository: memory.repository, ...deps, now: () => new Date(clock.time), random, lastStep: memoryLastStep() }).createSession()
  await session.open('id-1')
  await session.decide('ancestry', 'ancestry:dwarf')
  await session.decide(D_BACKGROUND, '1')
  await session.roll(D_AGE)
  vi.mocked(memory.repository.save).mockClear()
  return { ...memory, session, random, clock }
}

/** Retém só a próxima gravação do repositório até `release` (C15: nenhuma outra gravação muda). */
function holdNextSave(repository: Repository) {
  let release!: () => void
  const held = new Promise<void>((resolve) => (release = resolve))
  const save = vi.mocked(repository.save)
  const original = save.getMockImplementation()!
  save.mockImplementationOnce(async (document, meta) => {
    await held
    return original(document, meta)
  })
  return release
}

describe('character session: upstream change (FEAT-011)', () => {
  it('FR-STEP-005, FR-CHG-001, FR-CHG-008, FR-CHG-011, FR-CHG-019, FR-LOG-007: Dwarf with Background 1 and Age rolled → Human waits in pending; Apply sets the tables aside and logs it in one write (AC-5)', async () => {
    const { session, docs, repository } = await dwarf()
    const before = ready(session)
    await expect(session.decide('ancestry', 'ancestry:human')).resolves.toEqual(needsConfirmation)
    const waiting = ready(session)
    expect(waiting.document).toBe(before.document)
    expect(waiting.view).toBe(before.view)
    expect(waiting.save).toBe('saved')
    expect(waiting.pending).toMatchObject({ kind: 'decide', key: 'ancestry' })
    expect(waiting.pending!.impact.setAside.map((item) => item.key)).toEqual([D_AGE, D_BACKGROUND])
    expect(waiting.pending!.impact.recalculated.characteristics).toContainEqual(expect.objectContaining({ name: 'Corruption', from: 1, to: 0 }))
    expect(repository.save).not.toHaveBeenCalled()

    const applying = session.confirm()
    // O snapshot muda antes da gravação (FR-CHG-008; D11 da FEAT-007).
    expect(ready(session)).toMatchObject({ save: 'saving', view: { ancestry: 'ancestry:human' } })
    expect(ready(session).pending).toBeUndefined()
    expect(corruption(session)).toBe(0)
    expect(savedDocument(docs).decisions.ancestry).toMatchObject({ value: 'ancestry:dwarf' })
    await expect(applying).resolves.toEqual({ ok: true })

    expect(repository.save).toHaveBeenCalledTimes(1)
    const saved = savedDocument(docs)
    expect(saved.decisions).toEqual({
      ancestry: { mode: 'chosen', value: 'ancestry:human', logged: 4 },
      [D_AGE]: { ...ageOf, setAside: true },
      [D_BACKGROUND]: { ...backgroundOf, setAside: true },
    })
    expect(saved.log.slice(3)).toEqual([
      expect.objectContaining({ id: 4, kind: 'decision', slot: 'ancestry', result: { entity: { id: 'ancestry:human', name: 'Human' } } }),
      { id: 5, at: AT, kind: 'undone', slot: 'ancestry', ref: 1, reason: 'replaced', by: 4 },
      { id: 6, at: AT, kind: 'set-aside', slot: D_AGE, ref: 3, cause: { entry: 4 } },
      { id: 7, at: AT, kind: 'set-aside', slot: D_BACKGROUND, ref: 2, cause: { entry: 4 } },
    ])
    expect(saved.revision).toBe(before.document.revision + 1)
  })

  it('FR-CHG-008, FR-LOG-010: Apply stamps the new entries and updatedAt with the time of the confirmation, keeping ids and logged (D8)', async () => {
    const { session, docs, clock } = await dwarf()
    await session.decide('ancestry', 'ancestry:human')
    clock.time = LATER_AT
    await session.confirm()
    const saved = savedDocument(docs)
    expect(saved.updatedAt).toBe(LATER_AT)
    expect(saved.log.map((entry) => [entry.id, entry.at])).toEqual([
      [1, AT],
      [2, AT],
      [3, AT],
      [4, LATER_AT],
      [5, LATER_AT],
      [6, LATER_AT],
      [7, LATER_AT],
    ])
    expect(saved.decisions.ancestry).toEqual({ mode: 'chosen', value: 'ancestry:human', logged: 4 })
  })

  it('FR-CHG-009: Keep current takes the pending change away; the document stays as it was, and nothing is saved', async () => {
    const { session, repository } = await dwarf()
    const before = ready(session)
    await session.decide('ancestry', 'ancestry:human')
    await expect(session.keep()).resolves.toEqual({ ok: true })
    const kept = ready(session)
    expect(kept.pending).toBeUndefined()
    expect(kept.document).toBe(before.document)
    expect(kept.view).toBe(before.view)
    expect(repository.save).not.toHaveBeenCalled()
  })

  it('FR-CHG-018, FR-CHG-001: Human → Dwarf restores the tables with the recorded values, without drawing; with the Human Size decided, it is set aside in the same dialog (AC-6)', async () => {
    const { session, docs, random } = await dwarf()
    await session.decide('ancestry', 'ancestry:human')
    await session.confirm()

    // Só restauração: nada decidido para o Human.
    await expect(session.decide('ancestry', 'ancestry:dwarf')).resolves.toEqual(needsConfirmation)
    const restoreOnly = ready(session).pending!.impact
    expect(restoreOnly.setAside).toEqual([])
    expect(restoreOnly.restored.map((item) => [item.key, item.decision])).toEqual([
      [D_AGE, ageOf],
      [D_BACKGROUND, backgroundOf],
    ])
    await session.keep()

    // Com o Size do Human decidido, ele entra em "set aside" no mesmo diálogo.
    await expect(session.decide(H_SIZE, 1)).resolves.toEqual({ ok: true })
    await expect(session.decide('ancestry', 'ancestry:dwarf')).resolves.toEqual(needsConfirmation)
    const both = ready(session).pending!.impact
    expect(both.setAside.map((item) => item.key)).toEqual([H_SIZE])
    expect(both.restored.map((item) => item.key)).toEqual([D_AGE, D_BACKGROUND])

    await expect(session.confirm()).resolves.toEqual({ ok: true })
    // Só as três faces da Age original: o Apply não sorteia (D1).
    expect(random).toHaveBeenCalledTimes(3)
    expect(slotIn(session, D_AGE)).toMatchObject({ decided: true, result: { mode: 'rolled', faces: [3, 5, 2], total: 10, entry: '8-12' } })
    expect(corruption(session)).toBe(1)
    const saved = savedDocument(docs)
    expect(saved.decisions[D_AGE]).toEqual(ageOf)
    expect(saved.decisions[D_BACKGROUND]).toEqual(backgroundOf)
    expect(saved.decisions[H_SIZE]).toEqual({ mode: 'chosen', value: 1, logged: 8, setAside: true })
    expect(saved.log.slice(8)).toEqual([
      expect.objectContaining({ id: 9, kind: 'decision', slot: 'ancestry', result: { entity: { id: 'ancestry:dwarf', name: 'Dwarf' } } }),
      { id: 10, at: AT, kind: 'undone', slot: 'ancestry', ref: 4, reason: 'replaced', by: 9 },
      { id: 11, at: AT, kind: 'set-aside', slot: H_SIZE, ref: 8, cause: { entry: 9 } },
      { id: 12, at: AT, kind: 'restored', slot: D_AGE, ref: 3, cause: { entry: 9 } },
      { id: 13, at: AT, kind: 'restored', slot: D_BACKGROUND, ref: 2, cause: { entry: 9 } },
    ])
  })

  it('FR-CHG-002: with nothing set aside or restored the change applies directly, even when values are recalculated: ancestry switch without decided children, and Choose → Choose without a child (AC-7)', async () => {
    const memory = memoryRepository()
    memory.docs.set('id-1', stored({}, [CORE]))
    const session = createApp({ repository: memory.repository, ...deps, lastStep: memoryLastStep() }).createSession()
    await session.open('id-1')
    await session.decide('ancestry', 'ancestry:dwarf')
    const agility = () => ready(session).view.summary.attributes.find((attribute) => attribute.name === 'Agility')?.score
    expect(agility()).toBe(9)
    const switching = session.decide('ancestry', 'ancestry:human')
    expect(ready(session)).toMatchObject({ save: 'saving', view: { ancestry: 'ancestry:human' } })
    expect(ready(session).pending).toBeUndefined()
    await expect(switching).resolves.toEqual({ ok: true })
    expect(agility()).toBe(10)

    const tables = await withTables({ [AGE]: chosenEntry('3-7') })
    const choosing = tables.session.decide(AGE, '13-18')
    expect(ready(tables.session).pending).toBeUndefined()
    expect(slotIn(tables.session, AGE)).toMatchObject({ decided: true, value: '13-18' })
    await expect(choosing).resolves.toEqual({ ok: true })
  })

  it('FR-CHG-018, FR-CHG-019: deciding a reopened slot again puts the new decision in decisions and the set-aside one ahead in earlier, with its mark and no entry about it (AC-10)', async () => {
    // A entrada 1-2 não existe na tabela (pacote fictício: entrada removida); a decisão já foi registrada como suspensa.
    const old: Decision = { mode: 'chosen', value: '1-2', book: TABLES, setAside: true }
    const { session, docs } = await withTables({ [AGE]: old })
    expect(slotIn(session, AGE)).toMatchObject({ decided: false })
    await expect(session.decide(AGE, '3-7')).resolves.toEqual({ ok: true })
    const saved = savedDocument(docs)
    expect(saved.decisions[AGE]).toEqual({ ...chosenEntry('3-7'), logged: 1 })
    expect(saved.earlier).toEqual({ [AGE]: [old] })
    expect(saved.log.map((entry) => [entry.id, entry.kind, entry.slot])).toEqual([[1, 'decision', AGE]])
  })

  it('FR-CHG-019, FR-LOG-007: replacing an active decision kept in earlier moves the one in decisions ahead and takes the active one out as undone (AC-10)', async () => {
    const invalid: Decision = { mode: 'chosen', value: '1-2', book: TABLES, setAside: true }
    const active: Decision = { mode: 'chosen', value: '3-7', book: TABLES, logged: 7 }
    const memory = memoryRepository()
    memory.docs.set('id-1', {
      ...stored({}, [TABLES]),
      decisions: { ancestry: { mode: 'chosen', value: 'ancestry:gnome' }, [AGE]: invalid },
      earlier: { [AGE]: [active] },
    })
    const session = createApp({ repository: memory.repository, ...deps, lastStep: memoryLastStep() }).createSession()
    await session.open('id-1')
    expect(slotIn(session, AGE)).toMatchObject({ decided: true, value: '3-7', candidate: 1 })
    await expect(session.decide(AGE, '13-18')).resolves.toEqual({ ok: true })
    const saved = savedDocument(memory.docs)
    expect(saved.decisions[AGE]).toEqual({ ...chosenEntry('13-18'), logged: 1 })
    expect(saved.earlier).toEqual({ [AGE]: [invalid] })
    expect(saved.log.slice(1)).toEqual([{ id: 2, at: AT, kind: 'undone', slot: AGE, ref: 7, reason: 'replaced', by: 1 }])
  })

  it('FR-LOG-007, FR-CHG-018: clear takes out only the active decision; the most recent one left takes the slot and, being active, comes in restored (AC-10)', async () => {
    const superseded: Decision = { mode: 'chosen', value: '13-18', book: TABLES, logged: 1, setAside: true }
    const { session, docs } = await withTables({ [AGE]: { ...chosenEntry('3-7'), logged: 2 } })
    const document = { ...savedDocument(docs), earlier: { [AGE]: [superseded] } }
    docs.set('id-1', document)
    await session.open('id-1')
    expect(ready(session).view.setAside).toEqual([expect.objectContaining({ key: AGE, index: 1, reason: 'superseded' })])

    await expect(session.clear(AGE)).resolves.toEqual(needsConfirmation)
    const { impact } = ready(session).pending!
    expect(impact.restored.map((item) => [item.key, item.decision])).toEqual([[AGE, { mode: 'chosen', value: '13-18', book: TABLES, logged: 1 }]])
    expect(impact.undone).toEqual({ ...chosenEntry('3-7'), logged: 2 })

    await expect(session.confirm()).resolves.toEqual({ ok: true })
    const saved = savedDocument(docs)
    expect(saved.decisions[AGE]).toEqual({ mode: 'chosen', value: '13-18', book: TABLES, logged: 1 })
    expect(saved.earlier).toBeUndefined()
    expect(saved.log).toEqual([
      { id: 1, at: AT, kind: 'undone', slot: AGE, ref: 2, reason: 'cleared' },
      { id: 2, at: AT, kind: 'restored', slot: AGE, ref: 1, cause: { entry: 1 } },
    ])
  })

  it('FR-LOG-007, FR-CHG-002: clear without dependents applies directly and writes the undone entry pointing to the decision (AC-11)', async () => {
    const { session, docs } = await opened(adjustable())
    await session.decide('adjust', pair)
    const clearing = session.clear('adjust')
    expect(ready(session)).toMatchObject({ save: 'saving' })
    expect(ready(session).pending).toBeUndefined()
    await expect(clearing).resolves.toEqual({ ok: true })
    expect(savedDocument(docs).log.slice(1)).toEqual([{ id: 2, at: AT, kind: 'undone', slot: 'adjust', ref: 1, reason: 'cleared' }])
  })

  it('FR-CHG-009: with a pending change, decide, roll, enter and clear give change-pending and change nothing; confirm and keep without one give no-pending (AC-12)', async () => {
    const { session, repository, random } = await dwarf()
    await expect(session.confirm()).resolves.toEqual({ ok: false, reason: 'no-pending' })
    await expect(session.keep()).resolves.toEqual({ ok: false, reason: 'no-pending' })

    await session.decide('ancestry', 'ancestry:human')
    const waiting = ready(session)
    const changePending = { ok: false, reason: 'change-pending' }
    await expect(session.decide(D_BUILD, '9-12')).resolves.toEqual(changePending)
    await expect(session.decide('ancestry', 'ancestry:dwarf')).resolves.toEqual(changePending)
    await expect(session.roll(D_BUILD)).resolves.toEqual(changePending)
    await expect(session.enter(D_BUILD, 10)).resolves.toEqual(changePending)
    await expect(session.clear(D_BACKGROUND)).resolves.toEqual(changePending)
    expect(session.getSnapshot()).toBe(waiting)
    expect(repository.save).not.toHaveBeenCalled()
    expect(random).toHaveBeenCalledTimes(3)

    // retrySave e visit seguem valendo, e a pendente fica.
    session.visit('story')
    await expect(session.retrySave()).resolves.toEqual({ ok: true })
    expect(ready(session).pending).toBe(waiting.pending)
    expect(repository.save).toHaveBeenCalledTimes(1)
    expect(await repository.get('id-1')).toMatchObject({ decisions: { ancestry: { value: 'ancestry:dwarf' } } })

    // Abrir de novo descarta a pendente.
    await session.open('id-1')
    expect(ready(session).pending).toBeUndefined()
    await expect(session.confirm()).resolves.toEqual({ ok: false, reason: 'no-pending' })
  })

  it('FR-CHG-019, FR-CHG-018, NFR-REL-001: the set-aside decisions survive saving and reopening, with values, book, logged and mark, and come back with their context without a new decision (AC-14)', async () => {
    const { session, repository } = await dwarf()
    await session.decide('ancestry', 'ancestry:human')
    await session.confirm()

    const reopened = createApp({ ...deps, repository, lastStep: memoryLastStep() }).createSession()
    await reopened.open('id-1')
    const view = ready(reopened).view
    expect(ready(reopened).document.decisions[D_AGE]).toEqual({ ...ageOf, setAside: true })
    expect(ready(reopened).document.decisions[D_BACKGROUND]).toEqual({ ...backgroundOf, setAside: true })
    expect(view.setAside.map((item) => [item.key, item.reason, item.decision])).toEqual([
      [D_AGE, 'not-generated', ageOf],
      [D_BACKGROUND, 'not-generated', backgroundOf],
    ])
    expect(view.openDecisions.map((open) => open.key)).not.toContain(D_AGE)

    await expect(reopened.decide('ancestry', 'ancestry:dwarf')).resolves.toEqual(needsConfirmation)
    await reopened.confirm()
    expect(slotIn(reopened, D_AGE)).toMatchObject({ decided: true, value: '8-12' })
    expect(slotIn(reopened, D_BACKGROUND)).toMatchObject({ decided: true, value: '1' })
  })

  it('FR-CHAR-010, NFR-REL-001: with the save held, Apply shows the new state before the save ends; the pending change does not wait for any save (AC-17)', async () => {
    const { session, docs, repository } = await dwarf()

    // Uma gravação anterior retida: o diálogo abre por `pending` sem esperar por ela.
    const releaseBuild = holdNextSave(repository)
    const building = session.decide(D_BUILD, '9-12')
    await expect(session.decide('ancestry', 'ancestry:human')).resolves.toEqual(needsConfirmation)
    expect(ready(session).pending!.impact.setAside.map((item) => item.key)).toEqual([D_AGE, D_BUILD, D_BACKGROUND])
    expect(savedDocument(docs).decisions[D_BUILD]).toBeUndefined()
    await session.keep()
    releaseBuild()
    await expect(building).resolves.toEqual({ ok: true })

    const release = holdNextSave(repository)
    const before = savedDocument(docs)
    await expect(session.decide('ancestry', 'ancestry:human')).resolves.toEqual(needsConfirmation)
    const applying = session.confirm()
    await Promise.resolve()
    expect(ready(session)).toMatchObject({ save: 'saving', view: { ancestry: 'ancestry:human' } })
    expect(ready(session).pending).toBeUndefined()
    expect(savedDocument(docs)).toBe(before)
    release()
    await expect(applying).resolves.toEqual({ ok: true })
    expect(ready(session).save).toBe('saved')
    expect(savedDocument(docs).decisions.ancestry).toMatchObject({ value: 'ancestry:human' })
  })

  it('FR-CHAR-010: a failed save after Apply keeps the new state with save failed, and retrySave saves it (AC-17)', async () => {
    const { session, docs, control } = await dwarf()
    await session.decide('ancestry', 'ancestry:human')
    control.failSave = true
    await expect(session.confirm()).resolves.toEqual({ ok: false, reason: 'save-failed' })
    expect(ready(session)).toMatchObject({ save: 'failed', view: { ancestry: 'ancestry:human' } })
    expect(ready(session).pending).toBeUndefined()
    expect(savedDocument(docs).decisions.ancestry).toMatchObject({ value: 'ancestry:dwarf' })

    control.failSave = false
    await expect(session.retrySave()).resolves.toEqual({ ok: true })
    expect(savedDocument(docs).decisions[D_AGE]).toEqual({ ...ageOf, setAside: true })
  })
})

// FEAT-011 T7: abrir com uma versão nova do pacote (technical-design §3.2, "Abrir"). Cada instância do app tem o seu
// carregador de regras, e o fetch falso de cada uma serve uma versão do pacote fictício de tabelas.
const tablesBook = files['/packs/test.tables.json'] as ReturnType<typeof book>
const withAgeEntries = (entries: Record<string, unknown>) => ({
  ...tablesBook,
  components: [
    {
      ...tablesBook.components[0],
      items: tablesBook.components[0].items.map((item) => ((item as { id: string }).id === 'table:gnome-age' ? { ...(item as object), entries } : item)),
    },
  ],
})
const VERSION = {
  first: tablesBook,
  // A entrada 3-7 sai (versão nova do pacote).
  removed: withAgeEntries({ '3-6': {}, '7-12': { page: 8 }, '13-18': {} }),
  // Só o efeito da entrada 3-7 muda.
  effect: withAgeEntries({ '3-7': { effects: { madness: { target: 'characteristic:madness', add: 1 } } }, '8-12': { page: 8 }, '13-18': {} }),
}
function instance(repository: Repository, tables: unknown = VERSION.first) {
  const serving = vi.fn(async (url: string) => {
    const body = url === '/packs/test.tables.json' ? tables : files[url]
    return { ok: body !== undefined, status: body === undefined ? 404 : 200, json: async () => body }
  })
  return createApp({ ...deps, repository, packs: { baseUrl: '/', fetch: serving }, lastStep: memoryLastStep() }).createSession()
}
/** Gnome com a Age escolhida em 3-7 pela primeira versão (entrada 1 do log), gravado pelo comando. */
async function gnomeWithAge() {
  const memory = memoryRepository()
  memory.docs.set('id-1', { ...stored({}, [TABLES]), decisions: { ancestry: { mode: 'chosen', value: 'ancestry:gnome' } } })
  const first = instance(memory.repository)
  await first.open('id-1')
  await first.decide(AGE, '3-7')
  vi.mocked(memory.repository.save).mockClear()
  return memory
}

describe('character session: open with a new version of the pack (FEAT-011)', () => {
  it('FR-CONT-015, FR-CONT-016, FR-CHG-011, FR-CHG-012: a recorded entry removed sets the decision aside and reopens the slot, with the notice and one save with the mark, the set-aside entry and the metadata (AC-13 i)', async () => {
    const { repository, docs, metas } = await gnomeWithAge()
    const before = savedDocument(docs)
    const release = holdNextSave(repository)
    const second = instance(repository, VERSION.removed)
    const opening = second.open('id-1')
    // O snapshot fica pronto, com o aviso e `saving`, antes do fim da gravação.
    await vi.waitFor(() => expect(second.getSnapshot()).toMatchObject({ status: 'ready', save: 'saving' }))
    const snapshot = ready(second)
    expect(snapshot.notice!.setAside.map((item) => [item.key, item.reason])).toEqual([[AGE, 'invalid']])
    expect(snapshot.notice!.restored).toEqual([])
    expect(slotIn(second, AGE)).toMatchObject({ decided: false })
    expect(snapshot.view.openDecisions.map((open) => open.key)).toContain(AGE)
    expect(savedDocument(docs)).toBe(before)
    release()
    await opening
    expect(ready(second).save).toBe('saved')

    expect(repository.save).toHaveBeenCalledTimes(1)
    const saved = savedDocument(docs)
    expect(saved.revision).toBe(before.revision + 1)
    expect(saved.updatedAt).toBe(AT)
    expect(saved.decisions[AGE]).toEqual({ ...chosenEntry('3-7'), logged: 1, setAside: true })
    expect(saved.log.slice(1)).toEqual([{ id: 2, at: AT, kind: 'set-aside', slot: AGE, ref: 1, cause: { content: true } }])
    expect(metas.get('id-1')).toMatchObject({ openDecisions: snapshot.view.openDecisions.length, updatedAt: AT })
  })

  it('FR-CONT-016, FR-CHG-018: the entry back in a later version restores the decision, with the notice and the restored entry (AC-13 ii)', async () => {
    const { repository, docs } = await gnomeWithAge()
    await instance(repository, VERSION.removed).open('id-1')
    vi.mocked(repository.save).mockClear()

    const third = instance(repository, VERSION.first)
    await third.open('id-1')
    expect(ready(third).notice!.setAside).toEqual([])
    expect(ready(third).notice!.restored.map((item) => item.key)).toEqual([AGE])
    expect(slotIn(third, AGE)).toMatchObject({ decided: true, value: '3-7' })
    expect(repository.save).toHaveBeenCalledTimes(1)
    const saved = savedDocument(docs)
    expect(saved.decisions[AGE]).toEqual({ ...chosenEntry('3-7'), logged: 1 })
    expect(saved.log.slice(2)).toEqual([{ id: 3, at: AT, kind: 'restored', slot: AGE, ref: 1, cause: { content: true } }])
  })

  it('FR-CONT-015: when only the effect of the entry changes, the value follows the new version and nothing is saved (AC-13 iii)', async () => {
    const { repository, docs } = await gnomeWithAge()
    const before = savedDocument(docs)
    const next = instance(repository, VERSION.effect)
    await next.open('id-1')
    expect(ready(next).view.summary.characteristics.find((c) => c.name === 'Madness')?.value).toBe(1)
    expect(ready(next).notice).toBeUndefined()
    expect(ready(next).save).toBe('saved')
    expect(repository.save).not.toHaveBeenCalled()
    expect(savedDocument(docs)).toBe(before)
  })

  it('ADR-004 §1: opening without a difference saves nothing: revision, log and updatedAt stay the same (AC-13 iv)', async () => {
    const { repository, docs } = await gnomeWithAge()
    const before = savedDocument(docs)
    const same = instance(repository, VERSION.first)
    await same.open('id-1')
    expect(ready(same).notice).toBeUndefined()
    expect(ready(same).document).toEqual(savedDocument(docs))
    expect(repository.save).not.toHaveBeenCalled()
    expect(savedDocument(docs)).toMatchObject({ revision: before.revision, updatedAt: before.updatedAt, log: before.log })
  })

  it('FR-CONT-016, FR-CHG-019: an older document with an orphan and no mark records it as set aside on the first opening, and nothing on the second (AC-13 v)', async () => {
    const memory = memoryRepository()
    memory.docs.set('id-1', stored({ ancestry: 'ancestry:troll', 'ancestry=gnome/stature': 1 }))
    const first = instance(memory.repository)
    await first.open('id-1')
    expect(ready(first).notice!.setAside).toEqual([
      expect.objectContaining({ key: 'ancestry=gnome/stature', reason: 'not-generated', decision: { mode: 'chosen', value: 1 } }),
    ])
    expect(ready(first).notice!.setAside[0].slot).toBeUndefined()
    expect(memory.repository.save).toHaveBeenCalledTimes(1)
    const saved = savedDocument(memory.docs)
    expect(saved.decisions['ancestry=gnome/stature']).toEqual({ mode: 'chosen', value: 1, setAside: true })
    // Sem `logged` (gravada antes da FEAT-011), a entrada fica sem ponteiro.
    expect(saved.log).toEqual([{ id: 1, at: AT, kind: 'set-aside', slot: 'ancestry=gnome/stature', cause: { content: true } }])

    vi.mocked(memory.repository.save).mockClear()
    const second = instance(memory.repository)
    await second.open('id-1')
    expect(ready(second).notice).toBeUndefined()
    expect(memory.repository.save).not.toHaveBeenCalled()
  })

  it('FR-CHAR-010: a failed save when opening with a difference shows save failed with the notice, and retrySave saves it (AC-13)', async () => {
    const memory = memoryRepository()
    memory.docs.set('id-1', stored({ ancestry: 'ancestry:troll', 'ancestry=gnome/stature': 1 }))
    memory.control.failSave = true
    const session = instance(memory.repository)
    await session.open('id-1')
    expect(ready(session)).toMatchObject({ save: 'failed', notice: { restored: [] } })
    expect(savedDocument(memory.docs).log).toEqual([])

    memory.control.failSave = false
    await expect(session.retrySave()).resolves.toEqual({ ok: true })
    expect(savedDocument(memory.docs).decisions['ancestry=gnome/stature']).toEqual({ mode: 'chosen', value: 1, setAside: true })
    expect(ready(session).notice).toBeDefined()
  })

  it('FR-CONT-016: dismissNotice takes the notice away without saving; commands keep it until then', async () => {
    const memory = memoryRepository()
    memory.docs.set('id-1', stored({ ancestry: 'ancestry:troll', 'ancestry=gnome/stature': 1 }))
    const session = instance(memory.repository)
    await session.open('id-1')
    vi.mocked(memory.repository.save).mockClear()
    await session.decide('ancestry', 'ancestry:sprite')
    expect(ready(session).notice).toBeDefined()
    vi.mocked(memory.repository.save).mockClear()
    const before = ready(session)
    session.dismissNotice()
    expect(ready(session).notice).toBeUndefined()
    expect(ready(session).document).toBe(before.document)
    expect(memory.repository.save).not.toHaveBeenCalled()
  })
})