import { z } from 'zod'

// CSP sem eval (ADR-007): o Zod 4 testa `new Function` para ligar o JIT; sem JIT, valida igual.
z.config({ jitless: true })

// Formato do pacote, `format: 1` (FEAT-007 technical-design §3.1; ADR-003, ADR-004, ADR-005).
// Objetos estritos: campo desconhecido é recusado, o que barra texto livre no pacote oficial (P22, FR-CONT-004).
// Os únicos textos são `name` de entidade e `abbr` de livro.

const slug = '[a-z0-9-]+'

export const bookId = z.string().regex(/^[a-z0-9]+(\.[a-z0-9-]+)+$/, 'book id like "sotdl.core"')

// FR-CONT-006: id estável `<kind>:<slug>`, independente do nome exibido.
export const entityId = z.string().regex(new RegExp(`^${slug}:${slug}$`), 'entity id like "ancestry:dwarf"')
const prefixedId = (kind: string) => z.string().regex(new RegExp(`^${kind}:${slug}$`), `id like "${kind}:<slug>"`)
const stepId = prefixedId('step')
const attributeId = prefixedId('attribute')
const characteristicId = prefixedId('characteristic')
const talentId = prefixedId('talent')
const languageId = prefixedId('language')
const localName = z.string().regex(new RegExp(`^${slug}$`), 'name in [a-z0-9-]')

// FR-CONT-010: data de publicação obrigatória (ano, ano-mês ou data completa).
const published = z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, 'publication date as YYYY, YYYY-MM or YYYY-MM-DD')
const name = z.string().min(1)
const abbr = z.string().regex(/^[A-Z0-9]{2,8}$/, 'abbreviation of 2 to 8 capitals or digits')
const layer = z.enum(['core', 'supplement', 'house'])
const page = z.number().int().positive()

/** Fórmula como árvore JSON (ADR-004 §2), nunca texto avaliado. `grant:<id>` lê a vaga concedida pela própria entidade. */
export type Formula =
  | number
  | { ref: string }
  | { add: Formula[] }
  | { div: [Formula, Formula] }
  | { min: Formula[] }
  | { max: Formula[] }
  | { round: 'down' | 'up' | 'nearest'; of: Formula }

const formulaRef = z
  .string()
  .regex(new RegExp(`^(?:(?:attribute|characteristic|grant):${slug}|self)$`), 'reference to an attribute, characteristic, grant or self')

export const formulaSchema: z.ZodType<Formula> = z.lazy(() =>
  z.union([
    z.number(),
    z.strictObject({ ref: formulaRef }),
    z.strictObject({ add: z.array(formulaSchema).min(2) }),
    z.strictObject({ div: z.tuple([formulaSchema, formulaSchema]) }),
    z.strictObject({ min: z.array(formulaSchema).min(2) }),
    z.strictObject({ max: z.array(formulaSchema).min(2) }),
    z.strictObject({ round: z.enum(['down', 'up', 'nearest']), of: formulaSchema }),
  ]),
)

/** Vaga raiz de uma etapa; a chave é o nome da vaga (ADR-004 §3). */
const slotDefSchema = z.strictObject({ kind: z.literal('choose-entity'), of: z.literal('ancestry') })

/** Vaga concedida por uma entidade; abre como filha da vaga em que a entidade foi escolhida. */
const grantedSlotSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('choose-value'),
    step: stepId,
    target: characteristicId,
    options: z.array(z.number()).min(2),
  }),
  // Sem resolvedor até a FEAT-016 (D9).
  z.strictObject({ kind: z.literal('attribute-increase'), step: stepId, amount: z.number().int() }),
  z.strictObject({ kind: z.literal('language-or-profession'), step: stepId }),
])

