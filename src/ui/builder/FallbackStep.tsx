import { toOpenDecision, type SlotView, type StepView } from '../../engine'
import { decisionTitle, pendingIn, slotElementId } from './copy'

/**
 * Etapa sem tela própria ainda (Story a Review): as pendências concedidas desta etapa, sem resolvê-las.
 * Cada feature de etapa (FEAT-009, 012 a 016) troca este corpo pela tela dela.
 */
export function FallbackStep({ step, slots, nameOf }: { step: StepView; slots: SlotView[]; nameOf: (id: string) => string }) {
  const pending = pendingIn(step, slots)
  if (pending.length === 0) return <p className="typography-meta">There&apos;s nothing to decide in this step yet.</p>
  return <PendingList pending={pending} nameOf={nameOf} />
}

/** A lista do fallback; a `TablesStep` a usa para as pendências não-tabela (technical-design da FEAT-009 §3.4). */
export function PendingList({ pending, nameOf }: { pending: SlotView[]; nameOf: (id: string) => string }) {
  return (
    <ul className="fallback-list">
      {pending.map((slot) => (
        <li key={slot.key} id={slotElementId(slot.key)} tabIndex={-1} className="subdecision">
          <p className="typography-label">
            {decisionTitle(toOpenDecision(slot), nameOf)}
          </p>
          {/* Texto provisório (ui-design §Textos): sai quando a etapa ganhar tela própria. */}
          <p className="typography-meta">You can&apos;t make this choice here yet. It stays in Open decisions.</p>
        </li>
      ))}
    </ul>
  )
}
