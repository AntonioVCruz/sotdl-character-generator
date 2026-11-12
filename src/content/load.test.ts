import { describe, expect, it, vi } from 'vitest'
import { loadBook, loadBookIndex, PackLoadError } from './load'

const index = { format: 1, books: [{ id: 'test.book', name: 'Test Book', abbr: 'TB', layer: 'core', published: '2001' }] }
const respond = (body: unknown, ok = true) =>
  vi.fn(async (url: string) => {
    void url
    return { ok, status: ok ? 200 : 404, json: async () => body }
  })

describe('pack loading', () => {
  it('FR-CONT-002: loads the embedded index from <base>packs/', async () => {
    const fetch = respond(index)
    await expect(loadBookIndex({ baseUrl: '/sub/', fetch })).resolves.toEqual(index)
    expect(fetch).toHaveBeenCalledWith('/sub/packs/index.json')
  })

  it('FR-CONT-001: validates a book when it loads and refuses an invalid one', async () => {
    const fetch = respond({ format: 1, id: 'test.book' })
    await expect(loadBook('test.book', { fetch })).rejects.toBeInstanceOf(PackLoadError)
  })

  it('FR-CONT-001: reports a missing file as a load error', async () => {
    await expect(loadBookIndex({ fetch: respond(null, false) })).rejects.toThrow('HTTP 404')
  })
})