const itemSchemas = {
  procedure: z.strictObject({ id: prefixedId('procedure'), steps: z.array(stepId).min(1) }),
  step: z.strictObject({
    id: stepId,
    name,
    // Etapas do próprio gerador (Review) não têm página no livro.
    page: page.optional(),
    regime: z.enum(['choice', 'roll-or-choose', 'roll', 'derived', 'free']).optional(),
    optional: z.literal(true).optional(),
    requires: z.array(stepId).optional(),
    slots: z.record(localName, slotDefSchema).optional(),
  }),
  attribute: z.strictObject({ id: attributeId, name, page, modifier: formulaSchema }),
  // D5: a fórmula padrão fica no item; a ancestralidade pode substituí-la.
  characteristic: z.strictObject({ id: characteristicId, name, page, formula: formulaSchema.optional() }),
  ancestry: z.strictObject({
    id: prefixedId('ancestry'),
    name,
    page,
    attributes: z.record(attributeId, z.number().int()),
    characteristics: z.record(characteristicId, formulaSchema).optional(),
    languages: z.record(languageId, z.array(z.enum(['speak', 'read', 'write'])).min(1)).optional(),
    talents: z.array(talentId).optional(),
    level4: z
      .strictObject({
        characteristics: z.record(characteristicId, z.number().int()).optional(),
        oneOf: z
          .array(z.union([z.strictObject({ spells: z.number().int().positive() }), z.strictObject({ talent: talentId })]))
          .optional(),
      })
      .optional(),
    grants: z.record(localName, grantedSlotSchema).optional(),
  }),
  talent: z.strictObject({ id: talentId, name, page }),
  language: z.strictObject({ id: languageId, name, page }),
}

export type ItemKind = keyof typeof itemSchemas
export type ItemOf<K extends ItemKind> = z.infer<(typeof itemSchemas)[K]>
export type Item = { [K in ItemKind]: ItemOf<K> }[ItemKind]
export type ProcedureItem = ItemOf<'procedure'>
export type StepItem = ItemOf<'step'>
export type AttributeItem = ItemOf<'attribute'>
export type CharacteristicItem = ItemOf<'characteristic'>
export type AncestryItem = ItemOf<'ancestry'>
export type TalentItem = ItemOf<'talent'>
export type LanguageItem = ItemOf<'language'>
export type SlotDef = z.infer<typeof slotDefSchema>
export type GrantedSlot = z.infer<typeof grantedSlotSchema>
export type Regime = NonNullable<StepItem['regime']>

/** Tipo do item pela parte do id antes de ":" (D4). */
export function itemKind(id: string): string {
  return id.slice(0, id.indexOf(':'))
}

export function isItemOf<K extends ItemKind>(item: Item, kind: K): item is ItemOf<K> {
  return itemKind(item.id) === kind
}

// D4: o schema do item é escolhido pelo prefixo do id; prefixo desconhecido é erro.
const itemSchema = z.unknown().transform((value, ctx): Item => {
  const id = value !== null && typeof value === 'object' && 'id' in value ? value.id : undefined
  const kind = typeof id === 'string' ? itemKind(id) : ''
  if (!Object.hasOwn(itemSchemas, kind)) {
    ctx.addIssue({ code: 'custom', path: ['id'], message: `unknown item kind in id ${JSON.stringify(id)}` })
    return z.NEVER
  }
  const parsed = itemSchemas[kind as ItemKind].safeParse(value)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message })
    return z.NEVER
  }
  return parsed.data
})

const componentSchema = z.strictObject({
  id: localName,
  type: z.enum(['adds', 'replaces', 'table', 'procedure', 'optional-rule', 'errata']),
  default: z.enum(['on', 'off']),
  items: z.array(itemSchema),
})

export const bookIndexSchema = z.strictObject({
  format: z.literal(1),
  books: z.array(z.strictObject({ id: bookId, name, abbr, layer, published })).min(1),
})

export const bookSchema = z
  .strictObject({
    format: z.literal(1),
    id: bookId,
    name,
    abbr,
    layer,
    published,
    components: z.array(componentSchema).min(1),
  })
  .superRefine(checkFormatRules)

export type BookIndex = z.infer<typeof bookIndexSchema>
export type Book = z.infer<typeof bookSchema>
export type Component = Book['components'][number]

// Chave de vaga (technical-design §3.3): `ancestry`, `ancestry=human/size`.
export const slotKey = z
  .string()
  .regex(/^[a-z0-9-]+(=[a-z0-9.-]+\/[a-z0-9-]+)*$/, 'slot key like "ancestry" or "ancestry=human/size"')

