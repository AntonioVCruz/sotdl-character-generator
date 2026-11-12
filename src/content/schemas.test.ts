import { describe, expect, it } from 'vitest'
import { bookIndexSchema, bookSchema } from './schemas'

// Pacotes fictícios: nenhum dado dos livros nos testes.
const book = {
  format: 1,
  id: 'test.book',
  name: 'Test Book',
  layer: 'core',
  published: '2001-02-03',
  steps: [
    { id: 'step:first', name: 'First', page: 1 },
    { id: 'step:last', name: 'Last' },
  ],
}

describe('pack schema', () => {
  it('FR-CONT-001: accepts a book in the documented format', () => {
    expect(bookSchema.parse(book)).toEqual(book)
  })

  it('FR-CONT-010: rejects a book or index entry without a publication date', () => {
    const undated = { ...book, published: undefined }
    expect(bookSchema.safeParse(undated).success).toBe(false)
    const index = { format: 1, books: [{ id: 'test.book', name: 'Test', layer: 'core' }] }
    expect(bookIndexSchema.safeParse(index).success).toBe(false)
  })

  it('FR-CONT-004: rejects any field outside the format, so no free text enters the official pack', () => {
    expect(bookSchema.safeParse({ ...book, description: 'Prose from a book' }).success).toBe(false)
    const step = { id: 'step:first', name: 'First', text: 'Prose' }
    expect(bookSchema.safeParse({ ...book, steps: [step] }).success).toBe(false)
  })
})
