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
        status: 'creating',
        sources: ['test.core'],
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
})

describe('openCharacter', () => {
  it('FR-FLOW-001: opens the builder view with the steps of the linked books', async () => {
    const app = createApp({ repository: memoryRepository(), ...deps })
    await app.createCharacter()
    const opened = await app.openCharacter('id-1')
    expect(opened.ok && opened.view.steps.map((step) => step.status)).toEqual(['not-started'])
  })
})
