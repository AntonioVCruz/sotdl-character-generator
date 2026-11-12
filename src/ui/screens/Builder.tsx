import { useEffect, useState, useSyncExternalStore } from 'react'
import { app } from '../../app'
import type { StepStatus } from '../../engine'

// Casca do construtor (SCR-WEB-003): três zonas vazias e o mapa de etapas da sessão.
// Transição da FEAT-007 até o T8 e o T9, que trazem os estados e as telas do ui-design.

const STATUS_LABEL: Record<StepStatus, string> = {
  locked: 'Locked',
  optional: 'Optional',
  'not-started': 'Not started',
  open: 'Open',
  done: 'Done',
}

export default function Builder({ id }: { id: string }) {
  const [session] = useState(() => app.createSession())
  const result = useSyncExternalStore(session.subscribe, session.getSnapshot)

  useEffect(() => {
    void session.open(id)
  }, [session, id])

  if (result.status === 'loading') {
    return (
      <p className="page typography-body" aria-busy="true">
        Loading…
      </p>
    )
  }
  if (result.status === 'error') {
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
