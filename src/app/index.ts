import { CONTENT_VERSION, characterDocumentSchema, loadBookIndex, type CharacterDocument, type PackSource } from '../content'
import { createIndexedDbRepository, openCharacterDatabase } from '../storage'
import { createCharacterSession, createRulesLoader, summarize, type Repository } from './session'

export * from './session'

// Camada de aplicação: único módulo que escreve (architecture.md §5.2, ADR-004 §5).

export type CreateResult = { ok: true; id: string } | { ok: false; reason: 'pack-load-failed' | 'save-failed' }

export interface AppDeps {
  repository: Repository
  packs?: PackSource
  now?: () => Date
  newId?: () => string
}

export function createApp({
  repository,
  packs = {},
  now = () => new Date(),
  newId = () => globalThis.crypto.randomUUID(),
}: AppDeps) {
  const loadRules = createRulesLoader(packs)
  return {
    listCharacters: () => repository.list(),

    /** FR-CHAR-001: personagem de nível 0 com o core como única fonte; FR-CHAR-009/010: grava ou falha sem perder nada. */
    async createCharacter(): Promise<CreateResult> {
      let core: string | undefined
      try {
        core = (await loadBookIndex(packs)).books.find((book) => book.layer === 'core')?.id
      } catch {
        return { ok: false, reason: 'pack-load-failed' }
      }
      if (!core) return { ok: false, reason: 'pack-load-failed' }

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
        await repository.save(document, summarize(document))
      } catch {
        return { ok: false, reason: 'save-failed' }
      }
      return { ok: true, id: document.id }
    },

    /** Uma sessão por construtor aberto (technical-design §3.2). */
    createSession: () => createCharacterSession({ repository, loadRules, now }),
  }
}

export type App = ReturnType<typeof createApp>

/** Instância do navegador: IndexedDB e pacotes do próprio site. */
export const app = createApp({ repository: createIndexedDbRepository(() => openCharacterDatabase()) })
