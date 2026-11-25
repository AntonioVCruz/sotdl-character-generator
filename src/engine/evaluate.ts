import type {
  AncestryItem,
  AttributeShift,
  CharacterDocument,
  Decision,
  DecisionValue,
  Dice,
  EntryKey,
  Formula,
  GrantedSlot,
  Regime,
  SheetField,
  SlotDef,
  TableItem,
  TableRegime,
} from '../content'
import { evaluateFormula, evaluateFormulas, formatFormula, type Finish, type Value } from './formula'
import { differsFromDefault, mechanics } from './mechanics'
import { isKind, type Provenance, type Resolved, type Rules } from './resolve'

// Visão do personagem (ADR-004 §3; technical-design §3.3 `CharacterView`): função pura das regras e das decisões.

export type StepStatus = 'locked' | 'optional' | 'not-started' | 'open' | 'done'

export interface StepView {
  id: string
  /** Parte local do id, usada na rota (`#/characters/:id/:step`). */
  slug: string
  name: string
  page?: number
  regime?: Regime
  index: number
  status: StepStatus
  /** Etapas de `requires` com vaga raiz em aberto (FR-FLOW-005). */
  lockedBy: string[]
  /** Contadores só das vagas obrigatórias: a vaga `optional` fica fora (FEAT-008 D2). */
  decided: number
  open: number
  total: number
}

export interface SlotSource {
  id: string
  name: string
}

export interface EntityOption {
  id: string
  name: string
  provenance: Provenance
  /** Linha de mecânica gerada dos dados (FR-CONT-009). */
  mechanics: string[]
}

interface SlotBase {
  key: string
  stepId: string
  decided: boolean
  value?: string | number
  /** Na vaga decidida: o índice da ativa entre os candidatos (FEAT-011 §3.1); 0 é `decisions[key]`. */
  candidate?: number
  /** Entidade que concedeu a vaga; `null` na vaga raiz da etapa. */
  source: SlotSource | null
}

export interface NamedRef {
  id: string
  name: string
}

/** Efeito de uma entrada (FEAT-009 §3.3): quantia fixa, ou dado decidido na vaga `roll-effect` de chave `slot`. */
export type EffectView =
  | { id: string; target: NamedRef; op: 'add' | 'set'; amount: number }
  | { id: string; target: NamedRef; op: 'add'; dice: Dice; slot: string }

export interface EntryView {
  key: EntryKey
  range: [number, number]
  /** A página da entrada, ou a da tabela (FR-DEC-008, 012). */
  provenance: Provenance
  entity?: NamedRef
  effects: EffectView[]
}

export type TableMode = 'roll' | 'choose' | 'enter'

export interface TableView {
  id: string
  name: string
  provenance: Provenance
  dice: Dice
  /** Do total: `count + modifier` a `count × sides + modifier`. */
  range: [number, number]
  /** Do Enter result: a soma que os dados mostram, `count` a `count × sides` (D4). */
  enterRange: [number, number]
  regime: TableRegime
  field?: SheetField
  /** Roll e Choose sempre; Enter result também no regime `roll` (D6; FR-DEC-001, 004). */
  modes: TableMode[]
  /** Na ordem do início da faixa, nunca na das chaves do objeto (§3.1). */
  entries: EntryView[]
}

/** O que foi gravado (D3): faces ou soma, modificador, total e entrada nunca são recalculados pelo dado atual. */
export type TableResult =
  | { mode: 'rolled'; entry: EntryKey; faces: number[]; modifier: number; total: number; rolls: number }
  | { mode: 'entered'; entry: EntryKey; sum: number; modifier: number; total: number }
  | { mode: 'chosen'; entry: EntryKey }

export type DiceResult =
  | { mode: 'rolled'; faces: number[]; modifier: number; total: number }
  | { mode: 'entered'; sum: number; modifier: number; total: number }

export type SlotView =
  | (SlotBase & { kind: 'choose-entity'; options: EntityOption[] } & Omit<Extract<SlotDef, { kind: 'choose-entity' }>, 'kind'>)
  | (SlotBase & { grant: string } & Exclude<GrantedSlot, { kind: 'table' }>)
  // Ajuste de scores (FEAT-008 §3.3): as opções são os atributos vigentes.
  | (Omit<SlotBase, 'value'> &
      Extract<SlotDef, { kind: 'attribute-shift' }> & { options: { id: string; name: string }[]; value?: AttributeShift })
  // FEAT-009 §3.3: a tabela concedida e o efeito com dado da entrada vigente (D7).
  | (SlotBase & { kind: 'table'; grant: string; table: TableView; value?: EntryKey; result?: TableResult })
  | (SlotBase & { kind: 'roll-effect'; dice: Dice; enterRange: [number, number]; target: NamedRef; result?: DiceResult })

export type SlotKind = SlotView['kind']

