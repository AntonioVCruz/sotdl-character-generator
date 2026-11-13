import { afterEach, describe, expect, it } from 'vitest'
import { createLastStepStore, type KeyValueStorage } from '.'

function memoryStorage(): KeyValueStorage & { items: Map<string, string> } {
  const items = new Map<string, string>()
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  }
}

const throwing: KeyValueStorage = {
  getItem: () => {
    throw new DOMException('denied', 'SecurityError')
  },
  setItem: () => {
    throw new DOMException('full', 'QuotaExceededError')
  },
  removeItem: () => {
    throw new DOMException('denied', 'SecurityError')
  },
}

describe('last step store', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  })

  it('FR-CHAR-007: set and get keep the step slug under the site key for each character', () => {
    const storage = memoryStorage()
    const store = createLastStepStore(storage)
    expect(store.get('id-1')).toBeUndefined()
    store.set('id-1', 'attributes')
    store.set('id-2', 'ancestry')
    expect(store.get('id-1')).toBe('attributes')
    expect(store.get('id-2')).toBe('ancestry')
    expect([...storage.items]).toEqual([
      ['sotdl-generator:last-step:id-1', 'attributes'],
      ['sotdl-generator:last-step:id-2', 'ancestry'],
    ])
  })

  it('FR-CHAR-007: forget removes the key', () => {
    const storage = memoryStorage()
    const store = createLastStepStore(storage)
    store.set('id-1', 'attributes')
    store.set('id-2', 'ancestry')
    store.forget('id-1')
    expect(store.get('id-1')).toBeUndefined()
    expect([...storage.items.keys()]).toEqual(['sotdl-generator:last-step:id-2'])
  })

  it('FR-CHAR-007: a storage that throws gives no step, and set and forget do not throw', () => {
    const store = createLastStepStore(throwing)
    expect(store.get('id-1')).toBeUndefined()
    expect(() => store.set('id-1', 'attributes')).not.toThrow()
    expect(() => store.forget('id-1')).not.toThrow()
  })

  it('FR-CHAR-007: a localStorage whose very access throws (storage blocked) gives no step, and set and forget do not throw', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError')
      },
    })
    const store = createLastStepStore()
    expect(store.get('id-1')).toBeUndefined()
    expect(() => store.set('id-1', 'attributes')).not.toThrow()
    expect(() => store.forget('id-1')).not.toThrow()
  })

  it('FR-CHAR-007: without a storage argument it uses the browser localStorage', () => {
    const storage = memoryStorage()
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
    createLastStepStore().set('id-1', 'attributes')
    expect(storage.items.get('sotdl-generator:last-step:id-1')).toBe('attributes')
  })
})
