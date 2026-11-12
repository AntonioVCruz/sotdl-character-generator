// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCharacterSession, createRulesLoader, type CharacterSession, type Repository } from '../../app'
import Builder from './Builder'

// Pacote fictício servido por um fetch falso; sessão real do `app` sobre um repositório em memória.
const files: Record<string, unknown> = {
  '/packs/test.core.json': {
    format: 1,
    id: 'test.core',
    name: 'Test Core',
    abbr: 'TC',
    layer: 'core',
    published: '2001',
    components: [
      {
        id: 'base',
        type: 'adds',
        default: 'on',
        items: [
          { id: 'procedure:test', steps: ['step:ancestry', 'step:traits'] },
          { id: 'step:ancestry', name: 'Ancestry', page: 1, regime: 'choice', slots: { ancestry: { kind: 'choose-entity', of: 'ancestry' } } },
          { id: 'step:traits', name: 'Traits', page: 2, requires: ['step:ancestry'] },
          { id: 'attribute:might', name: 'Might', page: 3, modifier: { add: [{ ref: 'self' }, -10] } },
          { id: 'characteristic:stature', name: 'Stature', page: 3 },
          {
            id: 'ancestry:gnome',
            name: 'Gnome',
            page: 5,
            attributes: { 'attribute:might': 8 },
            characteristics: { 'characteristic:stature': { ref: 'grant:stature' } },
            grants: { stature: { kind: 'choose-value', step: 'step:ancestry', target: 'characteristic:stature', options: [0.5, 1] } },
          },
          { id: 'ancestry:troll', name: 'Troll', page: 6, attributes: { 'attribute:might': 12 }, characteristics: { 'characteristic:stature': 2 } },
        ],
      },
    ],
  },
}
const fetch = async (url: string) => ({ ok: url in files, status: url in files ? 200 : 404, json: async () => files[url] })

function stored(decisions: Record<string, string | number> = {}) {
  return {
    schema: 1,
    id: 'c1',
    contentVersion: '0.0.0',
    revision: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    sources: { order: ['test.core'] },
    decisions: Object.fromEntries(Object.entries(decisions).map(([key, value]) => [key, { mode: 'chosen', value }])),
    text: {},
    log: [],
  }
}

const sessions: { current?: CharacterSession } = {}
function setup({ document = stored(), failGet = false, failSave = false } = {}) {
  const control = { failSave }
  const repository: Repository = {
    list: async () => [],
    get: async () => {
      if (failGet) throw new DOMException('blocked', 'UnknownError')
      return document as never
    },
    save: async () => {
      if (control.failSave) throw new Error('quota exceeded')
    },
    delete: async () => undefined,
  }
  const session = createCharacterSession({ repository, loadRules: createRulesLoader({ baseUrl: '/', fetch }) })
  sessions.current = session
  return { session, control }
}

vi.mock('../../app', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../app')>()),
  app: { createSession: () => sessions.current! },
}))

const renderBuilder = (step = 'ancestry') => render(<Builder route={{ id: 'c1', step }} />)

describe('Builder states', () => {
  afterEach(cleanup)

  it('FR-HELP-005: a repository that rejects shows the storage-unavailable message and no "Loading…"', async () => {
    setup({ failGet: true })
    renderBuilder()
    expect((await screen.findByRole('alert')).textContent).toMatch(/didn't let the generator read your saved characters/)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe("Can't open this character")
    expect(screen.queryByText(/Loading/)).toBeNull()
  })

  it('FR-CHAR-010: a failed save shows the warning, keeps the choice on screen, and "Try again" calls retrySave', async () => {
    const { session, control } = setup({ failSave: true })
    const retrySave = vi.spyOn(session, 'retrySave')
    renderBuilder()
    await userEvent.click(await screen.findByRole('radio', { name: 'Troll' }))
    await userEvent.click(screen.getByRole('button', { name: 'Choose Troll' }))

    expect((await screen.findByRole('alert')).textContent).toMatch(/Your last choice wasn't saved/)
    expect(screen.getByRole('radio', { name: 'Troll, your choice' })).toBeTruthy()

    control.failSave = false
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retrySave).toHaveBeenCalledOnce()
    await vi.waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })

  it('FR-FLOW-003: has-dependents shows a warning that names the choice in the way (Size of the Human, here Stature of the Gnome)', async () => {
    setup({ document: stored({ ancestry: 'ancestry:gnome', 'ancestry=gnome/stature': 1 }) })
    renderBuilder()
    await userEvent.click(await screen.findByRole('radio', { name: 'Troll' }))
    await userEvent.click(screen.getByRole('button', { name: 'Choose Troll' }))

    const status = await screen.findByRole('status')
    expect(status.textContent).toBe(
      "You can't switch to Troll yet: your Stature choice for Gnome depends on your current ancestry. Changing a choice that others depend on isn't available yet.",
    )
    expect(screen.getByRole('radio', { name: 'Gnome, your choice' })).toBeTruthy()
    // Nada muda: a seleção volta para a escolha atual.
    expect((screen.getByRole('radio', { name: 'Troll' }) as HTMLInputElement).checked).toBe(false)
    expect((screen.getByRole('radio', { name: 'Gnome, your choice' }) as HTMLInputElement).checked).toBe(true)
  })
})
