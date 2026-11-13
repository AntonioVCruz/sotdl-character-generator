import { describe, expect, it, vi } from 'vitest'
import type { CharacterDocument } from '../content'
import type { CharacterRepository } from '../storage'
import { createApp, type CharacterSummary } from '.'

// Pacote fictício servido por um fetch falso.
const files: Record<string, unknown> = {
  '/packs/index.json': {
    format: 1,
    books: [
      { id: 'test.extra', name: 'Extra', abbr: 'EX', layer: 'supplement', published: '2002' },
      { id: 'test.core', name: 'Core', abbr: 'CO', layer: 'core', published: '2001' },
    ],
  },
  '/packs/test.core.json': {
    format: 1,
    id: 'test.core',
    name: 'Core',
    abbr: 'CO',
    layer: 'core',
    published: '2001',
    components: [
      {
        id: 'base',
        type: 'adds',
        default: 'on',
        items: [
          { id: 'procedure:test', steps: ['step:one'] },
          { id: 'step:one', name: 'One', page: 1 },
        ],
      },
    ],
  },
}
const fetch = vi.fn(async (url: string) => ({
  ok: url in files,
  status: url in files ? 200 : 404,
  json: async () => files[url],
}))

type MemoryRepository = CharacterRepository<CharacterDocument, CharacterSummary> & {
  docs: Map<string, CharacterDocument>
}

function memoryRepository(fail = false): MemoryRepository {
  const docs = new Map<string, CharacterDocument>()
  const metas = new Map<string, CharacterSummary>()
  return {
    docs,
    list: async () => [...metas.values()],
    get: async (id) => docs.get(id),
    save: async (doc, meta) => {
      if (fail) throw new Error('quota exceeded')
      docs.set(doc.id, doc)
      metas.set(meta.id, meta)
    },
    delete: async (id) => {
      docs.delete(id)
      metas.delete(id)
    },
  }
}

const deps = { packs: { baseUrl: '/', fetch }, now: () => new Date('2026-01-01T00:00:00Z'), newId: () => 'id-1' }