/** Documento do personagem v1 (ADR-004 §1; technical-design §4): só entradas, nada derivado (FR-CALC-001). */
export const characterDocumentSchema = z.strictObject({
  schema: z.literal(1),
  id: z.string().min(1),
  contentVersion: z.string().min(1),
  revision: z.number().int().min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  sources: z.strictObject({ order: z.array(bookId).min(1) }),
  decisions: z.record(slotKey, z.strictObject({ mode: z.literal('chosen'), value: z.union([entityId, z.number()]) })),
  // Fora do log (FR-LOG-008).
  text: z.strictObject({ name: z.string().optional() }),
  // Forma na FEAT-009 e na FEAT-020.
  log: z.array(z.unknown()),
})

export type CharacterDocument = z.infer<typeof characterDocumentSchema>
export type Decision = CharacterDocument['decisions'][string]

// Versão do conteúdo gravada no personagem (ADR-004). O versionamento dos pacotes é do design detalhado.
export const CONTENT_VERSION = '0.0.0'

type Path = (string | number)[]
type Located<T> = { item: T; path: Path }

/** Visita cada fórmula da árvore. */
function formulaRefs(formula: Formula): string[] {
  if (typeof formula === 'number') return []
  if ('ref' in formula) return [formula.ref]
  if ('add' in formula) return formula.add.flatMap(formulaRefs)
  if ('div' in formula) return formula.div.flatMap(formulaRefs)
  if ('min' in formula) return formula.min.flatMap(formulaRefs)
  if ('max' in formula) return formula.max.flatMap(formulaRefs)
  return formulaRefs(formula.of)
}

/**
 * Regras de formato da §3.1 verificadas na carga, cada erro com o caminho no arquivo. As referências
 * são resolvidas dentro do livro; a integridade entre livros é da FEAT-003.
 */
