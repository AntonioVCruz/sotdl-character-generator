import {
  characterDocumentSchema,
  loadBook,
  PackLoadError,
  type Book,
  type CharacterDocument,
  type Decision,
  type DecisionEntry,
  type DecisionValue,
  type PackSource,
} from '../content'
import { cryptoRandomSource, rollDice, type RandomSource } from '../dice'
import {
  candidatesOf,
  EngineError,
  evaluate,
  impact,
  resolve,
  settle,
  type CharacterView,
  type Impact,
  type Provenance,
  type Rules,
  type Settled,
  type SlotView,
} from '../engine'
import type { CharacterRepository, LastStepStore } from '../storage'
import { change, decline, markEntries, nextLogId, type Change, type ChangeRequest } from './changes'

// Sessão do personagem (technical-design §3.2): store externo lido pelo React com `useSyncExternalStore`
// (ADR-006). Os comandos são os únicos que escrevem (ADR-004 §5), e cada decisão registrada vai ao log (FEAT-009 §3.3).

/**
 * Projeção do documento para a lista inicial (ADR-002; FEAT-001 §3.1). Derivada a cada gravação, nunca entrada
 * de cálculo (FEAT-001 D1): a Home a exibe sem carregar pacotes (NFR-PERF-001).
 */
export interface CharacterSummary {
  id: string
  name: string
  /** Nome da ancestralidade escolhida. */
  ancestry: string | null
  /** FR-CHAR-005, 006: `complete` quando nenhuma vaga obrigatória está aberta (FEAT-001 D2). */
  status: 'creating' | 'complete'
  /** `view.openDecisions.length`; `null` só em metadado gravado antes da FEAT-001. */
  openDecisions: number | null
  /** Na ordem de prioridade (FR-CHAR-003; FEAT-001 D7). */
  sources: { id: string; name: string; abbr: string }[]
  /** Do documento, para a FEAT-011 detectar o metadado desatualizado (D1). */
  contentVersion: string
  updatedAt: string
}

export type OpenFailure = 'not-found' | 'storage-unavailable' | 'unreadable' | 'pack-load-failed'

/** Mudança calculada à espera de Apply ou Keep (FEAT-011 §3.2; SCR-WEB-007). O documento e a visão na tela são os de antes. */
export interface PendingChange {
  kind: 'decide' | 'roll' | 'enter' | 'clear'
  key: string
  impact: Impact
}

export type Snapshot =
  | { status: 'loading'; id: string }
  | { status: 'error'; id: string; reason: OpenFailure }
  | {
      status: 'ready'
      id: string
      document: CharacterDocument
      rules: Rules
      view: CharacterView
      save: 'saved' | 'saving' | 'failed'
      /** Slug da última etapa visitada, lido em `open` (FR-CHAR-007; FEAT-001 §3.4). */
      lastStep?: string
      /** Mudança com suspensas ou restauradas, à espera de `confirm` ou `keep` (FR-CHG-001; FEAT-011 D3). */
      pending?: PendingChange
      /** Aviso da abertura com diferença (FR-CONT-016), até `dismissNotice`. */
      notice?: OpenNotice
    }

/** O que a abertura achou de diferente da marca de registro (FEAT-011 §3.2, "Abrir"). */
export interface OpenNotice {
  setAside: Settled['setAside']
  restored: Settled['restored']
}

export type DecideResult =
  | { ok: true }
  // `already-decided`: o ajuste é uma vez só (FEAT-008 D3); `not-decided`: `clear` de vaga sem decisão.
  | { ok: false; reason: 'unknown-slot' | 'invalid-value' | 'already-decided' | 'not-decided' }
  // FEAT-009 D4: a soma informada fora de `[count, count × sides]`, com essa faixa (FR-DEC-020).
  | { ok: false; reason: 'out-of-range'; range: [min: number, max: number] }
  | { ok: false; reason: 'save-failed' }
  // FEAT-011 §3.2: `pending` posto no snapshot, nada aplicado; outro comando com uma pendente; confirm ou keep sem ela.
  | { ok: false; reason: 'needs-confirmation' | 'change-pending' | 'no-pending' }