export interface OpenDecision {
  key: string
  kind: SlotKind
  stepId: string
  source: SlotSource | null
  target?: string
  /** Na vaga `table`, para o rótulo ("Dwarf Age"). */
  table?: NamedRef
  /** Na vaga `roll-effect`, com `target`, para o rótulo ("Insanity 1d6"). */
  dice?: Dice
}

/** A vaga na forma de pendência: o que o rótulo dela precisa (FR-FLOW-010). */
export function toOpenDecision(slot: SlotView): OpenDecision {
  return {
    key: slot.key,
    kind: slot.kind,
    stepId: slot.stepId,
    source: slot.source,
    ...(slot.kind === 'choose-value' && { target: slot.target }),
    ...(slot.kind === 'table' && { table: { id: slot.table.id, name: slot.table.name } }),
    ...(slot.kind === 'roll-effect' && { target: slot.target.id, dice: slot.dice }),
  }
}

/**
 * Parcela de um valor, na ordem dos estágios do P11b (FR-CALC-005). Toda parcela é aditiva: o total é a soma dos
 * `value` (FEAT-008 D5). `define`, `sum` e `manual` são pontos de extensão (FEAT-009, FEAT-019).
 */
export type Stage =
  | {
      stage: 'base'
      value: Value
      formula?: string
      origin: { kind: 'ancestry'; id: string; name: string } | { kind: 'default'; id: string }
    }
  | { stage: 'modifier'; value: number; origin: { kind: 'slot'; key: string; stepId: string; slotKind: SlotKind } }
  // FEAT-009 §3.3: efeitos de resultado. No `define`, `value` é a diferença para o total anterior, e `set` o valor posto;
  // no `sum` pendente (efeito com dado sem decisão), `value` é `null`.
  | { stage: 'define'; value: Value; set: number; origin: ResultOrigin }
  | { stage: 'sum'; value: Value; origin: ResultOrigin }
  // Só quando o limite corta (FR-CALC-007): `value` é a diferença, `limit` o valor do limite e `formula` o texto dele.
  | { stage: 'limit'; value: number; bound: 'max' | 'min'; limit: number; formula: string; origin: { kind: 'default'; id: string } }

/** De onde vem um efeito de resultado: a vaga `table` e a entrada vigente (FEAT-009 §3.3). */
export interface ResultOrigin {
  kind: 'table'
  key: string
  stepId: string
  table: NamedRef
  entry: EntryKey
}

type ModifierStage = Extract<Stage, { stage: 'modifier' }>
type ResultStage = Extract<Stage, { stage: 'define' | 'sum' }>
/** Efeito de resultado coletado para um alvo: `amount` é `null` enquanto a vaga `roll-effect` (`pendingOn`) está aberta. */
type ResultEffect = { op: 'set' | 'add'; amount: number | null; pendingOn?: string; origin: ResultOrigin }
type LimitStage = Extract<Stage, { stage: 'limit' }>

export interface AttributeSummary {
  id: string
  name: string
  score: Value
  modifier: Value
  /** Vaga cuja decisão falta para o valor: a `roll-effect` de um efeito com dado (FEAT-009 §3.3). */
  pendingOn?: string
  composition: Stage[]
}

export interface CharacteristicSummary {
  id: string
  name: string
  value: Value
  formula: string
  /** Vaga cuja decisão falta para o valor (ex.: `ancestry=human/size`). */
  pendingOn?: string
  /** Os limites declarados, cortando ou não, para a linha legível (FR-CALC-003). */
  limits: { bound: 'max' | 'min'; formula: string; limit: Value }[]
  composition: Stage[]
}

export interface Summary {
  attributes: AttributeSummary[]
  characteristics: CharacteristicSummary[]
  gained: {
    languages: { id: string; name: string; abilities: ('speak' | 'read' | 'write')[] }[]
    talents: { id: string; name: string; page: number }[]
  }
}

/**
 * Uma decisão guardada e onde está (FEAT-011 §3.1): `index` 0 é `decisions[key]`, e i ≥ 1 é `earlier[key][i − 1]`.
 * `decision` vem sem a marca `setAside`; `parent` é a vaga mãe (`parentKey`).
 */
export interface StoredRef {
  key: string
  index: number
  decision: Decision
  parent: string | null
}

/** Por que uma guardada não é a ativa (ADR-004 §1): vaga não gerada, validade, ou outra mais recente que passa (FR-CHG-018). */
export type SetAsideReason = 'not-generated' | 'invalid' | 'superseded'

/** Suspensa (D40): `slot` vem quando a vaga é gerada. */
export type SetAsideRef = StoredRef & { reason: SetAsideReason; slot?: SlotView }

export interface CharacterView {
  level: 0
  ancestry: string | null
  steps: StepView[]
  slots: SlotView[]
  /** Vagas vivas sem decisão, na ordem das etapas (FR-FLOW-010, FR-DEC-011). */
  openDecisions: OpenDecision[]
  /** Resumo vivo (FR-FLOW-012): calculado a cada avaliação, nunca gravado (FR-CALC-001). */
  summary: Summary
  /**
   * Guardadas e não ativas (D40; FR-CHG-019), na ordem das vagas e, no fim, as de vagas não geradas por chave. Não
   * contam como decisão aberta (FR-CHG-012).
   */
  setAside: SetAsideRef[]
}

