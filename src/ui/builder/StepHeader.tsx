import type { Ref } from 'react'
import type { Rules, SlotView, StepView } from '../../engine'
import { REGIME_LABEL, stepQuestion, stepRule } from './copy'
import { PillCounter } from '../parts'
import { SourceBadge } from './parts'

/** `step-header` (FR-FLOW-009): regime, pergunta, linha de regra com página e contadores. */
export function StepHeader({ step, steps, slots, rules, titleRef }: {
  step: StepView
  steps: StepView[]
  slots: SlotView[]
  rules: Rules
  /** Alvo do foco ao chegar à etapa por navegação dentro do app (ui-design da FEAT-001, Builder frame focus). */
  titleRef?: Ref<HTMLHeadingElement>
}) {
  const rule = stepRule(step)
  const provenance = rules.items.get(step.id)?.provenance
  // O ajuste não usado não ganha pílula: ele não é pendência (D2 da FEAT-008).
  const adjusted = slots.some((slot) => slot.stepId === step.id && slot.kind === 'attribute-shift' && slot.decided)
  return (
    <div className="step-header">
      <p className="typography-eyebrow step-header__eyebrow">
        {`Step ${step.index + 1} of ${steps.length}`}
        {step.regime && ` · ${REGIME_LABEL[step.regime]}`}
      </p>
      <h1 className="typography-display" tabIndex={-1} ref={titleRef}>
        {stepQuestion(step, slots)}
      </h1>
      {rule && (
        <p className="typography-body step-header__rule">
          {rule} {provenance?.page !== undefined && <SourceBadge provenance={provenance} />}
        </p>
      )}
      {(step.total > 0 || step.status === 'done') && (
        <p className="step-header__counters">
          {step.total > 0 ? (
            <PillCounter done={step.open === 0}>{`Chosen ${step.decided} of ${step.total}`}</PillCounter>
          ) : (
            // Etapa `done` só com vaga opcional (ui-design da FEAT-008, Contadores).
            <PillCounter done>Nothing required</PillCounter>
          )}
          {step.open > 0 && <PillCounter>{`${step.open} open`}</PillCounter>}
          {adjusted && <PillCounter done>Adjustment used</PillCounter>}
        </p>
      )}
    </div>
  )
}
