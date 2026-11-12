import { formatNumber, type OpenDecision, type SlotView, type StepStatus, type StepView } from '../../engine'

// Texto do construtor (ui-design §Textos, NFR-L10N-001). Nenhum id, enum ou nome de vaga aparece na tela (lição 5);
// pergunta da etapa e rótulos das pendências são do app, por id de etapa e por `kind` de vaga (D6).

export const REGIME_LABEL: Record<NonNullable<StepView['regime']>, string> = {
  choice: 'Choice',
  'roll-or-choose': 'Roll, choose or write your own',
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
const STEP_TEXT: Record<string, { question: string; rule: string; lockReason: string }> = {
  'step:ancestry': {
    question: "What is your character's ancestry?",
    rule: 'Choose one ancestry. It sets your starting attributes, characteristics, languages and talents.',
    lockReason: 'Choose an ancestry first.',
  },
}

export function stepQuestion(step: StepView, slots: SlotView[]): string {
  const own = STEP_TEXT[step.id]?.question
  if (own) return own
  const root = slots.find((slot) => slot.stepId === step.id && slot.source === null)
  if (root?.kind === 'choose-entity') return `Choose your ${ENTITY_LABEL[root.of] ?? root.of}`
  return step.name
}

export function stepRule(step: StepView): string | null {
  return STEP_TEXT[step.id]?.rule ?? (step.page === undefined ? null : 'The rules for this step are in your book.')
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

export const sourceBadge = (provenance: { abbr: string; page?: number }) =>
  provenance.page === undefined ? provenance.abbr : `${provenance.abbr} p.${provenance.page}`

export const TYPE_LABEL = { core: 'Core', adds: 'Adds' } as const

/** Título de uma pendência pelo `kind` da vaga. */
export function decisionTitle(decision: Pick<OpenDecision, 'kind' | 'target'>, nameOf: (id: string) => string): string {
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
  }
}

/** Onde a pendência se resolve: "{Step}" ou "{Step} · {origem}". */
export function decisionWhere(decision: OpenDecision, steps: StepView[]): string {
  const step = steps.find((candidate) => candidate.id === decision.stepId)?.name ?? ''
  return decision.source ? `${step} · ${decision.source.name}` : step
}

export const OPEN_MESSAGE = {
  'storage-unavailable':
    "This browser didn't let the generator read your saved characters. Nothing was changed. Reload the page to try again. If it keeps happening, check that this site is allowed to store data.",
  'not-found': "This character isn't saved in this browser. It may have been deleted, or created in another browser.",
  unreadable:
    "This character was saved by an earlier version of the generator and can't be opened. Your other characters aren't affected.",
  'pack-load-failed':
    "The rules this character uses couldn't be loaded. Nothing was changed. Check your connection and reload the page.",
} as const

export const SAVE_FAILED = "Your last choice wasn't saved. It's still on screen, but it will be lost if you close this page."

/** D8: nomeia as escolhas que impedem a troca ("your Size choice for Human depends on…"). */
export function hasDependentsMessage(next: string, current: string, titles: string[]): string {
  const choices =
    titles.length === 1
      ? `your ${titles[0]} choice`
      : `your ${titles.slice(0, -1).join(', ')} and ${titles[titles.length - 1]} choices`
  const verb = titles.length === 1 ? 'depends' : 'depend'
  return `You can't switch to ${next} yet: ${choices} for ${current} ${verb} on your current ancestry. Changing a choice that others depend on isn't available yet.`
}

/** Id de elemento da vaga, para o atalho `?slot=` (FR-FLOW-011). */
export const slotElementId = (key: string) => `slot-${key.replace(/[^a-z0-9-]/g, '_')}`
