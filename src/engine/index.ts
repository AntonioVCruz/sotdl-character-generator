import type { CharacterDocument, StepItem } from '../content'
import type { Rules } from './resolve'

export * from './formula'
export * from './resolve'

// `evaluate` ainda é o stub do esqueleto; o T5 da FEAT-007 o substitui pela visão da ADR-004.

export type StepStatus = 'not-started'

export interface StepView extends StepItem {
  status: StepStatus
}

export interface CharacterView {
  steps: StepView[]
}

/** Stub (FEAT-007): toda etapa aparece como "Not started"; nenhuma regra é calculada. */
export function evaluate(rules: Rules, character: CharacterDocument): CharacterView {
  void character
  return { steps: rules.steps.map((step) => ({ ...step, status: 'not-started' })) }
}
