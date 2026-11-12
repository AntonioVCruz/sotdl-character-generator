import type { StepView } from '../../engine'
import { href } from '../router'
import { lockReason, mapLockNote, statusLabel } from './copy'

/** `step-map` (design.md §4; ui-design, Builder frame): lista de links; etapa bloqueada sem link, sem foco e sem tooltip. */
export function StepMap({ id, steps, current, onNavigate }: {
  id: string
  steps: StepView[]
  current: StepView
  onNavigate?: () => void
}) {
  const locked = steps.find((step) => step.status === 'locked')
  return (
    <>
      <p className="typography-eyebrow eyebrow--secondary">Level 0 · Creation</p>
      <ol className="step-map">
        {steps.map((step) => {
          const label = `${step.index + 1}. ${step.name}`
          if (step.status === 'locked') {
            return (
              <li key={step.id} className="step-map__row">
                <span className="step-map__item step-map__item--locked">
                  <span aria-hidden="true" className="typography-label">
                    {label}
                  </span>
                  <span aria-hidden="true" className="typography-meta">
                    Locked
                  </span>
                  <span className="visually-hidden">{`${label}, locked. ${lockReason(steps, step)}`}</span>
                </span>
              </li>
            )
          }
          const isCurrent = step.id === current.id
          return (
            <li key={step.id} className="step-map__row">
              <a
                className={`step-map__item${isCurrent ? ' step-map__item--current' : ''}`}
                href={href.builder(id, step.slug)}
                aria-current={isCurrent ? 'step' : undefined}
                onClick={onNavigate}
              >
                <span className="typography-label">{label}</span>
                <span className="typography-meta">{statusLabel(step)}</span>
              </a>
            </li>
          )
        })}
      </ol>
      {locked && <p className="typography-caption step-map__note">{mapLockNote(lockReason(steps, locked))}</p>}
    </>
  )
}
