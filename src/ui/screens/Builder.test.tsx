// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
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
// Define de novo uma ancestralidade do core: o motor recusa (EngineError), e a tela mostra pack-load-failed.
files['/packs/test.clash.json'] = {
  ...(files['/packs/test.core.json'] as object),
  id: 'test.clash',
  components: [{ id: 'base', type: 'adds', default: 'on', items: [{ id: 'ancestry:troll', name: 'Troll', page: 1, attributes: {} }] }],
}
// O mesmo core com a vaga opcional do ajuste em Traits (FEAT-008).
const core = files['/packs/test.core.json'] as { components: { items: Record<string, unknown>[] }[] }
files['/packs/test.adjust.json'] = {
  ...core,
  id: 'test.adjust',
  components: [
    {
      ...core.components[0],
      items: core.components[0].items.map((item) =>
        item.id === 'step:traits' ? { ...item, slots: { adjust: { kind: 'attribute-shift', amount: 1, optional: true } } } : item,
      ),
    },
  ],
}
// Etapa com o ajuste e dois atributos, e uma característica com máximo (FEAT-008, T6).
files['/packs/test.scores.json'] = {
  ...core,
  id: 'test.scores',
  components: [
    {
      id: 'base',
      type: 'adds',
      default: 'on',
      items: [
        { id: 'procedure:test', steps: ['step:ancestry', 'step:scores'] },
        { id: 'step:ancestry', name: 'Ancestry', page: 1, regime: 'choice', slots: { ancestry: { kind: 'choose-entity', of: 'ancestry' } } },
        { id: 'step:scores', name: 'Scores', page: 2, requires: ['step:ancestry'], slots: { adjust: { kind: 'attribute-shift', amount: 1, optional: true } } },
        { id: 'attribute:might', name: 'Might', page: 3, modifier: { add: [{ ref: 'self' }, -10] } },
        { id: 'attribute:wits', name: 'Wits', page: 3, modifier: { add: [{ ref: 'self' }, -10] } },
        { id: 'characteristic:power', name: 'Power', page: 3, formula: { add: [{ ref: 'attribute:might' }, { ref: 'attribute:might' }] }, limits: { max: 25 } },
        { id: 'ancestry:troll', name: 'Troll', page: 6, attributes: { 'attribute:might': 12, 'attribute:wits': 10 } },
      ],
    },
  ],
}
const withAdjustment = () => {
  const document = stored({ ancestry: 'ancestry:troll' }, ['test.scores'])
  return { ...document, decisions: { ...document.decisions, adjust: { mode: 'chosen', value: { decrease: 'attribute:wits', increase: 'attribute:might' } } } }
}
const fetch = async (url: string) => ({ ok: url in files, status: url in files ? 200 : 404, json: async () => files[url] })

function stored(decisions: Record<string, string | number> = {}, order = ['test.core']) {
  return {
    schema: 1,
    id: 'c1',
    contentVersion: '0.0.0',
    revision: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    sources: { order },
    decisions: Object.fromEntries(Object.entries(decisions).map(([key, value]) => [key, { mode: 'chosen', value }])),
    text: {},
    log: [],
  }
}

const sessions: { current?: CharacterSession } = {}
function setup(options: { document?: unknown; failGet?: boolean; failSave?: boolean } = {}) {
  const document = 'document' in options ? options.document : stored()
  const control = { failSave: options.failSave ?? false }
  // Cada gravação bem-sucedida fica registrada, para conferir o que foi gravado (e o que não foi).
  const saved: { decisions: Record<string, { value: unknown }> }[] = []
  const repository: Repository = {
    list: async () => [],
    get: async () => {
      if (options.failGet) throw new DOMException('blocked', 'UnknownError')
      return document as never
    },
    save: vi.fn(async (doc) => {
      if (control.failSave) throw new Error('quota exceeded')
      saved.push(structuredClone(doc))
    }),
    delete: async () => undefined,
  }
  const session = createCharacterSession({ repository, loadRules: createRulesLoader({ baseUrl: '/', fetch }) })
  sessions.current = session
  return { session, control, repository, saved }
}

vi.mock('../../app', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../app')>()),
  app: { createSession: () => sessions.current! },
}))

const renderBuilder = (step = 'ancestry') => render(<Builder route={{ id: 'c1', step }} />)