/** Chave de vaga filha: `<mãe>=<parte local do valor>/<grantId>` (ex.: `ancestry=human/size`). */
export function childKey(parent: string, value: string, grant: string): string {
  return `${parent}=${value.slice(value.indexOf(':') + 1)}/${grant}`
}

export const isRootKey = (key: string) => !key.includes('=')

/** A vaga mãe (FEAT-011 §3.1): `ancestry=dwarf/background=2/insanity` → `ancestry=dwarf/background`; raiz → `null`. */
export function parentKey(key: string): string | null {
  const at = key.lastIndexOf('=')
  return at < 0 ? null : key.slice(0, at)
}

/** Candidatos de uma vaga (ADR-004 §3): `decisions[key]` e depois `earlier[key]`, da mais recente para a mais antiga. */
export function candidatesOf(character: CharacterDocument, key: string): Decision[] {
  const latest = character.decisions[key]
  return latest === undefined ? [] : [latest, ...(character.earlier?.[key] ?? [])]
}

/** A decisão como a visão a mostra: sem a marca, que o motor nunca lê (ADR-004 §1, cuidado 3). */
export function unmarked(decision: Decision): Decision {
  const copy = { ...decision }
  delete copy.setAside
  return copy
}

/** Quais candidatos de cada vaga gerada passam na validade dela, por chave. */
type Checked = Map<string, boolean[]>

/**
 * A ativa de uma vaga gerada (ADR-004 §3): o primeiro candidato que passa na validade (`judge` devolve o valor dele).
 * Registra em `checked` o resultado de cada candidato, para as suspensas da visão.
 */
function activeOf<T>(
  character: CharacterDocument,
  key: string,
  checked: Checked,
  judge: (decision: Decision) => T | undefined,
): { index: number; value: T } | undefined {
  const judged = candidatesOf(character, key).map(judge)
  checked.set(
    key,
    judged.map((value) => value !== undefined),
  )
  const index = judged.findIndex((value) => value !== undefined)
  return index < 0 ? undefined : { index, value: judged[index] as T }
}

/** As suspensas (FEAT-011 §3.1): por vaga gerada, as não ativas; no fim, as de vagas não geradas, por chave. */
function setAsideOf(character: CharacterDocument, slots: SlotView[], checked: Checked): SetAsideRef[] {
  const stored = (key: string, index: number, decision: Decision): StoredRef => ({
    key,
    index,
    decision: unmarked(decision),
    parent: parentKey(key),
  })
  const generated = slots.flatMap((slot) => {
    const valid = checked.get(slot.key) ?? []
    const active = slot.decided ? slot.candidate! : -1
    return candidatesOf(character, slot.key).flatMap((decision, index): SetAsideRef[] => {
      if (index === active) return []
      const reason: SetAsideReason = valid[index] && active >= 0 && index > active ? 'superseded' : 'invalid'
      return [{ ...stored(slot.key, index, decision), reason, slot }]
    })
  })
  const live = new Set(slots.map((slot) => slot.key))
  const orphans = Object.keys(character.decisions)
    .filter((key) => !live.has(key))
    .sort()
    .flatMap((key) =>
      candidatesOf(character, key).map((decision, index): SetAsideRef => ({ ...stored(key, index, decision), reason: 'not-generated' })),
    )
  return [...generated, ...orphans]
}

