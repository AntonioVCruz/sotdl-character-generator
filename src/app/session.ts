import {
  characterDocumentSchema,
  loadBook,
  PackLoadError,
  type Book,
  type CharacterDocument,
  type DecisionValue,
  type PackSource,
} from '../content'
import { EngineError, evaluate, resolve, type CharacterView, type Rules, type SlotView } from '../engine'
import type { CharacterRepository, LastStepStore } from '../storage'

// Sessão do personagem (technical-design §3.2): store externo lido pelo React com `useSyncExternalStore`
// (ADR-006). Os comandos são os únicos que escrevem (ADR-004 §5); o log de decisões entra na FEAT-009.

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
    }

export type DecideResult =
  | { ok: true }
  // `already-decided`: o ajuste é uma vez só (FEAT-008 D3); `not-decided`: `clear` de vaga sem decisão.
  | { ok: false; reason: 'unknown-slot' | 'invalid-value' | 'already-decided' | 'not-decided' }
  // D8: mudança com dependentes é recusada até a FEAT-011.
  | { ok: false; reason: 'has-dependents'; dependents: string[] }
  | { ok: false; reason: 'save-failed' }

export type Repository = CharacterRepository<CharacterDocument, CharacterSummary>
export type LoadRules = (order: string[]) => Promise<Rules>

export interface SessionDeps {
  repository: Repository
  loadRules: LoadRules
  now?: () => Date
  /** Padrão: um store que não guarda nada (FEAT-001 §3.4). */
  lastStep?: LastStepStore
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

/** O valor cabe na vaga: uma opção viva, ou, no ajuste, dois atributos vigentes e diferentes. */
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
  }
}

export function createCharacterSession({ repository, loadRules, now = () => new Date(), lastStep = NO_LAST_STEP }: SessionDeps) {
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

  /** Aplica as decisões novas, comum a `decide` e `clear`: documento novo, `evaluate`, dependentes, tela e gravação. */
  function commit(before: Extract<Snapshot, { status: 'ready' }>, decisions: CharacterDocument['decisions']): Promise<DecideResult> {
    const document: CharacterDocument = {
      ...before.document,
      revision: before.document.revision + 1,
      updatedAt: now().toISOString(),
      decisions,
    }
    const view = evaluate(before.rules, document)

    // Dependentes: decisões cuja vaga estava viva antes e deixa de estar depois. Órfãs antigas não contam.
    const live = new Set(view.slots.map((candidate) => candidate.key))
    const dependents = before.view.slots
      .map((candidate) => candidate.key)
      .filter((candidate) => !live.has(candidate) && candidate in before.document.decisions)
    if (dependents.length) return Promise.resolve({ ok: false, reason: 'has-dependents', dependents })

    set({ ...before, document, view, save: 'saving' })
    return persist()
  }

  const liveSlot = (key: string) => (snapshot.status === 'ready' ? snapshot.view.slots.find((slot) => slot.key === key) : undefined)

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
      // Uma falha de leitura da etapa não é falha de abertura: o store devolve `undefined`.
      if (current()) set({ status: 'ready', id, document: parsed.data, rules, view, save: 'saved', lastStep: lastStep.get(id) })
    },

    /**
     * Confirma uma decisão: ancestralidade, Size ou o par do ajuste. Decidir de novo substitui, salvo no
     * `attribute-shift`, que é uma vez só (FR-STEP-010; FEAT-008 D3). A tela muda antes da gravação (NFR-PERF-002).
     */
    async decide(key: string, value: DecisionValue): Promise<DecideResult> {
      const slot = liveSlot(key)
      if (snapshot.status !== 'ready' || !slot) return { ok: false, reason: 'unknown-slot' }
      if (slot.kind === 'attribute-shift' && slot.decided) return { ok: false, reason: 'already-decided' }
      if (!isValid(slot, value)) return { ok: false, reason: 'invalid-value' }
      return commit(snapshot, { ...snapshot.document.decisions, [key]: { mode: 'chosen', value } })
    },

    /** Limpa a decisão de uma vaga (FR-STEP-011; FEAT-008 D4): o valor sai de novo do `evaluate`, sem ela. */
    async clear(key: string): Promise<DecideResult> {
      const slot = liveSlot(key)
      if (snapshot.status !== 'ready' || !slot) return { ok: false, reason: 'unknown-slot' }
      if (!slot.decided) return { ok: false, reason: 'not-decided' }
      const decisions = Object.fromEntries(Object.entries(snapshot.document.decisions).filter(([candidate]) => candidate !== key))
      return commit(snapshot, decisions)
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
