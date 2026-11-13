import { CircleAlert, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

// Peças do design.md §4 compartilhadas pela Home e pelo construtor, fora de `src/ui/builder/` (ui-design da FEAT-001,
// Decisões entre telas): a Home não importa nada do construtor.

/** `pill-counter`: preenchido quando concluído, tracejado quando pendente. */
export function PillCounter({ done = false, children }: { done?: boolean; children: ReactNode }) {
  return <span className={`pill-counter typography-caption${done ? ' pill-counter--done' : ''}`}>{children}</span>
}

/**
 * `inline-alert` (design.md §4): ícone, borda esquerda da cor do estado e fundo tint. Não some sozinho. Por padrão,
 * região viva (`alert` no danger, `status` no warning); `live={false}` para um aviso estático, sem `role`.
 */
export function InlineAlert({ tone, live = true, children }: { tone: 'danger' | 'warning'; live?: boolean; children: ReactNode }) {
  const Icon = tone === 'danger' ? CircleAlert : TriangleAlert
  const role = live ? (tone === 'danger' ? 'alert' : 'status') : undefined
  return (
    <div role={role} className={`inline-alert inline-alert--${tone} typography-body`}>
      <Icon className="icon icon--md inline-alert__icon" aria-hidden="true" />
      <div className="inline-alert__body">{children}</div>
    </div>
  )
}
