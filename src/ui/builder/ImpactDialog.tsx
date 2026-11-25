import { useEffect, useRef, type ReactNode } from 'react'
import { Archive, ArchiveRestore, ChevronDown, ChevronUp } from 'lucide-react'
import { Button, Dialog, Disclosure, DisclosurePanel, Heading, Modal, ModalOverlay } from 'react-aria-components'
import type { PendingChange } from '../../app'
import { toOpenDecision, type CharacterView, type ImpactItem, type SlotView, type ValueChange } from '../../engine'
import { DecisionLine } from './DecisionLine'
import { EffectChips } from './TablesStep'
import {
  decisionTitle,
  effectDice,
  effectText,
  formatModifier,
  formatValue,
  IMPACT_TEXT,
  impactWording,
  partsOf,
  rangeText,
  resultCalc,
  staysLabel,
  tableDice,
} from './copy'
import { SourceBadge } from './parts'

/**
 * Diálogo de impacto (SCR-WEB-007; ui-design da FEAT-011): renderizado pela moldura, abre quando o snapshot ganha
 * `pending` e fecha quando o perde (C2). Esc é Keep; o clique fora não fecha. Foco ao abrir no título.
 */
export function ImpactDialog({ pending, nameOf, onKeep, onApply }: {
  pending: PendingChange | undefined
  nameOf: (id: string) => string
  onKeep: () => void
  onApply: () => void
}) {
  return (
    <ModalOverlay
      className="dialog-overlay"
      isOpen={pending !== undefined}
      isDismissable={false}
      onOpenChange={(open) => {
        if (!open) onKeep()
      }}
    >
      <Modal className="dialog impact-dialog">
        {pending && <ImpactContent pending={pending} nameOf={nameOf} onKeep={onKeep} onApply={onApply} />}
      </Modal>
    </ModalOverlay>
  )
}

function ImpactContent({ pending, nameOf, onKeep, onApply }: {
  pending: PendingChange
  nameOf: (id: string) => string
  onKeep: () => void
  onApply: () => void
}) {
  const { impact } = pending
  const { from, to } = impact.change
  const slot = from ?? to
  const title = useRef<HTMLHeadingElement>(null)
  // Foco ao abrir no título, nunca em Apply (ui-design, dialog-open): o diálogo é para ler antes de decidir.
  useEffect(() => title.current?.focus(), [])

  const wording = impactWording(pending.kind, slot, from, to, nameOf)
  const recalculated = [...impact.recalculated.attributes, ...impact.recalculated.characteristics]
  const parentTitle = (item: ImpactItem, view: CharacterView) => {
    if (item.parent === null || item.parent === impact.change.key) return undefined
    const parent = view.slots.find((candidate) => candidate.key === item.parent)
    return parent && decisionTitle(toOpenDecision(parent), nameOf)
  }

  return (
    <Dialog className="dialog__content impact-dialog__content">
      <Heading slot="title" ref={title} tabIndex={-1} className="typography-heading">
        {wording.title}
      </Heading>
      <div className="impact-dialog__columns">
        <div className="impact-dialog__column">
          <h3 className="typography-eyebrow eyebrow--secondary">{IMPACT_TEXT.current}</h3>
          <ColumnValue slot={from} nameOf={nameOf} />
        </div>
        <div className="impact-dialog__column">
          <h3 className="typography-eyebrow eyebrow--secondary">{IMPACT_TEXT.new}</h3>
          <ColumnValue slot={to} nameOf={nameOf} />
        </div>
      </div>
      {pending.kind === 'roll' && impact.undone && <p className="typography-meta impact-dialog__note">{IMPACT_TEXT.rerollNote}</p>}
      <div className="impact-dialog__lists">
        {impact.setAside.length > 0 && (
          <ImpactList id="impact-set-aside" heading={IMPACT_TEXT.setAside} note={IMPACT_TEXT.d40}>
            {impact.setAside.map((item) => (
              <li key={`${item.key}/${item.index}`} className="impact-dialog__item">
                <Archive className="icon icon--sm" aria-hidden="true" />
                <DecisionLine parts={partsOf(item.slot, item.decision, nameOf)} dependsOn={parentTitle(item, impact.before)} />
              </li>
            ))}
          </ImpactList>
        )}
        {impact.restored.length > 0 && (
          <ImpactList id="impact-restored" heading={IMPACT_TEXT.restored}>
            {impact.restored.map((item) => (
              <li key={`${item.key}/${item.index}`} className="impact-dialog__item">
                <ArchiveRestore className="icon icon--sm" aria-hidden="true" />
                <DecisionLine parts={partsOf(item.slot, item.decision, nameOf)} dependsOn={parentTitle(item, impact.after)} />
              </li>
            ))}
          </ImpactList>
        )}
        {recalculated.length > 0 && (
          <ImpactList id="impact-recalculated" heading={IMPACT_TEXT.recalculated}>
            {recalculated.map((change) => (
              <Recalculated key={change.id} change={change} />
            ))}
          </ImpactList>
        )}
        {impact.stays.length > 0 && (
          <Disclosure className="impact-dialog__stays">
            {({ isExpanded }) => (
              <>
                <h3 className="impact-dialog__stays-heading">
                  <Button slot="trigger" className="composition-trigger typography-label">
                    {staysLabel(impact.stays.length)}
                    {isExpanded ? (
                      <ChevronUp className="icon icon--sm" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="icon icon--sm" aria-hidden="true" />
                    )}
                  </Button>
                </h3>
                <DisclosurePanel>
                  <ul className="impact-dialog__list">
                    {impact.stays.map((item) => (
                      <li key={`${item.key}/${item.index}`} className="impact-dialog__item impact-dialog__item--plain">
                        <DecisionLine parts={partsOf(item.slot, item.decision, nameOf)} dependsOn={parentTitle(item, impact.after)} />
                      </li>
                    ))}
                  </ul>
                </DisclosurePanel>
              </>
            )}
          </Disclosure>
        )}
      </div>
      <div className="dialog__actions">
        <Button className="button-secondary typography-label" onPress={onKeep}>
          {wording.keep}
        </Button>
        <Button className="button-primary typography-label" onPress={onApply}>
          {wording.apply}
        </Button>
      </div>
    </Dialog>
  )
}