export function evaluate(rules: Rules, character: CharacterDocument): CharacterView {
  const checked: Checked = new Map()
  const slots = slotTree(rules, character, checked)
  const root = slots.find((slot) => slot.kind === 'choose-entity' && slot.of === 'ancestry' && slot.decided)
  const ancestry = root ? (rules.items.get(root.value as string) as AncestryItem) : null

  const required = slots.filter((slot) => !isOptional(slot))
  const rootOpen = (stepId: string) => required.some((slot) => slot.stepId === stepId && isRootKey(slot.key) && !slot.decided)
  const steps = rules.steps.map((step, index): StepView => {
    const all = slots.filter((slot) => slot.stepId === step.id)
    const own = required.filter((slot) => slot.stepId === step.id)
    const decided = own.filter((slot) => slot.decided).length
    const open = own.length - decided
    // Só vaga raiz obrigatória de etapa em `requires` bloqueia; vaga concedida nunca bloqueia etapa (P4, FR-FLOW-007).
    const lockedBy = (step.requires ?? []).filter(rootOpen)
    // FEAT-008 §3.3: `done` com ao menos uma vaga (contando as opcionais) e nenhuma obrigatória aberta; `open` com
    // obrigatória aberta e alguma vaga decidida ou concedida por outra etapa; o resto, `not-started`.
    const started = all.some((slot) => slot.decided || slot.source !== null)
    const status: StepStatus = lockedBy.length
      ? 'locked'
      : step.optional
        ? 'optional'
        : all.length > 0 && open === 0
          ? 'done'
          : open > 0 && started
            ? 'open'
            : 'not-started'
    return {
      id: step.id,
      slug: step.id.slice(step.id.indexOf(':') + 1),
      name: step.name,
      ...(step.page !== undefined && { page: step.page }),
      ...(step.regime && { regime: step.regime }),
      index,
      status,
      lockedBy,
      decided,
      open,
      total: own.length,
    }
  })

  const stepIndex = new Map(steps.map((step) => [step.id, step.index]))
  const openDecisions = required
    .filter((slot) => !slot.decided)
    .map(toOpenDecision)
    .sort((a, b) => stepIndex.get(a.stepId)! - stepIndex.get(b.stepId)!)

  const summary = summarize(
    rules,
    ancestry,
    (grant) => {
      const slot = root && ancestry && slots.find((candidate) => candidate.key === childKey(root.key, ancestry.id, grant))
      return { key: slot?.key, value: slot?.decided ? (slot.value as number) : null }
    },
    modifiers(slots),
    resultEffects(slots),
  )
  const setAside = setAsideOf(character, slots, checked)
  return { level: 0, ancestry: ancestry?.id ?? null, steps, slots, openDecisions, summary, setAside }
}

const isOptional = (slot: SlotView) => 'optional' in slot && slot.optional === true

/** Efeitos do estágio `modifier`, com a origem, coletados das vagas vivas decididas (ADR-004 §2; FEAT-008 D1). */
function modifiers(slots: SlotView[]): Map<string, ModifierStage[]> {
  const byAttribute = new Map<string, ModifierStage[]>()
  const add = (id: string, stage: ModifierStage) => byAttribute.set(id, [...(byAttribute.get(id) ?? []), stage])
  for (const slot of slots) {
    if (slot.kind !== 'attribute-shift' || !slot.value) continue
    const origin = { kind: 'slot' as const, key: slot.key, stepId: slot.stepId, slotKind: slot.kind }
    add(slot.value.decrease, { stage: 'modifier', value: -slot.amount, origin })
    add(slot.value.increase, { stage: 'modifier', value: slot.amount, origin })
  }
  return byAttribute
}

/** Valor de uma decisão `chosen`; os outros modos não têm `value` (FEAT-009 §4). */
const chosenValue = (decision: Decision): DecisionValue | undefined => (decision.mode === 'chosen' ? decision.value : undefined)

/** Os campos da vaga decidida pela ativa: `decided`, `value` e `candidate` (FEAT-011 §3.1). */
function decidedBy<T, R extends object>(
  active: { index: number; value: T } | undefined,
  fields: (picked: T) => R,
): ({ decided: true; candidate: number } & R) | { decided: false } {
  return active ? { decided: true, ...fields(active.value), candidate: active.index } : { decided: false }
}
const asValue = <T>(picked: T) => ({ value: picked })

/**
 * Efeitos das entradas vigentes das vagas `table` decididas, em ordem de vagas, por alvo (FR-CALC-010, 011). Um efeito
 * com dado vale o total gravado da vaga `roll-effect`, ou fica pendente nela.
 */
function resultEffects(slots: SlotView[]): Map<string, ResultEffect[]> {
  const byTarget = new Map<string, ResultEffect[]>()
  const add = (id: string, effect: ResultEffect) => byTarget.set(id, [...(byTarget.get(id) ?? []), effect])
  for (const slot of slots) {
    if (slot.kind !== 'table' || !slot.result) continue
    const entry = slot.table.entries.find((candidate) => candidate.key === slot.result!.entry)
    if (!entry) continue
    const origin: ResultOrigin = {
      kind: 'table',
      key: slot.key,
      stepId: slot.stepId,
      table: { id: slot.table.id, name: slot.table.name },
      entry: entry.key,
    }
    for (const effect of entry.effects) {
      if (!('dice' in effect)) {
        add(effect.target.id, { op: effect.op, amount: effect.amount, origin })
        continue
      }
      const child = slots.find((candidate) => candidate.key === effect.slot)
      const total = child?.kind === 'roll-effect' && child.result ? child.result.total : null
      add(effect.target.id, { op: 'add', amount: total, ...(total === null && { pendingOn: effect.slot }), origin })
    }
  }
  return byTarget
}

/**
 * Estágios `define` e depois `sum` sobre um total (P11b; D8): cada `set` vira a diferença para o total anterior, e o
 * último vale; cada `add` é uma parcela. Um `add` pendente deixa o total pendente.
 */
