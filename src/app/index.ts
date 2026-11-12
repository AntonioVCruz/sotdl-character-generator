import {
  CONTENT_VERSION,
  characterDocumentSchema,
  loadBook,
  loadBookIndex,
  type CharacterDocument,
  type PackSource,
} from '../content'
import { evaluate, resolve, type CharacterView } from '../engine'
import { createIndexedDbRepository, openCharacterDatabase, type CharacterRepository } from '../storage'

// Camada de aplicação: único módulo que escreve (architecture.md §5.2, ADR-004 §5).

/** Registro de metadados da lista inicial (ADR-002). O cartão completo da Home é da FEAT-001. */
export interface CharacterSummary {
  id: string
  name: string
  ancestry: string | null
  status: 'creating'
  sources: string[]
  updatedAt: string
}

export type CreateResult = { ok: true; id: string } | { ok: false; reason: 'pack-load-failed' | 'save-failed' }
export type OpenResult =
  | { ok: true; document: CharacterDocument; view: CharacterView }
  | { ok: false; reason: 'not-found' | 'pack-load-failed' }

export interface AppDeps {
  repository: CharacterRepository<CharacterDocument, CharacterSummary>
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

    /** Abre o personagem: carrega os livros ligados nele e avalia (architecture.md §6.3). */
    async openCharacter(id: string): Promise<OpenResult> {
      const document = await repository.get(id)
      if (!document) return { ok: false, reason: 'not-found' }
      try {
        const books = await Promise.all(document.sources.order.map((book) => loadBook(book, packs)))
        return { ok: true, document, view: evaluate(resolve(books, document.sources.order), document) }
      } catch {
        return { ok: false, reason: 'pack-load-failed' }
      }
    },
  }
}

export type App = ReturnType<typeof createApp>

function summarize(document: CharacterDocument): CharacterSummary {
  return {
    id: document.id,
    name: document.text.name ?? '',
    ancestry: null,
    status: 'creating',
    sources: document.sources.order,
    updatedAt: document.updatedAt,
  }
}

/** Instância do navegador: IndexedDB e pacotes do próprio site. */
export const app = createApp({ repository: createIndexedDbRepository(() => openCharacterDatabase()) })
