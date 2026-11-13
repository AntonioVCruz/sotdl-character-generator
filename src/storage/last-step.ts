// Última etapa visitada por personagem (FEAT-001 §3.3, D3): estado de interface no `localStorage`, fora do
// documento, do metadado e do arquivo exportado. Não mexe em `updatedAt` nem em `revision`.

export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export interface LastStepStore {
  /** Slug da etapa, ou `undefined` sem registro ou com o armazenamento indisponível. */
  get(id: string): string | undefined
  set(id: string, slug: string): void
  forget(id: string): void
}

const key = (id: string) => `sotdl-generator:last-step:${id}`

/**
 * Sem `storage`, usa `globalThis.localStorage`, acessado dentro do `try`: o próprio acesso lança `SecurityError`
 * com o armazenamento bloqueado. Qualquer exceção vira "sem registro" no `get` e nada no `set` e no `forget`.
 */
export function createLastStepStore(storage?: KeyValueStorage): LastStepStore {
  const area = (): KeyValueStorage => storage ?? globalThis.localStorage
  return {
    get(id) {
      try {
        return area().getItem(key(id)) ?? undefined
      } catch {
        return undefined
      }
    },
    set(id, slug) {
      try {
        area().setItem(key(id), slug)
      } catch {
        // estado de interface: perder a etapa não é erro
      }
    },
    forget(id) {
      try {
        area().removeItem(key(id))
      } catch {
        // uma chave que sobra para um id inexistente é inerte (§3.1)
      }
    },
  }
}
