import type { ReactNode } from 'react'
import type { Provenance } from '../../engine'
import { sourceBadge, TYPE_LABEL } from './copy'

// Peças pequenas do design.md §4 (Estrutura e Componentes do domínio).

export function SourceBadge({ provenance }: { provenance: { abbr: string; page?: number } }) {
  return <span className="source-badge typography-badge">{sourceBadge(provenance)}</span>
}

export function TypeBadge({ provenance }: { provenance: Provenance }) {
  return <span className="type-badge typography-caption">{TYPE_LABEL[provenance.type]}</span>
}

/** `pill-counter`: preenchido quando concluído, tracejado quando pendente. */
export function PillCounter({ done = false, children }: { done?: boolean; children: ReactNode }) {
  return <span className={`pill-counter typography-caption${done ? ' pill-counter--done' : ''}`}>{children}</span>
}

export function Eyebrow({ as: Tag = 'p', id, secondary = false, children }: {
  as?: 'p' | 'h2' | 'h3'
  id?: string
  secondary?: boolean
  children: ReactNode
}) {
  return (
    <Tag id={id} className={`typography-eyebrow${secondary ? ' eyebrow--secondary' : ''}`}>
      {children}
    </Tag>
  )
}