export type Repository = CharacterRepository<CharacterDocument, CharacterSummary>
export type LoadRules = (order: string[]) => Promise<Rules>

export interface SessionDeps {
  repository: Repository
  loadRules: LoadRules
  now?: () => Date
  /** Padrão: um store que não guarda nada (FEAT-001 §3.4). */
  lastStep?: LastStepStore
  /** Padrão: o `crypto` do navegador (ADR-009). Os testes injetam uma sequência fixa. */
  random?: RandomSource
}

const NO_LAST_STEP: LastStepStore = { get: () => undefined, set: () => undefined, forget: () => undefined }

export function summarize(document: CharacterDocument, rules: Rules): CharacterSummary {
  const view = evaluate(rules, document)
  const ancestry = view.ancestry ? rules.items.get(view.ancestry) : undefined
  const openDecisions = view.openDecisions.length
  return {
    id: document.id,
    name: document.text.name ?? '',
    ancestry: ancestry && 'name' in ancestry ? ancestry.name : null,
    status: openDecisions === 0 ? 'complete' : 'creating',
    openDecisions,
    sources: rules.books.map(({ id, name, abbr }) => ({ id, name, abbr })),
    contentVersion: document.contentVersion,
    updatedAt: document.updatedAt,
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const text = (value: unknown) => (typeof value === 'string' ? value : '')

/**
 * Leitura tolerante de um registro de metadados (FEAT-001 §3.1): os gravados antes da FEAT-001 não têm os campos
 * novos. Sem `id` string, o registro é ignorado; o `status` sai sempre da contagem, nunca do valor gravado.
 */
export function readSummary(raw: unknown): CharacterSummary | null {
  if (!isRecord(raw) || typeof raw.id !== 'string') return null
  const open = raw.openDecisions
  const openDecisions = typeof open === 'number' && Number.isInteger(open) && open >= 0 ? open : null
  const sources = Array.isArray(raw.sources)
    ? raw.sources.filter(
        (source): source is CharacterSummary['sources'][number] =>
          isRecord(source) && typeof source.id === 'string' && typeof source.name === 'string' && typeof source.abbr === 'string',
      )
    : []
  return {
    id: raw.id,
    name: text(raw.name),
    ancestry: typeof raw.ancestry === 'string' ? raw.ancestry : null,
    status: openDecisions === 0 ? 'complete' : 'creating',
    openDecisions,
    sources: sources.map(({ id, name, abbr }) => ({ id, name, abbr })),
    contentVersion: text(raw.contentVersion),
    updatedAt: text(raw.updatedAt),
  }
}

/** FR-CHAR-004: edição mais recente primeiro (o ISO do `toISOString` compara como texto), empate pelo `id`; sem data, no fim. */
export function byRecentEdit(a: CharacterSummary, b: CharacterSummary): number {
  if (a.updatedAt !== b.updatedAt) {
    if (!a.updatedAt) return 1
    if (!b.updatedAt) return -1
    return a.updatedAt < b.updatedAt ? 1 : -1
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/** Livros carregados uma vez e regras memoizadas pela ordem de fontes (architecture.md §8, Desempenho). */
export function createRulesLoader(packs: PackSource = {}): LoadRules {
  const books = new Map<string, Promise<Book>>()
  const rules = new Map<string, Rules>()
  const book = (id: string) => {
    let loading = books.get(id)
    if (!loading) {
      loading = loadBook(id, packs)
      loading.catch(() => books.delete(id))
      books.set(id, loading)
    }
    return loading
  }
  return async (order) => {
    const key = order.join('\n')
    const cached = rules.get(key)
    if (cached) return cached
    const resolved = resolve(await Promise.all(order.map(book)), order)
    rules.set(key, resolved)
    return resolved
  }
}

/** O valor cabe na vaga: uma opção viva, ou, no ajuste, dois atributos vigentes e diferentes; na tabela, uma entrada dela. */
function isValid(slot: SlotView, value: DecisionValue): boolean {
  switch (slot.kind) {
    case 'choose-entity':
      return slot.options.some((option) => option.id === value)
    case 'choose-value':
      return typeof value === 'number' && slot.options.includes(value)
    case 'attribute-shift': {
      const isAttribute = (id: string) => slot.options.some((option) => option.id === id)
      return typeof value === 'object' && value.decrease !== value.increase && isAttribute(value.decrease) && isAttribute(value.increase)
    }
    // Sem resolvedor até a FEAT-016 (D9 da FEAT-007).
    case 'attribute-increase':
    case 'language-or-profession':
      return false
    case 'table':
      return typeof value === 'string' && slot.table.entries.some((entry) => entry.key === value)
    // O efeito com dado só tem Roll e Enter result (FR-STEP-014).
    case 'roll-effect':
      return false
  }
}

type DiceSlot = Extract<SlotView, { kind: 'table' | 'roll-effect' }>
type LogDraft = Omit<DecisionEntry, 'id' | 'at'>
type Ready = Extract<Snapshot, { status: 'ready' }>

const named = (rules: Rules, id: string) => {
  const item = rules.items.get(id)
  return { id, name: item && 'name' in item ? item.name : id }
}
const sourceOf = ({ book, abbr, page }: Provenance) => ({ book, abbr, ...(page !== undefined && { page }) })

/**
 * Entrada de log de uma decisão (FEAT-009 §3.3), com os nomes congelados, montada da vista e das regras de antes do
 * comando e da decisão gravada. A fonte é a da entrada (tabela), a da entidade escolhida, ou a do item que declara a
 * vaga (a etapa, ou quem a concedeu).
 */
function logDraft(rules: Rules, slot: SlotView, decision: Decision): LogDraft {
  const step = named(rules, slot.stepId)
  const declaring = rules.items.get(slot.source?.id ?? slot.stepId)?.provenance
  const base = { kind: 'decision' as const, slot: slot.key, slotKind: slot.kind, step, origin: slot.source, mode: decision.mode }
  const roll = (dice: { count: number; sides: number }) => {
    if (decision.mode === 'chosen') return {}
    const fact = { count: dice.count, sides: dice.sides, modifier: decision.modifier, total: decision.total }
    if (decision.mode === 'entered') return { roll: { ...fact, sum: decision.sum } }
    return { roll: { ...fact, ...(decision.rolls !== undefined && { rolls: decision.rolls }), faces: decision.dice } }
  }
  switch (slot.kind) {
    case 'table': {
      const key = decision.mode === 'chosen' ? (decision.value as string) : decision.entry!
      const entry = slot.table.entries.find((candidate) => candidate.key === key)!
      return {
        ...base,
        subject: { id: slot.table.id, name: slot.table.name },
        source: sourceOf(entry.provenance),
        result: { entry: key, ...(entry.entity && { entity: entry.entity }) },
        ...roll(slot.table.dice),
      }
    }
    case 'roll-effect':
      return {
        ...base,
        subject: slot.target,
        source: sourceOf(declaring!),
        // Rolada ou informada: o efeito com dado não tem Choose (FR-STEP-014).
        result: { value: (decision as Exclude<Decision, { mode: 'chosen' }>).total },
        ...roll(slot.dice),
      }
    case 'choose-entity': {
      const option = slot.options.find((candidate) => decision.mode === 'chosen' && candidate.id === decision.value)!
      return { ...base, subject: null, source: sourceOf(option.provenance), result: { entity: { id: option.id, name: option.name } } }
    }
    case 'attribute-shift': {
      const shift = (decision as Extract<Decision, { mode: 'chosen' }>).value as { decrease: string; increase: string }
      const result = { shift: { decrease: named(rules, shift.decrease), increase: named(rules, shift.increase) } }
      return { ...base, subject: null, source: sourceOf(declaring!), result }
    }
    default: {
      const value = (decision as Extract<Decision, { mode: 'chosen' }>).value as number
      const subject = slot.kind === 'choose-value' ? named(rules, slot.target) : null
      return { ...base, subject, source: sourceOf(declaring!), result: { value } }
    }
  }
}

export function createCharacterSession({
  repository,
  loadRules,
  now = () => new Date(),
  lastStep = NO_LAST_STEP,
  random = cryptoRandomSource,
}: SessionDeps) {
  let snapshot: Snapshot = { status: 'loading', id: '' }
  const listeners = new Set<() => void>()
  const set = (next: Snapshot) => {
    snapshot = next
    for (const listener of listeners) listener()
  }

  let opening = 0
  // Gravações em série: a última vence, e o documento vai inteiro, então repetir é idempotente (D11).
  let saves: Promise<unknown> = Promise.resolve()
  let lastSave = 0

  function persist(): Promise<DecideResult> {
    if (snapshot.status !== 'ready') return Promise.resolve({ ok: false, reason: 'save-failed' })
    const { id, document, rules } = snapshot
    const mine = ++lastSave
    const saved = saves.then(() => repository.save(document, summarize(document, rules))).then(
      () => true,
      () => false,
    )
    saves = saved
    return saved.then((ok): DecideResult => {
      if (mine === lastSave && snapshot.status === 'ready' && snapshot.id === id) set({ ...snapshot, save: ok ? 'saved' : 'failed' })
      return ok ? { ok: true } : { ok: false, reason: 'save-failed' }
    })
  }

  // O candidato da mudança pendente (FEAT-011 D3): vai junto com `snapshot.pending` e sai com ele.
  let proposal: Change | null = null

  /** O snapshot sem a mudança pendente. */
  function settled(ready: Ready): Ready {
    proposal = null
    const next = { ...ready }
    delete next.pending
    return next
  }

  /**
   * O documento a gravar de uma mudança: revisão seguinte, e `updatedAt` e o `at` das entradas novas na hora dada, sem
   * mudar ids nem `logged` (D8: no Apply, a hora da confirmação).
   */
  function stamped(proposed: Change, before: CharacterDocument, at: string): CharacterDocument {
    const fresh = new Set(proposed.entries.map((entry) => entry.id))
    const log = proposed.document.log.map((entry) => (fresh.has(entry.id) ? { ...entry, at } : entry))
    return { ...proposed.document, revision: before.revision + 1, updatedAt: at, log }
  }

  /** O snapshot com o documento novo e a visão dele, antes da gravação, e a gravação (D11 da FEAT-007; FR-CHG-008). */
  function apply(ready: Ready, document: CharacterDocument, view: CharacterView): Promise<DecideResult> {
    set({ ...ready, document, view, save: 'saving' })
    return persist()
  }

  /**
   * Pipeline comum dos comandos que mudam decisões (FEAT-011 §3.2, passos 2 a 4), depois das recusas sem escrita: o
   * candidato pelas regras de escrita, com as entradas de log e as marcas (`change`), e o `impact` contra o documento de
   * antes. Sem nada suspenso nem restaurado, aplica direto (FR-CHG-002); com algo, põe `pending` no snapshot e não grava
   * (FR-CHG-001, FR-DEC-017, FR-STEP-005).
   */
  function propose(before: Ready, slot: SlotView, kind: PendingChange['kind'], request: ChangeRequest): Promise<DecideResult> {
    const at = now().toISOString()
    const proposed = change(before.rules, before.document, slot, request, at)
    const candidate = stamped(proposed, before.document, at)
    const result = impact(before.rules, before.document, candidate, slot.key)
    if (!result.needsDialog) return apply(before, candidate, result.after)
    set({ ...before, pending: { kind, key: slot.key, impact: result } })
    proposal = proposed
    return Promise.resolve({ ok: false, reason: 'needs-confirmation' })
  }

  const liveSlot = (key: string) => (snapshot.status === 'ready' ? snapshot.view.slots.find((slot) => slot.key === key) : undefined)

  /** Recusas antes de qualquer vaga: sem personagem aberto, ou com uma mudança pendente (FR-CHG-009; AC-12). */
  function blocked(): Extract<DecideResult, { ok: false }> | null {
    if (snapshot.status !== 'ready') return { ok: false, reason: 'unknown-slot' }
    if (snapshot.pending) return { ok: false, reason: 'change-pending' }
    return null
  }

  /** Registra a decisão nova de uma vaga, com a entrada de log dela, pelo pipeline comum. */
  function record(before: Ready, slot: SlotView, kind: PendingChange['kind'], decision: Decision): Promise<DecideResult> {
    return propose(before, slot, kind, { decision, draft: logDraft(before.rules, slot, decision) })
  }

  /**
   * O contador da vaga `table` (D5; ADR-004 §1): o `rolls` da prévia, que é a ativa ou, na vaga reaberta,
   * `decisions[k]`. Fora da `table`, sem contador.
   */
  function priorRolls(ready: Ready, slot: SlotView): number | undefined {
    if (slot.kind !== 'table') return undefined
    const prior = slot.decided ? candidatesOf(ready.document, slot.key)[slot.candidate ?? 0] : ready.document.decisions[slot.key]
    return prior?.rolls
  }

  /**
   * O fato de uma rolagem ou de uma soma informada (D3): `modifier` é o da versão vigente da tabela (0 se ausente), e, na
   * vaga `table`, a entrada é a que contém o total e `book` o livro dessa versão; na `roll-effect`, sem entrada nem livro.
   * O contador (D5): a rolada grava o da prévia + 1; a informada leva o da prévia, quando ele existe.
   */
  function diceDecision(slot: DiceSlot, fact: { dice: number[] } | { sum: number }, prior: number | undefined): Decision | null {
    const dice = slot.kind === 'table' ? slot.table.dice : slot.dice
    const modifier = dice.modifier ?? 0
    const shown = 'sum' in fact ? fact.sum : fact.dice.reduce((sum, face) => sum + face, 0)
    const total = shown + modifier
    const recorded = 'sum' in fact ? { mode: 'entered' as const, sum: fact.sum } : { mode: 'rolled' as const, dice: fact.dice }
    if (slot.kind === 'roll-effect') return { ...recorded, modifier, total }
    const entry = slot.table.entries.find(({ range: [start, end] }) => start <= total && total <= end)
    if (!entry) return null
    const book = slot.table.provenance.book
    return recorded.mode === 'rolled'
      ? { ...recorded, modifier, total, entry: entry.key, rolls: (prior ?? 0) + 1, book }
      : { ...recorded, modifier, total, entry: entry.key, ...(prior !== undefined && { rolls: prior }), book }
  }

  /**
   * Vaga viva com dado (`table` ou `roll-effect`), ou a recusa (§3.2, passo 1). Decidida, o comando é Reroll ou troca
   * de modo, pelo mesmo pipeline (FR-DEC-015, 018).
   */
  function diceSlot(key: string): DiceSlot | Extract<DecideResult, { ok: false }> {
    const refused = blocked()
    if (refused) return refused
    const slot = liveSlot(key)
    if (!slot) return { ok: false, reason: 'unknown-slot' }
    if (slot.kind !== 'table' && slot.kind !== 'roll-effect') return { ok: false, reason: 'invalid-value' }
    return slot
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    getSnapshot: () => snapshot,

    /** Abre o personagem; cada falha vira uma razão, e o snapshot nunca fica em `loading` (FR-HELP-004, 005). */
    async open(id: string): Promise<void> {
      const mine = ++opening
      const current = () => mine === opening
      // Abrir outro personagem descarta a mudança pendente (FEAT-011 §3.2).
      proposal = null
      set({ status: 'loading', id })
      const fail = (reason: OpenFailure) => {
        if (current()) set({ status: 'error', id, reason })
      }

      let stored: unknown
      try {
        stored = await repository.get(id)
      } catch {
        return fail('storage-unavailable')
      }
      if (stored === undefined) return fail('not-found')
      // Documentos do esqueleto técnico (D1) e qualquer forma inválida caem aqui.
      const parsed = characterDocumentSchema.safeParse(stored)
      if (!parsed.success) return fail('unreadable')

      let rules: Rules
      let view: CharacterView
      try {
        rules = await loadRules(parsed.data.sources.order)
        view = evaluate(rules, parsed.data)
      } catch (error) {
        if (error instanceof PackLoadError || error instanceof EngineError) return fail('pack-load-failed')
        throw error
      }
      if (!current()) return
      // Uma falha de leitura da etapa não é falha de abertura: o store devolve `undefined`.
      const ready: Ready = { status: 'ready', id, document: parsed.data, rules, view, save: 'saved', lastStep: lastStep.get(id) }

      // Comparação com a marca de registro (ADR-004 §1, §4; FR-CONT-015, 016): sem diferença, nada é gravado.
      const found = settle(rules, parsed.data, view)
      if (found.setAside.length === 0 && found.restored.length === 0) return set(ready)
      // Com diferença: o documento assentado e as entradas com `cause: { content: true }`, numa gravação com o
      // metadado; o snapshot vem antes da gravação, com o aviso. A visão não muda: os derivados já seguem a versão vigente.
      const at = now().toISOString()
      const entries = markEntries(found, { content: true }, at, nextLogId(parsed.data))
      const document: CharacterDocument = {
        ...found.document,
        revision: parsed.data.revision + 1,
        updatedAt: at,
        log: [...parsed.data.log, ...entries],
      }
      set({ ...ready, document, save: 'saving', notice: { setAside: found.setAside, restored: found.restored } })
      await persist()
    },

    /** Tira o aviso da abertura, sem gravar (FR-CONT-016; ui-design, open-notice). */
    dismissNotice(): void {
      if (snapshot.status !== 'ready' || !snapshot.notice) return
      const next = { ...snapshot }
      delete next.notice
      set(next)
    },

    /**
     * Confirma uma decisão: ancestralidade, Size, o par do ajuste ou a entrada de uma tabela (Choose, FR-DEC-024).
     * Decidir de novo substitui (troca de ancestralidade, Choose → Choose, troca de modo para Choose; FR-STEP-005,
     * FR-DEC-018), salvo no `attribute-shift`, que é uma vez só (FR-STEP-010; FEAT-008 D3). O valor da ativa devolve `ok`
     * sem gravar (D13). Na tabela, a escolhida leva o contador da prévia (D5). Com suspensas ou restauradas,
     * `needs-confirmation` e `pending` (FEAT-011 §3.2).
     */
    async decide(key: string, value: DecisionValue): Promise<DecideResult> {
      const refused = blocked()
      if (refused) return refused
      const before = snapshot as Ready
      const slot = liveSlot(key)
      if (!slot) return { ok: false, reason: 'unknown-slot' }
      if (slot.kind === 'attribute-shift' && slot.decided) return { ok: false, reason: 'already-decided' }
      if (!isValid(slot, value)) return { ok: false, reason: 'invalid-value' }
      if (slot.decided && slot.value === value) return { ok: true }
      const rolls = priorRolls(before, slot)
      const table = slot.kind === 'table' ? { book: slot.table.provenance.book, ...(rolls !== undefined && { rolls }) } : {}
      return record(before, slot, 'decide', { mode: 'chosen', value, ...table })
    },

    /**
     * Rola o dado de uma tabela ou de um efeito com dado (FR-DEC-005, 007; FR-STEP-014): o único passo impuro (ADR-004
     * §5). Na vaga decidida, é o Reroll, ou a troca de modo para Roll numa escolhida (FR-DEC-015, 018). O dado rola uma
     * vez, aqui; o Apply grava o candidato sem rolar de novo (D1).
     */
    async roll(key: string): Promise<DecideResult> {
      const slot = diceSlot(key)
      if ('ok' in slot) return slot
      const before = snapshot as Ready
      const faces = rollDice(slot.kind === 'table' ? slot.table.dice : slot.dice, random)
      const decision = diceDecision(slot, { dice: faces }, priorRolls(before, slot))
      if (!decision) return { ok: false, reason: 'invalid-value' }
      return record(before, slot, 'roll', decision)
    },

    /**
     * Enter result (FR-DEC-019, 020; D4): a soma que os dados mostram, sem modificador, em `[count, count × sides]`. Na
     * vaga decidida, substitui: troca de modo para Enter result, ou outra soma (FR-DEC-018).
     */
    async enter(key: string, sum: number): Promise<DecideResult> {
      const slot = diceSlot(key)
      if ('ok' in slot) return slot
      const before = snapshot as Ready
      const range = slot.kind === 'table' ? slot.table.enterRange : slot.enterRange
      if (!Number.isInteger(sum) || sum < range[0] || sum > range[1]) return { ok: false, reason: 'out-of-range', range }
      const decision = diceDecision(slot, { sum }, priorRolls(before, slot))
      if (!decision) return { ok: false, reason: 'invalid-value' }
      return record(before, slot, 'enter', decision)
    },

    /**
     * Limpa a decisão de uma vaga (FR-STEP-011; FEAT-008 D4): sai só a ativa, que vai ao log como desfeita (`cleared`;
     * FR-LOG-007), e o candidato mais recente que sobra ocupa a vaga (ADR-004 §3). Com dependentes, o diálogo.
     */
    async clear(key: string): Promise<DecideResult> {
      const refused = blocked()
      if (refused) return refused
      const before = snapshot as Ready
      const slot = liveSlot(key)
      if (!slot) return { ok: false, reason: 'unknown-slot' }
      if (!slot.decided) return { ok: false, reason: 'not-decided' }
      return propose(before, slot, 'clear', { clear: true })
    },

    /**
     * Apply (FR-CHG-008, 011): aplica a mudança pendente, sem rolar de novo (D1), com o `at` das entradas novas e o
     * `updatedAt` na hora da confirmação (D8). O snapshot muda antes da gravação, e a falha mantém o estado novo com
     * `save: 'failed'` (FR-CHAR-010).
     */
    async confirm(): Promise<DecideResult> {
      if (snapshot.status !== 'ready' || !snapshot.pending || !proposal) return { ok: false, reason: 'no-pending' }
      const { pending } = snapshot
      const document = stamped(proposal, snapshot.document, now().toISOString())
      return apply(settled(snapshot), document, pending.impact.after)
    },

    /**
     * Keep current (FR-CHG-009): tira a mudança pendente; o documento fica como estava, e nada é gravado. Numa rerrolagem
     * (pendente `roll` com `undone`), grava só o registro da recusa (FR-CHG-010; D5; emenda M1): a `decision` do valor
     * recusado e a `undone` `declined`, e o contador na ativa. Como no `confirm`, o snapshot muda antes da gravação, já
     * sem `pending`; a falha mantém esse estado com `save: 'failed'` (FR-CHAR-010).
     */
    async keep(): Promise<DecideResult> {
      if (snapshot.status !== 'ready' || !snapshot.pending) return { ok: false, reason: 'no-pending' }
      const { pending } = snapshot
      const proposed = proposal
      const kept = settled(snapshot)
      const from = pending.impact.change.from
      const refused = proposed?.document.decisions[pending.key]
      const [entry] = proposed?.entries ?? []
      if (pending.kind !== 'roll' || !pending.impact.undone || !from || !refused || entry?.kind !== 'decision') {
        set(kept)
        return { ok: true }
      }
      const at = now().toISOString()
      const declined = decline(kept.document, from, refused, entry, at)
      const document = { ...declined.document, revision: kept.document.revision + 1, updatedAt: at }
      return apply(kept, document, evaluate(kept.rules, document))
    },

    /**
     * FR-CHAR-007: registra a etapa mostrada. Navegar não grava o documento nem muda o snapshot (ADR-004 §5;
     * FEAT-001 D3).
     */
    visit(slug: string): void {
      if (snapshot.status === 'ready') lastStep.set(snapshot.id, slug)
    },

    /** FR-CHAR-010: grava de novo o documento atual. */
    retrySave(): Promise<DecideResult> {
      if (snapshot.status === 'ready') set({ ...snapshot, save: 'saving' })
      return persist()
    },
  }
}

export type CharacterSession = ReturnType<typeof createCharacterSession>