function applyResults(start: number, effects: readonly ResultEffect[]): { stages: ResultStage[]; value: Value; pendingOn?: string } {
  let value: Value = start
  let pendingOn: string | undefined
  const stages: ResultStage[] = []
  for (const effect of effects) {
    if (effect.op !== 'set' || effect.amount === null) continue
    stages.push({ stage: 'define', value: effect.amount - value!, set: effect.amount, origin: effect.origin })
    value = effect.amount
  }
  for (const effect of effects) {
    if (effect.op !== 'add') continue
    stages.push({ stage: 'sum', value: effect.amount, origin: effect.origin })
    if (effect.amount === null) pendingOn ??= effect.pendingOn
    value = value === null || effect.amount === null ? null : value + effect.amount
  }
  return { stages, value, ...(pendingOn && { pendingOn }) }
}

/**
 * Raízes: as vagas de cada etapa. Uma escolha em `choose-entity` abre as concessões da entidade como filhas. Cada vaga
 * vale pela ativa, o primeiro candidato válido (ADR-004 §3); sem ativa, fica aberta.
 */
function slotTree(rules: Rules, character: CharacterDocument, checked: Checked): SlotView[] {
  const slots: SlotView[] = []
  for (const step of rules.steps) {
    for (const [key, def] of Object.entries(step.slots ?? {})) {
      if (def.kind === 'attribute-shift') {
        slots.push(shiftSlot(rules, key, step.id, def, character, checked))
        continue
      }
      const options = rules.ancestries.map((ancestry) => ({
        id: ancestry.id,
        name: ancestry.name,
        provenance: ancestry.provenance,
        mechanics: mechanics(rules, ancestry).map((line) => line.text),
      }))
      // Decisão sem opção viva (id que sumiu) não passa: a vaga fica em aberto.
      const active = activeOf(character, key, checked, (decision) => {
        const value = chosenValue(decision)
        return typeof value === 'string' && options.some((option) => option.id === value) ? value : undefined
      })
      slots.push({ key, stepId: step.id, source: null, ...decidedBy(active, asValue), ...def, options })
      if (!active) continue

      const entity = rules.items.get(active.value)
      if (!entity || !isKind(entity, 'ancestry')) continue
      slots.push(...grantedSlots(rules, key, entity, character, checked))
    }
  }
  return slots
}

/** Decisão válida: dois atributos vigentes e diferentes. Sem candidato válido, a vaga fica sem decisão. */
function shiftSlot(
  rules: Rules,
  key: string,
  stepId: string,
  def: Extract<SlotDef, { kind: 'attribute-shift' }>,
  character: CharacterDocument,
  checked: Checked,
): SlotView {
  const options = rules.attributes.map((attribute) => ({ id: attribute.id, name: attribute.name }))
  const isAttribute = (id: string) => options.some((option) => option.id === id)
  const active = activeOf(character, key, checked, (decision) => {
    const value = chosenValue(decision)
    return typeof value === 'object' && value.decrease !== value.increase && isAttribute(value.decrease) && isAttribute(value.increase)
      ? value
      : undefined
  })
  return { key, stepId, source: null, ...decidedBy(active, asValue), ...def, options }
}

function grantedSlots(rules: Rules, parent: string, entity: AncestryItem, character: CharacterDocument, checked: Checked): SlotView[] {
  return Object.entries(entity.grants ?? {}).flatMap(([grant, def]): SlotView[] => {
    const key = childKey(parent, entity.id, grant)
    if (def.kind === 'table') {
      const table = rules.items.get(def.table)
      if (!table || !isKind(table, 'table')) return []
      const source = { id: entity.id, name: entity.name }
      return tableSlots(rules, { key, stepId: def.step, source, grant }, table as Resolved<TableItem>, character, checked)
    }
    // `attribute-increase` e `language-or-profession` não têm resolvedor até a FEAT-016 (D9).
    const active = activeOf(character, key, checked, (decision) => {
      const value = chosenValue(decision)
      return def.kind === 'choose-value' && typeof value === 'number' && def.options.includes(value) ? value : undefined
    })
    return [{ key, stepId: def.step, source: { id: entity.id, name: entity.name }, ...decidedBy(active, asValue), grant, ...def }]
  })
}

const span = (dice: Dice, modifier = 0): [number, number] => [dice.count + modifier, dice.count * dice.sides + modifier]

