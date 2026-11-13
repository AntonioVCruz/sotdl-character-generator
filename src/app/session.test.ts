import { describe, expect, it, vi } from 'vitest'
import type { CharacterDocument } from '../content'
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

async function opened(document: unknown = stored(), options?: { failGet?: boolean }) {
  const memory = memoryRepository(options)
  if (document) memory.docs.set('id-1', document)
  const session = createApp({ repository: memory.repository, ...deps }).createSession()
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
        'ancestry=gnome/stature': { mode: 'chosen', value: 0.5 },
      },
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

  it('FR-FLOW-003: a switch whose dependents it would orphan gives has-dependents with the keys, and nothing changes', async () => {
    const { session, repository } = await opened(stored({ ancestry: 'ancestry:gnome', 'ancestry=gnome/stature': 1 }))
    const before = ready(session)
    await expect(session.decide('ancestry', 'ancestry:troll')).resolves.toEqual({
      ok: false,
      reason: 'has-dependents',
      dependents: ['ancestry=gnome/stature'],
    })
    expect(session.getSnapshot()).toBe(before)
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
      decisions: { ancestry: { mode: 'chosen', value: 'ancestry:troll' }, adjust: { mode: 'chosen', value: pair } },
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

  it('FR-STEP-011: clear of a slot with decided children gives has-dependents; clearing Size, then switching ancestry, applies (AC-11)', async () => {
    const { session, repository } = await opened(adjustable({ ancestry: 'ancestry:gnome', 'ancestry=gnome/stature': 1 }))
    const before = ready(session)
    await expect(session.clear('ancestry')).resolves.toEqual({ ok: false, reason: 'has-dependents', dependents: ['ancestry=gnome/stature'] })
    expect(session.getSnapshot()).toBe(before)
    expect(repository.save).not.toHaveBeenCalled()

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
