// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCharacterSession, createRulesLoader, type CharacterSession, type Repository } from '../../app'
import { slotElementId } from '../builder/copy'
import { useRoute } from '../router'
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
function setup(
  options: { document?: unknown; failGet?: boolean; failSave?: boolean; holdSave?: boolean; lastStep?: string; random?: () => number } = {},
) {
  const document = 'document' in options ? options.document : stored()
  const control = { failSave: options.failSave ?? false, release: () => {}, hold: () => {} }
  // `holdSave`: a gravação fica pendente até `control.release()`, como um IndexedDB lento (DEF-003). `control.hold()`
  // retém de novo as gravações seguintes, para reter só a que interessa (C15), como a nova tentativa (DEF-011, DEF-012).
  let held = Promise.resolve()
  control.hold = () => void (held = new Promise<void>((resolve) => (control.release = resolve)))
  if (options.holdSave) control.hold()
  // Cada gravação bem-sucedida fica registrada, para conferir o que foi gravado (e o que não foi).
  const saved: { decisions: Record<string, { value: unknown }> }[] = []
  const repository: Repository = {
    list: async () => [],
    get: async () => {
      if (options.failGet) throw new DOMException('blocked', 'UnknownError')
      return document as never
    },
    save: vi.fn(async (doc) => {
      await held
      if (control.failSave) throw new Error('quota exceeded')
      saved.push(structuredClone(doc))
    }),
    delete: async () => undefined,
  }
  const steps = new Map(options.lastStep ? [['c1', options.lastStep]] : [])
  const lastStep = {
    get: (id: string) => steps.get(id),
    set: (id: string, slug: string) => void steps.set(id, slug),
    forget: () => undefined,
  }
  const session = createCharacterSession({
    repository,
    loadRules: createRulesLoader({ baseUrl: '/', fetch }),
    lastStep,
    ...(options.random && { random: options.random }),
  })
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
    expect(saved[0].decisions).toEqual({ ancestry: { mode: 'chosen', value: 'ancestry:troll', logged: 1 } })
    expect(screen.getByRole('radio', { name: 'Troll, your choice' })).toBeTruthy()
  })

  /** Escolhe o Troll com a gravação falhando e prepara a nova tentativa: a próxima gravação dá certo, mas retida. */
  async function failThenHoldRetry() {
    const result = setup({ failSave: true })
    renderBuilder()
    await userEvent.click(await screen.findByRole('radio', { name: 'Troll' }))
    await userEvent.click(screen.getByRole('button', { name: 'Choose Troll' }))
    const alert = await screen.findByRole('alert')
    result.control.failSave = false
    result.control.hold()
    return { ...result, alert, tryAgain: within(alert).getByRole('button', { name: 'Try again' }) }
  }

  it('FR-CHAR-010 (DEF-011): during the retry, "Try again" shows the decorative spinner before its label', async () => {
    const { control, saved, tryAgain } = await failThenHoldRetry()
    expect(tryAgain.querySelector('svg')).toBeNull()

    await userEvent.click(tryAgain)
    // design.md §4, loading (E7); ui-design da FEAT-007, save-failed: o botão fica em loading durante a nova tentativa.
    const spinner = tryAgain.querySelector('svg')
    expect(spinner).not.toBeNull()
    expect(spinner?.getAttribute('aria-hidden')).toBe('true')
    expect(spinner?.classList.contains('icon--sm')).toBe(true)
    expect(tryAgain.firstElementChild).toBe(spinner)
    expect(tryAgain.textContent).toBe('Try again')
    expect(saved).toEqual([])

    // Uma nova tentativa que falha deixa o alerta e o botão sem o spinner.
    control.failSave = true
    control.release()
    await vi.waitFor(() => expect(tryAgain.querySelector('svg')).toBeNull())
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(tryAgain.isConnected).toBe(true)
  })

  it('NFR-ACC-001 (DEF-012): when the retry succeeds with the focus on "Try again", the focus goes to the step h1', async () => {
    const { control, saved, tryAgain } = await failThenHoldRetry()
    await userEvent.click(tryAgain)
    expect(document.activeElement).toBe(tryAgain)

    control.release()
    await vi.waitFor(() => expect(saved).toHaveLength(1))
    await vi.waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
  })

  it('NFR-ACC-001 (DEF-012): when the person tabs out of the alert during the retry, its success leaves the focus where they put it', async () => {
    const { control, saved, alert, tryAgain } = await failThenHoldRetry()
    await userEvent.click(tryAgain)
    await userEvent.tab()
    const outside = document.activeElement
    expect(outside).not.toBe(document.body)
    expect(alert.contains(outside)).toBe(false)

    control.release()
    await vi.waitFor(() => expect(saved).toHaveLength(1))
    await vi.waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    await act(async () => {}) // a continuação da nova tentativa roda e a tela é atualizada
    expect(document.activeElement).toBe(outside)
  })

  it('NFR-ACC-001 (DEF-003): after "Choose", the focus goes to the detail title as soon as the choice is on screen, without waiting for the save', async () => {
    const { control, saved } = setup({ holdSave: true })
    renderBuilder()
    await userEvent.click(await screen.findByRole('radio', { name: 'Troll' }))
    await userEvent.click(screen.getByRole('button', { name: 'Choose Troll' }))

    // A escolha já está na tela, e a gravação continua pendente (technical-design da FEAT-007, D11).
    expect(screen.getByRole('radio', { name: 'Troll, your choice' })).toBeTruthy()
    const title = screen.getByRole('heading', { level: 2, name: 'Troll' })
    await vi.waitFor(() => expect(document.activeElement).toBe(title))
    expect(saved).toEqual([])

    control.release()
    await vi.waitFor(() => expect(saved).toHaveLength(1))
    expect(document.activeElement).toBe(title)
  })

  it('FR-FLOW-014 (DEF-005): a slow save of "Choose" does not clear the preview of another card opened meanwhile', async () => {
    const { session, control, saved } = setup({ holdSave: true })
    renderBuilder()
    await userEvent.click(await screen.findByRole('radio', { name: 'Troll' }))
    await userEvent.click(screen.getByRole('button', { name: 'Choose Troll' }))
    expect(screen.getByRole('radio', { name: 'Troll, your choice' })).toBeTruthy()

    // Com a gravação ainda pendente, a pessoa abre a prévia de outro cartão.
    await userEvent.click(screen.getByRole('radio', { name: 'Gnome' }))
    expect(screen.getByRole('button', { name: 'Choose Gnome' })).toBeTruthy()

    control.release()
    await vi.waitFor(() => expect(saved).toHaveLength(1))
    await vi.waitFor(() => expect(session.getSnapshot()).toMatchObject({ save: 'saved' }))
    await act(async () => {}) // a continuação do "Choose" roda e a tela é atualizada
    expect(screen.getByRole('button', { name: 'Choose Gnome' })).toBeTruthy()
  })

  it('FR-FLOW-014 (DEF-006): a slow save of "Choose" does not clear a new preview of the same card, opened after another choice', async () => {
    const { session, control, saved } = setup({ holdSave: true })
    renderBuilder()
    await userEvent.click(await screen.findByRole('radio', { name: 'Troll' }))
    await userEvent.click(screen.getByRole('button', { name: 'Choose Troll' }))
    expect(screen.getByRole('radio', { name: 'Troll, your choice' })).toBeTruthy()

    // Com a gravação do Troll pendente, a pessoa escolhe o Gnome e abre de novo a prévia do Troll.
    await userEvent.click(screen.getByRole('radio', { name: 'Gnome' }))
    await userEvent.click(screen.getByRole('button', { name: 'Choose Gnome' }))
    expect(screen.getByRole('radio', { name: 'Gnome, your choice' })).toBeTruthy()
    await userEvent.click(screen.getByRole('radio', { name: 'Troll' }))
    expect(screen.getByRole('button', { name: 'Choose Troll' })).toBeTruthy()

    control.release()
    await vi.waitFor(() => expect(saved).toHaveLength(2))
    await vi.waitFor(() => expect(session.getSnapshot()).toMatchObject({ save: 'saved' }))
    await act(async () => {}) // as continuações dos dois "Choose" rodam e a tela é atualizada
    expect(screen.getByRole('button', { name: 'Choose Troll' })).toBeTruthy()
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
    // Nem o contador do cabeçalho a trata como pendência (ui-design, Contadores).
    expect(screen.getByText('Nothing required')).toBeTruthy()
    expect(screen.queryByText(/^\d+ open$/)).toBeNull()
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

  const card = () => screen.getByRole('heading', { level: 2, name: 'Score adjustment' }).closest('section')!
  const groupRadio = (group: string, name: string) =>
    within(screen.getByRole('radiogroup', { name: group })).getByRole('radio', { name }) as HTMLInputElement
  async function applyMightOverWits() {
    await userEvent.click(groupRadio('Raise one attribute by 1', 'Might'))
    await userEvent.click(groupRadio('Lower another attribute by 1', 'Wits'))
    await userEvent.click(screen.getByRole('button', { name: 'Apply adjustment' }))
  }
  async function settled(session: CharacterSession, saved: unknown[], count: number) {
    await vi.waitFor(() => expect(saved).toHaveLength(count))
    await vi.waitFor(() => expect(session.getSnapshot()).toMatchObject({ save: 'saved' }))
    await act(async () => {}) // as continuações dos comandos rodam e a tela é atualizada
    await nextFrame()
  }

  it('NFR-ACC-001 (DEF-008): after Apply, the focus goes to the status line as soon as the adjustment is on screen, and a slow save does not pull it back', async () => {
    const { session, control, saved } = setup({ document: stored({ ancestry: 'ancestry:troll' }, ['test.scores']), holdSave: true })
    renderBuilder('scores')
    await screen.findByRole('heading', { name: 'Score adjustment' })
    await applyMightOverWits()

    // O ajuste já está na tela e a gravação continua pendente: o foco vai à linha de estado (ui-design, applied).
    const status = screen.getByText('Applied: Might +1, Wits −1.')
    await vi.waitFor(() => expect(document.activeElement).toBe(status))
    expect(saved).toEqual([])

    // Antes de a gravação terminar, a pessoa abre a composição de Might.
    const might = within(screen.getByRole('main')).getByRole('button', { name: 'Might 13 Modifier +3' })
    await userEvent.click(might)
    expect(document.activeElement).toBe(might)

    control.release()
    await settled(session, saved, 1)
    expect(document.activeElement).toBe(might)
  })

  it('FR-STEP-011 (DEF-008): undoing during a slow save of Apply shows the empty card, and a new choice survives that save', async () => {
    const { session, control, saved } = setup({ document: stored({ ancestry: 'ancestry:troll' }, ['test.scores']), holdSave: true })
    renderBuilder('scores')
    await screen.findByRole('heading', { name: 'Score adjustment' })
    await applyMightOverWits()
    await userEvent.click(screen.getByRole('button', { name: 'Undo adjustment' }))

    // Desfeito, o card volta ao default (ui-design, undone): nada marcado e sem prévia.
    expect(groupRadio('Raise one attribute by 1', 'Might').checked).toBe(false)
    expect(groupRadio('Lower another attribute by 1', 'Wits').checked).toBe(false)
    expect(within(card()).queryByText(/If you apply this adjustment/i)).toBeNull()

    await userEvent.click(groupRadio('Raise one attribute by 1', 'Wits'))
    control.release()
    await settled(session, saved, 2)
    expect(groupRadio('Raise one attribute by 1', 'Wits').checked).toBe(true)
  })

  it('NFR-ACC-001 (DEF-009): after Undo, the focus and the announcement come as soon as the card is back, and a slow save does not pull the focus back', async () => {
    const { session, control, saved } = setup({ document: withAdjustment(), holdSave: true })
    renderBuilder('scores')
    await screen.findByRole('heading', { name: 'Score adjustment' })
    await userEvent.click(screen.getByRole('button', { name: 'Undo adjustment' }))

    // O card já voltou ao default e a gravação continua pendente (ui-design, undone).
    const title = screen.getByRole('heading', { level: 2, name: 'Score adjustment' })
    await vi.waitFor(() => expect(document.activeElement).toBe(title))
    expect(within(card()).getByRole('status').textContent).toBe('Adjustment undone.')
    expect(saved).toEqual([])

    // Antes de a gravação terminar, a pessoa escolhe o atributo que sobe.
    const wits = groupRadio('Raise one attribute by 1', 'Wits')
    await userEvent.click(wits)
    expect(document.activeElement).toBe(wits)

    control.release()
    await settled(session, saved, 1)
    expect(document.activeElement).toBe(wits)
  })

  it('FR-STEP-011 (DEF-009): a new adjustment applied during a slow save of Undo is not announced as undone', async () => {
    const { session, control, saved } = setup({ document: withAdjustment(), holdSave: true })
    renderBuilder('scores')
    await screen.findByRole('heading', { name: 'Score adjustment' })
    await userEvent.click(screen.getByRole('button', { name: 'Undo adjustment' }))
    await applyMightOverWits()
    expect(screen.getByText('Applied: Might +1, Wits −1.')).toBeTruthy()

    control.release()
    await settled(session, saved, 2)
    expect(within(card()).getByRole('status').textContent).toBe('')
  })

  /** A gravação retida falha ao ser liberada: o alerta do save-failed aparece e as continuações rodam. */
  async function failed(session: CharacterSession, control: { release: () => void }) {
    control.release()
    expect((await screen.findByRole('alert')).textContent).toMatch(/Your last choice wasn't saved/)
    await vi.waitFor(() => expect(session.getSnapshot()).toMatchObject({ save: 'failed' }))
    await act(async () => {}) // as continuações dos comandos rodam e a tela é atualizada
    await nextFrame()
  }

  it('FR-CHAR-010, NFR-ACC-001 (FEAT-008): when the save of Apply fails, the alert shows, the adjustment stays, and the focus stays where the person put it', async () => {
    const { session, control, saved } = setup({ document: stored({ ancestry: 'ancestry:troll' }, ['test.scores']), holdSave: true, failSave: true })
    renderBuilder('scores')
    await screen.findByRole('heading', { name: 'Score adjustment' })
    await applyMightOverWits()

    // Na entrada de applied, o foco vai à linha de estado (ui-design, applied), com a gravação pendente.
    const status = screen.getByText('Applied: Might +1, Wits −1.')
    await vi.waitFor(() => expect(document.activeElement).toBe(status))
    expect(saved).toEqual([])

    // A pessoa move o foco antes de a gravação falhar.
    const might = within(screen.getByRole('main')).getByRole('button', { name: 'Might 13 Modifier +3' })
    await userEvent.click(might)
    expect(document.activeElement).toBe(might)

    // Na falha, só aparece o alerta: o ajuste continua na tela e o foco não se move (ui-design, applied e save-failed).
    await failed(session, control)
    expect(saved).toEqual([])
    expect(screen.getByText('Applied: Might +1, Wits −1.')).toBeTruthy()
    expect(groupRadio('Raise one attribute by 1', 'Might').checked).toBe(true)
    expect(groupRadio('Lower another attribute by 1', 'Wits').checked).toBe(true)
    expect(screen.getByRole('button', { name: 'Undo adjustment' })).toBeTruthy()
    expect(document.activeElement).toBe(might)
  })

  it('FR-CHAR-010, NFR-ACC-001 (FEAT-008): when the save of Undo fails, the alert shows, the card stays undone, the focus stays on the segment, and nothing is announced again', async () => {
    const { session, control, saved } = setup({ document: withAdjustment(), holdSave: true, failSave: true })
    renderBuilder('scores')
    await screen.findByRole('heading', { name: 'Score adjustment' })
    await userEvent.click(screen.getByRole('button', { name: 'Undo adjustment' }))

    // Na entrada de undone, o h2 focado e o anúncio (ui-design, undone), com a gravação pendente.
    const title = screen.getByRole('heading', { level: 2, name: 'Score adjustment' })
    await vi.waitFor(() => expect(document.activeElement).toBe(title))
    const region = within(card()).getByRole('status')
    expect(region.textContent).toBe('Adjustment undone.')
    expect(saved).toEqual([])

    // A pessoa clica num segmento de "Raise" antes de a gravação falhar.
    const wits = groupRadio('Raise one attribute by 1', 'Wits')
    await userEvent.click(wits)
    expect(document.activeElement).toBe(wits)
    const before = region.textContent

    // Na falha, só aparece o alerta: o card continua sem o ajuste, o foco fica no segmento e a região não muda.
    await failed(session, control)
    expect(saved).toEqual([])
    expect(screen.queryByText(/^Applied:/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Undo adjustment' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Apply adjustment' })).toBeTruthy()
    expect(groupRadio('Raise one attribute by 1', 'Might').checked).toBe(false)
    expect(groupRadio('Raise one attribute by 1', 'Wits').checked).toBe(true)
    expect(document.activeElement).toBe(wits)
    expect(region.textContent).toBe(before)
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

// O construtor pela rota do hash, como no `App`: a navegação dentro do app passa por `hashchange`.
function Routed() {
  const route = useRoute()
  return route.name === 'builder' ? <Builder route={route} /> : null
}
async function goTo(hash: string) {
  if (window.location.hash === hash) return
  const changed = new Promise((resolve) => window.addEventListener('hashchange', resolve, { once: true }))
  window.location.hash = hash
  await changed
}
const nextFrame = () => act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))
const stepTitle = (name: string) => screen.findByRole('heading', { level: 1, name })

describe('Builder: last step, name and focus', () => {
  afterEach(cleanup)

  it('FR-CHAR-007: opening without a step, with a last step saved, goes to that step', async () => {
    setup({ document: stored({ ancestry: 'ancestry:troll' }), lastStep: 'traits' })
    await goTo('#/')
    await goTo('#/characters/c1')
    render(<Routed />)
    await stepTitle('Traits')
    expect(window.location.hash).toBe('#/characters/c1/traits')
  })

  it('FR-CHAR-007: each step shown is recorded with visit', async () => {
    const { session } = setup({ document: stored({ ancestry: 'ancestry:troll' }) })
    const visit = vi.spyOn(session, 'visit')
    await goTo('#/characters/c1/ancestry')
    render(<Routed />)
    await stepTitle("What is your character's ancestry?")
    await userEvent.click(screen.getByRole('button', { name: 'Next: Traits' }))
    await stepTitle('Traits')
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    await stepTitle("What is your character's ancestry?")
    expect(visit.mock.calls.map(([slug]) => slug)).toEqual(['ancestry', 'traits', 'ancestry'])
  })

  it('FR-CHAR-011: a name of only spaces shows "Unnamed character" in the header', async () => {
    setup({ document: { ...stored(), text: { name: '   ' } } })
    renderBuilder()
    await stepTitle("What is your character's ancestry?")
    const banner = screen.getByRole('banner')
    expect(within(banner).getAllByText(/^Unnamed character/).length).toBeGreaterThan(0)
    expect(banner.textContent).not.toMatch(/ {3}/)
  })

  it('FR-CHAR-011: a defined name shows in the header', async () => {
    setup({ document: { ...stored(), text: { name: 'Liliana' } } })
    renderBuilder()
    await stepTitle("What is your character's ancestry?")
    const banner = screen.getByRole('banner')
    expect(within(banner).getAllByText(/^Liliana/).length).toBeGreaterThan(0)
    expect(within(banner).queryByText(/Unnamed character/)).toBeNull()
  })

  it('FR-FLOW-007: after Next, the focus is on the h1 of the new step', async () => {
    setup({ document: stored({ ancestry: 'ancestry:troll' }) })
    await goTo('#/characters/c1/ancestry')
    render(<Routed />)
    await stepTitle("What is your character's ancestry?")
    await userEvent.click(screen.getByRole('button', { name: 'Next: Traits' }))
    const title = await stepTitle('Traits')
    await nextFrame()
    expect(document.activeElement).toBe(title)
    expect(title.getAttribute('tabindex')).toBe('-1')
  })

  it('FR-CHAR-007: arriving through "Continue" (a route without a step) goes to the resolved step with the focus on its h1', async () => {
    setup({ document: stored({ ancestry: 'ancestry:troll' }), lastStep: 'traits' })
    await goTo('#/')
    await goTo('#/characters/c1')
    render(<Routed />)
    const title = await stepTitle('Traits')
    await nextFrame()
    expect(window.location.hash).toBe('#/characters/c1/traits')
    expect(document.activeElement).toBe(title)
  })

  it('FR-FLOW-011: with ?slot=, the focus stays on the slot, not on the h1', async () => {
    setup({ document: stored({ ancestry: 'ancestry:gnome' }) })
    await goTo('#/')
    await goTo('#/characters/c1/ancestry?slot=ancestry%3Dgnome%2Fstature')
    render(<Routed />)
    await stepTitle("What is your character's ancestry?")
    await nextFrame()
    const slot = document.getElementById(slotElementId('ancestry=gnome/stature'))
    expect(slot).not.toBeNull()
    expect(document.activeElement).toBe(slot)
  })
})

// FEAT-009 (SCR-WEB-009): pacote fictício com tabelas. O Gnome concede a Stature na Ancestry e cinco tabelas na Story.
// Age: 3d6 com uma entrada de página própria; Fate: 3d6 de regime `roll`; Omen: 3d6+1 de regime `roll`; Past: d6 com
// um efeito fixo na 5-6 e um efeito de dado na 4; Foe: d20 de regime `choice`, com entidades. O Troll não concede nada.
files['/packs/test.tables.json'] = {
  format: 1,
  id: 'test.tables',
  name: 'Test Tables',
  abbr: 'TT',
  layer: 'core',
  published: '2001',
  components: [
    {
      id: 'base',
      type: 'adds',
      default: 'on',
      items: [
        { id: 'procedure:test', steps: ['step:ancestry', 'step:story'] },
        { id: 'step:ancestry', name: 'Ancestry', page: 1, regime: 'choice', slots: { ancestry: { kind: 'choose-entity', of: 'ancestry' } } },
        { id: 'step:story', name: 'Story', page: 11, regime: 'roll-or-choose', requires: ['step:ancestry'] },
        { id: 'attribute:might', name: 'Might', page: 3, modifier: { add: [{ ref: 'self' }, -10] } },
        { id: 'characteristic:stature', name: 'Stature', page: 3 },
        { id: 'characteristic:madness', name: 'Madness', page: 3, formula: 0 },
        { id: 'creature-type:wolf', name: 'Wolves', page: 7 },
        { id: 'creature-type:bear', name: 'Bears', page: 7 },
        { id: 'table:gnome-age', name: 'Gnome Age', page: 7, dice: { count: 3, sides: 6 }, regime: 'roll-or-choose', entries: { '3-7': {}, '8-12': { page: 8 }, '13-18': {} } },
        { id: 'table:gnome-fate', name: 'Gnome Fate', page: 7, dice: { count: 3, sides: 6 }, regime: 'roll', entries: { '3-10': {}, '11-18': {} } },
        { id: 'table:gnome-omen', name: 'Gnome Omen', page: 7, dice: { count: 3, sides: 6, modifier: 1 }, regime: 'roll', entries: { '4-11': {}, '12-19': {} } },
        {
          id: 'table:gnome-past',
          name: 'Gnome Past',
          page: 7,
          dice: { count: 1, sides: 6 },
          regime: 'roll-or-choose',
          entries: {
            '1-3': {},
            '4': { effects: { madness: { target: 'characteristic:madness', add: { dice: { count: 1, sides: 6 } } } } },
            '5-6': { effects: { madness: { target: 'characteristic:madness', add: 1 } } },
          },
        },
        {
          id: 'table:gnome-foe',
          name: 'Gnome Foe',
          page: 7,
          dice: { count: 1, sides: 20 },
          regime: 'choice',
          entries: { '1-10': { entity: 'creature-type:wolf' }, '11-20': { entity: 'creature-type:bear' } },
        },
        {
          id: 'ancestry:gnome',
          name: 'Gnome',
          page: 5,
          attributes: { 'attribute:might': 8 },
          characteristics: { 'characteristic:stature': { ref: 'grant:stature' } },
          grants: {
            stature: { kind: 'choose-value', step: 'step:ancestry', target: 'characteristic:stature', options: [0.5, 1] },
            age: { kind: 'table', step: 'step:story', table: 'table:gnome-age' },
            fate: { kind: 'table', step: 'step:story', table: 'table:gnome-fate' },
            omen: { kind: 'table', step: 'step:story', table: 'table:gnome-omen' },
            past: { kind: 'table', step: 'step:story', table: 'table:gnome-past' },
            foe: { kind: 'table', step: 'step:story', table: 'table:gnome-foe' },
          },
        },
        { id: 'ancestry:troll', name: 'Troll', page: 6, attributes: { 'attribute:might': 12 } },
      ],
    },
  ],
}
const AGE = 'ancestry=gnome/age'
const MADNESS = 'ancestry=gnome/past=4/madness'
const TABLES = 'test.tables'
const CARDS = ['Gnome Age', 'Gnome Fate', 'Gnome Omen', 'Gnome Past', 'Gnome Foe']

/** O Gnome escolhido, com as decisões dadas (no formato gravado). */
function gnome(decisions: Record<string, unknown> = {}) {
  const document = stored({ ancestry: 'ancestry:gnome' }, [TABLES])
  return { ...document, decisions: { ...document.decisions, ...decisions } }
}
const chosenEntry = (value: string) => ({ mode: 'chosen', value, book: TABLES })

/** Sorteio fixo (ADR-009): devolve os valores na ordem; face de um dN = valor % N + 1. Falha se pedirem mais. */
const sequence = (values: number[]) =>
  vi.fn(() => {
    if (!values.length) throw new Error('the random source was called')
    return values.shift()!
  })

const card = (name: string) => screen.getByRole('region', { name })
const modes = (name: string) => within(card(name)).getByRole('radiogroup', { name })
const grid = (name: string) => within(card(name)).getByRole('radiogroup', { name: `${name} Choose a result.` })
const entryRadio = (name: string, entry: string) => within(grid(name)).getByRole('radio', { name: entry }) as HTMLInputElement
const resultColumn = (key: string) => document.getElementById(`${slotElementId(key)}-result`)
/** Os nomes visíveis das entradas da grade, na ordem do DOM. */
const entryNames = (name: string) => within(grid(name)).getAllByRole('radio').map((radio) => radio.closest('label')!.textContent)
/** Os textos ligados a um campo por `aria-describedby`. */
const describedBy = (element: Element) =>
  (element.getAttribute('aria-describedby') ?? '').split(' ').map((id) => document.getElementById(id)?.textContent)

async function storySettled(session: CharacterSession, saved: unknown[], count: number) {
  await vi.waitFor(() => expect(saved).toHaveLength(count))
  await vi.waitFor(() => expect(session.getSnapshot()).toMatchObject({ save: 'saved' }))
  await act(async () => {}) // as continuações dos comandos rodam e a tela é atualizada
  await nextFrame()
}

describe('Story step (tables)', () => {
  afterEach(cleanup)

  it('FR-STEP-012, FR-DEC-001, FR-DEC-002, FR-DEC-004: one card per table, each with Roll and Choose and its regime; Enter result only on roll-regime tables (AC-1, AC-2)', async () => {
    setup({ document: gnome() })
    renderBuilder('story')
    await stepTitle("What is your character's story?")
    const main = screen.getByRole('main')
    expect(within(main).getByText('Step 2 of 2 · Roll or choose')).toBeTruthy()
    expect(main.querySelector('.step-header__rule')!.textContent).toBe(
      "Roll on each of your ancestry's tables, or choose the result you want. Some results change your scores: you'll see them under the result. TT p.11",
    )
    expect(within(main).getByText('0 of 5 decided')).toBeTruthy()
    expect(within(main).getByText('5 open')).toBeTruthy()
    expect(within(main).queryByText(/^Chosen /)).toBeNull()

    // Um cartão por tabela, na ordem das vagas, com o nome no h2, o dado ao lado e o selo da tabela.
    expect(within(main).getAllByRole('region').map((region) => within(region).getByRole('heading', { level: 2 }).textContent)).toEqual(CARDS)
    expect(card('Gnome Age').querySelector('.roll-card__dice')!.textContent).toBe('3d6')
    expect(card('Gnome Omen').querySelector('.roll-card__dice')!.textContent).toBe('3d6+1')
    expect(card('Gnome Foe').querySelector('.roll-card__dice')!.textContent).toBe('d20')

    const regime = (name: string) => card(name).querySelector('.roll-card__regime')!.textContent
    expect(regime('Gnome Age')).toBe('The book says to roll or choose. TT p.7')
    expect(regime('Gnome Fate')).toBe('The book says to roll. TT p.7')
    expect(regime('Gnome Foe')).toBe('The book says to choose. TT p.7')

    for (const name of CARDS) {
      const segments = within(modes(name)).getAllByRole('radio') as HTMLInputElement[]
      expect(segments.map((segment) => segment.closest('label')!.textContent)).toEqual(['Roll', 'Choose'])
      // O regime `choice` abre em Choose; os demais, em Roll. Em Roll, Enter result só nas tabelas de regime `roll`.
      expect(within(modes(name)).getByRole('radio', { name: name === 'Gnome Foe' ? 'Choose' : 'Roll' })).toHaveProperty('checked', true)
      await userEvent.click(within(modes(name)).getByRole('radio', { name: 'Roll' }))
      const dice = card(name).querySelector('.roll-card__dice')!.textContent
      expect(within(card(name)).getByRole('button', { name: `Roll ${dice}` })).toBeTruthy()
      const enter = within(card(name)).queryByRole('button', { name: 'Enter result' })
      expect(enter !== null, `${name}: Enter result`).toBe(name === 'Gnome Fate' || name === 'Gnome Omen')
      expect(within(card(name)).getByText('Not decided yet. Nothing else waits for it.')).toBeTruthy()
    }
  })

  it('FR-DEC-007, FR-DEC-008: Roll shows the faces, the modifier, the total, the range, the page, no effects and the no-text line, read-only with its reason (AC-4, AC-5)', async () => {
    const { session, saved } = setup({ document: gnome(), random: sequence([2, 4, 1]) })
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Age' })
    await userEvent.click(within(card('Gnome Age')).getByRole('button', { name: 'Roll 3d6' }))

    const column = resultColumn(AGE)!
    expect(within(column).getByText('Rolled 3d6: 3 + 5 + 2 · Modifier +0 · Total 10')).toBeTruthy()
    expect(column.querySelector('.roll-result__entry')!.textContent).toBe('8–12')
    expect(within(column).getByText(/^No text added for this entry/).textContent).toBe('No text added for this entry · TT p.8')
    expect(within(column).queryByRole('list')).toBeNull()
    // Caixa de valor: o total e "rolled", fora da árvore de acessibilidade (o total já está no cálculo).
    const box = card('Gnome Age').querySelector('.roll-value')!
    expect(box.getAttribute('aria-hidden')).toBe('true')
    expect(box.textContent).toBe('10rolled')
    expect(box.querySelector('.typography-stat-lg')!.textContent).toBe('10')

    // decided-locked: segmento da decisão marcado, só leitura, com o motivo; Roll e Enter result saem.
    expect(within(modes('Gnome Age')).getByRole('radio', { name: 'Roll' })).toHaveProperty('checked', true)
    expect(modes('Gnome Age').getAttribute('aria-readonly')).toBe('true')
    expect(describedBy(modes('Gnome Age'))).toEqual(["Rerolling or changing this result isn't available yet."])
    expect(within(card('Gnome Age')).queryByRole('button', { name: /^Roll/ })).toBeNull()

    await vi.waitFor(() => expect(document.activeElement).toBe(column))
    await storySettled(session, saved, 1)
    expect(saved[0].decisions[AGE]).toEqual({ mode: 'rolled', dice: [3, 5, 2], modifier: 0, total: 10, entry: '8-12', rolls: 1, book: TABLES, logged: 1 })
    expect(within(screen.getByRole('main')).getByText('1 of 5 decided')).toBeTruthy()
  })

  it('FR-DEC-012, FR-STEP-013, FR-DEC-024: Choose lists every entry by range (with the creature names), decides on click and replaces Choose with Choose (AC-1, AC-6)', async () => {
    const { session, saved } = setup({ document: gnome() })
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Foe' })
    // A tabela de entidades mostra faixa e nome; as demais, faixa e página, na ordem do início da faixa.
    expect(entryNames('Gnome Foe')).toEqual(['1–10 Wolves', '11–20 Bears'])
    await userEvent.click(within(modes('Gnome Age')).getByRole('radio', { name: 'Choose' }))
    expect(entryNames('Gnome Age')).toEqual(['3–7 TT p.7', '8–12 TT p.8', '13–18 TT p.7'])
    expect(within(card('Gnome Age')).getByText('Choose a result.')).toBeTruthy()

    const middle = entryRadio('Gnome Age', '8–12 TT p.8')
    await userEvent.click(middle)
    expect(middle.checked).toBe(true)
    expect(middle.closest('label')!.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
    // Sem prévia e sem foco programático: o foco fica no radio acionado.
    expect(document.activeElement).toBe(middle)
    const column = resultColumn(AGE)!
    expect(within(column).queryByText(/^Rolled/)).toBeNull()
    expect(column.querySelector('.roll-result__entry')!.textContent).toBe('8–12')
    expect(within(column).getByText(/^No text added for this entry/).textContent).toBe('No text added for this entry · TT p.8')
    expect(card('Gnome Age').querySelector('.roll-value')).toBeNull()
    expect(within(modes('Gnome Age')).getByRole('radio', { name: 'Choose' })).toHaveProperty('checked', true)
    expect(modes('Gnome Age').getAttribute('aria-readonly')).toBe('true')
    expect(describedBy(modes('Gnome Age'))).toEqual(["You can choose another result. Rolling instead isn't available yet."])
    await storySettled(session, saved, 1)
    expect(saved[0].decisions[AGE]).toEqual({ ...chosenEntry('8-12'), logged: 1 })
    expect(document.activeElement).toBe(middle)

    // Choose → Choose substitui (D5).
    await userEvent.click(entryRadio('Gnome Age', '13–18 TT p.7'))
    expect(entryRadio('Gnome Age', '13–18 TT p.7').checked).toBe(true)
    expect(entryRadio('Gnome Age', '8–12 TT p.8').checked).toBe(false)
    await storySettled(session, saved, 2)
    expect(saved[1].decisions[AGE]).toEqual({ ...chosenEntry('13-18'), logged: 2 })
    expect(document.activeElement).toBe(entryRadio('Gnome Age', '13–18 TT p.7'))
  })

  it('FR-DEC-019, FR-DEC-020: Enter result has one field with the valid range; out of range shows it and saves nothing; entered shows the sum, the modifier and the total (AC-7)', async () => {
    const { session, saved, repository } = setup({ document: gnome() })
    const enter = vi.spyOn(session, 'enter')
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Fate' })
    await userEvent.click(within(card('Gnome Fate')).getByRole('button', { name: 'Enter result' }))

    // Um campo por expressão de dado, focado ao abrir, com a faixa [count, count × sides] na ajuda (E9).
    const field = within(card('Gnome Fate')).getByLabelText('Your 3d6 roll') as HTMLInputElement
    await vi.waitFor(() => expect(document.activeElement).toBe(field))
    expect(field.getAttribute('inputmode')).toBe('numeric')
    expect(describedBy(field)).toEqual(['Add up what the dice show, without any modifier. From 3 to 18.'])
    expect(within(card('Gnome Fate')).queryByRole('button', { name: 'Roll 3d6' })).toBeNull()

    // Vazio: erro local, sem comando.
    await userEvent.click(within(card('Gnome Fate')).getByRole('button', { name: 'Use this result' }))
    expect(enter).not.toHaveBeenCalled()
    expect(describedBy(field)).toContain('Enter a value from 3 to 18.')

    // A mensagem some na próxima edição; fora da faixa, a recusa mostra a faixa válida, o campo fica com o valor e o
    // foco, e nada é gravado.
    await userEvent.type(field, '19')
    expect(describedBy(field)).not.toContain('Enter a value from 3 to 18.')
    await userEvent.keyboard('{Enter}')
    expect(enter).toHaveBeenCalledWith('ancestry=gnome/fate', 19)
    await vi.waitFor(() => expect(describedBy(field)).toContain('Enter a value from 3 to 18.'))
    expect(field.getAttribute('aria-invalid')).toBe('true')
    expect(field.value).toBe('19')
    expect(document.activeElement).toBe(field)
    expect(repository.save).not.toHaveBeenCalled()

    await userEvent.clear(field)
    await userEvent.type(field, '11')
    expect(field.getAttribute('aria-invalid')).toBeNull()
    await userEvent.click(within(card('Gnome Fate')).getByRole('button', { name: 'Use this result' }))
    const column = resultColumn('ancestry=gnome/fate')!
    expect(within(column).getByText('Entered for 3d6: 11 · Modifier +0 · Total 11')).toBeTruthy()
    expect(column.querySelector('.roll-result__entry')!.textContent).toBe('11–18')
    expect(card('Gnome Fate').querySelector('.roll-value')!.textContent).toBe('11entered')
    await vi.waitFor(() => expect(document.activeElement).toBe(column))
    await storySettled(session, saved, 1)
    expect(saved[0].decisions['ancestry=gnome/fate']).toEqual({ mode: 'entered', sum: 11, modifier: 0, total: 11, entry: '11-18', book: TABLES, logged: 1 })

    // Com modificador (3d6+1): a faixa continua [3, 18], e o total soma o modificador (D4).
    await userEvent.click(within(card('Gnome Omen')).getByRole('button', { name: 'Enter result' }))
    const omen = within(card('Gnome Omen')).getByLabelText('Your 3d6+1 roll')
    expect(describedBy(omen)).toEqual(['Add up what the dice show, without any modifier. From 3 to 18.'])
    await userEvent.type(omen, '11{Enter}')
    const omenColumn = resultColumn('ancestry=gnome/omen')!
    expect(within(omenColumn).getByText('Entered for 3d6+1: 11 · Modifier +1 · Total 12')).toBeTruthy()
    expect(omenColumn.querySelector('.roll-result__entry')!.textContent).toBe('12–19')
  })

  it('FR-DEC-019: "Cancel" closes Enter result without saving and puts the focus back on "Enter result"', async () => {
    const { session, repository } = setup({ document: gnome() })
    const enter = vi.spyOn(session, 'enter')
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Fate' })
    await userEvent.click(within(card('Gnome Fate')).getByRole('button', { name: 'Enter result' }))
    await userEvent.type(within(card('Gnome Fate')).getByLabelText('Your 3d6 roll'), '12')
    await userEvent.click(within(card('Gnome Fate')).getByRole('button', { name: 'Cancel' }))

    expect(within(card('Gnome Fate')).queryByLabelText('Your 3d6 roll')).toBeNull()
    expect(within(card('Gnome Fate')).getByRole('button', { name: 'Roll 3d6' })).toBeTruthy()
    expect(document.activeElement).toBe(within(card('Gnome Fate')).getByRole('button', { name: 'Enter result' }))
    expect(enter).not.toHaveBeenCalled()
    expect(repository.save).not.toHaveBeenCalled()
  })

  it('FR-STEP-014, FR-DEC-011: an entry with a dice effect opens its roll-effect in the same card, with Roll and Enter result; Choose → Choose with it decided is refused with the reason (AC-8)', async () => {
    const { session, saved } = setup({ document: gnome(), random: sequence([3]) })
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Past' })
    await userEvent.click(within(modes('Gnome Past')).getByRole('radio', { name: 'Choose' }))

    // Efeito fixo: só o chip.
    await userEvent.click(entryRadio('Gnome Past', '5–6 TT p.7'))
    expect(within(resultColumn('ancestry=gnome/past')!).getByRole('listitem').textContent).toBe('Madness +1')
    expect(document.getElementById(slotElementId(MADNESS))).toBeNull()

    // Efeito com dado: a vaga roll-effect no cartão, aberta, com Roll e Enter result.
    await userEvent.click(entryRadio('Gnome Past', '4 TT p.7'))
    const effect = document.getElementById(slotElementId(MADNESS))!
    expect(card('Gnome Past').contains(effect)).toBe(true)
    expect(within(resultColumn('ancestry=gnome/past')!).getAllByRole('listitem')[0].textContent).toBe('Madness +1d6')
    expect(within(effect).getByText('Madness 1d6')).toBeTruthy()
    expect(within(effect).getByText('Or decide later: it stays in Open decisions.')).toBeTruthy()
    // A roll-effect aberta conta como decisão aberta da etapa (FR-DEC-011): as outras 4 tabelas e ela.
    expect(within(screen.getByRole('main')).getByText('1 of 6 decided')).toBeTruthy()
    expect(within(screen.getByRole('main')).getByText('5 open')).toBeTruthy()
    await userEvent.click(within(effect).getByRole('button', { name: 'Enter result' }))
    expect(describedBy(within(effect).getByLabelText('Your 1d6 roll'))).toEqual([
      'Add up what the dice show, without any modifier. From 1 to 6.',
    ])
    await userEvent.click(within(effect).getByRole('button', { name: 'Cancel' }))

    await userEvent.click(within(effect).getByRole('button', { name: 'Roll 1d6' }))
    const effectColumn = resultColumn(MADNESS)!
    expect(within(effectColumn).getByText('Rolled 1d6: 4 · Modifier +0 · Total 4')).toBeTruthy()
    expect(within(effectColumn).getByRole('listitem').textContent).toBe('Madness +4')
    expect(within(effectColumn).getByText("Rerolling or changing this result isn't available yet.")).toBeTruthy()
    expect(effect.querySelector('.roll-value')!.textContent).toBe('4rolled')
    expect(effect.classList.contains('subdecision--decided')).toBe(true)
    await vi.waitFor(() => expect(document.activeElement).toBe(effectColumn))
    await storySettled(session, saved, 3)
    expect(saved[2].decisions[MADNESS]).toEqual({ mode: 'rolled', dice: [4], modifier: 0, total: 4, logged: 4 })

    // dependents-blocked: a grade continua na entrada atual, o foco fica no radio acionado e nada é gravado.
    const other = entryRadio('Gnome Past', '1–3 TT p.7')
    await userEvent.click(other)
    const status = await within(card('Gnome Past')).findByRole('status')
    expect(status.textContent).toBe(
      "You can't change Gnome Past to 1–3 yet: your Madness 1d6 result depends on the current result, 4. Changing a choice that others depend on isn't available yet.",
    )
    expect(entryRadio('Gnome Past', '4 TT p.7').checked).toBe(true)
    expect(other.checked).toBe(false)
    expect(document.activeElement).toBe(other)
    expect(saved).toHaveLength(3)

    // O aviso sai na próxima ação da pessoa neste cartão: aqui, outra entrada, recusada de novo, com o aviso dela.
    await userEvent.click(entryRadio('Gnome Past', '5–6 TT p.7'))
    await vi.waitFor(() => expect(within(card('Gnome Past')).getByRole('status').textContent).toMatch(/^You can't change Gnome Past to 5–6 yet:/))
    expect(within(card('Gnome Past')).getAllByRole('status')).toHaveLength(1)
  })

  it('AC-14 (FR-DEC-005): Roll shows the result before the save ends, and focus taken to another card during the save stays there', async () => {
    const { session, control, saved } = setup({ document: gnome(), random: sequence([2, 4, 1]), holdSave: true })
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Age' })
    await userEvent.click(within(card('Gnome Age')).getByRole('button', { name: 'Roll 3d6' }))

    const column = resultColumn(AGE)!
    expect(within(column).getByText('Rolled 3d6: 3 + 5 + 2 · Modifier +0 · Total 10')).toBeTruthy()
    await vi.waitFor(() => expect(document.activeElement).toBe(column))
    expect(saved).toEqual([])

    const segment = within(modes('Gnome Fate')).getByRole('radio', { name: 'Choose' })
    await userEvent.click(segment)
    expect(document.activeElement).toBe(segment)

    control.release()
    await storySettled(session, saved, 1)
    expect(document.activeElement).toBe(segment)
    expect(entryNames('Gnome Fate')).toEqual(['3–10 TT p.7', '11–18 TT p.7'])
  })

  it('AC-14 (FR-DEC-024, FR-DEC-019): Choose and Enter result show the result before the save ends, without pulling the focus back when it ends', async () => {
    const { session, control, saved } = setup({ document: gnome(), holdSave: true })
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Foe' })

    const wolves = entryRadio('Gnome Foe', '1–10 Wolves')
    await userEvent.click(wolves)
    expect(wolves.checked).toBe(true)
    expect(resultColumn('ancestry=gnome/foe')!.querySelector('.roll-result__entry')!.textContent).toBe('1–10 Wolves')
    expect(saved).toEqual([])

    await userEvent.click(within(card('Gnome Fate')).getByRole('button', { name: 'Enter result' }))
    await userEvent.type(within(card('Gnome Fate')).getByLabelText('Your 3d6 roll'), '7{Enter}')
    const column = resultColumn('ancestry=gnome/fate')!
    expect(within(column).getByText('Entered for 3d6: 7 · Modifier +0 · Total 7')).toBeTruthy()
    await vi.waitFor(() => expect(document.activeElement).toBe(column))
    expect(saved).toEqual([])

    // Durante a gravação, a pessoa leva o foco ao cartão da Age.
    const roll = within(card('Gnome Age')).getByRole('button', { name: 'Roll 3d6' })
    act(() => roll.focus())
    control.release()
    await storySettled(session, saved, 2)
    expect(document.activeElement).toBe(roll)
  })

  it('AC-14: a refused Enter result does not move the focus nor clear the field, also while the save of another card is pending', async () => {
    const { session, control, saved } = setup({ document: gnome(), random: sequence([2, 4, 1]), holdSave: true })
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Age' })
    await userEvent.click(within(card('Gnome Age')).getByRole('button', { name: 'Roll 3d6' }))
    await vi.waitFor(() => expect(document.activeElement).toBe(resultColumn(AGE)))

    await userEvent.click(within(card('Gnome Fate')).getByRole('button', { name: 'Enter result' }))
    const field = within(card('Gnome Fate')).getByLabelText('Your 3d6 roll') as HTMLInputElement
    await vi.waitFor(() => expect(document.activeElement).toBe(field))
    await userEvent.type(field, '2{Enter}')
    await vi.waitFor(() => expect(field.getAttribute('aria-invalid')).toBe('true'))
    control.release()
    await storySettled(session, saved, 1)
    expect(document.activeElement).toBe(field)
    expect(field.value).toBe('2')
    expect(saved[0].decisions['ancestry=gnome/fate']).toBeUndefined()
  })

  it('AC-14 (FR-CHAR-010): when the save of a Roll fails, the result stays and the frame alert shows', async () => {
    const { session, control, saved } = setup({ document: gnome(), random: sequence([2, 4, 1]), holdSave: true, failSave: true })
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Age' })
    await userEvent.click(within(card('Gnome Age')).getByRole('button', { name: 'Roll 3d6' }))
    await vi.waitFor(() => expect(document.activeElement).toBe(resultColumn(AGE)))

    control.release()
    expect((await screen.findByRole('alert')).textContent).toMatch(/Your last choice wasn't saved/)
    await vi.waitFor(() => expect(session.getSnapshot()).toMatchObject({ save: 'failed' }))
    await act(async () => {})
    await nextFrame()
    expect(saved).toEqual([])
    expect(within(resultColumn(AGE)!).getByText('Rolled 3d6: 3 + 5 + 2 · Modifier +0 · Total 10')).toBeTruthy()
    expect(document.activeElement).toBe(resultColumn(AGE))
  })

  it('FR-FLOW-011: the ?slot= shortcut of a table focuses its card (AC-12)', async () => {
    setup({ document: gnome() })
    await goTo('#/')
    await goTo(`#/characters/c1/story?slot=${encodeURIComponent('ancestry=gnome/omen')}`)
    render(<Routed />)
    await stepTitle("What is your character's story?")
    await nextFrame()
    expect(card('Gnome Omen').id).toBe(slotElementId('ancestry=gnome/omen'))
    expect(document.activeElement).toBe(card('Gnome Omen'))
  })

  it('FR-STEP-012: a step without tables stays in the fallback', async () => {
    setup({ document: stored({ ancestry: 'ancestry:troll' }, [TABLES]) })
    renderBuilder('story')
    await stepTitle('Story')
    expect(screen.getByText("There's nothing to decide in this step yet.")).toBeTruthy()
    expect(within(screen.getByRole('main')).queryByRole('region')).toBeNull()
  })

  it('FR-STEP-012: "Decide now" groups the tables of a step in one line, with the shortcut to the first one not decided', async () => {
    setup({ document: gnome({ [AGE]: chosenEntry('3-7') }) })
    renderBuilder('ancestry')
    const row = (await screen.findByText('5 tables in Story')).closest('div')!
    expect(within(row).getByText('Gnome Age, Gnome Fate, Gnome Omen, Gnome Past, Gnome Foe')).toBeTruthy()
    expect(row.lastElementChild!.textContent).toBe('1 of 5 decided. Go to Story')
    expect(within(row).getByRole('link', { name: 'Go to Story' }).getAttribute('href')).toBe(
      `#/characters/c1/story?slot=${encodeURIComponent('ancestry=gnome/fate')}`,
    )
    // A Stature continua uma linha própria, nesta etapa.
    expect(screen.getByRole('radiogroup', { name: 'Stature' })).toBeTruthy()
  })

  it('FR-FLOW-003 (AC-11): has-dependents with a table result names it as a result, after the choices', async () => {
    const { repository } = setup({ document: gnome({ 'ancestry=gnome/stature': { mode: 'chosen', value: 1 }, [AGE]: chosenEntry('3-7') }) })
    renderBuilder('ancestry')
    await userEvent.click(await screen.findByRole('radio', { name: 'Troll' }))
    await userEvent.click(screen.getByRole('button', { name: 'Choose Troll' }))
    expect((await screen.findByRole('status')).textContent).toBe(
      "You can't switch to Troll yet: your Stature choice and your Gnome Age result for Gnome depend on your current ancestry. Changing a choice that others depend on isn't available yet.",
    )
    expect(repository.save).not.toHaveBeenCalled()
  })
})
