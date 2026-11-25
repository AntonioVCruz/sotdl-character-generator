import {
  formatNumber,
  type CharacteristicSummary,
  type DiceResult,
  type EffectView,
  type ImpactItem,
  type OpenDecision,
  type SlotView,
  type StepStatus,
  type StepView,
  type TableResult,
  type TableView,
  toOpenDecision,
} from '../../engine'
import type { Snapshot } from '../../app'
import { STORAGE_UNAVAILABLE } from '../copy'

// Texto do construtor (ui-design §Textos, NFR-L10N-001). Nenhum id, enum ou nome de vaga aparece na tela (lição 5);
// pergunta da etapa e rótulos das pendências são do app, por id de etapa e por `kind` de vaga (D6).

export const REGIME_LABEL: Record<NonNullable<StepView['regime']>, string> = {
  choice: 'Choice',
  // ui-design da FEAT-009, Rótulo de regime: sem Write até a FEAT-010.
  'roll-or-choose': 'Roll or choose',
  roll: 'Roll',
  derived: 'Calculated',
  free: 'Write your own',
}

export const STATUS_LABEL: Record<Exclude<StepStatus, 'open'>, string> = {
  done: 'Done',
  'not-started': 'Not started',
  optional: 'Optional',
  locked: 'Locked',
}

export const statusLabel = (step: Pick<StepView, 'status' | 'open'>) =>
  step.status === 'open' ? `${step.open} open` : STATUS_LABEL[step.status]

/** Rótulos de tipo de entidade (nunca o prefixo do id). */
const ENTITY_LABEL: Record<string, string> = { ancestry: 'ancestry' }

/** Texto próprio das etapas que já têm tela; as demais usam o fallback. */
const STEP_TEXT: Record<string, { question: string; rule: string; lockReason?: string }> = {
  'step:ancestry': {
    question: "What is your character's ancestry?",
    rule: 'Choose one ancestry. It sets your starting attributes, characteristics, languages and talents.',
    lockReason: 'Choose an ancestry first.',
  },
  // ui-design da FEAT-008, Textos.
  'step:attributes': {
    question: 'How strong, quick, clever and willful is your character?',
    rule: 'Your ancestry sets your starting scores. Once, you may raise one score by 1 and lower another by 1.',
  },
}

/** Texto próprio de uma etapa de tabelas, só quando ela tem vagas `table` (ui-design da FEAT-009, Etapa Story). */
const TABLES_STEP_TEXT: Record<string, { question: string; rule: string }> = {
  'step:story': {
    question: "What is your character's story?",
    rule: "Roll on each of your ancestry's tables, or choose the result you want. Some results change your scores: you'll see them under the result.",
  },
}

/** Etapa de tabelas (technical-design da FEAT-009 §3.4): sem vaga raiz e com vagas `table`. */
export const isTablesStep = (step: Pick<StepView, 'id'>, slots: SlotView[]) =>
  !slots.some((slot) => slot.stepId === step.id && slot.source === null) &&
  slots.some((slot) => slot.stepId === step.id && slot.kind === 'table')

/** Pendências de uma etapa sem decisão. A vaga opcional nunca é pendência (FEAT-008 D2). */
export const pendingIn = (step: Pick<StepView, 'id'>, slots: SlotView[]) =>
  slots.filter((slot) => slot.stepId === step.id && !slot.decided && !('optional' in slot && slot.optional))

const ownText = (step: StepView, slots: SlotView[]) =>
  (isTablesStep(step, slots) ? TABLES_STEP_TEXT[step.id] : undefined) ?? STEP_TEXT[step.id]

export function stepQuestion(step: StepView, slots: SlotView[]): string {
  const own = ownText(step, slots)?.question
  if (own) return own
  const root = slots.find((slot) => slot.stepId === step.id && slot.source === null)
  if (root?.kind === 'choose-entity') return `Choose your ${ENTITY_LABEL[root.of] ?? root.of}`
  return step.name
}

export function stepRule(step: StepView, slots: SlotView[]): string | null {
  return ownText(step, slots)?.rule ?? (step.page === undefined ? null : 'The rules for this step are in your book.')
}

/** Motivo de bloqueio pela etapa que falta (FR-FLOW-005). */
export function lockReason(steps: StepView[], step: StepView): string {
  const blocking = steps.find((candidate) => candidate.id === step.lockedBy[0])
  if (!blocking) return ''
  return STEP_TEXT[blocking.id]?.lockReason ?? `Finish ${blocking.name} first.`
}

export const mapLockNote = (reason: string) => `${reason.replace(/\.$/, '')} to open the other steps.`

export const formatValue = (value: number | null) => (value === null ? '—' : formatNumber(value))

