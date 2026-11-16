import { afterEach, describe, expect, it, vi } from 'vitest'
import { cryptoRandomSource, rollDice, rollDie, type RandomSource } from '.'

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

/** Fonte fixa que conta as chamadas; falha se pedirem mais valores do que a sequência tem. */
function sequence(values: number[]): RandomSource & { calls: number } {
  const source = Object.assign(
    () => {
      if (source.calls >= values.length) throw new Error('sequence exhausted')
      return values[source.calls++]
    },
    { calls: 0 },
  )
  return source
}

const limitOf = (sides: number) => Math.floor(2 ** 32 / sides) * sides

describe('rollDice', () => {
  it('FR-DEC-005: 3d6 draws three times and returns three faces from 1 to 6', () => {
    const random = sequence([2, 4, 1])
    const faces = rollDice({ count: 3, sides: 6 }, random)
    expect(random.calls).toBe(3)
    expect(faces).toEqual([3, 5, 2])
    for (const face of faces) expect(face).toBeGreaterThanOrEqual(1)
    for (const face of faces) expect(face).toBeLessThanOrEqual(6)
  })

  it('FR-DEC-005: d20 draws once', () => {
    const random = sequence([19])
    expect(rollDice({ count: 1, sides: 20 }, random)).toEqual([20])
    expect(random.calls).toBe(1)
  })

  it('FR-DEC-005: the modifier is not part of the faces', () => {
    expect(rollDice({ count: 1, sides: 6, modifier: 1 }, sequence([5]))).toEqual([6])
  })
})

describe('rollDie by rejection', () => {
  it.each([6, 20])('FR-DEC-005: a draw at or above the rejection limit is discarded and the next one counts (d%i)', (sides) => {
    const limit = limitOf(sides)
    const random = sequence([limit, 2 ** 32 - 1, 7])
    expect(rollDie(sides, random)).toBe((7 % sides) + 1)
    expect(random.calls).toBe(3)
  })

  it.each([6, 20])('FR-DEC-005: the value just below the limit is accepted (d%i)', (sides) => {
    const random = sequence([limitOf(sides) - 1])
    expect(rollDie(sides, random)).toBe(sides)
    expect(random.calls).toBe(1)
  })

  it.each([6, 20])('FR-DEC-005: a full cycle of residues below the limit gives each face the same count (d%i)', (sides) => {
    const limit = limitOf(sides)
    // Dois ciclos completos de resíduos: um no início do intervalo e outro logo abaixo do limite.
    const values = [...Array.from({ length: sides }, (_, i) => i), ...Array.from({ length: sides }, (_, i) => limit - sides + i)]
    const random = sequence(values)
    const counts = new Map<number, number>()
    for (let i = 0; i < values.length; i++) {
      const face = rollDie(sides, random)
      counts.set(face, (counts.get(face) ?? 0) + 1)
    }
    expect([...counts.keys()].sort((a, b) => a - b)).toEqual(Array.from({ length: sides }, (_, i) => i + 1))
    for (const count of counts.values()) expect(count).toBe(2)
  })
})