describe('createCharacter', () => {
  it('FR-CHAR-001: creates a level 0 character with only the core book as active source', async () => {
    const repository = memoryRepository()
    await expect(createApp({ repository, ...deps }).createCharacter()).resolves.toEqual({ ok: true, id: 'id-1' })
    expect(repository.docs.get('id-1')).toMatchObject({
      schema: 1,
      sources: { order: ['test.core'] },
      revision: 1,
    })
    await expect(repository.list()).resolves.toEqual([
      {
        id: 'id-1',
        name: '',
        ancestry: null,
        // Na fixture, `step:one` não tem vagas: nenhuma decisão aberta (technical-design §7).
        status: 'complete',
        openDecisions: 0,
        sources: [{ id: 'test.core', name: 'Core', abbr: 'CO' }],
        contentVersion: '0.0.0',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ])
  })

  it('FR-CHAR-010: reports a failed save instead of opening a character', async () => {
    const result = await createApp({ repository: memoryRepository(true), ...deps }).createCharacter()
    expect(result).toEqual({ ok: false, reason: 'save-failed' })
  })

  it('FR-HELP-004: a pack that does not load creates nothing', async () => {
    const repository = memoryRepository()
    const broken = { ...deps, packs: { baseUrl: '/missing/', fetch } }
    await expect(createApp({ repository, ...broken }).createCharacter()).resolves.toEqual({
      ok: false,
      reason: 'pack-load-failed',
    })
    expect(repository.docs.size).toBe(0)
  })

  it('FR-HELP-004: a core book that does not load, with the index loading, gives pack-load-failed and saves nothing', async () => {
    const repository = memoryRepository()
    const save = vi.spyOn(repository, 'save')
    const noCore = vi.fn(async (url: string) => {
      const body = url === '/packs/test.core.json' ? undefined : files[url]
      return { ok: body !== undefined, status: body === undefined ? 404 : 200, json: async () => body }
    })
    await expect(createApp({ repository, ...deps, packs: { baseUrl: '/', fetch: noCore } }).createCharacter()).resolves.toEqual({
      ok: false,
      reason: 'pack-load-failed',
    })
    expect(noCore).toHaveBeenCalledWith('/packs/test.core.json')
    expect(save).not.toHaveBeenCalled()
    expect(repository.docs.size).toBe(0)
  })
})

describe('listCharacters', () => {
  const summary = (id: string, updatedAt: string): CharacterSummary => ({
    id,
    name: id,
    ancestry: null,
    status: 'creating',
    openDecisions: 1,
    sources: [{ id: 'test.core', name: 'Core', abbr: 'CO' }],
    contentVersion: '0.0.0',
    updatedAt,
  })
  const listing = (records: unknown[]) => ({ ...memoryRepository(), list: async () => records as CharacterSummary[] })

  it('FR-CHAR-004: lists the most recent edit first, with ties by id and an empty date last', async () => {
    const records = [
      summary('b', '2026-01-01T00:00:00.000Z'),
      summary('none', ''),
      summary('c', '2026-03-01T00:00:00.000Z'),
      summary('a', '2026-01-01T00:00:00.000Z'),
    ]
    const result = await createApp({ repository: listing(records), ...deps }).listCharacters()
    expect(result.ok && result.characters.map((character) => character.id)).toEqual(['c', 'a', 'b', 'none'])
  })

  it('FR-CHAR-003: old metadata reads with open decisions unknown, creating and no sources; a record without id is ignored', async () => {
    const old = { id: 'old', name: 'Liliana', ancestry: 'Human', status: 'complete', sources: ['sotdl.core'], updatedAt: '2026-01-01T00:00:00.000Z' }
    const result = await createApp({ repository: listing([old, { name: 'no id' }, null, { id: 7 }]), ...deps }).listCharacters()
    expect(result).toEqual({
      ok: true,
      characters: [
        {
          id: 'old',
          name: 'Liliana',
          ancestry: 'Human',
          status: 'creating',
          openDecisions: null,
          sources: [],
          contentVersion: '',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    })
  })

  it('FR-CHAR-003: the status is recalculated from a valid count, never read from the record', async () => {
    const records = [
      { ...summary('done', '2026-01-02T00:00:00.000Z'), status: 'creating', openDecisions: 0 },
      { ...summary('open', '2026-01-01T00:00:00.000Z'), status: 'complete', openDecisions: 2 },
      { ...summary('odd', '2026-01-01T00:00:00.000Z'), name: 3, ancestry: 4, openDecisions: 1.5 },
    ]
    const result = await createApp({ repository: listing(records), ...deps }).listCharacters()
    expect(result.ok && result.characters.map(({ id, name, ancestry, status, openDecisions }) => ({ id, name, ancestry, status, openDecisions }))).toEqual([
      { id: 'done', name: 'done', ancestry: null, status: 'complete', openDecisions: 0 },
      { id: 'odd', name: '', ancestry: null, status: 'creating', openDecisions: null },
      { id: 'open', name: 'open', ancestry: null, status: 'creating', openDecisions: 2 },
    ])
  })

  it('FR-HELP-005: a list that rejects gives storage-unavailable (FEAT-007 §8)', async () => {
    const repository = { ...memoryRepository(), list: () => Promise.reject(new DOMException('blocked', 'SecurityError')) }
    await expect(createApp({ repository, ...deps }).listCharacters()).resolves.toEqual({ ok: false, reason: 'storage-unavailable' })
  })
})

describe('deleteCharacter', () => {
  function lastStepStore(fail = false) {
    const steps = new Map([['id-1', 'attributes']])
    return {
      steps,
      get: (id: string) => steps.get(id),
      set: (id: string, slug: string) => void steps.set(id, slug),
      forget: vi.fn((id: string) => {
        if (fail) throw new DOMException('denied', 'SecurityError')
        steps.delete(id)
      }),
    }
  }

  async function created(lastStep: ReturnType<typeof lastStepStore>, repository = memoryRepository()) {
    const app = createApp({ repository, ...deps, lastStep })
    await app.createCharacter()
    return { app, repository }
  }

  it('FR-CHAR-014: deleting removes the document and its metadata, then forgets the last step', async () => {
    const lastStep = lastStepStore()
    const { app, repository } = await created(lastStep)
    await expect(app.deleteCharacter('id-1')).resolves.toEqual({ ok: true })
    await expect(repository.get('id-1')).resolves.toBeUndefined()
    await expect(repository.list()).resolves.toEqual([])
    expect(lastStep.forget).toHaveBeenCalledWith('id-1')
    expect(lastStep.steps.has('id-1')).toBe(false)
  })

  it('FR-CHAR-014: a delete that rejects gives delete-failed, leaving the document, the metadata and the key in place', async () => {
    const lastStep = lastStepStore()
    const { app, repository } = await created(lastStep)
    repository.delete = () => Promise.reject(new DOMException('aborted', 'AbortError'))
    await expect(app.deleteCharacter('id-1')).resolves.toEqual({ ok: false, reason: 'delete-failed' })
    await expect(repository.get('id-1')).resolves.toMatchObject({ id: 'id-1' })
    await expect(repository.list()).resolves.toHaveLength(1)
    expect(lastStep.forget).not.toHaveBeenCalled()
    expect(lastStep.steps.get('id-1')).toBe('attributes')
  })

  it('FR-CHAR-014: a forget that throws still gives ok', async () => {
    const lastStep = lastStepStore(true)
    const { app, repository } = await created(lastStep)
    await expect(app.deleteCharacter('id-1')).resolves.toEqual({ ok: true })
    expect(lastStep.forget).toHaveBeenCalledWith('id-1')
    await expect(repository.get('id-1')).resolves.toBeUndefined()
  })
})
