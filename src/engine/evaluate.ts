import type { AncestryItem, CharacterDocument, GrantedSlot, Regime, SlotDef } from '../content'
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
}

interface SlotBase {
  key: string
  stepId: string
  decided: boolean
  value?: string | number
  /** Entidade que concedeu a vaga; `null` na vaga raiz da etapa. */
  source: SlotSource | null
}

export type SlotView = SlotBase &
  (
    | ({ kind: 'choose-entity'; options: EntityOption[] } & Omit<SlotDef, 'kind'>)
    | ({ grant: string } & GrantedSlot)
  )

export type SlotKind = SlotView['kind']

export interface OpenDecision {
  key: string
  kind: SlotKind
  stepId: string
  source: SlotSource | null
  target?: string
}

export interface CharacterView {
  level: 0
  ancestry: string | null
  steps: StepView[]
  slots: SlotView[]
  /** Vagas vivas sem decisão, na ordem das etapas (FR-FLOW-010, FR-DEC-011). */
  openDecisions: OpenDecision[]
}

/** Chave de vaga filha: `<mãe>=<parte local do valor>/<grantId>` (ex.: `ancestry=human/size`). */
export function childKey(parent: string, value: string, grant: string): string {
  return `${parent}=${value.slice(value.indexOf(':') + 1)}/${grant}`
}

export const isRootKey = (key: string) => !key.includes('=')

export function evaluate(rules: Rules, character: CharacterDocument): CharacterView {
  const slots = slotTree(rules, character)
  const ancestry = slots.find((slot) => slot.kind === 'choose-entity' && slot.of === 'ancestry' && slot.decided)

  const rootOpen = (stepId: string) => slots.some((slot) => slot.stepId === stepId && isRootKey(slot.key) && !slot.decided)
  const steps = rules.steps.map((step, index): StepView => {
    const own = slots.filter((slot) => slot.stepId === step.id)
    const decided = own.filter((slot) => slot.decided).length
    const open = own.length - decided
    // Só vaga raiz de etapa em `requires` bloqueia; vaga concedida nunca bloqueia etapa (P4, FR-FLOW-007).
    const lockedBy = (step.requires ?? []).filter(rootOpen)
    const status: StepStatus = lockedBy.length
      ? 'locked'
      : step.optional
        ? 'optional'
        : decided === 0
          ? 'not-started'
          : open > 0
            ? 'open'
            : 'done'
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
  const openDecisions = slots
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

  return { level: 0, ancestry: (ancestry?.value as string | undefined) ?? null, steps, slots, openDecisions }
}

/** Raízes: as vagas de cada etapa. Uma escolha em `choose-entity` abre as concessões da entidade como filhas. */
function slotTree(rules: Rules, character: CharacterDocument): SlotView[] {
  const slots: SlotView[] = []
  for (const step of rules.steps) {
    for (const [key, def] of Object.entries(step.slots ?? {})) {
      const options = rules.ancestries.map(({ id, name, provenance }) => ({ id, name, provenance }))
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

function grantedSlots(parent: string, entity: AncestryItem, character: CharacterDocument): SlotView[] {
  return Object.entries(entity.grants ?? {}).map(([grant, def]): SlotView => {
    const key = childKey(parent, entity.id, grant)
    const value = character.decisions[key]?.value
    // `attribute-increase` e `language-or-profession` não têm resolvedor até a FEAT-016 (D9).
    const decided = def.kind === 'choose-value' && typeof value === 'number' && def.options.includes(value)
    return { key, stepId: def.step, source: { id: entity.id, name: entity.name }, decided, ...(decided && { value }), grant, ...def }
  })
}
