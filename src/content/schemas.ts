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
const tableId = prefixedId('table')

/** Expressão de dado (FEAT-009 §3.1; ADR-009). */
export const diceSchema = z.strictObject({
  count: z.number().int().min(1),
  sides: z.number().int().min(2),
  modifier: z.number().int().optional(),
})

/** Chave de entrada de tabela: a faixa, "n" ou "n-m" (FEAT-009 D2). `n ≤ m` é regra de formato do livro. */
export const entryKey = z.string().regex(/^\d+(-\d+)?$/, 'entry key like "3" or "4-7"')

/** Efeito de resultado (FEAT-009 §3.1): `add` no estágio `sum`, `set` no `define`; `add.dice` abre a vaga `roll-effect`. */
const effectTarget = z.union([attributeId, characteristicId])
const effectSchema = z.union([
  z.strictObject({ target: effectTarget, add: z.union([z.number(), z.strictObject({ dice: diceSchema })]) }),
  z.strictObject({ target: effectTarget, set: z.number() }),
])

const entrySchema = z.strictObject({
  // Ausente: a página da tabela.
  page: page.optional(),
  entity: entityId.optional(),
  effects: z.record(localName, effectSchema).optional(),
})

/** Campo da ficha que recebe o resultado (P28; FR-SHEET-006). */
const sheetField = z.enum([
  'appearance',
  'background',
  'personality',
  'religion',
  'languages',
  'professions',
  'interesting-things',
  'companions',
  'other-possessions',
  'marks-of-darkness',
  'quirks',
  'objective',
])

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

/**
 * Vaga raiz de uma etapa; a chave é o nome da vaga (ADR-004 §3). `optional` nunca bloqueia etapa, nunca é decisão
 * aberta e não entra nos contadores (FEAT-008 D2).
 */
const optionalSlot = z.literal(true).optional()
const slotDefSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('choose-entity'), of: z.literal('ancestry'), optional: optionalSlot }),
  // Ajuste de scores (FEAT-008 §3.1): diminui um atributo em `amount` e aumenta outro em `amount`.
  z.strictObject({ kind: z.literal('attribute-shift'), amount: z.number().int().min(1), optional: optionalSlot }),
])

/** Limites de uma característica (FR-CALC-006), como fórmula: "Insanity ≤ Will" é `{ max: { ref: 'attribute:will' } }`. */
const limitsSchema = z
  .strictObject({ max: formulaSchema.optional(), min: formulaSchema.optional() })
  .refine((limits) => limits.max !== undefined || limits.min !== undefined, 'a limit needs max, min or both')

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
  // FEAT-009 D1: tabela concedida pela ancestralidade numa etapa (ADR-003 §6).
  z.strictObject({ kind: z.literal('table'), step: stepId, table: tableId }),
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
  characteristic: z.strictObject({ id: characteristicId, name, page, formula: formulaSchema.optional(), limits: limitsSchema.optional() }),
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
  // FEAT-009 §3.1: cada tabela declara o próprio regime (princípios §1.1); as entradas são objeto com chave (ADR-003).
  table: z.strictObject({
    id: tableId,
    name,
    page,
    dice: diceSchema,
    regime: z.enum(['choice', 'roll-or-choose', 'roll']),
    field: sheetField.optional(),
    entries: z.record(z.string(), entrySchema),
  }),
  // D38, FEAT-009 D10: só nome e página.
  'creature-type': z.strictObject({ id: prefixedId('creature-type'), name, page }),
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
export type TableItem = ItemOf<'table'>
export type CreatureTypeItem = ItemOf<'creature-type'>
export type Dice = z.infer<typeof diceSchema>
export type EntryKey = z.infer<typeof entryKey>
export type Entry = z.infer<typeof entrySchema>
export type Effect = z.infer<typeof effectSchema>
export type SheetField = z.infer<typeof sheetField>
export type TableRegime = TableItem['regime']
export type SlotDef = z.infer<typeof slotDefSchema>
export type Limits = z.infer<typeof limitsSchema>
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

/** Decisão do ajuste de scores (FEAT-008 §3.2): o atributo que desce e o que sobe. */
const attributeShiftSchema = z.strictObject({ decrease: attributeId, increase: attributeId })
export type AttributeShift = z.infer<typeof attributeShiftSchema>

/** Id de uma entrada de log, para os ponteiros (ADR-004 §6). */
const logId = z.number().int().min(1)

