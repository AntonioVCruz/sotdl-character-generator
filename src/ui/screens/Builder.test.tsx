// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCharacterSession, createRulesLoader, type CharacterSession, type Repository } from '../../app'
import { impact } from '../../engine'
import { slotElementId } from '../builder/copy'
import { ImpactDialog } from '../builder/ImpactDialog'
import { useRoute } from '../router'
import Builder from './Builder'

// O jsdom não tem `CSS.escape`, que o React Aria usa ao abrir o `Modal` do diálogo de impacto (como no Home.test.tsx).
const css = ((globalThis as { CSS?: Partial<typeof CSS> }).CSS ??= {})
css.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`)

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
/** Os textos dos itens de uma lista, na ordem. */
const items = (list: HTMLElement) => within(list).getAllByRole('listitem').map((item) => item.textContent)

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

  it('FR-STEP-005, FR-CHG-001, FR-CHG-009: a switch with a decided dependent opens the impact dialog with it set aside; Keep current keeps the character, with the preview open (switch-kept)', async () => {
    const { session, repository } = setup({ document: stored({ ancestry: 'ancestry:gnome', 'ancestry=gnome/stature': 1 }) })
    renderBuilder()
    await userEvent.click(await screen.findByRole('radio', { name: 'Troll' }))
    await userEvent.click(screen.getByRole('button', { name: 'Choose Troll' }))

    // No lugar do aviso, o diálogo de impacto, com a Stature em "set aside".
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { level: 2 }).textContent).toBe('Switch from Gnome to Troll?')
    expect(items(within(dialog).getByRole('list', { name: 'Will be set aside' }))).toEqual(['Stature: 1'])
    expect(screen.queryByRole('status')).toBeNull()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep current ancestry' }))
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // switch-kept: a prévia continua aberta, com o Troll marcado em prévia; o Gnome continua a escolha, sem estar marcado.
    expect((screen.getByRole('radio', { name: 'Troll' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('radio', { name: 'Gnome, your choice' }) as HTMLInputElement).checked).toBe(false)
    // "Choose Troll" continua na tela e recebe o foco de volta.
    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Choose Troll' })))
    // A Stature continua decidida, e nada foi gravado.
    const ready = session.getSnapshot() as Extract<ReturnType<typeof session.getSnapshot>, { status: 'ready' }>
    expect(ready.view.slots.find((slot) => slot.key === 'ancestry=gnome/stature')).toMatchObject({ decided: true, value: 1 })
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

  it('FR-STEP-012, FR-DEC-001, FR-DEC-002, FR-DEC-003, FR-DEC-004: one card per table, each with Roll and Choose and its regime, Write on the roll-or-choose ones; Enter result only on roll-regime tables (AC-1, AC-2)', async () => {
    setup({ document: gnome() })
    renderBuilder('story')
    await stepTitle("What is your character's story?")
    const main = screen.getByRole('main')
    expect(within(main).getByText('Step 2 of 2 · Roll, choose or write your own')).toBeTruthy()
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
      expect(segments.map((segment) => segment.closest('label')!.textContent)).toEqual(
        name === 'Gnome Age' || name === 'Gnome Past' ? ['Roll', 'Choose', 'Write'] : ['Roll', 'Choose'],
      )
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

  it('FR-DEC-007, FR-DEC-008: Roll shows the faces, the modifier, the total, the range, the page, no effects and the no-text line, with free segments and Reroll (AC-4, AC-5)', async () => {
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

    // decided-roll (ui-design da FEAT-011): segmento da decisão marcado, segmentos livres e sem motivo; no fim da coluna,
    // "Reroll 3d6" secundário no lugar do Roll; sem "Enter result", porque a Age não tem `enter` em `table.modes`.
    expect(within(modes('Gnome Age')).getByRole('radio', { name: 'Roll' })).toHaveProperty('checked', true)
    expect(modes('Gnome Age').getAttribute('aria-readonly')).toBeNull()
    expect(modes('Gnome Age').getAttribute('aria-describedby')).toBeNull()
    expect(within(column).getByRole('button', { name: 'Reroll 3d6' }).className).toContain('button-secondary')
    expect(within(card('Gnome Age')).queryByRole('button', { name: 'Roll 3d6' })).toBeNull()
    expect(within(card('Gnome Age')).queryByRole('button', { name: 'Enter result' })).toBeNull()

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
    // decided-choose (ui-design da FEAT-011): segmentos livres, sem a linha do motivo.
    expect(within(modes('Gnome Age')).getByRole('radio', { name: 'Choose' })).toHaveProperty('checked', true)
    expect(modes('Gnome Age').getAttribute('aria-readonly')).toBeNull()
    expect(modes('Gnome Age').getAttribute('aria-describedby')).toBeNull()
    expect(within(card('Gnome Age')).queryByText(/Rolling instead/)).toBeNull()
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

    // decided-choose, segmento Roll: a coluna sem caixa nem cálculo e, no fim, "Roll 3d6" (não "Reroll": o resultado na
    // tela não foi rolado).
    await userEvent.click(within(modes('Gnome Age')).getByRole('radio', { name: 'Roll' }))
    const rollColumn = resultColumn(AGE)!
    expect(rollColumn.querySelector('.roll-result__entry')!.textContent).toBe('13–18')
    expect(within(rollColumn).getByRole('button', { name: 'Roll 3d6' }).className).toContain('button-secondary')
    expect(within(card('Gnome Age')).queryByRole('button', { name: 'Reroll 3d6' })).toBeNull()
    expect(within(rollColumn).queryByText(/^Rolled/)).toBeNull()
    expect(card('Gnome Age').querySelector('.roll-value')).toBeNull()
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

  it('FR-STEP-014, FR-DEC-011: an entry with a dice effect opens its roll-effect in the same card, with Roll and Enter result; Choose → Choose with it decided opens the impact dialog, and Keep leaves the grid on the current entry (AC-8)', async () => {
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
    // effect-reroll (ui-design da FEAT-011): "Reroll 1d6" e "Enter result" no lugar do motivo.
    expect(within(effectColumn).getByRole('button', { name: 'Reroll 1d6' }).className).toContain('button-secondary')
    expect(within(effectColumn).getByRole('button', { name: 'Enter result' })).toBeTruthy()
    expect(effect.querySelector('.roll-value')!.textContent).toBe('4rolled')
    expect(effect.classList.contains('subdecision--decided')).toBe(true)
    await vi.waitFor(() => expect(document.activeElement).toBe(effectColumn))
    await storySettled(session, saved, 3)
    expect(saved[2].decisions[MADNESS]).toEqual({ mode: 'rolled', dice: [4], modifier: 0, total: 4, logged: 4 })

    // replace-with-dependents: o diálogo da moldura, com a Madness em "set aside".
    const other = entryRadio('Gnome Past', '1–3 TT p.7')
    await userEvent.click(other)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { level: 2 }).textContent).toBe('Change Gnome Past from 4 to 1–3?')
    expect(items(within(dialog).getByRole('list', { name: 'Will be set aside' }))).toEqual(['Madness 1d6: 4 · rolled'])
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep current result' }))
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // replace-kept: a grade fica na entrada 4, a entrada acionada sem marca e com o foco, e nada é gravado.
    expect(entryRadio('Gnome Past', '4 TT p.7').checked).toBe(true)
    expect(other.checked).toBe(false)
    await vi.waitFor(() => expect(document.activeElement).toBe(other))
    expect(saved).toHaveLength(3)
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

  // DEF-013 (design.md §4, "error", emenda D-ERR; ui-design, entering): a região `aria-live="polite"` do erro já está no
  // formulário, vazia, antes do envio; a mensagem aparece dentro dela, ligada ao campo, e o foco fica onde estava. A
  // região é capturada antes do envio e conferida por identidade depois: uma região criada junto com a mensagem não passa.
  const enterRegion = (scope: HTMLElement) => scope.querySelector<HTMLElement>('.enter-form [aria-live="polite"]')
  /** A região do formulário aberto em `scope`, já no DOM e vazia antes do envio. */
  function regionBeforeSubmit(scope: HTMLElement) {
    const region = enterRegion(scope)
    expect(region, 'aria-live="polite" region in the Enter result form').not.toBeNull()
    expect(region!.textContent).toBe('')
    return region!
  }
  async function expectAnnounced(scope: HTMLElement, region: HTMLElement, field: HTMLElement, message: string, focused: Element) {
    await vi.waitFor(() => expect(region.textContent).toBe(message))
    expect(enterRegion(scope)).toBe(region)
    // A mensagem do `aria-describedby` está dentro da região, e a região é o ancestral `aria-live` mais próximo dela.
    const error = (field.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .map((id) => document.getElementById(id))
      .find((element) => element?.textContent === message)
    expect(error, 'message in aria-describedby').toBeTruthy()
    expect(error!.closest('[aria-live]')).toBe(region)
    expect(field.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(focused)
    await nextFrame()
    expect(document.activeElement).toBe(focused)
  }

  it('DEF-013, FR-DEC-004, FR-DEC-019, NFR-ACC-001: "Use this result" with the field empty shows the local error in the live region already in the form, with the focus kept on the button', async () => {
    const { session, repository } = setup({ document: gnome() })
    const enter = vi.spyOn(session, 'enter')
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Fate' })
    await userEvent.click(within(card('Gnome Fate')).getByRole('button', { name: 'Enter result' }))
    const field = within(card('Gnome Fate')).getByLabelText('Your 3d6 roll')
    await vi.waitFor(() => expect(document.activeElement).toBe(field))
    const region = regionBeforeSubmit(card('Gnome Fate'))

    const use = within(card('Gnome Fate')).getByRole('button', { name: 'Use this result' })
    await userEvent.click(use)
    expect(enter).not.toHaveBeenCalled()
    await expectAnnounced(card('Gnome Fate'), region, field, 'Enter a value from 3 to 18.', use)
    expect(repository.save).not.toHaveBeenCalled()

    // A mensagem some na próxima edição; a região continua no formulário, vazia.
    await userEvent.type(field, '1')
    expect(enterRegion(card('Gnome Fate'))).toBe(region)
    expect(region.textContent).toBe('')
  })

  it('DEF-013, FR-STEP-014, FR-DEC-020, NFR-ACC-001: on the roll-effect, the out-of-range refusal shows in the live region already in the form, with the focus kept on "Use this result"', async () => {
    const { session, saved } = setup({ document: gnome() })
    const enter = vi.spyOn(session, 'enter')
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Past' })
    await userEvent.click(within(modes('Gnome Past')).getByRole('radio', { name: 'Choose' }))
    await userEvent.click(entryRadio('Gnome Past', '4 TT p.7'))
    await storySettled(session, saved, 1)
    const effect = document.getElementById(slotElementId(MADNESS))!
    await userEvent.click(within(effect).getByRole('button', { name: 'Enter result' }))
    const field = within(effect).getByLabelText('Your 1d6 roll')
    const region = regionBeforeSubmit(effect)

    await userEvent.type(field, '7')
    const use = within(effect).getByRole('button', { name: 'Use this result' })
    await userEvent.click(use)
    expect(enter).toHaveBeenCalledWith(MADNESS, 7)
    await expectAnnounced(effect, region, field, 'Enter a value from 1 to 6.', use)
    expect((field as HTMLInputElement).value).toBe('7')
    expect(saved).toHaveLength(1)
  })

  it('DEF-013, FR-DEC-004, FR-DEC-019, NFR-ACC-001: Enter in the empty field shows the local error in the live region already in the form, with the focus kept on the field', async () => {
    const { session, repository } = setup({ document: gnome() })
    const enter = vi.spyOn(session, 'enter')
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Fate' })
    await userEvent.click(within(card('Gnome Fate')).getByRole('button', { name: 'Enter result' }))
    const field = within(card('Gnome Fate')).getByLabelText('Your 3d6 roll')
    await vi.waitFor(() => expect(document.activeElement).toBe(field))
    const region = regionBeforeSubmit(card('Gnome Fate'))

    await userEvent.keyboard('{Enter}')
    expect(enter).not.toHaveBeenCalled()
    await expectAnnounced(card('Gnome Fate'), region, field, 'Enter a value from 3 to 18.', field)
    expect(repository.save).not.toHaveBeenCalled()
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

  it('FR-STEP-005, FR-CHG-004 (AC-11): the impact dialog of a switch sets aside the Stature and the Gnome Age result, and Keep saves nothing', async () => {
    const { repository } = setup({ document: gnome({ 'ancestry=gnome/stature': { mode: 'chosen', value: 1 }, [AGE]: chosenEntry('3-7') }) })
    renderBuilder('ancestry')
    await userEvent.click(await screen.findByRole('radio', { name: 'Troll' }))
    await userEvent.click(screen.getByRole('button', { name: 'Choose Troll' }))
    const dialog = await screen.findByRole('dialog')
    expect(items(within(dialog).getByRole('list', { name: 'Will be set aside' }))).toEqual(['Stature: 1', 'Gnome Age: 3–7 · chosen'])
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep current ancestry' }))
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(repository.save).not.toHaveBeenCalled()
  })
})


// FEAT-011 T9: diálogo de impacto (SCR-WEB-007), troca de ancestralidade (SCR-WEB-003) e aviso ao abrir (moldura).
describe('Impact dialog and open notice (FEAT-011)', () => {
  afterEach(cleanup)

  const PAST = 'ancestry=gnome/past'
  const summaryCard = () => screen.getByRole('complementary', { name: 'Summary' })
  const withStature = () => stored({ ancestry: 'ancestry:gnome', 'ancestry=gnome/stature': 1 })
  async function askForTroll() {
    await userEvent.click(await screen.findByRole('radio', { name: 'Troll' }))
    const opener = screen.getByRole('button', { name: 'Choose Troll' })
    await userEvent.click(opener)
    return { opener, dialog: await screen.findByRole('dialog') }
  }

  it('FR-CHG-003, NFR-ACC-001: the dialog is named by its title and opens with the focus on it; Tab stays inside, a click outside does not close it, and Esc is Keep (dialog-open)', async () => {
    const { session, repository } = setup({ document: withStature() })
    const keep = vi.spyOn(session, 'keep')
    renderBuilder()
    const { opener, dialog } = await askForTroll()
    const title = within(dialog).getByRole('heading', { level: 2 })
    // C9: o nome vem do título visível, por `aria-labelledby`.
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id)
    expect(dialog.hasAttribute('aria-label')).toBe(false)
    expect(screen.getByRole('dialog', { name: 'Switch from Gnome to Troll?' })).toBe(dialog)
    await vi.waitFor(() => expect(document.activeElement).toBe(title))

    // Current × New (FR-CHG-003): o nome e o selo de cada ancestralidade.
    const column = (name: string) => within(dialog).getByRole('heading', { level: 3, name }).parentElement!
    expect(column('Current').textContent).toBe('CurrentGnomeTC p.5')
    expect(column('New').textContent).toBe('NewTrollTC p.6')
    expect(within(dialog).getByText(IMPACT_D40)).toBeTruthy()

    // Foco preso no diálogo: sem a contenção, o Tab depois de Apply sairia dele (o jsdom não tem `inert`, C16).
    const keepButton = within(dialog).getByRole('button', { name: 'Keep current ancestry' })
    const apply = within(dialog).getByRole('button', { name: 'Apply new ancestry' })
    await userEvent.tab()
    expect(document.activeElement).toBe(keepButton)
    await userEvent.tab()
    expect(document.activeElement).toBe(apply)
    await userEvent.tab()
    expect(document.activeElement).toBe(keepButton)
    await userEvent.tab({ shift: true })
    expect(document.activeElement).toBe(apply)

    // O clique fora não fecha (isDismissable={false}), e a contenção devolve o foco ao diálogo no quadro seguinte. O Esc
    // só vem depois disso: com o foco ainda no `body`, ele não chega ao diálogo (a corrida do CI 44562205950).
    await userEvent.click(document.querySelector('.dialog-overlay')!)
    expect(screen.getByRole('dialog')).toBe(dialog)
    expect(keep).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))

    // Esc é Keep: o diálogo fecha pelo snapshot, e o foco volta ao controle que o abriu.
    await userEvent.keyboard('{Escape}')
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(keep).toHaveBeenCalledOnce()
    await vi.waitFor(() => expect(document.activeElement).toBe(opener))
    expect(repository.save).not.toHaveBeenCalled()
  })

  it('FR-CHG-008, FR-CHAR-010, NFR-REL-001 (AC-17): with the saves held, the dialog opens without waiting for them, and Apply shows the new ancestry before the save ends, with the focus on the detail title and the "1 set aside" line (switch-applied)', async () => {
    const { control, saved } = setup({ document: withStature(), holdSave: true })
    renderBuilder()
    // Uma gravação anterior, retida: o diálogo abre por `pending`, sem esperar por ela.
    await userEvent.click(await screen.findByRole('radio', { name: '1/2' }))
    expect(within(summaryCard()).queryByText(/set aside$/)).toBeNull()
    const { dialog } = await askForTroll()
    expect(saved).toEqual([])

    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply new ancestry' }))
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect((screen.getByRole('radio', { name: 'Troll, your choice' }) as HTMLInputElement).checked).toBe(true)
    const heading = document.getElementById('ancestry-detail-title')!
    expect(heading.textContent).toBe('Troll')
    await vi.waitFor(() => expect(document.activeElement).toBe(heading))
    expect(within(summaryCard()).getByText('1 set aside')).toBeTruthy()
    expect(saved).toEqual([])

    control.release()
    await vi.waitFor(() => expect(saved).toHaveLength(2))
    expect(saved[1].decisions['ancestry=gnome/stature']).toMatchObject({ value: 0.5, setAside: true })
    await nextFrame()
    // O fim da gravação não move o foco.
    expect(document.activeElement).toBe(heading)
  })

  it('FR-CHAR-010 (AC-17): a failed save after Apply keeps the new ancestry on screen, with the frame alert', async () => {
    const { saved } = setup({ document: withStature(), failSave: true })
    renderBuilder()
    const { dialog } = await askForTroll()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply new ancestry' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/Your last choice wasn't saved/)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect((screen.getByRole('radio', { name: 'Troll, your choice' }) as HTMLInputElement).checked).toBe(true)
    expect(saved).toEqual([])
  })

  it('FR-CHG-018, FR-CHG-001, FR-CHG-006: switching back restores the set-aside decision, with only "Will be restored" and the recalculated values (restore-only)', async () => {
    const document = { ...stored({ ancestry: 'ancestry:troll' }), decisions: { ancestry: { mode: 'chosen', value: 'ancestry:troll' }, 'ancestry=gnome/stature': { mode: 'chosen', value: 1, setAside: true } } }
    const { saved } = setup({ document })
    renderBuilder()
    // A abertura sem diferença não mostra aviso; a linha do resumo conta a suspensa.
    await screen.findByRole('radio', { name: 'Troll, your choice' })
    expect(screen.queryByText(NOTICE_TITLE)).toBeNull()
    expect(within(summaryCard()).getByText('1 set aside')).toBeTruthy()

    await userEvent.click(screen.getByRole('radio', { name: 'Gnome' }))
    await userEvent.click(screen.getByRole('button', { name: 'Choose Gnome' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { level: 2 }).textContent).toBe('Switch from Troll to Gnome?')
    expect(within(dialog).queryByRole('list', { name: 'Will be set aside' })).toBeNull()
    expect(within(dialog).queryByText(IMPACT_D40)).toBeNull()
    expect(items(within(dialog).getByRole('list', { name: 'Will be restored' }))).toEqual(['Stature: 1'])
    expect(items(within(dialog).getByRole('list', { name: 'Will be recalculated' }))).toEqual(['Might12 → 8', 'Stature2 → 1'])

    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply new ancestry' }))
    await vi.waitFor(() => expect(saved).toHaveLength(1))
    expect(saved[0].decisions['ancestry=gnome/stature']).toEqual({ mode: 'chosen', value: 1 })
    expect(within(summaryCard()).queryByText(/set aside$/)).toBeNull()
  })

  it('FR-CHG-005, FR-CHG-006: the transitive dependent says what it depends on; a value that goes away is shown as "—"', async () => {
    setup({
      document: gnome({
        'ancestry=gnome/stature': { mode: 'chosen', value: 1 },
        [AGE]: chosenEntry('3-7'),
        [PAST]: chosenEntry('4'),
        [MADNESS]: { mode: 'rolled', dice: [4], modifier: 0, total: 4 },
      }),
    })
    renderBuilder()
    const { dialog } = await askForTroll()
    const list = within(dialog).getByRole('list', { name: 'Will be set aside' })
    const lines = within(list).getAllByRole('listitem')
    expect(lines.map((line) => line.querySelector('.decision-line > span')!.textContent)).toEqual([
      'Stature: 1',
      'Gnome Age: 3–7 · chosen',
      'Gnome Past: 4 · chosen',
      'Madness 1d6: 4 · rolled',
    ])
    // Só o dependente transitivo leva a linha "depends on", com o rótulo da vaga mãe.
    expect(lines.map((line) => line.querySelector('.decision-line__depends')?.textContent ?? null)).toEqual([null, null, null, 'depends on Gnome Past'])
    expect(items(within(dialog).getByRole('list', { name: 'Will be recalculated' }))).toEqual(['Might8 → 12', 'Stature1 → —', 'Madness4 → 0'])
  })

  it('FR-CHG-004: what stays is in a collapsed "Stays as it is" disclosure (Choose → Choose with the roll-effect decided)', async () => {
    setup({
      document: gnome({
        'ancestry=gnome/stature': { mode: 'chosen', value: 1 },
        [AGE]: chosenEntry('3-7'),
        [PAST]: chosenEntry('4'),
        [MADNESS]: { mode: 'rolled', dice: [4], modifier: 0, total: 4 },
      }),
    })
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Past' })
    await userEvent.click(entryRadio('Gnome Past', '5–6 TT p.7'))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { level: 2 }).textContent).toBe('Change Gnome Past from 4 to 5–6?')
    const column = (name: string) => within(dialog).getByRole('heading', { level: 3, name }).parentElement!
    expect(column('Current').textContent).toBe('Current4ChosenMadness +1d6')
    expect(column('New').textContent).toBe('New5–6ChosenMadness +1')
    const trigger = within(dialog).getByRole('button', { name: 'Stays as it is · 3' })
    expect(trigger.closest('h3')).not.toBeNull()
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    await userEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(within(dialog).getByText('Gnome Age:', { exact: false })).toBeTruthy()
    // Tab: o gatilho de "Stays as it is" antes das ações.
    expect(within(dialog).getAllByRole('button').map((button) => button.textContent)).toEqual(['Stays as it is · 3', 'Keep current result', 'Apply new result'])
  })

  // DEF-014 (ui-design, SCR-WEB-007, item 2; ui-design da FEAT-009, rolled, item 1). O Vitest não aplica o CSS (todo
  // `.css` importado chega vazio, inclusive com `?raw`), então o teste confere a ligação que o CSS faz: as declarações
  // `color` das regras do `builder.css`, lido do disco, cujo seletor casa com o elemento renderizado (`Element.matches`).
  /** As cores que o `builder.css` dá ao próprio elemento, na ordem do arquivo. */
  async function builderColorsOf() {
    // Caminho a partir da raiz do projeto, onde o Vitest roda (no jsdom, o `import.meta.url` não é `file:`).
    const { readFileSync } = (await import('node:fs' as string)) as { readFileSync: (path: string, encoding: 'utf8') => string }
    const builderCss = readFileSync('src/ui/styles/builder.css', 'utf8')
    // Guarda contra uma leitura vazia, que faria o teste falhar pelo motivo errado (C15).
    expect(builderCss).toMatch(/\.impact-dialog__mode\b/)
    return (element: Element) => builderColors(builderCss, element)
  }
  function builderColors(builderCss: string, element: Element) {
    const colors: string[] = []
    for (const [, selectors, body] of builderCss.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const color = /(?:^|;)\s*color:\s*([^;]+)/.exec(body)?.[1].trim()
      if (!color) continue
      for (const selector of selectors.split(',').map((part) => part.trim())) {
        // Seletores de `@keyframes` ("from", "50%") e de pseudoelementos não casam com elemento.
        if (selector.includes('::') || /^(from|to|\d+%)$/.test(selector)) continue
        if (element.matches(selector)) colors.push(color)
      }
    }
    return colors
  }
  const SECONDARY = ['var(--color-text-secondary)']

  it('DEF-014, FR-CHG-003: in the table column, the calculation and "Chosen" are in .typography-meta bound to --color-text-secondary', async () => {
    setup({ document: gnome({ [PAST]: chosenEntry('4'), [MADNESS]: { mode: 'rolled', dice: [4], modifier: 0, total: 4 } }), random: sequence([0]) })
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Past' })
    await userEvent.click(within(modes('Gnome Past')).getByRole('radio', { name: 'Roll' }))
    await userEvent.click(within(resultColumn(PAST)!).getByRole('button', { name: 'Roll d6' }))
    const dialog = await screen.findByRole('dialog')
    const column = (name: string) => within(dialog).getByRole('heading', { level: 3, name }).parentElement!

    const chosen = within(column('Current')).getByText('Chosen')
    const calc = within(column('New')).getByText('Rolled d6: 1 · Modifier +0 · Total 1')
    const colorsOf = await builderColorsOf()
    for (const element of [chosen, calc]) {
      expect(element.classList.contains('typography-meta'), element.textContent!).toBe(true)
      expect(colorsOf(element), element.textContent!).toEqual(SECONDARY)
    }
  })

  it('DEF-014, FR-CHG-003: in the roll-effect column, the calculation is in .typography-meta bound to --color-text-secondary', async () => {
    // Nenhum fluxo abre o diálogo com a vaga de uma roll-effect (sem vaga filha, ela não suspende nem restaura nada;
    // DEF-014, alcance): o diálogo é renderizado direto, com o impacto calculado pelo motor sobre a sessão real.
    const { session } = setup({ document: gnome({ [PAST]: chosenEntry('4'), [MADNESS]: { mode: 'rolled', dice: [4], modifier: 0, total: 4 } }) })
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Past' })
    const snapshot = session.getSnapshot()
    if (snapshot.status !== 'ready') throw new Error('the session is not ready')
    const after = { ...snapshot.document, decisions: { ...snapshot.document.decisions, [MADNESS]: { mode: 'entered', sum: 6, modifier: 0, total: 6 } } }
    const pending = { kind: 'enter' as const, key: MADNESS, impact: impact(snapshot.rules, snapshot.document, after as never, MADNESS) }
    render(<ImpactDialog pending={pending} nameOf={(id) => id} onKeep={() => {}} onApply={() => {}} />)
    const dialog = await screen.findByRole('dialog')
    const column = (name: string) => within(dialog).getByRole('heading', { level: 3, name }).parentElement!
    expect(column('Current').textContent).toBe('Current4Rolled 1d6: 4 · Modifier +0 · Total 4Madness +4')
    expect(column('New').textContent).toBe('New6Entered for 1d6: 6 · Modifier +0 · Total 6Madness +6')

    const colorsOf = await builderColorsOf()
    for (const element of [within(column('Current')).getByText(/^Rolled 1d6/), within(column('New')).getByText(/^Entered for 1d6/)]) {
      expect(element.classList.contains('typography-meta'), element.textContent!).toBe(true)
      expect(colorsOf(element), element.textContent!).toEqual(SECONDARY)
    }
  })

  it('FR-CONT-016, FR-CHG-012: opening with a difference shows the static notice at the top of main, with the frozen names, and Dismiss takes it away without saving (open-notice)', async () => {
    const sizeEntry = {
      id: 1,
      at: '2026-01-01T00:00:00.000Z',
      kind: 'decision',
      slot: 'ancestry=troll/size',
      slotKind: 'choose-value',
      step: { id: 'step:ancestry', name: 'Ancestry' },
      origin: { id: 'ancestry:troll', name: 'Troll' },
      mode: 'chosen',
      subject: { id: 'characteristic:stature', name: 'Stature' },
      source: { book: TABLES, abbr: 'TT', page: 6 },
      result: { value: 2 },
    }
    const document = {
      ...gnome({
        // Entrada que a versão atual não tem: a vaga reabre (pacote fictício).
        [AGE]: chosenEntry('1-2'),
        // Vagas não geradas: uma com a entrada original no log, outra gravada antes da FEAT-011, sem `logged`.
        'ancestry=troll/size': { mode: 'chosen', value: 2, logged: 1 },
        'ancestry=troll/omen': chosenEntry('3'),
      }),
      log: [sizeEntry],
    }
    const { saved } = setup({ document })
    renderBuilder()
    const title = await stepTitle("What is your character's ancestry?")
    const main = screen.getByRole('main')
    const notice = within(main).getByText(NOTICE_TITLE).closest('.inline-alert')!
    // Estático (live={false}), antes do cabeçalho da etapa.
    expect(notice.hasAttribute('role')).toBe(false)
    expect(notice.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(items(within(notice as HTMLElement).getByRole('list', { name: 'Set aside, because the current rules no longer have them:' }))).toEqual([
      'Gnome Age: 1–2 · chosen',
      'Stature: 2',
      '1 earlier decision',
    ])
    expect(within(notice as HTMLElement).getByText("Where the rules still ask for a decision, it's open again in Open decisions.")).toBeTruthy()
    expect(within(notice as HTMLElement).getByText(IMPACT_D40)).toBeTruthy()
    await vi.waitFor(() => expect(saved).toHaveLength(1))

    const dismiss = within(notice as HTMLElement).getByRole('button', { name: 'Dismiss' })
    await userEvent.click(dismiss)
    expect(screen.queryByText(NOTICE_TITLE)).toBeNull()
    expect(globalThis.document.activeElement).toBe(title)
    expect(saved).toHaveLength(1)
  })
})

const IMPACT_D40 = 'Set-aside decisions stay with this character, off the sheet, and come back on their own if what they depend on returns.'
const NOTICE_TITLE = 'The rules changed since this character was last saved.'

// FEAT-011 T10 (SCR-WEB-009): tabela decidida com Reroll, troca de modo e dependentes, com sorteio fixo. O `test.rollpast`
// é o pacote de tabelas com a Gnome Past no regime `roll`, para o Enter result numa tabela com `roll-effect`.
const tablesPack = files['/packs/test.tables.json'] as { components: { items: Record<string, unknown>[] }[] }
files['/packs/test.rollpast.json'] = {
  ...tablesPack,
  id: 'test.rollpast',
  components: [{ ...tablesPack.components[0], items: tablesPack.components[0].items.map((item) => (item.id === 'table:gnome-past' ? { ...item, regime: 'roll' } : item)) }],
}

describe('Story step: decided table (FEAT-011)', () => {
  afterEach(cleanup)

  const PAST = 'ancestry=gnome/past'
  const FATE = 'ancestry=gnome/fate'
  const button = (name: string, label: string) => within(card(name)).getByRole('button', { name: label })
  const effectBox = () => document.getElementById(slotElementId(MADNESS))!
  const dialogColumn = (dialog: HTMLElement, name: string) => within(dialog).getByRole('heading', { level: 3, name }).parentElement!
  /** Gnome Past rolada em 4 e a Madness rolada em 4, pelos cliques (as duas primeiras gravações). */
  async function pastAndMadness(session: CharacterSession, saved: unknown[]) {
    await userEvent.click(await screen.findByRole('button', { name: 'Roll d6' }))
    await userEvent.click(within(effectBox()).getByRole('button', { name: 'Roll 1d6' }))
    await storySettled(session, saved, 2)
  }

  it('FR-DEC-015, FR-DEC-016: decided-roll has "Reroll 3d6" and "Enter result"; a Reroll with the same faces applies directly and takes the focus to the result column (mode-switch)', async () => {
    const { session, saved } = setup({ document: gnome(), random: sequence([2, 4, 1, 2, 4, 1]) })
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Fate' })
    await userEvent.click(button('Gnome Fate', 'Roll 3d6'))
    const column = resultColumn(FATE)!
    await vi.waitFor(() => expect(document.activeElement).toBe(column))
    await storySettled(session, saved, 1)

    // A Fate tem `enter` em `table.modes`: "Reroll 3d6" e "Enter result", os dois secundários, no fim da coluna.
    const reroll = within(column).getByRole('button', { name: 'Reroll 3d6' })
    const enter = within(column).getByRole('button', { name: 'Enter result' })
    expect([reroll.className, enter.className].every((name) => name.includes('button-secondary'))).toBe(true)
    expect(column.lastElementChild!.contains(reroll)).toBe(true)
    expect(within(card('Gnome Fate')).queryByRole('button', { name: 'Roll 3d6' })).toBeNull()

    // As mesmas faces: a marca é consumida pelo `logged` novo, não pela vaga decidida (C2).
    await userEvent.click(reroll)
    await vi.waitFor(() => expect(document.activeElement).toBe(column))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(within(column).getByText('Rolled 3d6: 3 + 5 + 2 · Modifier +0 · Total 10')).toBeTruthy()
    await storySettled(session, saved, 2)
    expect(saved[1].decisions[FATE]).toEqual({ mode: 'rolled', dice: [3, 5, 2], modifier: 0, total: 10, entry: '3-10', rolls: 2, book: TABLES, logged: 2 })
  })

  it('FR-DEC-018: Enter result on a decided table opens the form in place of the actions; "Use this result" replaces the result, closes the form and focuses the result column (replace-applied)', async () => {
    const { session, saved } = setup({ document: gnome(), random: sequence([2, 4, 1]) })
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Fate' })
    await userEvent.click(button('Gnome Fate', 'Roll 3d6'))
    await storySettled(session, saved, 1)

    await userEvent.click(within(resultColumn(FATE)!).getByRole('button', { name: 'Enter result' }))
    const field = within(card('Gnome Fate')).getByLabelText('Your 3d6 roll')
    await vi.waitFor(() => expect(document.activeElement).toBe(field))
    expect(within(card('Gnome Fate')).queryByRole('button', { name: 'Reroll 3d6' })).toBeNull()
    await userEvent.type(field, '15')
    await userEvent.click(within(card('Gnome Fate')).getByRole('button', { name: 'Use this result' }))

    const column = resultColumn(FATE)!
    expect(within(column).getByText('Entered for 3d6: 15 · Modifier +0 · Total 15')).toBeTruthy()
    expect(within(card('Gnome Fate')).queryByLabelText('Your 3d6 roll')).toBeNull()
    expect(within(column).getByRole('button', { name: 'Reroll 3d6' })).toBeTruthy()
    await vi.waitFor(() => expect(document.activeElement).toBe(column))
    await storySettled(session, saved, 2)
    expect(saved[1].decisions[FATE]).toEqual({ mode: 'entered', sum: 15, modifier: 0, total: 15, entry: '11-18', rolls: 1, book: TABLES, logged: 2 })
  })

  it('FR-DEC-018, FR-DEC-016: Choose on a rolled table shows the grid with the decided entry and its calculation, and replaces it; Roll on the chosen one rolls again with rolls 2 (decided-choose)', async () => {
    const { session, saved } = setup({ document: gnome(), random: sequence([2, 4, 1, 0, 0, 0]) })
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Age' })
    await userEvent.click(button('Gnome Age', 'Roll 3d6'))
    await storySettled(session, saved, 1)

    // Segmento Choose com a decisão rolada: a grade marca a entrada dela, e a coluna mostra o cálculo, sem caixa de valor.
    await userEvent.click(within(modes('Gnome Age')).getByRole('radio', { name: 'Choose' }))
    expect(entryRadio('Gnome Age', '8–12 TT p.8').checked).toBe(true)
    expect(within(resultColumn(AGE)!).getByText('Rolled 3d6: 3 + 5 + 2 · Modifier +0 · Total 10')).toBeTruthy()
    expect(card('Gnome Age').querySelector('.roll-value')).toBeNull()
    expect(within(card('Gnome Age')).queryByRole('button', { name: 'Reroll 3d6' })).toBeNull()

    // Troca de modo para Choose, sem dependentes: aplica direto, sem foco programático.
    const low = entryRadio('Gnome Age', '3–7 TT p.7')
    await userEvent.click(low)
    expect(low.checked).toBe(true)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(within(resultColumn(AGE)!).queryByText(/^Rolled/)).toBeNull()
    await storySettled(session, saved, 2)
    expect(document.activeElement).toBe(low)
    expect(saved[1].decisions[AGE]).toEqual({ ...chosenEntry('3-7'), rolls: 1, logged: 2 })

    // Roll → Choose → Roll: "Roll 3d6" no segmento Roll, e a rolagem nova tem rolls 2 (FR-DEC-016).
    await userEvent.click(within(modes('Gnome Age')).getByRole('radio', { name: 'Roll' }))
    await userEvent.click(button('Gnome Age', 'Roll 3d6'))
    const column = resultColumn(AGE)!
    expect(within(column).getByText('Rolled 3d6: 1 + 1 + 1 · Modifier +0 · Total 3')).toBeTruthy()
    expect(within(column).getByRole('button', { name: 'Reroll 3d6' })).toBeTruthy()
    await vi.waitFor(() => expect(document.activeElement).toBe(column))
    await storySettled(session, saved, 3)
    expect(saved[2].decisions[AGE]).toEqual({ mode: 'rolled', dice: [1, 1, 1], modifier: 0, total: 3, entry: '3-7', rolls: 2, book: TABLES, logged: 4 })
  })

  it('FR-DEC-015, FR-DEC-017, FR-CHG-010, FR-CHAR-010: a Reroll onto another entry opens the by-reroll dialog; Keep closes it without waiting for the save, focuses "Reroll d6" with the result as it was, and logs the declined value (replace-kept)', async () => {
    const { session, saved, control } = setup({ document: gnome(), random: sequence([3, 3, 0]) })
    renderBuilder('story')
    await pastAndMadness(session, saved)

    const reroll = within(resultColumn(PAST)!).getByRole('button', { name: 'Reroll d6' })
    await userEvent.click(reroll)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { level: 2 }).textContent).toBe('Use the new roll for Gnome Past?')
    expect(dialogColumn(dialog, 'Current').textContent).toBe('Current4Rolled d6: 4 · Modifier +0 · Total 4Madness +1d6')
    expect(dialogColumn(dialog, 'New').textContent).toBe('New1–3Rolled d6: 1 · Modifier +0 · Total 1')
    expect(within(dialog).getByText("Whichever result you don't use goes to the log as undone. It isn't set aside.")).toBeTruthy()
    expect(items(within(dialog).getByRole('list', { name: 'Will be set aside' }))).toEqual(['Madness 1d6: 4 · rolled'])
    expect(saved).toHaveLength(2)

    // Só a gravação do Keep fica retida (C15): o diálogo fecha quando o `pending` some, antes do fim da gravação.
    control.hold()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep current result' }))
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(saved).toHaveLength(2)
    await vi.waitFor(() => expect(document.activeElement).toBe(reroll))
    expect(within(resultColumn(PAST)!).getByText('Rolled d6: 4 · Modifier +0 · Total 4')).toBeTruthy()
    expect(within(resultColumn(MADNESS)!).getByText('Rolled 1d6: 4 · Modifier +0 · Total 4')).toBeTruthy()

    control.release()
    await storySettled(session, saved, 3)
    expect(saved[2].decisions[PAST]).toEqual({ mode: 'rolled', dice: [4], modifier: 0, total: 4, entry: '4', rolls: 2, book: TABLES, logged: 1 })
    expect((saved[2] as unknown as { log: { kind: string; reason?: string }[] }).log.slice(2).map((entry) => [entry.kind, entry.reason])).toEqual([
      ['decision', undefined],
      ['undone', 'declined'],
    ])
    expect(document.activeElement).toBe(reroll)
  })

  it('FR-DEC-015, FR-DEC-017: Apply on the by-reroll dialog shows the new result, the roll-effect goes away, and the focus goes to the result column, without drawing again (replace-applied)', async () => {
    const { session, saved } = setup({ document: gnome(), random: sequence([3, 3, 0]) })
    renderBuilder('story')
    await pastAndMadness(session, saved)

    await userEvent.click(within(resultColumn(PAST)!).getByRole('button', { name: 'Reroll d6' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply new result' }))
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const column = resultColumn(PAST)!
    expect(within(column).getByText('Rolled d6: 1 · Modifier +0 · Total 1')).toBeTruthy()
    expect(column.querySelector('.roll-result__entry')!.textContent).toBe('1–3')
    expect(document.getElementById(slotElementId(MADNESS))).toBeNull()
    await vi.waitFor(() => expect(document.activeElement).toBe(column))
    // Sem a 4ª face: o Apply grava o candidato, sem rolar de novo (D1); a sequência falharia se rolasse.
    await storySettled(session, saved, 3)
    expect(saved[2].decisions[PAST]).toMatchObject({ dice: [1], entry: '1-3', rolls: 2 })
    expect(saved[2].decisions[MADNESS]).toMatchObject({ total: 4, setAside: true })
  })

  it('FR-DEC-018, FR-DEC-017: Choose → Choose and the switch to Choose with the roll-effect decided open the dialog; after Apply, the entry used in the grid has the focus (applied)', async () => {
    const { session, saved } = setup({ document: gnome(), random: sequence([3, 3]) })
    renderBuilder('story')
    await pastAndMadness(session, saved)

    // Troca de modo para Choose numa rolada, com a roll-effect decidida.
    await userEvent.click(within(modes('Gnome Past')).getByRole('radio', { name: 'Choose' }))
    const high = entryRadio('Gnome Past', '5–6 TT p.7')
    await userEvent.click(high)
    let dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { level: 2 }).textContent).toBe('Change Gnome Past from 4 to 5–6?')
    expect(within(dialog).queryByText("Whichever result you don't use goes to the log as undone. It isn't set aside.")).toBeNull()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply new result' }))
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(entryRadio('Gnome Past', '5–6 TT p.7').checked).toBe(true)
    await vi.waitFor(() => expect(document.activeElement).toBe(entryRadio('Gnome Past', '5–6 TT p.7')))
    await storySettled(session, saved, 3)
    expect(document.activeElement).toBe(entryRadio('Gnome Past', '5–6 TT p.7'))

    // Choose → Choose de volta à 4 restaura a Madness (restore-only), e o foco fica na entrada acionada.
    await userEvent.click(entryRadio('Gnome Past', '4 TT p.7'))
    dialog = await screen.findByRole('dialog')
    expect(items(within(dialog).getByRole('list', { name: 'Will be restored' }))).toEqual(['Madness 1d6: 4 · rolled'])
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply new result' }))
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await vi.waitFor(() => expect(document.activeElement).toBe(entryRadio('Gnome Past', '4 TT p.7')))
    expect(within(resultColumn(MADNESS)!).getByText('Rolled 1d6: 4 · Modifier +0 · Total 4')).toBeTruthy()
    await storySettled(session, saved, 4)
    expect(document.activeElement).toBe(entryRadio('Gnome Past', '4 TT p.7'))
  })

  it('FR-DEC-015, FR-CHG-010: Roll on a chosen table with the roll-effect decided opens the by-reroll dialog; Keep keeps the Roll segment and focuses "Roll d6" (replace-kept)', async () => {
    const { session, saved } = setup({ document: gnome({ [PAST]: chosenEntry('4'), [MADNESS]: { mode: 'rolled', dice: [4], modifier: 0, total: 4 } }), random: sequence([0]) })
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Past' })
    await userEvent.click(within(modes('Gnome Past')).getByRole('radio', { name: 'Roll' }))
    const roll = within(resultColumn(PAST)!).getByRole('button', { name: 'Roll d6' })
    expect(within(card('Gnome Past')).queryByRole('button', { name: 'Reroll d6' })).toBeNull()
    await userEvent.click(roll)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { level: 2 }).textContent).toBe('Use the new roll for Gnome Past?')
    expect(dialogColumn(dialog, 'Current').textContent).toBe('Current4ChosenMadness +1d6')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep current result' }))
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // O Keep não muda o modo da decisão, então o segmento escolhido pela pessoa fica.
    expect(within(modes('Gnome Past')).getByRole('radio', { name: 'Roll' })).toHaveProperty('checked', true)
    await vi.waitFor(() => expect(document.activeElement).toBe(roll))
    await storySettled(session, saved, 1)
    expect(saved[0].decisions[PAST]).toEqual({ ...chosenEntry('4'), rolls: 1 })
  })

  it('FR-DEC-018, FR-DEC-017: "Use this result" on a decided table with the roll-effect decided opens the dialog; Keep leaves the form open with the sum, and "Use this result" gets the focus (replace-kept)', async () => {
    const { session, saved } = setup({ document: stored({ ancestry: 'ancestry:gnome' }, ['test.rollpast']), random: sequence([3, 3]) })
    renderBuilder('story')
    await pastAndMadness(session, saved)

    // A linha de ações da tabela é o último filho da coluna, depois da caixa da Madness (que tem o seu "Enter result").
    await userEvent.click(within(resultColumn(PAST)!.lastElementChild as HTMLElement).getByRole('button', { name: 'Enter result' }))
    await userEvent.type(within(card('Gnome Past')).getByLabelText('Your d6 roll'), '2')
    const use = within(card('Gnome Past')).getByRole('button', { name: 'Use this result' })
    await userEvent.click(use)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { level: 2 }).textContent).toBe('Change Gnome Past from 4 to 1–3?')
    expect(dialogColumn(dialog, 'New').textContent).toBe('New1–3Entered for d6: 2 · Modifier +0 · Total 2')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep current result' }))
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect((within(card('Gnome Past')).getByLabelText('Your d6 roll') as HTMLInputElement).value).toBe('2')
    await vi.waitFor(() => expect(document.activeElement).toBe(use))
    await nextFrame()
    expect(saved).toHaveLength(2)
  })

  it('FR-DEC-015, FR-STEP-014: the decided roll-effect has "Reroll 1d6" and "Enter result"; both apply directly and focus the result column of the box (effect-reroll)', async () => {
    const { session, saved } = setup({ document: gnome(), random: sequence([3, 3, 0]) })
    renderBuilder('story')
    await pastAndMadness(session, saved)

    const column = resultColumn(MADNESS)!
    await userEvent.click(within(column).getByRole('button', { name: 'Reroll 1d6' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(within(column).getByText('Rolled 1d6: 1 · Modifier +0 · Total 1')).toBeTruthy()
    await vi.waitFor(() => expect(document.activeElement).toBe(column))
    await storySettled(session, saved, 3)
    expect(saved[2].decisions[MADNESS]).toEqual({ mode: 'rolled', dice: [1], modifier: 0, total: 1, logged: 3 })

    await userEvent.click(within(column).getByRole('button', { name: 'Enter result' }))
    const field = within(effectBox()).getByLabelText('Your 1d6 roll')
    await userEvent.type(field, '6{Enter}')
    expect(within(column).getByText('Entered for 1d6: 6 · Modifier +0 · Total 6')).toBeTruthy()
    expect(within(effectBox()).queryByLabelText('Your 1d6 roll')).toBeNull()
    await vi.waitFor(() => expect(document.activeElement).toBe(column))
    await storySettled(session, saved, 4)
    expect(saved[3].decisions[MADNESS]).toEqual({ mode: 'entered', sum: 6, modifier: 0, total: 6, logged: 5 })
  })
})

// FEAT-010 T5 (SCR-WEB-009, SCR-WEB-007): Write e "Roll all undecided", pelos estados do ui-design, com o pacote de
// tabelas (Gnome). Os textos escritos são inventados (P22), como o do AC-3.
describe('Story step: Write and Roll all undecided (FEAT-010)', () => {
  afterEach(cleanup)

  const TEXT = 'Raised by a caravan of tinkers.'
  const HELP = 'Write it in your own words, or as your GM decides. Up to 2,000 characters.'
  const LIMIT = "You've reached the limit. Text past 2,000 characters isn't kept."
  const EMPTY = "Write your result first. Spaces and line breaks alone don't count."
  const REASON = 'Every table in this step has a result.'
  const REROLL_NOTE = "Whichever result you don't use goes to the log as undone. It isn't set aside."
  const PAST = 'ancestry=gnome/past'
  const FATE = 'ancestry=gnome/fate'
  const OMEN = 'ancestry=gnome/omen'
  const FOE = 'ancestry=gnome/foe'
  const TABLE_KEYS = [AGE, FATE, OMEN, PAST, FOE]
  const madness = (extra: object = {}) => ({ mode: 'rolled', dice: [4], modifier: 0, total: 4, ...extra })
  const writtenEntry = (text = TEXT) => ({ mode: 'written', text, book: TABLES })
  /** Faces de um Roll all das cinco tabelas: Age 3+5+2, Fate 1+1+1, Omen 6+6+6 (+1), Past com a face dada, Foe 1. */
  const allFaces = (past: number) => [2, 4, 1, 0, 0, 0, 5, 5, 5, past - 1, 0]

  const field = (name: string) => within(card(name)).getByLabelText('Your own result') as HTMLTextAreaElement
  const button = (name: string, label: string) => within(card(name)).getByRole('button', { name: label })
  const segment = (name: string, label: string) => within(modes(name)).getByRole('radio', { name: label }) as HTMLInputElement
  const dialogColumn = (dialog: HTMLElement, name: string) => within(dialog).getByRole('heading', { level: 3, name }).parentElement!
  const rows = (column: HTMLElement) => [...column.querySelectorAll('.impact-dialog__rows > p')].map((row) => row.textContent)
  const main = () => screen.getByRole('main')
  const announcement = () => main().querySelector('.roll-all [role="status"]')!
  const reason = () => within(main()).getByText(REASON)

  async function write(name: string, text: string) {
    await userEvent.click(segment(name, 'Write'))
    await userEvent.type(field(name), text)
    await userEvent.click(button(name, 'Use this text'))
  }

  it('FR-DEC-003: the Write segment shows the field with its label and help, keeps the focus on the segment, and its draft survives a switch of segment; at 2,000 characters the help says the limit (write-mode)', async () => {
    const { session, repository } = setup({ document: gnome() })
    const writeCommand = vi.spyOn(session, 'write')
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Age' })

    // Write nunca é o inicial; trocar para ele não põe o foco no campo.
    expect(segment('Gnome Age', 'Roll').checked).toBe(true)
    await userEvent.click(segment('Gnome Age', 'Write'))
    expect(segment('Gnome Age', 'Write').checked).toBe(true)
    expect(document.activeElement).toBe(segment('Gnome Age', 'Write'))

    // Campo pelo `<label>` (C9), ajuda pelo `aria-describedby`, três linhas, limite no campo, sem placeholder.
    const input = field('Gnome Age')
    expect(input.tagName).toBe('TEXTAREA')
    expect(input.getAttribute('rows')).toBe('3')
    expect(input.getAttribute('maxlength')).toBe('2000')
    expect(input.hasAttribute('placeholder')).toBe(false)
    expect(input.hasAttribute('aria-label')).toBe(false)
    expect(input.value).toBe('')
    expect(describedBy(input)).toEqual([HELP])
    expect(button('Gnome Age', 'Use this text').className).toContain('button-primary')
    expect(within(card('Gnome Age')).queryByRole('button', { name: 'Cancel' })).toBeNull()
    expect(within(card('Gnome Age')).queryByRole('button', { name: 'Roll 3d6' })).toBeNull()
    expect(within(card('Gnome Age')).getByText('Not decided yet. Nothing else waits for it.')).toBeTruthy()

    // Enter é quebra de linha, sem confirmar; o rascunho sobrevive à troca de segmento.
    await userEvent.type(input, 'Raised by{Enter}tinkers')
    expect(input.value).toBe('Raised by\ntinkers')
    await userEvent.click(segment('Gnome Age', 'Roll'))
    expect(within(card('Gnome Age')).queryByLabelText('Your own result')).toBeNull()
    await userEvent.click(segment('Gnome Age', 'Write'))
    expect(field('Gnome Age').value).toBe('Raised by\ntinkers')

    // No limite, a ajuda ganha a frase, sem erro; o que passa de 2.000 caracteres não entra.
    await userEvent.clear(field('Gnome Age'))
    await userEvent.paste('a'.repeat(2001))
    expect(field('Gnome Age').value).toHaveLength(2000)
    expect(describedBy(field('Gnome Age'))).toEqual([`${HELP} ${LIMIT}`])
    expect(field('Gnome Age').getAttribute('aria-invalid')).toBeNull()
    await userEvent.keyboard('{Backspace}')
    expect(describedBy(field('Gnome Age'))).toEqual([HELP])
    expect(writeCommand).not.toHaveBeenCalled()
    expect(repository.save).not.toHaveBeenCalled()
  })

  it('FR-DEC-021, NFR-ACC-001: Write with only spaces and line breaks is refused in the field, announced by a live region already in the form, keeping the text and the focus on "Use this text", and nothing is saved (write-refused, AC-2)', async () => {
    const { session, repository } = setup({ document: gnome() })
    const writeCommand = vi.spyOn(session, 'write')
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Age' })
    await userEvent.click(segment('Gnome Age', 'Write'))

    // D-ERR: a região viva está no formulário desde que ele abre, vazia (no DOM renderizado, C4).
    const region = card('Gnome Age').querySelector('.write-form [aria-live="polite"]')!
    expect(region).not.toBeNull()
    expect(region.textContent).toBe('')
    const input = field('Gnome Age')
    await userEvent.type(input, '   {Enter}  ')
    const use = button('Gnome Age', 'Use this text')
    await userEvent.click(use)
    expect(writeCommand).toHaveBeenCalledWith(AGE, '   \n  ')

    await vi.waitFor(() => expect(region.textContent).toBe(EMPTY))
    expect(card('Gnome Age').querySelector('.write-form [aria-live="polite"]')).toBe(region)
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(describedBy(input)).toEqual([HELP, EMPTY])
    expect(input.value).toBe('   \n  ')
    expect(document.activeElement).toBe(use)
    await nextFrame()
    expect(document.activeElement).toBe(use)
    expect(repository.save).not.toHaveBeenCalled()

    // A mensagem some na próxima edição.
    await userEvent.type(input, 'x')
    expect(region.textContent).toBe('')
    expect(input.getAttribute('aria-invalid')).toBeNull()
  })

  it('FR-DEC-003, FR-LOG-003, NFR-REL-001 (AC-3, AC-11): "Use this text" shows the written state before the save ends, with the focus on the result column; the text is saved trimmed, and the end of the save does not move the focus (written)', async () => {
    const { session, control, saved } = setup({ document: gnome(), holdSave: true })
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Age' })
    await write('Gnome Age', `  ${TEXT}  `)

    const column = resultColumn(AGE)!
    expect(column.getAttribute('tabindex')).toBe('-1')
    expect(within(column).getByText('Your own result').tagName).toBe('P')
    expect(within(column).getByText(TEXT).classList.contains('written-text')).toBe(true)
    expect(within(column).getByRole('button', { name: 'Change text' }).className).toContain('button-secondary')
    // Sem cálculo, faixa, "No text added for this entry", efeitos, selo de entrada nem caixa de valor.
    expect(column.querySelector('.roll-result__calc, .roll-result__entry, .effect-chips, .source-badge')).toBeNull()
    expect(within(card('Gnome Age')).queryByText(/No text added/)).toBeNull()
    expect(card('Gnome Age').querySelector('.roll-value')).toBeNull()
    expect(within(card('Gnome Age')).queryByLabelText('Your own result')).toBeNull()
    expect(segment('Gnome Age', 'Write').checked).toBe(true)
    await vi.waitFor(() => expect(document.activeElement).toBe(column))
    expect(saved).toEqual([])

    control.release()
    await storySettled(session, saved, 1)
    expect(saved[0].decisions[AGE]).toEqual({ mode: 'written', text: TEXT, book: TABLES, logged: 1 })
    expect(document.activeElement).toBe(column)
    expect(within(main()).getByText('1 of 5 decided')).toBeTruthy()
  })

  it('FR-CHAR-010 (AC-11): when the save of a Write fails, the written state stays with the frame alert, and the focus does not move', async () => {
    const { session, control, saved } = setup({ document: gnome(), holdSave: true, failSave: true })
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Age' })
    await write('Gnome Age', TEXT)
    await vi.waitFor(() => expect(document.activeElement).toBe(resultColumn(AGE)))

    control.release()
    expect((await screen.findByRole('alert')).textContent).toMatch(/Your last choice wasn't saved/)
    await vi.waitFor(() => expect(session.getSnapshot()).toMatchObject({ save: 'failed' }))
    await act(async () => {})
    await nextFrame()
    expect(saved).toEqual([])
    expect(within(resultColumn(AGE)!).getByText(TEXT)).toBeTruthy()
    expect(document.activeElement).toBe(resultColumn(AGE))
  })

  it('FR-DEC-003, FR-DEC-018: a written decision opens in Write; in Roll it has "Roll 3d6", in Choose the grid has no entry marked; without Write in its modes it shows in Roll, with Enter result; Roll on it applies directly (mode-switch-write)', async () => {
    const { session, saved } = setup({ document: gnome({ [AGE]: writtenEntry(), [FATE]: writtenEntry('Born under a falling star.') }), random: sequence([2, 4, 1]) })
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Age' })
    expect(segment('Gnome Age', 'Write').checked).toBe(true)
    expect(within(resultColumn(AGE)!).getByText(TEXT)).toBeTruthy()
    expect(within(resultColumn(AGE)!).getByRole('button', { name: 'Change text' })).toBeTruthy()

    // Roll: o rótulo e o texto, sem caixa nem cálculo, e "Roll 3d6" (não "Reroll": o resultado não foi rolado).
    await userEvent.click(segment('Gnome Age', 'Roll'))
    let column = resultColumn(AGE)!
    expect(within(column).getByText('Your own result')).toBeTruthy()
    expect(within(column).getByText(TEXT)).toBeTruthy()
    expect(within(column).getByRole('button', { name: 'Roll 3d6' }).className).toContain('button-secondary')
    expect(within(card('Gnome Age')).queryByRole('button', { name: 'Reroll 3d6' })).toBeNull()
    expect(within(card('Gnome Age')).queryByRole('button', { name: 'Change text' })).toBeNull()
    expect(card('Gnome Age').querySelector('.roll-value, .roll-result__calc')).toBeNull()

    // Choose: a grade sem entrada marcada e, abaixo, a coluna sem ações.
    await userEvent.click(segment('Gnome Age', 'Choose'))
    expect(within(grid('Gnome Age')).getAllByRole('radio').some((radio) => (radio as HTMLInputElement).checked)).toBe(false)
    column = resultColumn(AGE)!
    expect(within(column).getByText(TEXT)).toBeTruthy()
    expect(within(column).queryByRole('button')).toBeNull()

    // A Gnome Fate (regime roll) não tem Write: a escrita aparece no Roll, com "Roll 3d6" e "Enter result".
    expect(within(modes('Gnome Fate')).queryByRole('radio', { name: 'Write' })).toBeNull()
    expect(segment('Gnome Fate', 'Roll').checked).toBe(true)
    const fate = resultColumn(FATE)!
    expect(within(fate).getByText('Born under a falling star.')).toBeTruthy()
    expect(within(fate).getByRole('button', { name: 'Roll 3d6' })).toBeTruthy()
    expect(within(fate).getByRole('button', { name: 'Enter result' })).toBeTruthy()

    // Roll sobre a escrita, sem dependentes: aplica direto, com o foco na coluna, no segmento Roll.
    await userEvent.click(segment('Gnome Age', 'Roll'))
    await userEvent.click(button('Gnome Age', 'Roll 3d6'))
    column = resultColumn(AGE)!
    expect(within(column).getByText('Rolled 3d6: 3 + 5 + 2 · Modifier +0 · Total 10')).toBeTruthy()
    await vi.waitFor(() => expect(document.activeElement).toBe(column))
    await storySettled(session, saved, 1)
    expect(saved[0].decisions[AGE]).toMatchObject({ mode: 'rolled', entry: '8-12', rolls: 1 })

    // Write sobre a rolada: o campo vazio e, abaixo, a coluna da rolada, com o cálculo e sem ações.
    await userEvent.click(segment('Gnome Age', 'Write'))
    expect(field('Gnome Age').value).toBe('')
    column = resultColumn(AGE)!
    expect(within(column).getByText('Rolled 3d6: 3 + 5 + 2 · Modifier +0 · Total 10')).toBeTruthy()
    expect(within(column).queryByRole('button')).toBeNull()
  })

  it('FR-DEC-018, FR-CHG-002: Write on a chosen entry with a fixed effect applies directly, without a dialog, and takes the focus to the result column (mode-switch-write)', async () => {
    const { session, saved } = setup({ document: gnome({ [PAST]: chosenEntry('5-6') }) })
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Past' })
    expect(segment('Gnome Past', 'Choose').checked).toBe(true)
    await userEvent.click(segment('Gnome Past', 'Write'))
    // Abaixo do formulário, a coluna da escolhida: a entrada e o efeito, sem ações.
    let column = resultColumn(PAST)!
    expect(column.querySelector('.roll-result__entry')!.textContent).toBe('5–6')
    expect(within(column).getByRole('listitem').textContent).toBe('Madness +1')
    expect(within(column).queryByRole('button')).toBeNull()

    await userEvent.type(field('Gnome Past'), TEXT)
    await userEvent.click(button('Gnome Past', 'Use this text'))
    expect(screen.queryByRole('dialog')).toBeNull()
    column = resultColumn(PAST)!
    expect(within(column).getByText(TEXT)).toBeTruthy()
    expect(within(column).queryByRole('listitem')).toBeNull()
    await vi.waitFor(() => expect(document.activeElement).toBe(column))
    await storySettled(session, saved, 1)
    expect(saved[0].decisions[PAST]).toMatchObject({ mode: 'written', text: TEXT, book: TABLES })
  })

  it('FR-DEC-018, FR-DEC-021: "Change text" opens the form in place with the text, the focus and the caret at the end; Cancel and the same text go back to "Change text" without a command; empty is refused; another text replaces it, with its line break (write-again)', async () => {
    const { session, saved } = setup({ document: gnome({ [AGE]: writtenEntry() }) })
    const writeCommand = vi.spyOn(session, 'write')
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Age' })

    await userEvent.click(button('Gnome Age', 'Change text'))
    let input = field('Gnome Age')
    expect(input.value).toBe(TEXT)
    await vi.waitFor(() => expect(document.activeElement).toBe(input))
    expect([input.selectionStart, input.selectionEnd]).toEqual([TEXT.length, TEXT.length])
    expect(within(card('Gnome Age')).queryByRole('button', { name: 'Change text' })).toBeNull()
    const actionRow = button('Gnome Age', 'Use this text').parentElement!
    expect(within(actionRow).getAllByRole('button').map((action) => action.textContent)).toEqual(['Use this text', 'Cancel'])

    // Cancel: volta ao escrito sem gravar, com o foco em "Change text".
    await userEvent.type(input, ' And more.')
    await userEvent.click(button('Gnome Age', 'Cancel'))
    expect(within(resultColumn(AGE)!).getByText(TEXT)).toBeTruthy()
    await vi.waitFor(() => expect(document.activeElement).toBe(button('Gnome Age', 'Change text')))

    // O mesmo texto depois do `trim` (D5): sem comando, como o Cancel; a edição anterior foi descartada.
    await userEvent.click(button('Gnome Age', 'Change text'))
    expect(field('Gnome Age').value).toBe(TEXT)
    await userEvent.type(field('Gnome Age'), '  ')
    await userEvent.click(button('Gnome Age', 'Use this text'))
    expect(within(resultColumn(AGE)!).getByText(TEXT)).toBeTruthy()
    await vi.waitFor(() => expect(document.activeElement).toBe(button('Gnome Age', 'Change text')))
    expect(writeCommand).not.toHaveBeenCalled()

    // Vazio: a recusa, com o formulário aberto e o foco em "Use this text".
    await userEvent.click(button('Gnome Age', 'Change text'))
    input = field('Gnome Age')
    await userEvent.clear(input)
    await userEvent.click(button('Gnome Age', 'Use this text'))
    await vi.waitFor(() => expect(describedBy(input)).toContain(EMPTY))
    expect(document.activeElement).toBe(button('Gnome Age', 'Use this text'))

    // Outro texto, com uma quebra de linha: substitui, fecha o formulário e leva o foco à coluna.
    const replaced = `${TEXT}\nThey taught me to mend clocks.`
    await userEvent.type(input, `${TEXT}{Enter}They taught me to mend clocks.`)
    await userEvent.click(button('Gnome Age', 'Use this text'))
    const column = resultColumn(AGE)!
    expect(column.querySelector('.written-text')!.textContent).toBe(replaced)
    expect(within(card('Gnome Age')).queryByLabelText('Your own result')).toBeNull()
    await vi.waitFor(() => expect(document.activeElement).toBe(column))
    await storySettled(session, saved, 1)
    expect(saved[0].decisions[AGE]).toMatchObject({ mode: 'written', text: replaced })
    expect(writeCommand).toHaveBeenCalledTimes(2)
  })

  it('FR-DEC-017, FR-DEC-018, FR-CHG-001, FR-CHG-009: Write on Gnome Past 4 with the Madness rolled opens the by-write dialog; Keep leaves the form and the draft with the focus on "Use this text"; Apply sets the Madness aside and focuses the result column; Choose 4 then restores it, with the written Current (by-write, AC-6)', async () => {
    const { session, saved, repository } = setup({ document: gnome({ [PAST]: chosenEntry('4'), [MADNESS]: madness() }), random: sequence([]) })
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Past' })
    await userEvent.click(segment('Gnome Past', 'Write'))
    await userEvent.type(field('Gnome Past'), TEXT)
    const use = button('Gnome Past', 'Use this text')
    await userEvent.click(use)

    let dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { level: 2 }).textContent).toBe('Change Gnome Past from 4 to your own result?')
    expect(dialogColumn(dialog, 'Current').textContent).toBe('Current4ChosenMadness +1d6')
    expect(dialogColumn(dialog, 'New').textContent).toBe(`New${TEXT}Written`)
    expect(items(within(dialog).getByRole('list', { name: 'Will be set aside' }))).toEqual(['Madness 1d6: 4 · rolled'])
    expect(within(dialog).getByText(IMPACT_D40)).toBeTruthy()
    expect(within(dialog).queryByText(REROLL_NOTE)).toBeNull()

    // Keep: nada é gravado; o formulário continua aberto, com o rascunho, e o foco volta a "Use this text".
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep current result' }))
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await vi.waitFor(() => expect(document.activeElement).toBe(use))
    await nextFrame()
    expect(document.activeElement).toBe(use)
    expect(field('Gnome Past').value).toBe(TEXT)
    expect(segment('Gnome Past', 'Write').checked).toBe(true)
    expect(repository.save).not.toHaveBeenCalled()

    // Apply: o estado escrito, sem a Madness no cartão, com o foco na coluna de resultado.
    await userEvent.click(use)
    dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply new result' }))
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const column = resultColumn(PAST)!
    expect(within(column).getByText(TEXT)).toBeTruthy()
    expect(document.getElementById(slotElementId(MADNESS))).toBeNull()
    await vi.waitFor(() => expect(document.activeElement).toBe(column))
    await storySettled(session, saved, 1)
    expect(saved[0].decisions[PAST]).toMatchObject({ mode: 'written', text: TEXT })
    expect(saved[0].decisions[MADNESS]).toMatchObject({ total: 4, setAside: true })

    // Choose 4 sobre a escrita: só restauração, com o Current escrito; Apply sem sorteio, foco na entrada acionada.
    await userEvent.click(segment('Gnome Past', 'Choose'))
    const four = entryRadio('Gnome Past', '4 TT p.7')
    expect(four.checked).toBe(false)
    await userEvent.click(four)
    dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { level: 2 }).textContent).toBe('Change Gnome Past from your own result to 4?')
    expect(dialogColumn(dialog, 'Current').textContent).toBe(`Current${TEXT}Written`)
    expect(dialogColumn(dialog, 'New').textContent).toBe('New4ChosenMadness +1d6')
    expect(within(dialog).queryByRole('list', { name: 'Will be set aside' })).toBeNull()
    expect(items(within(dialog).getByRole('list', { name: 'Will be restored' }))).toEqual(['Madness 1d6: 4 · rolled'])
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply new result' }))
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await vi.waitFor(() => expect(document.activeElement).toBe(entryRadio('Gnome Past', '4 TT p.7')))
    expect(within(resultColumn(MADNESS)!).getByText('Rolled 1d6: 4 · Modifier +0 · Total 4')).toBeTruthy()
    await storySettled(session, saved, 2)
    expect(saved[1].decisions[MADNESS]).toEqual(madness())
  })

  it('FR-DEC-015, FR-CHG-010: Roll on a written Gnome Past that brings the Madness back opens the dialog with the written Current and the reroll note; Keep focuses "Roll d6" (mode-switch-write)', async () => {
    const { session, saved } = setup({ document: gnome({ [PAST]: writtenEntry(), [MADNESS]: madness({ setAside: true }) }), random: sequence([3]) })
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Past' })
    await userEvent.click(segment('Gnome Past', 'Roll'))
    const roll = button('Gnome Past', 'Roll d6')
    await userEvent.click(roll)

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { level: 2 }).textContent).toBe('Use the new roll for Gnome Past?')
    expect(dialogColumn(dialog, 'Current').textContent).toBe(`Current${TEXT}Written`)
    expect(dialogColumn(dialog, 'New').textContent).toBe('New4Rolled d6: 4 · Modifier +0 · Total 4Madness +1d6')
    expect(within(dialog).getByText(REROLL_NOTE)).toBeTruthy()
    expect(items(within(dialog).getByRole('list', { name: 'Will be restored' }))).toEqual(['Madness 1d6: 4 · rolled'])
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep current result' }))
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await vi.waitFor(() => expect(document.activeElement).toBe(roll))
    expect(within(resultColumn(PAST)!).getByText(TEXT)).toBeTruthy()
    await storySettled(session, saved, 1)
    expect(saved[0].decisions[PAST]).toMatchObject({ mode: 'written', text: TEXT, rolls: 1 })
  })

  it('FR-CHG-004, FR-CHG-005: in the dialog lists, a written decision shows its title and " · written", with the whole text below; the other lines stay as they were (written-line)', async () => {
    const text = `${TEXT}\nThey taught me to mend clocks.`
    setup({ document: gnome({ 'ancestry=gnome/stature': { mode: 'chosen', value: 1 }, [AGE]: writtenEntry(text), [FOE]: chosenEntry('1-10') }) })
    renderBuilder()
    await userEvent.click(await screen.findByRole('radio', { name: 'Troll' }))
    await userEvent.click(screen.getByRole('button', { name: 'Choose Troll' }))
    const dialog = await screen.findByRole('dialog')
    const lines = within(within(dialog).getByRole('list', { name: 'Will be set aside' })).getAllByRole('listitem')
    expect(lines.map((line) => line.querySelector('.decision-line > span')!.textContent)).toEqual([
      'Stature: 1',
      'Gnome Age · written',
      'Gnome Foe: 1–10 Wolves · chosen',
    ])
    expect(lines[1].querySelector('.written-text')!.textContent).toBe(text)
    expect(lines[1].querySelector('.typography-badge')).toBeNull()
    expect(lines[1].hasAttribute('aria-label')).toBe(false)
    expect(lines.map((line) => line.querySelector('.written-text') !== null)).toEqual([false, true, false])
  })

  it('FR-CONT-016: in the open notice, a written decision of a slot that is no longer generated shows the frozen title, " · written" and the text from its log entry (written-line)', async () => {
    const entry = {
      id: 1,
      at: '2026-01-01T00:00:00.000Z',
      kind: 'decision',
      slot: 'ancestry=troll/age',
      slotKind: 'table',
      step: { id: 'step:story', name: 'Story' },
      origin: { id: 'ancestry:troll', name: 'Troll' },
      mode: 'written',
      subject: { id: 'table:troll-age', name: 'Troll Age' },
      source: { book: TABLES, abbr: 'TT', page: 9 },
      result: { text: TEXT },
    }
    const document = { ...gnome({ 'ancestry=troll/age': { ...writtenEntry(), logged: 1 } }), log: [entry] }
    setup({ document })
    renderBuilder()
    await stepTitle("What is your character's ancestry?")
    const notice = within(main()).getByText(NOTICE_TITLE).closest('.inline-alert') as HTMLElement
    const list = within(notice).getByRole('list', { name: 'Set aside, because the current rules no longer have them:' })
    const [line] = within(list).getAllByRole('listitem')
    expect(line.querySelector('.decision-line > span')!.textContent).toBe('Troll Age · written')
    expect(line.querySelector('.written-text')!.textContent).toBe(TEXT)
  })

  it('FR-DEC-023, FR-DEC-016, NFR-REL-001 (AC-8, AC-11): "Roll all undecided · 5" is the first element of the step body; it rolls every card before the save ends, each in Roll, announces the results and takes the focus to the reason of the disabled button; a Write draft is kept (roll-all, roll-all-applied)', async () => {
    const { session, control, saved } = setup({ document: gnome(), random: sequence(allFaces(1)), holdSave: true })
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Age' })
    const rollAll = within(main()).getByRole('button', { name: 'Roll all undecided · 5' })
    expect(rollAll.className).toContain('button-secondary')
    expect(rollAll.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true')
    expect(rollAll.hasAttribute('aria-label')).toBe(false)
    // Depois do cabeçalho e antes do primeiro cartão, fora dos cartões e da região fixa do celular.
    const h1 = within(main()).getByRole('heading', { level: 1 })
    expect(h1.compareDocumentPosition(rollAll) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(rollAll.compareDocumentPosition(card('Gnome Age')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(rollAll.closest('.roll-card, .builder__dock')).toBeNull()
    // A região do anúncio já existe, vazia.
    expect(announcement().textContent).toBe('')

    await userEvent.click(segment('Gnome Age', 'Write'))
    await userEvent.type(field('Gnome Age'), 'A draft')
    await userEvent.click(rollAll)

    // Cada cartão no rolled pelo snapshot, antes da gravação, no segmento Roll (a Foe também), com "Reroll".
    const calcs = {
      'Gnome Age': 'Rolled 3d6: 3 + 5 + 2 · Modifier +0 · Total 10',
      'Gnome Fate': 'Rolled 3d6: 1 + 1 + 1 · Modifier +0 · Total 3',
      'Gnome Omen': 'Rolled 3d6+1: 6 + 6 + 6 · Modifier +1 · Total 19',
      'Gnome Past': 'Rolled d6: 1 · Modifier +0 · Total 1',
      'Gnome Foe': 'Rolled d20: 1 · Modifier +0 · Total 1',
    }
    for (const [name, calc] of Object.entries(calcs)) {
      expect(segment(name, 'Roll').checked, `${name}: Roll`).toBe(true)
      expect(card(name).querySelector('.roll-result__calc')!.textContent).toBe(calc)
      expect(card(name).querySelector('.roll-value')).not.toBeNull()
      expect(within(card(name)).getByRole('button', { name: /^Reroll / })).toBeTruthy()
    }
    expect(saved).toEqual([])
    expect(announcement().textContent).toBe(
      'Rolled 5 tables. Gnome Age: 8–12. Gnome Fate: 3–10. Gnome Omen: 12–19. Gnome Past: 1–3. Gnome Foe: 1–10 Wolves.',
    )
    expect(within(main()).getByText('5 of 5 decided')).toBeTruthy()

    // roll-all-none: o mesmo botão, desabilitado e sem quantidade, com o motivo ligado; o foco vai para o motivo.
    expect(within(main()).getByRole('button', { name: 'Roll all undecided' })).toBe(rollAll)
    expect(rollAll.hasAttribute('disabled')).toBe(true)
    expect(describedBy(rollAll)).toEqual([REASON])
    expect(reason().getAttribute('tabindex')).toBe('-1')
    await vi.waitFor(() => expect(document.activeElement).toBe(reason()))

    control.release()
    await storySettled(session, saved, 1)
    expect(TABLE_KEYS.map((key) => saved[0].decisions[key])).toMatchObject(
      TABLE_KEYS.map((_, index) => ({ mode: 'rolled', rolls: 1, book: TABLES, logged: index + 1 })),
    )
    expect(document.activeElement).toBe(reason())
    expect(announcement().textContent).toMatch(/^Rolled 5 tables\./)

    // O rascunho do Write ficou guardado no cartão rolado.
    await userEvent.click(segment('Gnome Age', 'Write'))
    expect(field('Gnome Age').value).toBe('A draft')
  })

  it('FR-DEC-023, FR-CHAR-010 (AC-8, AC-11): with the Foe chosen and the Age written, "Roll all undecided · 3" rolls only the others; a failed save keeps them with the frame alert, without moving the focus or changing the announcement (roll-all-applied)', async () => {
    const { session, control, saved } = setup({
      document: gnome({ [FOE]: chosenEntry('11-20'), [AGE]: writtenEntry() }),
      random: sequence([0, 0, 0, 5, 5, 5, 0]),
      holdSave: true,
      failSave: true,
    })
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Age' })
    await userEvent.click(within(main()).getByRole('button', { name: 'Roll all undecided · 3' }))
    await vi.waitFor(() => expect(document.activeElement).toBe(reason()))
    const text = 'Rolled 3 tables. Gnome Fate: 3–10. Gnome Omen: 12–19. Gnome Past: 1–3.'
    expect(announcement().textContent).toBe(text)
    // As decididas não mudam.
    expect(within(resultColumn(AGE)!).getByText(TEXT)).toBeTruthy()
    expect(segment('Gnome Age', 'Write').checked).toBe(true)
    expect(entryRadio('Gnome Foe', '11–20 Bears').checked).toBe(true)

    control.release()
    expect((await screen.findByRole('alert')).textContent).toMatch(/Your last choice wasn't saved/)
    await vi.waitFor(() => expect(session.getSnapshot()).toMatchObject({ save: 'failed' }))
    await act(async () => {})
    await nextFrame()
    expect(saved).toEqual([])
    expect(document.activeElement).toBe(reason())
    expect(announcement().textContent).toBe(text)
    expect(card('Gnome Past').querySelector('.roll-result__calc')!.textContent).toBe('Rolled d6: 1 · Modifier +0 · Total 1')
  })

  it('FR-DEC-023: with every table decided, "Roll all undecided" is disabled, without the count, out of the tab order, with the reason visible and linked (roll-all-none)', async () => {
    const { session } = setup({
      document: gnome({ [AGE]: writtenEntry(), [FATE]: chosenEntry('3-10'), [OMEN]: chosenEntry('4-11'), [PAST]: chosenEntry('1-3'), [FOE]: chosenEntry('1-10') }),
    })
    const rollAllCommand = vi.spyOn(session, 'rollAll')
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Age' })
    const rollAll = within(main()).getByRole('button', { name: 'Roll all undecided' })
    expect(rollAll.hasAttribute('disabled')).toBe(true)
    expect(describedBy(rollAll)).toEqual([REASON])
    expect(reason().className).toContain('typography-meta')
    await userEvent.click(rollAll)
    expect(rollAllCommand).not.toHaveBeenCalled()
  })

  it('FR-DEC-023, FR-CHG-001, FR-CHG-009 (AC-10): Roll all with one table that brings the Madness back opens the dialog of a roll on an open slot; Keep saves nothing and focuses the button; Apply restores it, without an announcement, with the focus on the reason (by-roll-all)', async () => {
    const { session, saved, repository } = setup({
      document: gnome({ [AGE]: chosenEntry('3-7'), [FATE]: chosenEntry('3-10'), [OMEN]: chosenEntry('4-11'), [FOE]: chosenEntry('1-10'), [MADNESS]: madness({ setAside: true }) }),
      random: sequence([3, 3]),
    })
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Past' })
    const rollAll = within(main()).getByRole('button', { name: 'Roll all undecided · 1' })
    await userEvent.click(rollAll)

    let dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { level: 2 }).textContent).toBe('Use this roll for Gnome Past?')
    expect(dialogColumn(dialog, 'Current').textContent).toBe('CurrentNot decided yet.')
    expect(dialogColumn(dialog, 'New').textContent).toBe('New4Rolled d6: 4 · Modifier +0 · Total 4Madness +1d6')
    // Sem `change`, a restaurada leva o "depends on".
    expect(items(within(dialog).getByRole('list', { name: 'Will be restored' }))).toEqual(['Madness 1d6: 4 · rolleddepends on Gnome Past'])
    expect(within(dialog).queryByRole('list', { name: 'Will be set aside' })).toBeNull()
    expect(within(dialog).queryByText(IMPACT_D40)).toBeNull()
    expect(within(dialog).queryByText(REROLL_NOTE)).toBeNull()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep current result' }))
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await vi.waitFor(() => expect(document.activeElement).toBe(rollAll))
    await nextFrame()
    expect(document.activeElement).toBe(rollAll)
    expect(rollAll.hasAttribute('disabled')).toBe(false)
    expect(repository.save).not.toHaveBeenCalled()

    await userEvent.click(rollAll)
    dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply new result' }))
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(within(resultColumn(MADNESS)!).getByText('Rolled 1d6: 4 · Modifier +0 · Total 4')).toBeTruthy()
    await vi.waitFor(() => expect(document.activeElement).toBe(reason()))
    expect(announcement().textContent).toBe('')
    await storySettled(session, saved, 1)
    expect(saved[0].decisions[PAST]).toMatchObject({ mode: 'rolled', entry: '4', rolls: 1 })
    expect(saved[0].decisions[MADNESS]).toEqual(madness())
    expect(document.activeElement).toBe(reason())
  })

  it('FR-DEC-023, FR-CHG-001, FR-CHG-003, FR-CHG-009 (AC-10): Roll all with several tables that brings the Madness back lists one line per table in Current and New; Keep current results focuses the button; Apply new results restores it, with the focus on the reason (by-roll-all)', async () => {
    const { session, saved, repository } = setup({
      document: gnome({ [MADNESS]: madness({ setAside: true }) }),
      random: sequence([...allFaces(4), ...allFaces(4)]),
    })
    renderBuilder('story')
    await screen.findByRole('region', { name: 'Gnome Past' })
    const rollAll = within(main()).getByRole('button', { name: 'Roll all undecided · 5' })
    await userEvent.click(rollAll)

    let dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { level: 2 }).textContent).toBe('Use these rolls for 5 tables?')
    expect(rows(dialogColumn(dialog, 'Current'))).toEqual(CARDS.map((name) => `${name}: Not decided yet.`))
    expect(rows(dialogColumn(dialog, 'New'))).toEqual([
      'Gnome Age: 8–12 · rolled',
      'Gnome Fate: 3–10 · rolled',
      'Gnome Omen: 12–19 · rolled',
      'Gnome Past: 4 · rolled',
      'Gnome Foe: 1–10 Wolves · rolled',
    ])
    expect(items(within(dialog).getByRole('list', { name: 'Will be restored' }))).toEqual(['Madness 1d6: 4 · rolleddepends on Gnome Past'])
    expect(within(dialog).queryByRole('list', { name: 'Will be set aside' })).toBeNull()
    expect(within(dialog).queryByText(IMPACT_D40)).toBeNull()
    expect(within(dialog).queryByText(REROLL_NOTE)).toBeNull()
    expect(within(dialog).queryByRole('button', { name: 'Keep current result' })).toBeNull()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep current results' }))
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await vi.waitFor(() => expect(document.activeElement).toBe(rollAll))
    await nextFrame()
    expect(document.activeElement).toBe(rollAll)
    expect(within(main()).getByText('0 of 5 decided')).toBeTruthy()
    expect(repository.save).not.toHaveBeenCalled()

    await userEvent.click(rollAll)
    dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply new results' }))
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await vi.waitFor(() => expect(document.activeElement).toBe(reason()))
    expect(announcement().textContent).toBe('')
    expect(within(resultColumn(MADNESS)!).getByText('Rolled 1d6: 4 · Modifier +0 · Total 4')).toBeTruthy()
    await storySettled(session, saved, 1)
    expect(TABLE_KEYS.map((key) => saved[0].decisions[key])).toMatchObject(TABLE_KEYS.map(() => ({ mode: 'rolled', rolls: 1 })))
    expect(saved[0].decisions[MADNESS]).toEqual(madness())
  })
})