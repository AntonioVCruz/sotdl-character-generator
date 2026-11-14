// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CharacterSummary } from '../../app'
import { formatEdited } from '../home/copy'
import { Home } from './Home'

// O jsdom não tem `CSS.escape`, que o React Aria usa ao abrir o popover do menu.
const css = ((globalThis as { CSS?: Partial<typeof CSS> }).CSS ??= {})
css.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`)

const createCharacter = vi.fn()
const listCharacters = vi.fn(async () => ({ ok: true, characters: [] }) as unknown)
const deleteCharacter = vi.fn(async (id: string) => ({ ok: true, id }) as unknown)
vi.mock('../../app', () => ({
  app: {
    listCharacters: () => listCharacters(),
    createCharacter: () => createCharacter(),
    deleteCharacter: (id: string) => deleteCharacter(id),
  },
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

const CORE = [{ id: 'sotdl.core', name: 'Shadow of the Demon Lord', abbr: 'CORE' }]
const summary = (overrides: Partial<CharacterSummary> & { id: string }): CharacterSummary => ({
  name: '',
  ancestry: null,
  status: 'creating',
  openDecisions: 1,
  sources: CORE,
  contentVersion: '0.0.0',
  updatedAt: '2026-11-12T12:00:00.000Z',
  ...overrides,
})
const liliana = summary({ id: 'c1', name: 'Liliana', ancestry: 'Human', openDecisions: 3, updatedAt: '2026-11-13T12:00:00.000Z' })
const brokk = summary({ id: 'c2', name: 'Brokk', ancestry: 'Dwarf', status: 'complete', openDecisions: 0 })
const unnamed = summary({ id: 'c3', name: '  ', updatedAt: '2026-11-11T12:00:00.000Z' })

function listing(...characters: CharacterSummary[]) {
  listCharacters.mockResolvedValueOnce({ ok: true, characters })
  render(<Home />)
  return screen.findByRole('list', { name: 'Saved characters' })
}
const card = (name: string) => screen.getByRole('article', { name })
const openDelete = async (name: string) => {
  await userEvent.click(screen.getByRole('button', { name: `More actions for ${name}` }))
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }))
  return screen.findByRole('alertdialog', { name: `Delete ${name}?` })
}
const CONSEQUENCE = "This permanently deletes Liliana and its creation log from this browser. You can't undo this."
const DELETE_FAILED = "Liliana wasn't deleted. It's still saved in this browser. Try again, and if it keeps failing, reload the page."
const NOTICE = "Characters are saved in this browser only. Clearing your browser's data for this site deletes them."

describe('Home: character cards', () => {
  afterEach(cleanup)

  it('FR-CHAR-003: the card shows name, ancestry, "Level 0", state, sources and date, with actions named by the character', async () => {
    await listing(liliana)
    const article = card('Liliana')
    expect(within(article).getByRole('heading', { level: 2 }).textContent).toBe('Liliana')
    expect(within(article).getByText('Human · Level 0')).toBeTruthy()
    expect(within(article).getByText('Creating · 3 open')).toBeTruthy()
    expect(within(article).getByText('Sources: Shadow of the Demon Lord')).toBeTruthy()
    expect(within(article).getByText(/^Edited/).textContent).toBe('Edited Nov 13, 2026')
    expect(within(article).getByText('Nov 13, 2026').getAttribute('datetime')).toBe('2026-11-13T12:00:00.000Z')
    const link = within(article).getByRole('link', { name: 'Continue Liliana' })
    expect(link.getAttribute('href')).toBe('#/characters/c1')
    expect(link.textContent).toBe('Continue')
    expect(within(article).getByRole('button', { name: 'More actions for Liliana' })).toBeTruthy()
  })

  it('FR-CHAR-005: an open count shows "Creating · N open", pending (dashed)', async () => {
    await listing(summary({ id: 'c1', name: 'Ann', openDecisions: 1 }))
    const pill = within(card('Ann')).getByText('Creating · 1 open')
    expect(pill.className).toContain('pill-counter')
    expect(pill.className).not.toContain('pill-counter--done')
    expect(within(card('Ann')).getByText('Level 0')).toBeTruthy()
  })

  it('FR-CHAR-005: old metadata without a count shows "Creating" with no number, and no sources or date line', async () => {
    await listing(summary({ id: 'c1', name: 'Old', openDecisions: null, sources: [], updatedAt: '' }))
    const article = card('Old')
    expect(within(article).getByText('Creating')).toBeTruthy()
    expect(within(article).queryByText(/open/)).toBeNull()
    expect(within(article).queryByText(/^Sources/)).toBeNull()
    expect(within(article).queryByText(/^Edited/)).toBeNull()
  })

  it('FR-CHAR-006: no open decisions shows "Complete", filled', async () => {
    await listing(brokk)
    expect(within(card('Brokk')).getByText('Complete').className).toContain('pill-counter--done')
  })

  it('FR-CHAR-011: a name of only spaces shows "Unnamed character"', async () => {
    await listing(unnamed)
    expect(within(card('Unnamed character')).getByRole('link', { name: 'Continue Unnamed character' })).toBeTruthy()
  })

  it('FR-CHAR-004: the cards keep the order of the app', async () => {
    const list = await listing(liliana, brokk, unnamed)
    expect(within(list).getAllByRole('article').map((article) => article.getAttribute('aria-labelledby'))).toEqual([
      'character-c1-name',
      'character-c2-name',
      'character-c3-name',
    ])
  })

  it('FR-CHAR-003: formatEdited gives the date in English, and nothing for an invalid or empty one', () => {
    expect(formatEdited('2026-11-12T12:00:00.000Z')).toBe('Nov 12, 2026')
    expect(formatEdited('not a date')).toBeNull()
    expect(formatEdited('')).toBeNull()
  })
})

describe('Home: states', () => {
  afterEach(cleanup)

  it('FR-CHAR-015: with no characters, the empty state says what the app does and where the rules text is', async () => {
    listCharacters.mockResolvedValueOnce({ ok: true, characters: [] })
    render(<Home />)
    const title = await screen.findByRole('heading', { level: 2, name: 'No characters yet' })
    expect([...title.parentElement!.querySelectorAll('p')].map((p) => p.textContent)).toEqual([
      'This generator guides you through creating a level 0 character for Shadow of the Demon Lord, one step at a time, and shows how each number is calculated.',
      'For each rule, it shows the mechanics and the book and page they come from. The full rules text is in the books.',
      'To start, choose New character.',
    ])
    expect(screen.getAllByRole('button', { name: 'New character' })).toHaveLength(1)
    expect(screen.queryByRole('list', { name: 'Saved characters' })).toBeNull()
  })

  it('FR-CHAR-016: the browser-only notice shows with and without characters, as static text', async () => {
    listCharacters.mockResolvedValueOnce({ ok: true, characters: [] })
    render(<Home />)
    await screen.findByRole('heading', { name: 'No characters yet' })
    expect(screen.getByText(NOTICE).closest('[role]')).toBeNull()
    cleanup()

    await listing(liliana)
    expect(screen.getByText(NOTICE).closest('[role]')).toBeNull()
  })

  it('NFR-PERF-001: while the list loads, the Home shows skeletons, busy, with a hidden loading text', async () => {
    let resolve: (value: unknown) => void = () => undefined
    listCharacters.mockReturnValueOnce(new Promise((done) => (resolve = done)))
    render(<Home />)
    expect(screen.getByText('Loading characters…').closest('[aria-busy="true"]')).not.toBeNull()
    expect(screen.getByText(NOTICE)).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'No characters yet' })).toBeNull()
    resolve({ ok: true, characters: [] })
    await screen.findByRole('heading', { name: 'No characters yet' })
    expect(screen.queryByText('Loading characters…')).toBeNull()
  })
})

describe('Home: delete', () => {
  afterEach(() => {
    cleanup()
    deleteCharacter.mockClear()
  })

  it('FR-CHAR-013: "Delete" opens a dialog that says the deletion is permanent; "Cancel" and Esc close it without deleting', async () => {
    await listing(liliana, brokk)
    const dialog = await openDelete('Liliana')
    expect(within(dialog).getByText('Human · Level 0 · Edited Nov 13, 2026')).toBeTruthy()
    expect(within(dialog).getByText(CONSEQUENCE)).toBeTruthy()
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Cancel' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    // O foco volta ao "···" no quadro seguinte (ui-design, Foco na Home); antes disso, o jsdom, sem `inert`, deixa esse
    // foco tirar o menu recém-aberto. O segundo clique espera esse estado.
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'More actions for Liliana' })))

    await openDelete('Liliana')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(deleteCharacter).not.toHaveBeenCalled()
    expect(card('Liliana')).toBeTruthy()
  })

  it('FR-CHAR-013: after cancelling (Esc or "Cancel"), the focus goes back to the "···" of the card', async () => {
    await listing(liliana, brokk)
    const more = screen.getByRole('button', { name: 'More actions for Brokk' })
    const dialog = await openDelete('Brokk')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(document.activeElement).toBe(more))

    await openDelete('Brokk')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(document.activeElement).toBe(more))
  })

  it('FR-CHAR-014: confirming removes the card and announces it; the last one leads to the empty state, with the focus on its title', async () => {
    await listing(liliana)
    const dialog = await openDelete('Liliana')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete permanently' }))
    expect(deleteCharacter).toHaveBeenCalledWith('c1')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(screen.queryByRole('article', { name: 'Liliana' })).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('Liliana was deleted.')
    // FR-CHAR-015: depois do último, o foco vai a "No characters yet".
    const empty = screen.getByRole('heading', { name: 'No characters yet' })
    await waitFor(() => expect(document.activeElement).toBe(empty))
  })

  it('FR-CHAR-014: after deleting, the focus goes to the title of the next card, or of the previous one when it was the last', async () => {
    await listing(liliana, brokk, unnamed)
    await userEvent.click(within(await openDelete('Brokk')).getByRole('button', { name: 'Delete permanently' }))
    await waitFor(() => expect(document.activeElement).toBe(within(card('Unnamed character')).getByRole('heading', { level: 2 })))

    await userEvent.click(within(await openDelete('Unnamed character')).getByRole('button', { name: 'Delete permanently' }))
    await waitFor(() => expect(document.activeElement).toBe(within(card('Liliana')).getByRole('heading', { level: 2 })))
    expect(screen.getAllByRole('article')).toHaveLength(1)
  })

  it('FR-CHAR-014: delete-failed keeps the dialog open with the warning, and trying again deletes', async () => {
    deleteCharacter.mockResolvedValueOnce({ ok: false, reason: 'delete-failed' })
    await listing(liliana, brokk)
    const dialog = await openDelete('Liliana')
    const confirm = within(dialog).getByRole('button', { name: 'Delete permanently' })
    await userEvent.click(confirm)
    expect((await within(dialog).findByRole('alert')).textContent).toBe(DELETE_FAILED)
    expect(screen.getByRole('alertdialog', { name: 'Delete Liliana?' })).toBeTruthy()
    // Com o modal aberto, o resto da página fica fora da árvore de acessibilidade (aria-hidden do React Aria).
    expect(screen.getByRole('article', { name: 'Liliana', hidden: true })).toBeTruthy()
    expect(document.activeElement).toBe(confirm)

    await userEvent.click(confirm)
    expect(deleteCharacter).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(screen.queryByRole('article', { name: 'Liliana' })).toBeNull()
    expect(card('Brokk')).toBeTruthy()
  })
})