/**
 * Campos comuns aos três modos (FEAT-011 §4; ADR-004 §1): `setAside`, a marca de registro, que nem o `evaluate` nem a
 * validade leem; `logged`, o id da entrada `decision` que registrou a decisão (D2), ausente nas gravadas antes dele.
 */
const recorded = { setAside: z.literal(true).optional(), logged: logId.optional() }
/** Contador de rolagens da vaga `table` (FEAT-011 D5): atravessa a troca de modo e conta a rerrolagem recusada. */
const rolls = z.number().int().min(1).optional()

/**
 * Texto do jogador numa decisão escrita (FEAT-010 §4, D3): de 1 a 2.000 pelo `length` da string, e nada do que o
 * `trim()` do comando tiraria nas pontas (espaço, tabulação, quebra de linha), para schema e comando concordarem.
 */
const writtenText = z
  .string()
  .min(1)
  .max(2000)
  .refine((text) => text === text.trim(), 'text without whitespace at either end')

/**
 * Decisão (FEAT-009 §4, D3). `chosen` grava o valor; numa vaga `table`, a entrada e o livro. `rolled` e `entered`
 * gravam o fato da rolagem: faces (ou a soma informada), modificador e total e, na vaga `table`, a entrada, o livro e
 * o contador. `written` (FEAT-010 D1) grava o texto do jogador, sem entrada. A forma certa por vaga é do comando; a
 * validade na leitura, do motor.
 */
const decisionSchema = z.discriminatedUnion('mode', [
  z.strictObject({
    mode: z.literal('chosen'),
    value: z.union([entityId, z.number(), attributeShiftSchema, entryKey]),
    rolls,
    book: bookId.optional(),
    ...recorded,
  }),
  z.strictObject({
    mode: z.literal('rolled'),
    dice: z.array(z.number().int()).min(1),
    modifier: z.number().int(),
    total: z.number().int(),
    entry: entryKey.optional(),
    rolls,
    book: bookId.optional(),
    ...recorded,
  }),
  z.strictObject({
    mode: z.literal('entered'),
    sum: z.number().int(),
    modifier: z.number().int(),
    total: z.number().int(),
    entry: entryKey.optional(),
    rolls,
    book: bookId.optional(),
    ...recorded,
  }),
  z.strictObject({
    mode: z.literal('written'),
    text: writtenText,
    rolls,
    book: bookId.optional(),
    ...recorded,
  }),
])

const named = z.strictObject({ id: z.string().min(1), name })

/** `kind` de vaga, como o motor os nomeia (FEAT-007, FEAT-008, FEAT-009). */
export const slotKind = z.enum([
  'choose-entity',
  'choose-value',
  'attribute-increase',
  'language-or-profession',
  'attribute-shift',
  'table',
  'roll-effect',
])

const rollBase = { count: z.number().int().min(1), sides: z.number().int().min(2), modifier: z.number().int(), total: z.number().int(), rolls: z.number().int().min(1).optional() }

/**
 * Entrada de log de uma decisão (FEAT-009 §3.3; FR-LOG-001, 002, 004, 010): montada pelo `app` no `commit`, com os
 * nomes congelados. O motor nunca a lê (ADR-004 §6).
 */
const decisionEntrySchema = z.strictObject({
  id: logId,
  at: z.iso.datetime(),
  kind: z.literal('decision'),
  slot: slotKey,
  slotKind,
  step: z.strictObject({ id: stepId, name }),
  origin: named.nullable(),
  mode: z.enum(['chosen', 'rolled', 'entered', 'written']),
  subject: named.nullable(),
  source: z.strictObject({ book: bookId, abbr, page: page.optional() }),
  result: z.union([
    z.strictObject({ entity: named }),
    z.strictObject({ value: z.number() }),
    z.strictObject({ shift: z.strictObject({ decrease: named, increase: named }) }),
    z.strictObject({ entry: entryKey, entity: named.optional() }),
    // FEAT-010 §3.2 (FR-LOG-003): a decisão escrita, com o texto do jogador.
    z.strictObject({ text: writtenText }),
  ]),
  roll: z
    .union([
      z.strictObject({ ...rollBase, faces: z.array(z.number().int()).min(1) }),
      z.strictObject({ ...rollBase, sum: z.number().int() }),
    ])
    .optional(),
})

