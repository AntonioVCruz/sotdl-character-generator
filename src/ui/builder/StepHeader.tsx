import type { Rules, SlotView, StepView } from '../../engine'
import { REGIME_LABEL, stepQuestion, stepRule } from './copy'
import { PillCounter, SourceBadge } from './parts'

/** `step-header` (FR-FLOW-009): regime, pergunta, linha de regra com página e contadores. */
export function StepHeader({ step, steps, slots, rules }: { step: StepView; steps: StepView[]; slots: SlotView[]; rules: Rules }) {
  const rule = stepRule(step)
  const provenance = rules.items.get(step.id)?.provenance
  return (
    <div className="step-header">
      <p className="typography-eyebrow step-header__eyebrow">
        {`Step ${step.index + 1} of ${steps.length}`}
        {step.regime && ` · ${REGIME_LABEL[step.regime]}`}
      </p>
      <h1 className="typography-display">{stepQuestion(step, slots)}</h1>
      {rule && (
        <p className="typography-body step-header__rule">
          {rule} {provenance?.page !== undefined && <SourceBadge provenance={provenance} />}
        </p>
      )}
      {step.total > 0 && (
        <p className="step-header__counters">
          <PillCounter done={step.open === 0}>{`Chosen ${step.decided} of ${step.total}`}</PillCounter>
          {step.open > 0 && <PillCounter>{`${step.open} open`}</PillCounter>}
        </p>
      )}
    </div>
  )
}