/** Modificador com sinal, com o sinal de menos tipográfico ("+0", "−1"). */
export const formatModifier = (value: number | null) =>
  value === null ? '—' : value < 0 ? `−${Math.abs(value)}` : `+${value}`

/** Limite como na linha de fórmula: numérico como número ("25"); por referência, com o valor ("Will (10)"). */
export function limitText(formula: string, limit: number | null): string {
  if (limit === null || formula === formatNumber(limit)) return formula
  return `${formula} (${formatNumber(limit)})`
}

/**
 * Linha de fórmula de uma característica (FR-CALC-003; ui-design da FEAT-008): a fórmula, "Fixed" quando ela é só um
 * número, e os limites ("Health / 4, rounded down, minimum 1", "Fixed, maximum Will (10)").
 */
export function formulaLine(characteristic: CharacteristicSummary): string {
  const formula = /^-?\d+(\/\d+)?$/.test(characteristic.formula) ? 'Fixed' : characteristic.formula
  const limits = characteristic.limits.map(
    ({ bound, formula: text, limit }) => `${bound === 'max' ? 'maximum' : 'minimum'} ${limitText(text, limit)}`,
  )
  return [formula, ...limits].filter(Boolean).join(', ')
}

export const sourceBadge = (provenance: { abbr: string; page?: number }) =>
  provenance.page === undefined ? provenance.abbr : `${provenance.abbr} p.${provenance.page}`

export const TYPE_LABEL = { core: 'Core', adds: 'Adds' } as const

/** Faixa de uma entrada com travessão: a chave "4-7" vira "4–7" (ui-design da FEAT-009). */
export const rangeText = (key: string) => key.replace('-', '–')

/** Dado de um efeito, quantia somada: sempre com a contagem, como os livros ("1d6", "2d6+1"; ui-design da FEAT-009). */
export const effectDice = (dice: NonNullable<OpenDecision['dice']>) => `${dice.count}d${dice.sides}${dice.modifier ? formatModifier(dice.modifier) : ''}`

/** Dado de uma tabela, que se rola: sem o "1" ("d20", "3d6", "d6+1"; ui-design da FEAT-009). */
export const tableDice = (dice: NonNullable<OpenDecision['dice']>) =>
  `${dice.count === 1 ? '' : dice.count}d${dice.sides}${dice.modifier ? formatModifier(dice.modifier) : ''}`

// ui-design da FEAT-009, Textos (Roll-card).

/** Linha do regime (FR-DEC-002): o que o livro prevê, sem restringir. */
export const REGIME_PHRASE: Record<TableView['regime'], string> = {
  choice: 'The book says to choose.',
  'roll-or-choose': 'The book says to roll or choose.',
  roll: 'The book says to roll.',
}

export const NOT_DECIDED = 'Not decided yet. Nothing else waits for it.'
export const CHOOSE_A_RESULT = 'Choose a result.'
export const LATER = 'Or decide later: it stays in Open decisions.'
export const NO_TEXT = 'No text added for this entry · '

export const enterLabel = (dice: string) => `Your ${dice} roll`
export const enterHelp = ([min, max]: [number, number]) =>
  `Add up what the dice show, without any modifier. From ${min} to ${max}.`
export const outOfRange = ([min, max]: [number, number]) => `Enter a value from ${min} to ${max}.`

/** Cálculo de um resultado (FR-DEC-007): sempre com o modificador, mesmo +0. */
export function resultCalc(dice: string, result: TableResult | DiceResult): string {
  if (result.mode === 'chosen' || result.mode === 'written') return ''
  const shown = result.mode === 'rolled' ? `Rolled ${dice}: ${result.faces.join(' + ')}` : `Entered for ${dice}: ${result.sum}`
  return `${shown} · Modifier ${formatModifier(result.modifier)} · Total ${result.total}`
}

/** Efeito de uma entrada: "Corruption +1", "Size 1/2", "Insanity +1d6"; decidido, "Insanity +4". */
export function effectText(effect: EffectView, decided?: number): string {
  if ('dice' in effect) return `${effect.target.name} ${decided === undefined ? `+${effectDice(effect.dice)}` : formatModifier(decided)}`
  return `${effect.target.name} ${effect.op === 'set' ? formatNumber(effect.amount) : formatModifier(effect.amount)}`
}

/** Linha agrupada do Decide now (SCR-WEB-003): "6 tables in Story". */
export const tablesIn = (count: number, step: string) => `${count} ${count === 1 ? 'table' : 'tables'} in ${step}`

