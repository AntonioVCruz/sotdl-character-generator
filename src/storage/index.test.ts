import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { createIndexedDbRepository, openCharacterDatabase } from '.'

interface Doc {
  id: string
  payload: unknown
}
interface Meta {
  id: string
  name: string
}

let counter = 0
const freshRepository = () => {
  const database = openCharacterDatabase(`test-${++counter}`)
  return { repository: createIndexedDbRepository<Doc, Meta>(database), database }
}

describe('IndexedDB repository', () => {
  it('FR-CHAR-009: saves the document and its metadata, and lists from the metadata only', async () => {
    const { repository } = freshRepository()
    await repository.save({ id: 'c1', payload: { level: 0 } }, { id: 'c1', name: 'Test' })
    await expect(repository.get('c1')).resolves.toEqual({ id: 'c1', payload: { level: 0 } })
    await expect(repository.list()).resolves.toEqual([{ id: 'c1', name: 'Test' }])
  })

  it('FR-CHAR-010: a failed save rejects and writes nothing, not even the metadata', async () => {
    const { repository, database } = freshRepository()
    // Uma função não é clonável: o IndexedDB recusa o documento no meio da transação.
    const unsavable = { id: 'c2', payload: () => undefined }
    await expect(repository.save(unsavable, { id: 'c2', name: 'Lost' })).rejects.toThrow()
    await expect(repository.list()).resolves.toEqual([])
    await expect((await database).count('characters')).resolves.toBe(0)
  })

  /** Uma fábrica que conta as aberturas; as primeiras `failures` rejeitam, como uma falha transitória do navegador. */
  const countingFactory = (failures: number) => {
    const name = `test-${++counter}`
    const factory = Object.assign(
      () => {
        factory.calls++
        return factory.calls <= failures ? Promise.reject(new DOMException('transient', 'UnknownError')) : openCharacterDatabase(name)
      },
      { calls: 0 },
    )
    return factory
  }

  it('DEF-020 FR-CHAR-010 FR-CHAR-009: after a rejected opening, the next operation opens again and works', async () => {
    const factory = countingFactory(1)
    const repository = createIndexedDbRepository<Doc, Meta>(factory)
    // Duas operações sobre a mesma abertura em andamento: uma tentativa só, e as duas falham com ela.
    const [list, get] = await Promise.allSettled([repository.list(), repository.get('c4')])
    expect(list.status).toBe('rejected')
    expect(get.status).toBe('rejected')
    expect(factory.calls).toBe(1)

    await repository.save({ id: 'c4', payload: null }, { id: 'c4', name: 'Retried' })
    await expect(repository.list()).resolves.toEqual([{ id: 'c4', name: 'Retried' }])
    expect(factory.calls).toBe(2)
  })

  it('DEF-020 FR-CHAR-009: simultaneous operations share an opening in progress, and an open connection is reused', async () => {
    const factory = countingFactory(0)
    const repository = createIndexedDbRepository<Doc, Meta>(factory)
    await Promise.all([repository.list(), repository.get('c5'), repository.save({ id: 'c5', payload: 1 }, { id: 'c5', name: 'Shared' })])
    expect(factory.calls).toBe(1)
    await expect(repository.get('c5')).resolves.toEqual({ id: 'c5', payload: 1 })
    expect(factory.calls).toBe(1)
  })

  it('FR-CHAR-014: deleting removes the document and its metadata', async () => {
    const { repository } = freshRepository()
    await repository.save({ id: 'c3', payload: null }, { id: 'c3', name: 'Gone' })
    await repository.delete('c3')
    await expect(repository.get('c3')).resolves.toBeUndefined()
    await expect(repository.list()).resolves.toEqual([])
  })
})
