import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

// ADR-002: um registro por personagem (documento inteiro) e um registro de metadados para a lista inicial,
// gravados juntos numa transação. A interface de repositório deixa entrar um adaptador de servidor depois.

interface Keyed {
  id: string
}

export interface CharacterRepository<Doc extends Keyed, Meta extends Keyed> {
  /** Só os metadados: a lista inicial não lê documentos (NFR-PERF-001). */
  list(): Promise<Meta[]>
  get(id: string): Promise<Doc | undefined>
  /** Grava documento e metadados na mesma transação; rejeita se qualquer um falhar (FR-CHAR-010). */
  save(document: Doc, meta: Meta): Promise<void>
  delete(id: string): Promise<void>
}

interface CharacterDb extends DBSchema {
  characters: { key: string; value: Keyed }
  characterMeta: { key: string; value: Keyed }
}

export const DATABASE_NAME = 'sotdl-generator'

export function openCharacterDatabase(name = DATABASE_NAME): Promise<IDBPDatabase<CharacterDb>> {
  return openDB<CharacterDb>(name, 1, {
    upgrade(db) {
      db.createObjectStore('characters', { keyPath: 'id' })
      db.createObjectStore('characterMeta', { keyPath: 'id' })
    },
  })
}

export function createIndexedDbRepository<Doc extends Keyed, Meta extends Keyed>(
  database: Promise<IDBPDatabase<CharacterDb>> | (() => Promise<IDBPDatabase<CharacterDb>>),
): CharacterRepository<Doc, Meta> {
  let opened: Promise<IDBPDatabase<CharacterDb>> | undefined
  const db = () => (opened ??= typeof database === 'function' ? database() : database)
  let persistRequested = false

  return {
    async list() {
      return (await (await db()).getAll('characterMeta')) as Meta[]
    },
    async get(id) {
      return (await (await db()).get('characters', id)) as Doc | undefined
    },
    async save(document, meta) {
      const tx = (await db()).transaction(['characters', 'characterMeta'], 'readwrite')
      const done = tx.done
      done.catch(() => undefined) // a falha é tratada no catch abaixo
      try {
        await tx.objectStore('characterMeta').put(meta)
        await tx.objectStore('characters').put(document)
        await done
      } catch (error) {
        // Qualquer falha desfaz a transação inteira: nunca metadados sem documento.
        try {
          tx.abort()
        } catch {
          // já encerrada pelo próprio erro
        }
        throw error
      }
      if (!persistRequested) {
        // ADR-002: pede armazenamento persistente no primeiro salvamento; a recusa não é erro.
        persistRequested = true
        void globalThis.navigator?.storage?.persist?.().catch(() => false)
      }
    },
    async delete(id) {
      const tx = (await db()).transaction(['characters', 'characterMeta'], 'readwrite')
      await Promise.all([tx.objectStore('characters').delete(id), tx.objectStore('characterMeta').delete(id), tx.done])
    },
  }
}