/** Título de uma pendência pelo `kind` da vaga. */
export function decisionTitle(
  decision: Pick<OpenDecision, 'kind' | 'target' | 'table' | 'dice'>,
  nameOf: (id: string) => string,
): string {
  switch (decision.kind) {
    case 'choose-entity':
      return 'Ancestry'
    case 'choose-value':
      return decision.target ? nameOf(decision.target) : 'Choice'
    case 'attribute-increase':
      return '+1 to one attribute'
    case 'language-or-profession':
      return 'Extra language or profession'
    case 'attribute-shift':
      return 'Score adjustment'
    // ui-design da FEAT-009, rótulos de pendência: "Dwarf Age", "Insanity 1d6".
    case 'table':
      return decision.table?.name ?? 'Table'
    case 'roll-effect':
      return [decision.target && nameOf(decision.target), decision.dice && effectDice(decision.dice)].filter(Boolean).join(' ')
  }
}

/** Onde a pendência se resolve: "{Step}" ou "{Step} · {origem}". */
export function decisionWhere(decision: OpenDecision, steps: StepView[]): string {
  const step = steps.find((candidate) => candidate.id === decision.stepId)?.name ?? ''
  return decision.source ? `${step} · ${decision.source.name}` : step
}

export const OPEN_MESSAGE = {
  'storage-unavailable': STORAGE_UNAVAILABLE,
  'not-found': "This character isn't saved in this browser. It may have been deleted, or created in another browser.",
  unreadable:
    "This character was saved by an earlier version of the generator and can't be opened. Your other characters aren't affected.",
  'pack-load-failed':
    "The rules this character uses couldn't be loaded. Nothing was changed. Check your connection and reload the page.",
} as const

export const SAVE_FAILED = "Your last choice wasn't saved. It's still on screen, but it will be lost if you close this page."

// ui-design da FEAT-011, Textos: diálogo de impacto (SCR-WEB-007), aviso ao abrir e linha do resumo (moldura).

export const IMPACT_TEXT = {
  current: 'Current',
  new: 'New',
  setAside: 'Will be set aside',
  restored: 'Will be restored',
  recalculated: 'Will be recalculated',
  notDecided: 'Not decided yet.',
  chosen: 'Chosen',
  d40: 'Set-aside decisions stay with this character, off the sheet, and come back on their own if what they depend on returns.',
  rerollNote: "Whichever result you don't use goes to the log as undone. It isn't set aside.",
} as const

export const staysLabel = (count: number) => `Stays as it is · ${count}`
export const dependsOnText = (decision: string) => `depends on ${decision}`
/** O par do ajuste: "{Atributo} +1, {Atributo} −1". */
export const shiftText = (increase: string, decrease: string) => `${increase} +1, ${decrease} −1`

const ANCESTRY_ACTIONS = { keep: 'Keep current ancestry', apply: 'Apply new ancestry' }
const RESULT_ACTIONS = { keep: 'Keep current result', apply: 'Apply new result' }
/**
 * Decide, Enter result ou Roll numa vaga que não é ancestralidade, tabela nem efeito com dado: não acontece no conteúdo
 * do MVP (só essas vagas têm dependentes). O ui-design não tem texto para ela; "Apply new choice" é provisório.
 */
export const CHOICE_ACTIONS = { keep: 'Keep current choice', apply: 'Apply new choice' }

export interface ImpactWording {
  title: string
  keep: string
  apply: string
}

/** Valor curto de uma vaga decidida, para o título: faixa na tabela, total no efeito, nome ou número nas escolhas. */
function shortValue(slot: SlotView | undefined, nameOf: (id: string) => string): string | null {
  if (!slot?.decided) return null
  // A escrita (FEAT-010) não tem faixa; o título dela é do ui-design da FEAT-010 (T5).
  if (slot.kind === 'table') return slot.result && slot.result.mode !== 'written' ? rangeText(slot.result.entry) : null
  if (slot.kind === 'roll-effect') return slot.result ? String(slot.result.total) : null
  if (slot.kind === 'choose-entity') return nameOf(String(slot.value))
  if (slot.kind === 'attribute-shift') return slot.value ? shiftText(nameOf(slot.value.increase), nameOf(slot.value.decrease)) : null
  return slot.value === undefined ? null : typeof slot.value === 'number' ? formatNumber(slot.value) : String(slot.value)
}

const changeTitle = (subject: string, from: string | null, to: string | null) =>
  from === null ? `Change ${subject} to ${to}?` : `Change ${subject} from ${from} to ${to}?`

