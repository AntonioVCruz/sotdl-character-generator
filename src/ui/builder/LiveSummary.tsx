import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button, Disclosure, DisclosurePanel } from 'react-aria-components'
import type { CharacterView, OpenDecision, Stage, StepView } from '../../engine'
import { href } from '../router'
import { decisionTitle, decisionWhere, formatModifier, formatValue } from './copy'
import { Eyebrow, PillCounter } from './parts'

/** `live-summary` (FR-FLOW-012, 013): atributos, características com composição e ganhos. */
export function LiveSummary({ view, nameOf }: { view: CharacterView; nameOf: (id: string) => string }) {
  const { attributes, characteristics, gained } = view.summary
  const announcement = [...attributes.map((a) => [a.name, a.score]), ...characteristics.map((c) => [c.name, c.value])]
    .filter(([, value]) => value !== null)
    .map(([name, value]) => `${name} ${formatValue(value as number)}`)
    .join(', ')
  const pendingTitle = (key: string) => {
    const slot = view.slots.find((candidate) => candidate.key === key)
    return slot ? decisionTitle({ kind: slot.kind, target: 'target' in slot ? slot.target : undefined }, nameOf) : ''
  }

  return (
    <section className="card live-summary" aria-labelledby="live-summary-title">
      <Eyebrow as="h2" id="live-summary-title" secondary>
        Live summary
      </Eyebrow>
      {/* Só o texto anunciado é região viva, não o card inteiro (design.md §5). */}
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>
      <ul className="live-summary__attributes">
        {attributes.map((attribute) => (
          <li key={attribute.id} className="mini-card">
            <Composition
              total={attribute.score}
              name={attribute.name}
              stages={attribute.composition}
              trigger={
                <>
                  <span className="typography-caption">{attribute.name}</span>
                  <span className="typography-stat-sm">{formatValue(attribute.score)}</span>
                  <span className="typography-caption">{formatModifier(attribute.modifier)}</span>
                </>
              }
            />
          </li>
        ))}
      </ul>
      {view.ancestry === null && <p className="typography-meta">Choose an ancestry to see your scores.</p>}
      <ul className="live-summary__characteristics">
        {characteristics.map((characteristic) => (
          <li key={characteristic.id} className="characteristic-line">
            <Composition
              total={characteristic.value}
              name={characteristic.name}
              stages={characteristic.composition}
              pending={characteristic.pendingOn && pendingTitle(characteristic.pendingOn)}
              trigger={
                <>
                  <span className="characteristic-line__name">
                    <span className="typography-meta">{characteristic.name}</span>
                    {characteristic.pendingOn && <PillCounter>Open</PillCounter>}
                  </span>
                  <span className="characteristic-line__value typography-label">{formatValue(characteristic.value)}</span>
                </>
              }
            />
          </li>
        ))}
      </ul>
      {(gained.languages.length > 0 || gained.talents.length > 0) && (
        <div className="live-summary__gained">
          <Eyebrow secondary>Gained so far</Eyebrow>
          {gained.languages.length > 0 && (
            <p className="typography-meta">{gained.languages.map((l) => `${l.name} (${l.abilities.join(', ')})`).join(', ')}</p>
          )}
          {gained.talents.length > 0 && <p className="typography-meta">{gained.talents.map((t) => t.name).join(', ')}</p>}
        </div>
      )}
    </section>
  )
}

/** Linha que abre o `value-composition` (P11): termo base com a origem e o total. */
function Composition({ trigger, stages, total, name, pending }: {
  trigger: ReactNode
  stages: Stage[]
  total: number | null
  name: string
  pending?: string
}) {
  if (stages.length === 0) return <div className="composition-trigger composition-trigger--static">{trigger}</div>
  return (
    <Disclosure className="composition">
      <Button slot="trigger" className="composition-trigger">
        {trigger}
        <ChevronDown className="icon icon--sm composition__closed" aria-hidden="true" />
        <ChevronUp className="icon icon--sm composition__open" aria-hidden="true" />
      </Button>
      <DisclosurePanel className="value-composition">
        <p className="typography-eyebrow eyebrow--secondary">How this is calculated</p>
        <ul>
          {stages.map((stage, index) => (
            <li key={index} className="value-composition__line">
              <span className="typography-meta">{stageLabel(stage, pending)}</span>
              <span className="typography-badge">{formatValue(stage.value)}</span>
            </li>
          ))}
          <li className="value-composition__line value-composition__total">
            <span className="typography-meta">{name}</span>
            <span className="typography-badge">{formatValue(total)}</span>
          </li>
        </ul>
      </DisclosurePanel>
    </Disclosure>
  )
}

function stageLabel(stage: Stage, pending?: string): string {
  if (stage.origin.kind === 'default') return `Standard rule: ${stage.formula}`
  if (pending) return `${stage.origin.name}: ${pending}, open`
  if (stage.formula === undefined) return `${stage.origin.name} starting score`
  return `${stage.origin.name}: ${stage.formula}`
}

/** `open-decisions` (FR-FLOW-010, 011): contagem e um atalho para cada pendência. */
export function OpenDecisions({ id, view, nameOf, onNavigate }: {
  id: string
  view: CharacterView
  nameOf: (id: string) => string
  onNavigate?: () => void
}) {
  const stepOf = (decision: OpenDecision): StepView => view.steps.find((step) => step.id === decision.stepId)!
  return (
    <section className="card open-decisions" aria-labelledby="open-decisions-title">
      <Eyebrow as="h2" id="open-decisions-title" secondary>
        {`Open decisions · ${view.openDecisions.length}`}
      </Eyebrow>
      {view.openDecisions.length === 0 ? (
        <p className="typography-meta">Nothing open right now.</p>
      ) : (
        <ul className="open-decisions__list">
          {view.openDecisions.map((decision) => (
            <li key={decision.key}>
              <a className="open-decision" href={href.builder(id, stepOf(decision).slug, decision.key)} onClick={onNavigate}>
                <span className="typography-label">{decisionTitle(decision, nameOf)}</span>
                <span className="typography-meta">{decisionWhere(decision, view.steps)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