describe('Builder states', () => {
  afterEach(cleanup)

  // AC-11: cada razão de falha do `open` mostra a mensagem dela (ui-design §Textos), nunca "Loading…", e nada é gravado.
  const openFailures: [string, Parameters<typeof setup>[0], RegExp][] = [
    ['FR-HELP-005: a repository that rejects shows the storage-unavailable message', { failGet: true }, /^This browser didn't let the generator read your saved characters\. Nothing was changed\./],
    ['FR-HELP-005: a character that is not saved shows the not-found message', { document: undefined }, /^This character isn't saved in this browser\./],
    [
      'FR-HELP-005: a document saved by the skeleton shows the unreadable message',
      { document: { ...stored(), name: '', level: 0, text: undefined } },
      /^This character was saved by an earlier version of the generator and can't be opened\./,
    ],
    ['FR-HELP-004: a pack that does not load shows the pack-load-failed message', { document: stored({}, ['test.missing']) }, /^The rules this character uses couldn't be loaded\. Nothing was changed\./],
    [
      'FR-HELP-004: rules the engine refuses (an id in two books) show the pack-load-failed message',
      { document: stored({}, ['test.core', 'test.clash']) },
      /^The rules this character uses couldn't be loaded\. Nothing was changed\./,
    ],
  ]
  it.each(openFailures)('%s, never "Loading…", and saves nothing', async (_, options, message) => {
    const { repository } = setup(options)
    renderBuilder()
    expect((await screen.findByRole('alert')).textContent).toMatch(message)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe("Can't open this character")
    expect(screen.getByRole('link', { name: 'Back to My characters' })).toBeTruthy()
    expect(screen.queryByText(/Loading/)).toBeNull()
    expect(screen.queryByRole('navigation', { name: 'Creation steps' })).toBeNull()
    expect(repository.save).not.toHaveBeenCalled()
  })

  it('FR-CHAR-010: a failed save shows the warning, keeps the choice on screen, and "Try again" calls retrySave', async () => {
    const { session, control, saved } = setup({ failSave: true })
    const retrySave = vi.spyOn(session, 'retrySave')
    renderBuilder()
    await userEvent.click(await screen.findByRole('radio', { name: 'Troll' }))
    await userEvent.click(screen.getByRole('button', { name: 'Choose Troll' }))

    expect((await screen.findByRole('alert')).textContent).toMatch(/Your last choice wasn't saved/)
    expect(screen.getByRole('radio', { name: 'Troll, your choice' })).toBeTruthy()
    expect(saved).toEqual([])

    control.failSave = false
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retrySave).toHaveBeenCalledOnce()
    await vi.waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    // "Try again" grava o estado que está na tela: a escolha do Troll.
    expect(saved).toHaveLength(1)
    expect(saved[0].decisions).toEqual({ ancestry: { mode: 'chosen', value: 'ancestry:troll' } })
    expect(screen.getByRole('radio', { name: 'Troll, your choice' })).toBeTruthy()
  })

  it('FR-FLOW-003: has-dependents shows a warning that names the choice in the way (Size of the Human, here Stature of the Gnome)', async () => {
    const { repository } = setup({ document: stored({ ancestry: 'ancestry:gnome', 'ancestry=gnome/stature': 1 }) })
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
    // A Stature decidida continua, e nada foi gravado.
    expect((screen.getByRole('radio', { name: '1' }) as HTMLInputElement).checked).toBe(true)
    expect(screen.getByText('Decided.')).toBeTruthy()
    expect(repository.save).not.toHaveBeenCalled()
  })

  it('FR-STEP-009: the optional adjustment slot is not shown as pending in the step', async () => {
    setup({ document: stored({ ancestry: 'ancestry:troll' }, ['test.adjust']) })
    renderBuilder('traits')
    // A etapa tem tela própria (T6): o ajuste aparece como opcional, não como pendência.
    const card = (await screen.findByRole('heading', { name: 'Score adjustment' })).closest('section')!
    expect(within(card).getByText('Optional. You can make it once.')).toBeTruthy()
    expect(screen.queryByText(/It stays in Open decisions/)).toBeNull()
    expect(screen.getByRole('heading', { name: 'Open decisions · 0' })).toBeTruthy()
  })
})

describe('Attributes step', () => {
  afterEach(cleanup)

  it('FR-STEP-010: a second adjustment is refused and the step offers to undo the current one', async () => {
    const { session, repository } = setup({ document: withAdjustment() })
    const decide = vi.spyOn(session, 'decide')
    renderBuilder('scores')
    const raise = await screen.findByRole('radiogroup', { name: 'Raise one attribute by 1' })
    const lower = screen.getByRole('radiogroup', { name: 'Lower another attribute by 1' })
    const radio = (group: HTMLElement, name: string) => within(group).getByRole('radio', { name }) as HTMLInputElement

    await userEvent.click(radio(raise, 'Wits'))
    await userEvent.click(radio(lower, 'Might'))
    expect(decide).not.toHaveBeenCalled()
    expect(radio(raise, 'Might').checked).toBe(true)
    expect(radio(lower, 'Wits').checked).toBe(true)
    expect(screen.getByText('Applied: Might +1, Wits −1.')).toBeTruthy()
    const reason = screen.getByText('To change it, undo the current adjustment first.')
    expect(raise.getAttribute('aria-describedby')).toBe(reason.id)
    expect(lower.getAttribute('aria-describedby')).toBe(reason.id)
    expect(screen.getByRole('button', { name: 'Undo adjustment' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Apply adjustment' })).toBeNull()
    expect(repository.save).not.toHaveBeenCalled()
  })

  it('FR-CALC-002, FR-CALC-007: the composition lists the adjustment and the limit, and the total is their sum', async () => {
    setup({ document: withAdjustment() })
    renderBuilder('scores')
    await screen.findByRole('heading', { name: 'Score adjustment' })
    const main = screen.getByRole('main')
    // As linhas do value-composition aberto da linha do gatilho.
    const lines = (trigger: HTMLElement) =>
      within(trigger.closest('li')!.querySelector<HTMLElement>('.value-composition:not([hidden])')!)
        .getAllByRole('listitem')
        .map((item) => item.textContent)

    const might = within(main).getByRole('button', { name: 'Might 13 Modifier +3' })
    await userEvent.click(might)
    expect(lines(might)).toEqual(['Troll starting score12', 'Score adjustment+1', 'Might13'])

    // O nome vem do conteúdo: nome, valor e linha de fórmula com o limite (WCAG 2.5.3; ui-design, emenda da T8).
    const power = within(main).getByRole('button', { name: 'Power 25 Might + Might, maximum 25' })
    await userEvent.click(power)
    expect(lines(power)).toEqual([
      'Standard rule: Might + Might26',
      'Capped at 25−1',
      'Power25',
    ])
  })
})
