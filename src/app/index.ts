import { CONTENT_VERSION, characterDocumentSchema, loadBookIndex, PackLoadError, type CharacterDocument, type PackSource } from '../content'
import { EngineError, type Rules } from '../engine'
import { createIndexedDbRepository, createLastStepStore, openCharacterDatabase, type LastStepStore } from '../storage'
import { byRecentEdit, createCharacterSession, createRulesLoader, readSummary, summarize, type CharacterSummary, type Repository } from './session'

export * from './session'

// Camada de aplicação: único módulo que escreve (architecture.md §5.2, ADR-004 §5).

export type ListResult = { ok: true; characters: CharacterSummary[] } | { ok: false; reason: 'storage-unavailable' }

export type DeleteResult = { ok: true } | { ok: false; reason: 'delete-failed' }

export type CreateResult = { ok: true; id: string } | { ok: false; reason: 'pack-load-failed' | 'save-failed' }

export interface AppDeps {
  repository: Repository
  packs?: PackSource
  now?: () => Date
  newId?: () => string
  /** Padrão: o `localStorage` do navegador (FEAT-001 §3.3). Os testes injetam um store em memória. */
  lastStep?: LastStepStore
}

export function createApp({
  repository,
  packs = {},
  now = () => new Date(),
  newId = () => globalThis.crypto.randomUUID(),
  lastStep = createLastStepStore(),
}: AppDeps) {
  const loadRules = createRulesLoader(packs)
  return {
    /** FR-CHAR-003, 004: os metadados, lidos com tolerância e ordenados; a falha de leitura é um resultado (FEAT-001 D4, D5). */
    async listCharacters(): Promise<ListResult> {
      let records: unknown[]
      try {
        records = await repository.list()
      } catch {
        return { ok: false, reason: 'storage-unavailable' }
      }
      const characters = records.map(readSummary).filter((summary) => summary !== null)
      return { ok: true, characters: characters.sort(byRecentEdit) }
    },

    /** FR-CHAR-001: personagem de nível 0 com o core como única fonte; FR-CHAR-009/010: grava ou falha sem perder nada. */
    async createCharacter(): Promise<CreateResult> {
      let core: string | undefined
      try {
        core = (await loadBookIndex(packs)).books.find((book) => book.layer === 'core')?.id
      } catch {
        return { ok: false, reason: 'pack-load-failed' }
      }
      if (!core) return { ok: false, reason: 'pack-load-failed' }

      // FEAT-001 §3.1: as regras do core antes de gravar, pelo mesmo carregador da sessão, para o metadado
      // levar estado, contagem e fontes, e o construtor reaproveitar o livro sem novo pedido.
      let rules: Rules
      try {
        rules = await loadRules([core])
      } catch (error) {
        if (error instanceof PackLoadError || error instanceof EngineError) return { ok: false, reason: 'pack-load-failed' }
        throw error
      }

      const timestamp = now().toISOString()
      const document = characterDocumentSchema.parse({
        schema: 1,
        id: newId(),
        contentVersion: CONTENT_VERSION,
        revision: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
        sources: { order: [core] },
        decisions: {},
        text: {},
        log: [],
      } satisfies CharacterDocument)

      try {
        await repository.save(document, summarize(document, rules))
      } catch {
        return { ok: false, reason: 'save-failed' }
      }
      return { ok: true, id: document.id }
    },

    /**
     * FR-CHAR-014: documento e metadados numa transação (o log mora no documento), depois a chave da última
     * etapa; uma falha nesse passo é ignorada (FEAT-001 §3.1).
     */
    async deleteCharacter(id: string): Promise<DeleteResult> {
      try {
        await repository.delete(id)
      } catch {
        return { ok: false, reason: 'delete-failed' }
      }
      try {
        lastStep.forget(id)
      } catch {
        // uma chave que sobra para um id inexistente é inerte
      }
      return { ok: true }
    },

    /** Uma sessão por construtor aberto (technical-design §3.2). */
    createSession: () => createCharacterSession({ repository, loadRules, now, lastStep }),
  }
}

export type App = ReturnType<typeof createApp>

/** Instância do navegador: IndexedDB e pacotes do próprio site. */
export const app = createApp({ repository: createIndexedDbRepository(() => openCharacterDatabase()) })
