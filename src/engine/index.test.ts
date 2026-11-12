import { describe, expect, it } from 'vitest'
import type { Book, CharacterDocument } from '../content'
import { evaluate, resolve } from '.'

const book: Book = {
  format: 1,
  id: 'test.book',
  name: 'Test Book',
  layer: 'core',
  abbr: 'TB',
  published: '2001',
  components: [
    {
      id: 'base',
      type: 'adds',
      default: 'on',
      items: [
        { id: 'procedure:test', steps: ['step:one', 'step:two'] },
        { id: 'step:one', name: 'One', page: 1 },
        { id: 'step:two', name: 'Two' },
      ],
    },
  ],
}

const character = { sources: { order: ['test.book'] } } as CharacterDocument

describe('engine stubs (FEAT-007 replaces them)', () => {
  it('FR-FLOW-001: lists every step of the procedure with its state, all "not started" in the skeleton', () => {
    const view = evaluate(resolve([book], character.sources.order), character)
    expect(view.steps.map((step) => [step.id, step.status])).toEqual([
      ['step:one', 'not-started'],
      ['step:two', 'not-started'],
    ])
  })
})
