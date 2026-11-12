import { describe, expect, it } from 'vitest'
import { removedIds } from './check-packs.mjs'

describe('removed pack ids', () => {
  const base = { 'test.book.json': { id: 'test.book', steps: [{ id: 'step:a' }, { id: 'step:b' }] } }

  it('FR-CONT-006: flags an id that disappeared since the base revision', () => {
    const current = { 'test.book.json': { id: 'test.book', steps: [{ id: 'step:a' }] } }
    expect(removedIds(base, current)).toEqual(['step:b (was in packs/test.book.json)'])
  })

  it('FR-CONT-006: accepts renamed entries and ids moved to another file', () => {
    const current = {
      'test.book.json': { id: 'test.book', steps: [{ id: 'step:a', name: 'Renamed' }] },
      'test.other.json': { id: 'test.other', steps: [{ id: 'step:b' }] },
    }
    expect(removedIds(base, current)).toEqual([])
  })
})
