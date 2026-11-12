import { characterDocumentSchema, loadBook, PackLoadError, type Book, type CharacterDocument, type PackSource } from '../content'
import { EngineError, evaluate, resolve, type CharacterView, type Rules } from '../engine'
import type { CharacterRepository } from '../storage'

// Sessão do personagem (technical-design §3.2): store externo lido pelo React com `useSyncExternalStore`
// (ADR-006). Os comandos são os únicos que escrevem (ADR-004 §5); o log de decisões entra na FEAT-009.

/** Registro de metadados da lista inicial (ADR-002). O cartão completo da Home é da FEAT-001. */
export interface CharacterSummary {
  id: string
  name: string
  /** Nome da ancestralidade escolhida, para a Home exibi-lo sem carregar pacotes (NFR-PERF-001). */
  ancestry: string | null
  status: 'creating'
  sources: string[]
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
    }

export type DecideResult =
  | { ok: true }
  | { ok: false; reason: 'unknown-slot' | 'invalid-value' }
  // D8: mudança com dependentes é recusada até a FEAT-011.
  | { ok: false; reason: 'has-dependents'; dependents: string[] }
  | { ok: false; reason: 'save-failed' }

export type Repository = CharacterRepository<CharacterDocument, CharacterSummary>
export type LoadRules = (order: string[]) => Promise<Rules>

export interface SessionDeps {
  repository: Repository
  loadRules: LoadRules
  now?: () => Date
}

export function summarize(document: CharacterDocument, rules?: Rules): CharacterSummary {
  const ancestry = rules ? evaluate(rules, document).ancestry : null
  const name = ancestry ? rules?.items.get(ancestry) : undefined
  return {
    id: document.id,
    name: document.text.name ?? '',
    ancestry: name && 'name' in name ? name.name : null,
    status: 'creating',
    sources: document.sources.order,
    updatedAt: document.updatedAt,
  }
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

export function createCharacterSession({ repository, loadRules, now = () => new Date() }: SessionDeps) {
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
      if (current()) set({ status: 'ready', id, document: parsed.data, rules, view, save: 'saved' })
    },

    /** Único comando da FEAT-007: confirma uma ancestralidade ou o Size. A tela muda antes da gravação (NFR-PERF-002). */
    async decide(key: string, value: string | number): Promise<DecideResult> {
      if (snapshot.status !== 'ready') return { ok: false, reason: 'unknown-slot' }
      const before = snapshot
      const slot = before.view.slots.find((candidate) => candidate.key === key)
      if (!slot) return { ok: false, reason: 'unknown-slot' }
      const valid =
        slot.kind === 'choose-entity'
          ? slot.options.some((option) => option.id === value)
          : slot.kind === 'choose-value' && typeof value === 'number' && slot.options.includes(value)
      if (!valid) return { ok: false, reason: 'invalid-value' }

      const document: CharacterDocument = {
        ...before.document,
        revision: before.document.revision + 1,
        updatedAt: now().toISOString(),
        decisions: { ...before.document.decisions, [key]: { mode: 'chosen', value } },
      }
      const view = evaluate(before.rules, document)

      // Dependentes: decisões cuja vaga estava viva antes e deixa de estar depois. Órfãs antigas não contam.
      const live = new Set(view.slots.map((candidate) => candidate.key))
      const dependents = before.view.slots
        .map((candidate) => candidate.key)
        .filter((candidate) => !live.has(candidate) && candidate in before.document.decisions)
      if (dependents.length) return { ok: false, reason: 'has-dependents', dependents }

      set({ ...before, document, view, save: 'saving' })
      return persist()
    },

    /** FR-CHAR-010: grava de novo o documento atual. */
    retrySave(): Promise<DecideResult> {
      if (snapshot.status === 'ready') set({ ...snapshot, save: 'saving' })
      return persist()
    },
  }
}

export type CharacterSession = ReturnType<typeof createCharacterSession>