/**
 * Entradas novas da FEAT-011 (§3.2, "Entradas de log novas"; ADR-004 §6), sempre de acréscimo. `ref` é o `logged` da
 * decisão a que a entrada se refere (falta nas decisões sem `logged`); `by` e `cause.entry` apontam para entradas da
 * mesma escrita; `cause: { content: true }` é a abertura com versão nova do pacote (FR-CONT-016).
 */
const undoneEntrySchema = z.strictObject({
  id: logId,
  at: z.iso.datetime(),
  kind: z.literal('undone'),
  slot: slotKey,
  ref: logId.optional(),
  reason: z.enum(['replaced', 'cleared', 'declined']),
  by: logId.optional(),
})
const markEntry = <K extends 'set-aside' | 'restored'>(kind: K) =>
  z.strictObject({
    id: logId,
    at: z.iso.datetime(),
    kind: z.literal(kind),
    slot: slotKey,
    ref: logId.optional(),
    cause: z.union([z.strictObject({ entry: logId }), z.strictObject({ content: z.literal(true) })]),
  })

export const logEntrySchema = z.discriminatedUnion('kind', [
  decisionEntrySchema,
  undoneEntrySchema,
  markEntry('set-aside'),
  markEntry('restored'),
])

/** Documento do personagem v1 (ADR-004 §1; technical-design §4): só entradas, nada derivado (FR-CALC-001). */
export const characterDocumentSchema = z
  .strictObject({
    schema: z.literal(1),
    id: z.string().min(1),
    contentVersion: z.string().min(1),
    revision: z.number().int().min(1),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    sources: z.strictObject({ order: z.array(bookId).min(1) }),
    decisions: z.record(slotKey, decisionSchema),
    // ADR-004 §3: as decisões anteriores da vaga, da mais recente para a mais antiga (FEAT-011 §4).
    earlier: z.record(slotKey, z.array(decisionSchema).min(1)).optional(),
    // Fora do log (FR-LOG-008).
    text: z.strictObject({ name: z.string().optional() }),
    log: z.array(logEntrySchema),
  })
  .superRefine((document, ctx) => {
    // Regra do documento (FEAT-011 §4): toda chave de `earlier` tem `decisions[k]`.
    for (const key of Object.keys(document.earlier ?? {})) {
      if (!Object.hasOwn(document.decisions, key)) {
        ctx.addIssue({ code: 'custom', path: ['earlier', key], message: `earlier["${key}"] needs decisions["${key}"]` })
      }
    }
  })

export type CharacterDocument = z.infer<typeof characterDocumentSchema>
export type Decision = z.infer<typeof decisionSchema>
export type ChosenDecision = Extract<Decision, { mode: 'chosen' }>
export type DecisionValue = ChosenDecision['value']
export type LogEntry = z.infer<typeof logEntrySchema>
export type DecisionEntry = Extract<LogEntry, { kind: 'decision' }>
export type UndoneEntry = Extract<LogEntry, { kind: 'undone' }>
export type MarkEntry = Extract<LogEntry, { kind: 'set-aside' | 'restored' }>
export type SlotKindName = z.infer<typeof slotKind>

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
  // Limites: referências como as da fórmula, sem `self` nem `grant:` (FR-CALC-006).
  const limits = new Map<string, Located<Formula>[]>()
  for (const { item, path } of characteristics) {
    if (item.formula !== undefined) checkFormula(item.formula, [...path, 'formula'], {})
    const own = Object.entries(item.limits ?? {}).map(([bound, formula]) => ({ item: formula, path: [...path, 'limits', bound] }))
    for (const limit of own) checkFormula(limit.item, limit.path, {})
    if (own.length) limits.set(item.id, own)
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
      if (grant.kind === 'table' && !has(grant.table, 'table')) issue([...path, 'grants', grantId, 'table'], `unknown table ${grant.table}`)
    }
  }

  for (const { item: table, path } of ofKind('table')) checkTable(table, path, issue, (id) => byId.has(id))

  // ADR-004 §2: nenhum ciclo entre fórmulas. Um grafo por ancestralidade (o padrão com as fórmulas que ela
  // substitui), para que duas ancestralidades com fórmulas cruzadas não acusem ciclo falso. Os limites são
  // arestas da característica para o que eles referenciam (FEAT-008 §3.1).
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
    const edges = (id: string) => [graph.get(id), ...(limits.get(id) ?? [])].filter((edge) => edge !== undefined)
    const cycle = findCycle(new Set([...graph.keys(), ...limits.keys()]), edges)
    if (!cycle) continue
    // A fórmula que fecha o ciclo é a que a ancestralidade substitui: sem ela, o padrão não tem ciclo.
    const start = Math.max(0, cycle.findIndex((id) => graph.get(id) !== defaults.get(id)))
    const ids = [...cycle.slice(start), ...cycle.slice(0, start)]
    // A aresta que fecha: a fórmula ou o limite do primeiro nó que referencia o seguinte.
    const next = ids[1 % ids.length]
    const closing = edges(ids[0]).find((edge) => formulaRefs(edge.item).includes(next))!.path
    const message = `cycle: ${[...ids, ids[0]].map(nameOf).join(' → ')}`
    const key = `${closing.join('.')} ${message}`
    if (!reported.has(key)) issue(closing, message)
    reported.add(key)
  }
}

