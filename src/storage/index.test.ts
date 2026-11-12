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

  it('FR-CHAR-014: deleting removes the document and its metadata', async () => {
    const { repository } = freshRepository()
    await repository.save({ id: 'c3', payload: null }, { id: 'c3', name: 'Gone' })
    await repository.delete('c3')
    await expect(repository.get('c3')).resolves.toBeUndefined()
    await expect(repository.list()).resolves.toEqual([])
  })
})