/** A tabela como a vaga a mostra (FEAT-009 §3.3), com as chaves das vagas `roll-effect` sob a vaga `key`. */
function tableView(rules: Rules, table: Resolved<TableItem>, key: string): TableView {
  const nameOf = nameIn(rules)
  const named = (id: string) => ({ id, name: nameOf(id) })
  const entries = Object.entries(table.entries)
    .map(([entryKey, entry]): EntryView => {
      const [start, end = start] = entryKey.split('-').map(Number)
      const effects = Object.entries(entry.effects ?? {}).map(([id, effect]): EffectView => {
        const target = named(effect.target)
        if ('set' in effect) return { id, target, op: 'set', amount: effect.set }
        if (typeof effect.add === 'number') return { id, target, op: 'add', amount: effect.add }
        return { id, target, op: 'add', dice: effect.add.dice, slot: childKey(key, entryKey, id) }
      })
      return {
        key: entryKey,
        range: [start, end],
        provenance: { ...table.provenance, page: entry.page ?? table.page },
        ...(entry.entity !== undefined && { entity: named(entry.entity) }),
        effects,
      }
    })
    .sort((a, b) => a.range[0] - b.range[0])
  return {
    id: table.id,
    name: table.name,
    provenance: table.provenance,
    dice: table.dice,
    range: span(table.dice, table.dice.modifier),
    enterRange: span(table.dice),
    regime: table.regime,
    ...(table.field !== undefined && { field: table.field }),
    modes: table.regime === 'roll' ? ['roll', 'choose', 'enter'] : ['roll', 'choose'],
    entries,
  }
}

/**
 * Validade na leitura (D3): a decisão vale se (a) `book` é o livro da versão vigente da tabela e (b) a entrada gravada
 * existe nela. Senão é ignorada, mas continua no documento (suspensa, D40), e volta a valer com (a) e (b).
 */
function tableResult(decision: Decision | undefined, table: TableView): TableResult | undefined {
  if (!decision || decision.book !== table.provenance.book) return undefined
  // FEAT-010 T1: a decisão escrita ainda não vale (a T2 a faz valer pela regra (a)).
  if (decision.mode === 'written') return undefined
  const entry = decision.mode === 'chosen' ? decision.value : decision.entry
  if (typeof entry !== 'string' || !table.entries.some((candidate) => candidate.key === entry)) return undefined
  switch (decision.mode) {
    case 'chosen':
      return { mode: 'chosen', entry }
    case 'rolled':
      return { mode: 'rolled', entry, faces: decision.dice, modifier: decision.modifier, total: decision.total, rolls: decision.rolls ?? 1 }
    case 'entered':
      return { mode: 'entered', entry, sum: decision.sum, modifier: decision.modifier, total: decision.total }
  }
}

/** A vaga `roll-effect` vale com os valores gravados enquanto existir (D7). */
function diceResult(decision: Decision | undefined): DiceResult | undefined {
  if (decision?.mode === 'rolled') return { mode: 'rolled', faces: decision.dice, modifier: decision.modifier, total: decision.total }
  if (decision?.mode === 'entered') return { mode: 'entered', sum: decision.sum, modifier: decision.modifier, total: decision.total }
  return undefined
}

/** A vaga `table` e, com uma ativa, uma vaga `roll-effect` por efeito com dado da entrada vigente. */
function tableSlots(
  rules: Rules,
  base: { key: string; stepId: string; source: SlotSource; grant: string },
  table: Resolved<TableItem>,
  character: CharacterDocument,
  checked: Checked,
): SlotView[] {
  const view = tableView(rules, table, base.key)
  const active = activeOf(character, base.key, checked, (decision) => tableResult(decision, view))
  const result = active?.value
  const slot: SlotView = { ...base, kind: 'table', table: view, ...decidedBy(active, (picked) => ({ value: picked.entry, result: picked })) }
  const entry = result && view.entries.find((candidate) => candidate.key === result.entry)
  const effects = (entry?.effects ?? []).flatMap((effect): SlotView[] => {
    if (!('dice' in effect)) return []
    const decided = activeOf(character, effect.slot, checked, diceResult)
    return [
      {
        key: effect.slot,
        stepId: base.stepId,
        source: { id: table.id, name: table.name },
        kind: 'roll-effect',
        dice: effect.dice,
        enterRange: span(effect.dice),
        target: effect.target,
        ...decidedBy(decided, (picked) => ({ result: picked })),
      },
    ]
  })
  return [slot, ...effects]
}

type GrantValue = (grant: string) => { key?: string; value: Value }

const nameIn = (rules: Rules) => (id: string) => {
  const item = rules.items.get(id)
  return item && 'name' in item ? item.name : id
}

/**
 * Atributos, características e ganhos de uma ancestralidade (ou de nenhuma), com as concessões decididas e os efeitos
 * do estágio `modifier`. Os atributos vêm primeiro, e toda referência lê o total (FR-CALC-009).
 */
