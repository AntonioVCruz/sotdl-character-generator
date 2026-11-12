import type { SlotView, StepView } from '../../engine'
import { decisionTitle, slotElementId } from './copy'

/**
 * Etapa sem tela própria ainda (Attributes a Review): as pendências concedidas desta etapa, sem resolvê-las.
 * Cada feature de etapa (FEAT-008, 009, 012 a 016) troca este corpo pela tela dela.
 */
export function FallbackStep({ step, slots, nameOf }: { step: StepView; slots: SlotView[]; nameOf: (id: string) => string }) {
  const pending = slots.filter((slot) => slot.stepId === step.id && !slot.decided)
  if (pending.length === 0) return <p className="typography-meta">There&apos;s nothing to decide in this step yet.</p>
  return (
    <ul className="fallback-list">
      {pending.map((slot) => (
        <li key={slot.key} id={slotElementId(slot.key)} tabIndex={-1} className="subdecision">
          <p className="typography-label">
            {decisionTitle({ kind: slot.kind, target: 'target' in slot ? slot.target : undefined }, nameOf)}
          </p>
          {/* Texto provisório (ui-design §Textos): sai quando a etapa ganhar tela própria. */}
          <p className="typography-meta">You can&apos;t make this choice here yet. It stays in Open decisions.</p>
        </li>
      ))}
    </ul>
  )
}
