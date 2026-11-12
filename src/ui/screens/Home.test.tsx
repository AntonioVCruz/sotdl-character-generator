// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Home } from './Home'

const createCharacter = vi.fn()
vi.mock('../../app', () => ({
  app: { listCharacters: async () => [], createCharacter: () => createCharacter() },
}))

describe('Home', () => {
  afterEach(cleanup)

  it('FR-CHAR-010: when the new character is not saved, warns and stays on the Home', async () => {
    createCharacter.mockResolvedValue({ ok: false, reason: 'save-failed' })
    window.location.hash = '#/'
    render(<Home />)
    await userEvent.click(screen.getByRole('button', { name: 'New character' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/did not save/)
    expect(window.location.hash).toBe('#/')
  })
})