/** Faixa de uma chave de entrada ("3" → [3, 3], "4-7" → [4, 7]); `null` se a chave não é faixa. */
export function entryRange(key: string): [number, number] | null {
  const match = /^(\d+)(?:-(\d+))?$/.exec(key)
  if (!match) return null
  const start = Number(match[1])
  return [start, match[2] === undefined ? start : Number(match[2])]
}

/**
 * Regras de formato de uma tabela (FEAT-009 §3.1): chave `n` ou `n-m` com `n ≤ m`; as faixas, ordenadas pelo início
 * (nunca pela ordem das chaves do objeto), cobrem exatamente o total do dado, sem buraco nem sobreposição; `entity` e
 * `target` existem no livro.
 */
function checkTable(table: ItemOf<'table'>, path: Path, issue: (path: Path, message: string) => void, exists: (id: string) => boolean) {
  const at = (key: string, ...rest: Path) => [...path, 'entries', key, ...rest]
  const ranges: { key: string; start: number; end: number }[] = []
  for (const [key, entry] of Object.entries(table.entries)) {
    const range = entryRange(key)
    if (!range) issue(at(key), `entry key "${key}" must be "n" or "n-m"`)
    else if (range[0] > range[1]) issue(at(key), `entry key "${key}" starts after it ends`)
    else ranges.push({ key, start: range[0], end: range[1] })
    if (entry.entity !== undefined && !exists(entry.entity)) issue(at(key, 'entity'), `unknown entity ${entry.entity}`)
    for (const [effectId, effect] of Object.entries(entry.effects ?? {})) {
      if (!exists(effect.target)) issue(at(key, 'effects', effectId, 'target'), `unknown attribute or characteristic ${effect.target}`)
    }
  }

  const modifier = table.dice.modifier ?? 0
  const min = table.dice.count + modifier
  const max = table.dice.count * table.dice.sides + modifier
  ranges.sort((a, b) => a.start - b.start || a.end - b.end)
  let next = min
  for (const { key, start, end } of ranges) {
    if (start < min || end > max) {
      issue(at(key), `entry ${key} is outside the dice range ${min}-${max}`)
      continue
    }
    if (start > next) issue(at(key), `gap: no entry covers ${next === start - 1 ? next : `${next}-${start - 1}`}`)
    else if (start < next) issue(at(key), `entry ${key} overlaps the entry before it`)
    next = Math.max(next, end + 1)
  }
  if (next <= max) issue([...path, 'entries'], `gap: no entry covers ${next === max ? next : `${next}-${max}`}`)
}

/** Primeiro ciclo entre características, como a lista dos nós do ciclo. */
function findCycle(nodes: Set<string>, edges: (id: string) => Located<Formula>[]): string[] | null {
  const done = new Set<string>()
  const stack: string[] = []
  const visit = (id: string): string[] | null => {
    if (done.has(id)) return null
    const at = stack.indexOf(id)
    if (at >= 0) return stack.slice(at)
    if (!nodes.has(id)) return null
    stack.push(id)
    for (const ref of edges(id).flatMap((edge) => formulaRefs(edge.item))) {
      if (!ref.startsWith('characteristic:')) continue
      const found = visit(ref)
      if (found) return found
    }
    stack.pop()
    done.add(id)
    return null
  }
  for (const id of nodes) {
    const found = visit(id)
    if (found) return found
  }
  return null
}