function summarize(
  rules: Rules,
  ancestry: AncestryItem | null,
  grantValue: GrantValue,
  attributeModifiers: ReadonlyMap<string, ModifierStage[]> = new Map(),
  results: ReadonlyMap<string, ResultEffect[]> = new Map(),
): Summary {
  const nameOf = nameIn(rules)
  const origin = ancestry && { kind: 'ancestry' as const, id: ancestry.id, name: ancestry.name }

  const attributes = rules.attributes.map((attribute): AttributeSummary => {
    const base = ancestry?.attributes[attribute.id] ?? null
    // Pendente propaga: sem base, nada se soma.
    if (!origin || base === null) return { id: attribute.id, name: attribute.name, score: null, modifier: null, composition: [] }
    // base → modifier → define → sum (P11b; FEAT-009 §3.3).
    const modifierStages = attributeModifiers.get(attribute.id) ?? []
    const modified = modifierStages.reduce((total, stage) => total + stage.value, base)
    const applied = applyResults(modified, results.get(attribute.id) ?? [])
    const composition: Stage[] = [{ stage: 'base', value: base, origin }, ...modifierStages, ...applied.stages]
    const score = applied.value
    // O modificador lê o score total, depois do ajuste e dos efeitos (FEAT-008 §3.3, AC-2).
    const modifier =
      score === null ? null : evaluateFormula(attribute.modifier, (ref) => (ref === 'self' ? score : null)).value
    return { id: attribute.id, name: attribute.name, score, modifier, ...(applied.pendingOn && { pendingOn: applied.pendingOn }), composition }
  })
  const scores = new Map(attributes.map((attribute) => [attribute.id, attribute.score]))
  const attributePending = new Map(attributes.flatMap((attribute) => (attribute.pendingOn ? [[attribute.id, attribute.pendingOn] as const] : [])))

  // A fórmula da ancestralidade substitui a padrão do item (D5).
  const formulas = new Map<string, Formula>()
  for (const characteristic of rules.characteristics) {
    const formula = ancestry?.characteristics?.[characteristic.id] ?? characteristic.formula
    if (formula !== undefined) formulas.set(characteristic.id, formula)
  }
  // Estágios depois da fórmula, na ordem fixa (P11b): `define` e `sum` (FEAT-009), depois `limit`. `manual`
  // (FEAT-019) entra aqui. Um limite pendente não corta.
  const limitsOf = new Map(rules.characteristics.flatMap((c) => (c.limits ? [[c.id, c.limits] as const] : [])))
  const bases = new Map<string, Value>()
  const applied = new Map<string, ResultStage[]>()
  const cuts = new Map<string, LimitStage[]>()
  const finish: Finish = (id, evaluated, evaluateLimit) => {
    bases.set(id, evaluated.value)
    if (evaluated.value === null) return evaluated
    const effects = applyResults(evaluated.value, results.get(id) ?? [])
    if (effects.stages.length) applied.set(id, effects.stages)
    if (effects.value === null) return { value: null, pendingOn: effects.pendingOn }
    const limits = limitsOf.get(id)
    if (!limits) return { value: effects.value }
    let value = effects.value
    const stages: LimitStage[] = []
    for (const bound of ['max', 'min'] as const) {
      const formula = limits[bound]
      const limit = formula === undefined ? null : evaluateLimit(formula).value
      if (formula === undefined || limit === null) continue
      const limited = bound === 'max' ? Math.min(value, limit) : Math.max(value, limit)
      if (limited === value) continue
      stages.push({ stage: 'limit', value: limited - value, bound, limit, formula: formatFormula(rules, formula), origin: { kind: 'default', id } })
      value = limited
    }
    if (stages.length) cuts.set(id, stages)
    return { value }
  }
  const leaf = (ref: string) => (ref.startsWith('grant:') ? grantValue(ref.slice('grant:'.length)).value : (scores.get(ref) ?? null))
  const values = evaluateFormulas(formulas, leaf, nameOf, finish)
  // Valor de um limite para a linha legível, com as mesmas referências (totais).
  const limitValue = (formula: Formula) =>
    evaluateFormula(formula, (ref) => (ref.startsWith('characteristic:') ? (values.get(ref)?.value ?? null) : leaf(ref))).value

  const characteristics = rules.characteristics.map((characteristic): CharacteristicSummary => {
    const formula = formulas.get(characteristic.id)
    const { value = null, pendingOn } = values.get(characteristic.id) ?? {}
    const text = formula === undefined ? '' : formatFormula(rules, formula, ancestry?.id)
    const fromAncestry = origin && ancestry?.characteristics?.[characteristic.id] !== undefined
    // A pendência é uma vaga: a concessão, a `roll-effect` de um efeito, ou a de um atributo referenciado.
    const pendingKey = pendingOn?.startsWith('grant:')
      ? grantValue(pendingOn.slice('grant:'.length)).key
      : pendingOn?.startsWith('attribute:')
        ? attributePending.get(pendingOn)
        : pendingOn?.includes('=')
          ? pendingOn
          : undefined
    const base: Stage = {
      stage: 'base',
      value: bases.get(characteristic.id) ?? null,
      formula: text,
      origin: fromAncestry ? origin : { kind: 'default', id: characteristic.id },
    }
    const composition: Stage[] =
      formula === undefined ? [] : [base, ...(applied.get(characteristic.id) ?? []), ...(cuts.get(characteristic.id) ?? [])]
    const limits = (['max', 'min'] as const).flatMap((bound) => {
      const limit = characteristic.limits?.[bound]
      return limit === undefined ? [] : [{ bound, formula: formatFormula(rules, limit), limit: limitValue(limit) }]
    })
    return {
      id: characteristic.id,
      name: characteristic.name,
      value,
      formula: text,
      ...(pendingKey && { pendingOn: pendingKey }),
      limits,
      composition,
    }
  })

  const languages = Object.entries(ancestry?.languages ?? {}).map(([id, abilities]) => ({ id, name: nameOf(id), abilities }))
  const talents = (ancestry?.talents ?? []).map((id) => ({ id, name: nameOf(id), page: rules.items.get(id)?.provenance.page ?? 0 }))
  return { attributes, characteristics, gained: { languages, talents } }
}

