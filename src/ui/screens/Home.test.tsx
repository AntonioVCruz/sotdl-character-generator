// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Home } from './Home'

const createCharacter = vi.fn()
const listCharacters = vi.fn(async () => ({ ok: true, characters: [] }) as unknown)
vi.mock('../../app', () => ({
  app: { listCharacters: () => listCharacters(), createCharacter: () => createCharacter() },
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

  it('FR-HELP-005: a list that cannot be read shows the alert, not the empty state', async () => {
    listCharacters.mockResolvedValueOnce({ ok: false, reason: 'storage-unavailable' })
    render(<Home />)
    expect((await screen.findByRole('alert')).textContent).toBe(
      "This browser didn't let the generator read your saved characters. Nothing was changed. Reload the page to try again. If it keeps happening, check that this site is allowed to store data.",
    )
    expect(screen.queryByRole('heading', { name: 'No characters yet' })).toBeNull()
    expect(screen.queryByRole('list', { name: 'Saved characters' })).toBeNull()
    expect(screen.getByRole('button', { name: 'New character' }).hasAttribute('disabled')).toBe(false)
  })
})
