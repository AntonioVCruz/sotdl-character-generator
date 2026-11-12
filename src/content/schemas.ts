import { z } from 'zod'

// CSP sem eval (ADR-007): o Zod 4 testa `new Function` para ligar o JIT; sem JIT, valida igual.
z.config({ jitless: true })

// Formato do pacote no esqueleto técnico: só o índice e o procedimento de 8 etapas.
// Ancestralidade, fórmula e concessão entram no design detalhado da FEAT-007 (ADR-003, ADR-005).
// Objetos estritos: campo desconhecido é recusado, o que barra texto livre no pacote oficial (P22, FR-CONT-004).

export const bookId = z.string().regex(/^[a-z0-9]+(\.[a-z0-9-]+)+$/, 'book id like "sotdl.core"')

// FR-CONT-010: data de publicação obrigatória (ano, ano-mês ou data completa).
const published = z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, 'publication date as YYYY, YYYY-MM or YYYY-MM-DD')

const bookFields = {
  format: z.literal(1),
  id: bookId,
  name: z.string().min(1),
  layer: z.enum(['core', 'supplement', 'house']),
  published,
}

export const bookIndexSchema = z.strictObject({
  format: z.literal(1),
  books: z.array(z.strictObject({ id: bookId, name: bookFields.name, layer: bookFields.layer, published })).min(1),
})

export const stepSchema = z.strictObject({
  id: z.string().regex(/^step:[a-z0-9-]+$/),
  name: z.string().min(1),
  // Etapas do próprio gerador (Review) não têm página no livro.
  page: z.number().int().positive().optional(),
})

export const bookSchema = z.strictObject({
  ...bookFields,
  steps: z.array(stepSchema).optional(),
})

// Documento do personagem v1, esboço da ADR-004. Decisões e log ganham forma na FEAT-007 e na FEAT-020.
export const characterDocumentSchema = z.strictObject({
  schema: z.literal(1),
  id: z.string().min(1),
  level: z.literal(0),
  contentVersion: z.string().min(1),
  revision: z.number().int().nonnegative(),
  name: z.string(),
  sources: z.strictObject({ order: z.array(bookId).min(1) }),
  decisions: z.record(z.string(), z.unknown()),
  log: z.array(z.unknown()),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export type BookIndex = z.infer<typeof bookIndexSchema>
export type Book = z.infer<typeof bookSchema>
export type Step = z.infer<typeof stepSchema>
export type CharacterDocument = z.infer<typeof characterDocumentSchema>

// Versão do conteúdo gravada no personagem (ADR-004). O versionamento dos pacotes é do design detalhado.
export const CONTENT_VERSION = '0.0.0'
