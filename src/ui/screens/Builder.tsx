import { useEffect, useState } from 'react'
import { app, type OpenResult } from '../../app'
import type { StepStatus } from '../../engine'

// Casca do construtor (SCR-WEB-003): três zonas vazias e o mapa de etapas do `evaluate` (stub).
// Etapas reais, resumo vivo e decisões abertas entram a partir da FEAT-007.

const STATUS_LABEL: Record<StepStatus, string> = {
  locked: 'Locked',
  optional: 'Optional',
  'not-started': 'Not started',
  open: 'Open',
  done: 'Done',
}

export default function Builder({ id }: { id: string }) {
  const [result, setResult] = useState<OpenResult | null>(null)

  useEffect(() => {
    let current = true
    app.openCharacter(id).then((opened) => current && setResult(opened))
    return () => {
      current = false
    }
  }, [id])

  if (!result) {
    return (
      <p className="page typography-body" aria-busy="true">
        Loading…
      </p>
    )
  }
  if (!result.ok) {
    return (
      <p role="alert" className="page notice notice--danger typography-body">
        {result.reason === 'not-found'
          ? 'This character is not saved in this browser.'
          : 'The rules for this character could not be loaded. Nothing was changed.'}
      </p>
    )
  }

  return (
    <div className="builder">
      <nav className="builder__map zone" aria-labelledby="steps-title">
        <h2 id="steps-title" className="typography-eyebrow">
          Steps
        </h2>
        <ol className="step-list">
          {result.view.steps.map((step) => (
            <li key={step.id} className="step-list__item">
              <span className="typography-label">{step.name}</span>
              <span className="typography-caption">{STATUS_LABEL[step.status]}</span>
            </li>
          ))}
        </ol>
      </nav>
      <section className="builder__step zone" aria-label="Current step" />
      <section className="builder__summary zone" aria-labelledby="summary-title">
        <h2 id="summary-title" className="typography-eyebrow">
          Live summary
        </h2>
      </section>
    </div>
  )
}