/** Uma lista do diálogo: `h3` visível e `ul` nomeada por ele (C9). */
function ImpactList({ id, heading, note, children }: { id: string; heading: string; note?: string; children: ReactNode }) {
  return (
    <section className="impact-dialog__group">
      <h3 id={id} className="typography-label">
        {heading}
      </h3>
      <ul className="impact-dialog__list" aria-labelledby={id}>
        {children}
      </ul>
      {note && <p className="typography-meta impact-dialog__note">{note}</p>}
    </section>
  )
}

function Recalculated({ change }: { change: ValueChange }) {
  return (
    <li className="impact-dialog__recalculated">
      <span className="typography-meta">{change.name}</span>
      <span className="typography-badge">{`${formatValue(change.from)} → ${formatValue(change.to)}`}</span>
    </li>
  )
}

/** Valor de Current ou New pelo `kind` da vaga (ui-design, Estrutura, item 2); sem resultado, "Not decided yet.". */
function ColumnValue({ slot, nameOf }: { slot: SlotView | undefined; nameOf: (id: string) => string }) {
  if (!slot || !slot.decided) return <p className="typography-meta">{IMPACT_TEXT.notDecided}</p>
  switch (slot.kind) {
    case 'choose-entity': {
      const option = slot.options.find((candidate) => candidate.id === slot.value)
      return (
        <p className="impact-dialog__value">
          <span className="typography-title-sm">{option?.name ?? nameOf(String(slot.value))}</span>
          {option && <SourceBadge provenance={option.provenance} />}
        </p>
      )
    }
    case 'table': {
      const result = slot.result!
      // A escrita (FEAT-010): a variante do diálogo é do ui-design da FEAT-010 (T5).
      if (result.mode === 'written') return null
      const entry = slot.table.entries.find((candidate) => candidate.key === result.entry)
      return (
        <>
          <p className="impact-dialog__value">
            <span className="typography-badge">{rangeText(result.entry)}</span>
            {entry?.entity && <span className="typography-title-sm">{entry.entity.name}</span>}
          </p>
          <p className="typography-meta">{result.mode === 'chosen' ? IMPACT_TEXT.chosen : resultCalc(tableDice(slot.table.dice), result)}</p>
          {entry && entry.effects.length > 0 && <EffectChips texts={entry.effects.map((effect) => effectText(effect))} />}
        </>
      )
    }
    case 'roll-effect': {
      const result = slot.result!
      const dice = effectDice(slot.dice)
      return (
        <>
          <p className="typography-title-sm">{result.total}</p>
          <p className="typography-meta">{resultCalc(dice, result)}</p>
          <EffectChips texts={[`${slot.target.name} ${formatModifier(result.total)}`]} />
        </>
      )
    }
    case 'attribute-shift': {
      const { increase, decrease } = slot.value as { increase: string; decrease: string }
      return <p className="typography-body">{`${nameOf(increase)} +1, ${nameOf(decrease)} −1`}</p>
    }
    default:
      return <p className="typography-body">{typeof slot.value === 'number' ? formatValue(slot.value) : String(slot.value)}</p>
  }
}
