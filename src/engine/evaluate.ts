import type { AncestryItem, AttributeShift, CharacterDocument, DecisionValue, Formula, GrantedSlot, Regime, SlotDef } from '../content'
import { evaluateFormula, evaluateFormulas, formatFormula, type Finish, type Value } from './formula'
import { differsFromDefault, mechanics } from './mechanics'
import { isKind, type Provenance, type Rules } from './resolve'

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
  /** Entidade que concedeu a vaga; `null` na vaga raiz da etapa. */
  source: SlotSource | null
}

export type SlotView =
  | (SlotBase & { kind: 'choose-entity'; options: EntityOption[] } & Omit<Extract<SlotDef, { kind: 'choose-entity' }>, 'kind'>)
  | (SlotBase & { grant: string } & GrantedSlot)
  // Ajuste de scores (FEAT-008 §3.3): as opções são os atributos vigentes.
  | (Omit<SlotBase, 'value'> &
      Extract<SlotDef, { kind: 'attribute-shift' }> & { options: { id: string; name: string }[]; value?: AttributeShift })

export type SlotKind = SlotView['kind']

export interface OpenDecision {
  key: string
  kind: SlotKind
  stepId: string
  source: SlotSource | null
  target?: string
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
  // Só quando o limite corta (FR-CALC-007): `value` é a diferença, `limit` o valor do limite e `formula` o texto dele.
  | { stage: 'limit'; value: number; bound: 'max' | 'min'; limit: number; formula: string; origin: { kind: 'default'; id: string } }

type ModifierStage = Extract<Stage, { stage: 'modifier' }>
type LimitStage = Extract<Stage, { stage: 'limit' }>

export interface AttributeSummary {
  id: string
  name: string
  score: Value
  modifier: Value
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

export interface CharacterView {
  level: 0
  ancestry: string | null
  steps: StepView[]
  slots: SlotView[]
  /** Vagas vivas sem decisão, na ordem das etapas (FR-FLOW-010, FR-DEC-011). */
  openDecisions: OpenDecision[]
  /** Resumo vivo (FR-FLOW-012): calculado a cada avaliação, nunca gravado (FR-CALC-001). */
  summary: Summary
}

/** Chave de vaga filha: `<mãe>=<parte local do valor>/<grantId>` (ex.: `ancestry=human/size`). */
export function childKey(parent: string, value: string, grant: string): string {
  return `${parent}=${value.slice(value.indexOf(':') + 1)}/${grant}`
}

export const isRootKey = (key: string) => !key.includes('=')

export function evaluate(rules: Rules, character: CharacterDocument): CharacterView {
  const slots = slotTree(rules, character)
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
    .map(
      (slot): OpenDecision => ({
        key: slot.key,
        kind: slot.kind,
        stepId: slot.stepId,
        source: slot.source,
        ...(slot.kind === 'choose-value' && { target: slot.target }),
      }),
    )
    .sort((a, b) => stepIndex.get(a.stepId)! - stepIndex.get(b.stepId)!)

  const summary = summarize(
    rules,
    ancestry,
    (grant) => {
      const slot = root && ancestry && slots.find((candidate) => candidate.key === childKey(root.key, ancestry.id, grant))
      return { key: slot?.key, value: slot?.decided ? (slot.value as number) : null }
    },
    modifiers(slots),
  )
  return { level: 0, ancestry: ancestry?.id ?? null, steps, slots, openDecisions, summary }
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

/** Raízes: as vagas de cada etapa. Uma escolha em `choose-entity` abre as concessões da entidade como filhas. */
function slotTree(rules: Rules, character: CharacterDocument): SlotView[] {
  const slots: SlotView[] = []
  for (const step of rules.steps) {
    for (const [key, def] of Object.entries(step.slots ?? {})) {
      if (def.kind === 'attribute-shift') {
        slots.push(shiftSlot(rules, key, step.id, def, character.decisions[key]?.value))
        continue
      }
      const options = rules.ancestries.map((ancestry) => ({
        id: ancestry.id,
        name: ancestry.name,
        provenance: ancestry.provenance,
        mechanics: mechanics(rules, ancestry).map((line) => line.text),
      }))
      const value = character.decisions[key]?.value
      // Decisão sem opção viva (id que sumiu) é ignorada: a vaga fica em aberto.
      const decided = typeof value === 'string' && options.some((option) => option.id === value)
      slots.push({ key, stepId: step.id, source: null, decided, ...(decided && { value }), ...def, options })
      if (!decided) continue

      const entity = rules.items.get(value)
      if (!entity || !isKind(entity, 'ancestry')) continue
      slots.push(...grantedSlots(key, entity, character))
    }
  }
  return slots
}

/** Decisão válida: dois atributos vigentes e diferentes. Inválida é ignorada, e a vaga fica sem decisão. */
function shiftSlot(
  rules: Rules,
  key: string,
  stepId: string,
  def: Extract<SlotDef, { kind: 'attribute-shift' }>,
  value: DecisionValue | undefined,
): SlotView {
  const options = rules.attributes.map((attribute) => ({ id: attribute.id, name: attribute.name }))
  const isAttribute = (id: string) => options.some((option) => option.id === id)
  const decided =
    typeof value === 'object' && value.decrease !== value.increase && isAttribute(value.decrease) && isAttribute(value.increase)
  return { key, stepId, source: null, decided, ...(decided && { value }), ...def, options }
}

function grantedSlots(parent: string, entity: AncestryItem, character: CharacterDocument): SlotView[] {
  return Object.entries(entity.grants ?? {}).map(([grant, def]): SlotView => {
    const key = childKey(parent, entity.id, grant)
    const value = character.decisions[key]?.value
    // `attribute-increase` e `language-or-profession` não têm resolvedor até a FEAT-016 (D9).
    const decided = def.kind === 'choose-value' && typeof value === 'number' && def.options.includes(value)
    return { key, stepId: def.step, source: { id: entity.id, name: entity.name }, decided, ...(decided && { value }), grant, ...def }
  })
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
): Summary {
  const nameOf = nameIn(rules)
  const origin = ancestry && { kind: 'ancestry' as const, id: ancestry.id, name: ancestry.name }

  const attributes = rules.attributes.map((attribute): AttributeSummary => {
    const base = ancestry?.attributes[attribute.id] ?? null
    // Pendente propaga: sem base, nada se soma.
    const composition: Stage[] =
      origin && base !== null ? [{ stage: 'base', value: base, origin }, ...(attributeModifiers.get(attribute.id) ?? [])] : []
    const score = base === null ? null : composition.reduce((total, stage) => total + stage.value!, 0)
    // O modificador lê o score total, depois do ajuste (FEAT-008 §3.3, AC-2).
    const modifier =
      score === null ? null : evaluateFormula(attribute.modifier, (ref) => (ref === 'self' ? score : null)).value
    return { id: attribute.id, name: attribute.name, score, modifier, composition }
  })
  const scores = new Map(attributes.map((attribute) => [attribute.id, attribute.score]))

  // A fórmula da ancestralidade substitui a padrão do item (D5).
  const formulas = new Map<string, Formula>()
  for (const characteristic of rules.characteristics) {
    const formula = ancestry?.characteristics?.[characteristic.id] ?? characteristic.formula
    if (formula !== undefined) formulas.set(characteristic.id, formula)
  }
  // Estágios depois da fórmula, na ordem fixa (P11b): `limit`, sobre o termo base. `define` e `sum` (FEAT-009) e
  // `manual` (FEAT-019) entram aqui. Um limite pendente não corta.
  const limitsOf = new Map(rules.characteristics.flatMap((c) => (c.limits ? [[c.id, c.limits] as const] : [])))
  const bases = new Map<string, Value>()
  const cuts = new Map<string, LimitStage[]>()
  const finish: Finish = (id, evaluated, evaluateLimit) => {
    bases.set(id, evaluated.value)
    const limits = limitsOf.get(id)
    if (!limits || evaluated.value === null) return evaluated
    let value = evaluated.value
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
    if (!stages.length) return evaluated
    cuts.set(id, stages)
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
    const pendingKey = pendingOn?.startsWith('grant:') ? grantValue(pendingOn.slice('grant:'.length)).key : undefined
    const base: Stage = {
      stage: 'base',
      value: bases.get(characteristic.id) ?? null,
      formula: text,
      origin: fromAncestry ? origin : { kind: 'default', id: characteristic.id },
    }
    const composition: Stage[] = formula === undefined ? [] : [base, ...(cuts.get(characteristic.id) ?? [])]
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
  const view = evaluate(rules, { ...character, decisions: { ...character.decisions, [key]: { mode: 'chosen', value } } })
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
