import { afterEach, describe, expect, it, vi } from 'vitest'
import { cryptoRandomSource } from '.'

describe('random source', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('ADR-009: draws from globalThis.crypto.getRandomValues, without a seed', () => {
    const spy = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
      if (array instanceof Uint32Array) array[0] = 42
      return array
    })
    expect(cryptoRandomSource()).toBe(42)
    expect(spy).toHaveBeenCalledOnce()
  })
})
