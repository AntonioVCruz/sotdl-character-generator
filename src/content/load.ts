import { z } from 'zod'
import { bookIndexSchema, bookSchema, type Book, type BookIndex } from './schemas'

export class PackLoadError extends Error {
  readonly file: string

  constructor(file: string, reason: string) {
    super(`Could not load ${file}: ${reason}`)
    this.name = 'PackLoadError'
    this.file = file
  }
}

type Fetch = (url: string) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>

export interface PackSource {
  /** Endereço base do site; os pacotes ficam em <base>packs/ (ADR-005, ADR-007). */
  baseUrl?: string
  fetch?: Fetch
}

async function loadJson<T>(file: string, schema: z.ZodType<T>, { baseUrl = import.meta.env.BASE_URL, fetch = globalThis.fetch }: PackSource): Promise<T> {
  let body: unknown
  try {
    const response = await fetch(`${baseUrl}packs/${file}`)
    if (!response.ok) throw new PackLoadError(file, `HTTP ${response.status}`)
    body = await response.json()
  } catch (error) {
    if (error instanceof PackLoadError) throw error
    throw new PackLoadError(file, error instanceof Error ? error.message : String(error))
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw new PackLoadError(file, z.prettifyError(parsed.error))
  return parsed.data
}

/** FR-CONT-001, FR-CONT-002: índice do pacote oficial embutido, validado ao carregar. */
export function loadBookIndex(source: PackSource = {}): Promise<BookIndex> {
  return loadJson('index.json', bookIndexSchema, source)
}

/** Um livro do pacote oficial, carregado sob demanda quando um personagem o usa (ADR-001). */
export function loadBook(id: string, source: PackSource = {}): Promise<Book> {
  return loadJson(`${id}.json`, bookSchema, source)
}
