import type { ReactNode } from 'react'
import type { Provenance } from '../../engine'
import { sourceBadge, TYPE_LABEL } from './copy'

// Peças pequenas do design.md §4 (Estrutura e Componentes do domínio). `PillCounter` e `InlineAlert` estão em
// `src/ui/parts.tsx`, compartilhados com a Home.

export function SourceBadge({ provenance }: { provenance: { abbr: string; page?: number } }) {
  return <span className="source-badge typography-badge">{sourceBadge(provenance)}</span>
}

export function TypeBadge({ provenance }: { provenance: Provenance }) {
  return <span className="type-badge typography-caption">{TYPE_LABEL[provenance.type]}</span>
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