export interface ValueChange {
  id: string
  name: string
  from: Value
  to: Value
}

export interface StepChange {
  id: string
  name: string
  from: StepStatus
  to: StepStatus
}

export interface Changes {
  attributes: ValueChange[]
  characteristics: ValueChange[]
  steps: StepChange[]
}

/** O que muda com uma decisão, sem gravar nada (FR-FLOW-014, D7): o `evaluate` do documento hipotético. */
export function preview(
  rules: Rules,
  character: CharacterDocument,
  key: string,
  value: DecisionValue,
): { view: CharacterView; changes: Changes } {
  const before = evaluate(rules, character)
  // Numa vaga `table`, a escolha leva o livro da versão vigente, como a gravaria o comando (D3).
  const slot = before.slots.find((candidate) => candidate.key === key)
  const book = slot?.kind === 'table' ? { book: slot.table.provenance.book } : {}
  const view = evaluate(rules, { ...character, decisions: { ...character.decisions, [key]: { mode: 'chosen', value, ...book } } })
  const diff = <T extends { id: string; name: string }, V>(from: T[], to: T[], pick: (item: T) => V) =>
    to.flatMap((item, index) => {
      const old = pick(from[index])
      const now = pick(item)
      return old === now ? [] : [{ id: item.id, name: item.name, from: old, to: now }]
    })
  const changes: Changes = {
    attributes: diff(before.summary.attributes, view.summary.attributes, (attribute) => attribute.score),
    characteristics: diff(before.summary.characteristics, view.summary.characteristics, (c) => c.value),
    steps: diff(before.steps, view.steps, (step) => step.status),
  }
  return { view, changes }
}

export interface AncestryDetail {
  id: string
  name: string
  page: number
  provenance: Provenance
  attributes: { id: string; name: string; score: Value }[]
  /** Só as que diferem da regra padrão, como na linha de mecânica ("Health = Strength + 4", "Speed 8"). */
  characteristics: { id: string; name: string; text: string; value: Value }[]
  languages: Summary['gained']['languages']
  talents: { id: string; name: string; provenance: Provenance }[]
  /** "Health +6; one spell or Shake it Off". */
  level4: string | null
  /** Concessões pendentes ao escolher (Size, +1, idioma ou profissão), com a etapa em que se resolvem. */
  grants: ({ id: string; stepId: string; stepName: string } & GrantedSlot)[]
}

/** O que a ancestralidade dá, para o detalhe da etapa (FR-STEP-002); sem texto do livro. */
export function ancestryDetail(rules: Rules, ancestryId: string): AncestryDetail {
  const ancestry = rules.ancestries.find((candidate) => candidate.id === ancestryId)
  if (!ancestry) throw new Error(`${ancestryId} is not an active ancestry`)
  const nameOf = nameIn(rules)
  const summary = summarize(rules, ancestry, () => ({ value: null }))
  const lines = mechanics(rules, ancestry)

  const level4 = ancestry.level4
  const level4Parts = [
    Object.entries(level4?.characteristics ?? {})
      .map(([id, amount]) => `${nameOf(id)} ${amount < 0 ? '−' : '+'}${Math.abs(amount)}`)
      .join(', '),
    (level4?.oneOf ?? [])
      .map((option) =>
        'spells' in option ? (option.spells === 1 ? 'one spell' : `${option.spells} spells`) : nameOf(option.talent),
      )
      .join(' or '),
  ].filter(Boolean)

  return {
    id: ancestry.id,
    name: ancestry.name,
    page: ancestry.page,
    provenance: ancestry.provenance,
    attributes: summary.attributes.map(({ id, name, score }) => ({ id, name, score })),
    characteristics: summary.characteristics
      .filter((characteristic) => differsFromDefault(rules, ancestry, characteristic.id))
      .map(({ id, name, value }) => ({ id, name, text: lines.find((line) => line.id === id)!.text, value })),
    languages: summary.gained.languages,
    talents: (ancestry.talents ?? []).map((id) => ({ id, name: nameOf(id), provenance: rules.items.get(id)!.provenance })),
    level4: level4Parts.length ? level4Parts.join('; ') : null,
    grants: Object.entries(ancestry.grants ?? {}).map(([id, grant]) => ({ id, stepId: grant.step, stepName: nameOf(grant.step), ...grant })),
  }
}