function checkFormatRules(book: { components: Component[] }, ctx: z.RefinementCtx) {
  const issue = (path: Path, message: string) => ctx.addIssue({ code: 'custom', path, message })
  const located = book.components.flatMap((component, c) =>
    component.items.map((item, i): Located<Item> => ({ item, path: ['components', c, 'items', i] })),
  )
  const byId = new Map(located.map((entry) => [entry.item.id, entry]))
  const ofKind = <K extends ItemKind>(kind: K) =>
    located.filter((entry): entry is Located<ItemOf<K>> => isItemOf(entry.item, kind))
  const has = (id: string, kind: ItemKind) => itemKind(id) === kind && byId.has(id)

  // Procedimento: etapas existentes, `requires` só para trás, nome de vaga raiz único.
  const procedureSteps = new Set<string>()
  for (const { item: procedure, path } of ofKind('procedure')) {
    const slotNames = new Set<string>()
    procedure.steps.forEach((id, index) => {
      procedureSteps.add(id)
      const entry = byId.get(id)
      if (!entry || !isItemOf(entry.item, 'step')) return issue([...path, 'steps', index], `unknown step ${id}`)
      const step = entry.item
      step.requires?.forEach((required, r) => {
        const at = procedure.steps.indexOf(required)
        if (at < 0 || at >= index) {
          issue([...entry.path, 'requires', r], `${id} can only require a step that comes before it in ${procedure.id}`)
        }
      })
      for (const slot of Object.keys(step.slots ?? {})) {
        if (slotNames.has(slot)) issue([...entry.path, 'slots', slot], `root slot name "${slot}" is already used in ${procedure.id}`)
        slotNames.add(slot)
      }
    })
  }

  const characteristics = ofKind('characteristic')

  const checkFormula = (formula: Formula, path: Path, allow: { self?: boolean; grants?: Record<string, GrantedSlot> }) => {
    for (const ref of formulaRefs(formula)) {
      if (ref === 'self') {
        if (!allow.self) issue(path, '"self" is only allowed in an attribute modifier')
      } else if (ref.startsWith('grant:')) {
        const grant = allow.grants?.[ref.slice('grant:'.length)]
        if (grant?.kind !== 'choose-value') issue(path, `${ref} must name a choose-value grant of the same entity`)
      } else if (!byId.has(ref)) {
        issue(path, `unknown reference ${ref}`)
      }
    }
  }

  for (const { item, path } of ofKind('attribute')) checkFormula(item.modifier, [...path, 'modifier'], { self: true })
  for (const { item, path } of characteristics) {
    if (item.formula !== undefined) checkFormula(item.formula, [...path, 'formula'], {})
  }

  const ancestries = ofKind('ancestry')
  for (const { item: ancestry, path } of ancestries) {
    for (const id of Object.keys(ancestry.attributes)) {
      if (!has(id, 'attribute')) issue([...path, 'attributes', id], `unknown attribute ${id}`)
    }
    for (const [id, formula] of Object.entries(ancestry.characteristics ?? {})) {
      if (!has(id, 'characteristic')) issue([...path, 'characteristics', id], `unknown characteristic ${id}`)
      checkFormula(formula, [...path, 'characteristics', id], { grants: ancestry.grants })
    }
    for (const id of Object.keys(ancestry.languages ?? {})) {
      if (!has(id, 'language')) issue([...path, 'languages', id], `unknown language ${id}`)
    }
    ancestry.talents?.forEach((id, t) => {
      if (!has(id, 'talent')) issue([...path, 'talents', t], `unknown talent ${id}`)
    })
    for (const id of Object.keys(ancestry.level4?.characteristics ?? {})) {
      if (!has(id, 'characteristic')) issue([...path, 'level4', 'characteristics', id], `unknown characteristic ${id}`)
    }
    ancestry.level4?.oneOf?.forEach((option, o) => {
      if ('talent' in option && !has(option.talent, 'talent')) issue([...path, 'level4', 'oneOf', o], `unknown talent ${option.talent}`)
    })
    for (const [grantId, grant] of Object.entries(ancestry.grants ?? {})) {
      if (!procedureSteps.has(grant.step)) issue([...path, 'grants', grantId, 'step'], `${grant.step} is not a step of the procedure`)
      if (grant.kind === 'choose-value' && !has(grant.target, 'characteristic')) {
        issue([...path, 'grants', grantId, 'target'], `unknown characteristic ${grant.target}`)
      }
    }
  }

  // ADR-004 §2: nenhum ciclo entre fórmulas. Um grafo por ancestralidade (o padrão com as fórmulas que ela
  // substitui), para que duas ancestralidades com fórmulas cruzadas não acusem ciclo falso.
  const defaults = new Map<string, Located<Formula>>()
  for (const { item, path } of characteristics) {
    if (item.formula !== undefined) defaults.set(item.id, { item: item.formula, path: [...path, 'formula'] })
  }
  const graphs = [defaults]
  for (const { item: ancestry, path } of ancestries) {
    const graph = new Map(defaults)
    for (const [id, formula] of Object.entries(ancestry.characteristics ?? {})) {
      graph.set(id, { item: formula, path: [...path, 'characteristics', id] })
    }
    graphs.push(graph)
  }
  const nameOf = (id: string) => {
    const item = byId.get(id)?.item
    return item && 'name' in item ? item.name : id
  }
  const reported = new Set<string>()
  for (const graph of graphs) {
    const cycle = findCycle(graph)
    if (!cycle) continue
    // A fórmula que fecha o ciclo é a que a ancestralidade substitui: sem ela, o padrão não tem ciclo.
    const start = Math.max(0, cycle.findIndex((id) => graph.get(id) !== defaults.get(id)))
    const ids = [...cycle.slice(start), ...cycle.slice(0, start)]
    const closing = graph.get(ids[0])!.path
    const message = `cycle: ${[...ids, ids[0]].map(nameOf).join(' → ')}`
    const key = `${closing.join('.')} ${message}`
    if (!reported.has(key)) issue(closing, message)
    reported.add(key)
  }
}

/** Primeiro ciclo entre características, como a lista dos nós do ciclo. */
function findCycle(graph: Map<string, Located<Formula>>): string[] | null {
  const done = new Set<string>()
  const stack: string[] = []
  const visit = (id: string): string[] | null => {
    if (done.has(id)) return null
    const at = stack.indexOf(id)
    if (at >= 0) return stack.slice(at)
    const node = graph.get(id)
    if (!node) return null
    stack.push(id)
    for (const ref of formulaRefs(node.item)) {
      if (!ref.startsWith('characteristic:')) continue
      const found = visit(ref)
      if (found) return found
    }
    stack.pop()
    done.add(id)
    return null
  }
  for (const id of graph.keys()) {
    const found = visit(id)
    if (found) return found
  }
  return null
}