/** Título e ações do diálogo pela variante (ui-design da FEAT-011, Textos, diálogo de impacto). */
export function impactWording(
  // `write` (FEAT-010) cai no título de troca até a variante dele (ui-design da FEAT-010, T5).
  kind: 'decide' | 'roll' | 'enter' | 'clear' | 'write',
  slot: SlotView | undefined,
  from: SlotView | undefined,
  to: SlotView | undefined,
  nameOf: (id: string) => string,
): ImpactWording {
  const subject = slot ? decisionTitle(toOpenDecision(slot), nameOf) : ''
  const current = shortValue(from, nameOf)
  const next = shortValue(to, nameOf)
  if (kind === 'clear') {
    const noun = slot?.kind === 'table' || slot?.kind === 'roll-effect' ? 'result' : 'choice'
    return { title: `Undo your ${subject} ${noun}?`, keep: `Keep current ${noun}`, apply: 'Apply undo' }
  }
  if (slot?.kind === 'choose-entity') {
    return { title: current === null ? changeTitle(subject, null, next) : `Switch from ${current} to ${next}?`, ...ANCESTRY_ACTIONS }
  }
  if (slot?.kind === 'table' || slot?.kind === 'roll-effect') {
    if (kind === 'roll') return { title: current === null ? `Use this roll for ${subject}?` : `Use the new roll for ${subject}?`, ...RESULT_ACTIONS }
    return { title: changeTitle(subject, current, next), ...RESULT_ACTIONS }
  }
  return { title: changeTitle(subject, current, next), ...CHOICE_ACTIONS }
}

export const NOTICE_TEXT = {
  title: 'The rules changed since this character was last saved.',
  setAside: 'Set aside, because the current rules no longer have them:',
  reopened: "Where the rules still ask for a decision, it's open again in Open decisions.",
  restored: 'Restored, because the current rules have them again:',
  dismiss: 'Dismiss',
} as const

export const earlierDecisions = (count: number) => `${count} earlier ${count === 1 ? 'decision' : 'decisions'}`
export const setAsideCount = (count: number) => `${count} set aside`

type Decision = ImpactItem['decision']
type LogEntry = Extract<Snapshot, { status: 'ready' }>['document']['log'][number]
type DecisionEntry = Extract<LogEntry, { kind: 'decision' }>

/** As partes de uma linha de decisão (ui-design da FEAT-011, Linha de decisão): título, valor e, em resultado, o modo. */
export interface LineParts {
  title: string
  value: string
  mode?: string
}

/** Uma decisão guardada na vaga dela: o rótulo de pendência, o valor gravado e o modo, só em resultado. */
export function partsOf(slot: SlotView, decision: Decision, nameOf: (id: string) => string): LineParts {
  const title = decisionTitle(toOpenDecision(slot), nameOf)
  switch (slot.kind) {
    case 'table': {
      // A escrita (FEAT-010) não tem entrada; o texto dela na linha é do ui-design da FEAT-010 (T5).
      const key = decision.mode === 'chosen' ? String(decision.value) : 'entry' in decision ? (decision.entry ?? '') : ''
      const entity = slot.table.entries.find((entry) => entry.key === key)?.entity
      return { title, value: entity ? `${rangeText(key)} ${entity.name}` : rangeText(key), mode: decision.mode }
    }
    case 'roll-effect':
      return { title, value: decision.mode === 'chosen' ? String(decision.value) : 'total' in decision ? String(decision.total) : '', mode: decision.mode }
    case 'attribute-shift': {
      const { increase, decrease } = (decision as Extract<Decision, { mode: 'chosen' }>).value as { increase: string; decrease: string }
      return { title, value: shiftText(nameOf(increase), nameOf(decrease)) }
    }
    case 'choose-entity':
      return { title, value: nameOf(String((decision as Extract<Decision, { mode: 'chosen' }>).value)) }
    default: {
      const value = (decision as Extract<Decision, { mode: 'chosen' }>).value
      return { title, value: typeof value === 'number' ? formatValue(value) : String(value) }
    }
  }
}

/**
 * Uma suspensa sem vaga (vaga não gerada): os nomes congelados da entrada `decision` original, pelo `logged`, só para
 * exibir (technical-design §3.3; ui-design, open-notice). Sem a entrada, `undefined`.
 */
export function partsOfLogged(log: LogEntry[], logged: number | undefined): LineParts | undefined {
  const entry = log.find((candidate): candidate is DecisionEntry => candidate.kind === 'decision' && candidate.id === logged)
  if (!entry) return undefined
  const title = entry.subject?.name ?? entry.step.name
  const { result } = entry
  const value =
    'entry' in result
      ? [rangeText(result.entry), result.entity?.name].filter(Boolean).join(' ')
      : 'shift' in result
        ? shiftText(result.shift.increase.name, result.shift.decrease.name)
        : 'value' in result
          ? formatValue(result.value)
          : 'entity' in result
            ? result.entity.name
            : // A escrita (FEAT-010): o texto da linha é do ui-design da FEAT-010 (T5).
              ''
  const isResult = entry.slotKind === 'table' || entry.slotKind === 'roll-effect'
  return { title, value, ...(isResult && { mode: entry.mode }) }
}

/** Id de elemento da vaga, para o atalho `?slot=` (FR-FLOW-011). */
export const slotElementId = (key: string) => `slot-${key.replace(/[^a-z0-9-]/g, '_')}`
