import { useRef, useState } from 'react'
import { Button, Label, Radio, RadioGroup } from 'react-aria-components'
import type { CharacterSession, Snapshot } from '../../app'
import { preview, type SlotView } from '../../engine'
import { PreviewBox } from './AncestryStep'
import { decisionTitle, formatModifier, formatValue, formulaLine, slotElementId } from './copy'
import { Composition } from './LiveSummary'
import { PillCounter } from './parts'

type Ready = Extract<Snapshot, { status: 'ready' }>
type ShiftSlot = Extract<SlotView, { kind: 'attribute-shift' }>

/**
 * Corpo da etapa Attributes (SCR-WEB-005; ui-design da FEAT-008): atributos com composição, o ajuste de scores em duas
 * subdecisões, a pendência do +1 e as características com fórmula, limites e valor.
 */
export function AttributesStep({ session, snapshot, slot, nameOf }: {
  session: CharacterSession
  snapshot: Ready
  slot: ShiftSlot
  nameOf: (id: string) => string
}) {
  const { view } = snapshot
  const increases = view.slots.filter((candidate) => candidate.stepId === slot.stepId && candidate.kind === 'attribute-increase' && !candidate.decided)
  const pendingTitle = (key: string) => {
    const pending = view.slots.find((candidate) => candidate.key === key)
    return pending ? decisionTitle({ kind: pending.kind, target: 'target' in pending ? pending.target : undefined }, nameOf) : ''
  }

  return (
    <>
      <section className="card" aria-labelledby="attributes-title">
        <h2 id="attributes-title" className="typography-title">
          Attributes
        </h2>
        <ul className="characteristic-list" aria-label="Attributes">
          {view.summary.attributes.map((attribute) => (
            <li key={attribute.id} className="characteristic-row">
              <Composition
                total={attribute.score}
                name={attribute.name}
                stages={attribute.composition}
                trigger={
                  // DOM: nome, score, modificador; o nome acessível vem do conteúdo, e a grade põe o modificador no meio
                  // (WCAG 2.5.3; ui-design, emenda da T8).
                  <>
                    <span className="characteristic-row__name typography-label">{attribute.name}</span>{' '}
                    <span className="characteristic-row__value typography-stat">{formatValue(attribute.score)}</span>{' '}
                    <span className="characteristic-row__rule typography-meta">{`Modifier ${formatModifier(attribute.modifier)}`}</span>
                  </>
                }
              />
            </li>
          ))}
        </ul>
        {/* FR-STEP-008, só a exibição: o controle do +1 é da FEAT-016. */}
        {increases.map((increase) => (
          <div key={increase.key} id={slotElementId(increase.key)} tabIndex={-1} className="subdecision">
            <p className="typography-label">{decisionTitle({ kind: increase.kind }, nameOf)}</p>
            <p className="typography-meta">
              {`From ${increase.source?.name}. Choosing it here isn't available yet. It stays in Open decisions, and your scores don't include it until then.`}
            </p>
          </div>
        ))}
      </section>

      <AdjustmentCard session={session} snapshot={snapshot} slot={slot} nameOf={nameOf} />

      <section className="card" aria-labelledby="characteristics-title">
        <div className="card__head">
          <h2 id="characteristics-title" className="typography-title">
            Characteristics
          </h2>
          <p className="typography-meta card__note">Some come from your attributes and update when your scores change.</p>
        </div>
        <ul className="characteristic-list" aria-label="Characteristics">
          {view.summary.characteristics.map((characteristic) => {
            const pending = characteristic.pendingOn !== undefined
            return (
              <li key={characteristic.id} className="characteristic-row">
                <Composition
                  total={characteristic.value}
                  name={characteristic.name}
                  stages={characteristic.composition}
                  pending={characteristic.pendingOn && pendingTitle(characteristic.pendingOn)}
                  trigger={
                    // DOM: nome, valor, linha de fórmula; o nome acessível vem do conteúdo ("Size Open 1/2 or 1").
                    <>
                      <span className="characteristic-row__name">
                        <span className="typography-label">{characteristic.name}</span>
                        {pending && <> <PillCounter>Open</PillCounter></>}
                      </span>{' '}
                      <span className="characteristic-row__value typography-stat" aria-hidden={pending || undefined}>
                        {formatValue(characteristic.value)}
                      </span>{' '}
                      <span className="characteristic-row__rule typography-meta">{formulaLine(characteristic)}</span>
                    </>
                  }
                />
              </li>
            )
          })}
        </ul>
      </section>
    </>
  )
}

/** Card do ajuste (FR-STEP-009, 010, 011): o que sobe, o que desce, a prévia e aplicar; aplicado, só leitura e desfazer. */
function AdjustmentCard({ session, snapshot, slot, nameOf }: {
  session: CharacterSession
  snapshot: Ready
  slot: ShiftSlot
  nameOf: (id: string) => string
}) {
  const { rules, document, view } = snapshot
  // Escolha local até a confirmação (D7 da FEAT-007): nada é gravado antes de "Apply adjustment".
  const [raise, setRaise] = useState<string | null>(null)
  const [lower, setLower] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const title = useRef<HTMLHeadingElement>(null)
  const applied = useRef<HTMLParagraphElement>(null)
  const ids = { raise: `${slot.key}-raise`, lower: `${slot.key}-lower`, reason: `${slot.key}-reason`, applyReason: `${slot.key}-apply-reason` }
  const pair = raise !== null && lower !== null ? { decrease: lower, increase: raise } : null
  const both = pair !== null
  const amount = slot.amount

  function chooseRaise(id: string) {
    setAnnouncement('')
    setRaise(id)
    if (lower === id) setLower(null)
  }

  async function apply() {
    if (!pair) return
    setAnnouncement('')
    const result = await session.decide(slot.key, pair)
    if (!result.ok && result.reason !== 'save-failed') return
    setRaise(null)
    setLower(null)
    requestAnimationFrame(() => applied.current?.focus())
  }

  async function undo() {
    const result = await session.clear(slot.key)
    if (!result.ok && result.reason !== 'save-failed') return
    setAnnouncement('Adjustment undone.')
    requestAnimationFrame(() => title.current?.focus())
  }

  const current = slot.decided ? slot.value : undefined
  const raised = current?.increase ?? raise
  const lowered = current?.decrease ?? lower
  const options = slot.options.map((option) => (
    <Radio key={option.id} value={option.id} className="segmented-control__segment typography-label" data-focus-ring>
      {option.name}
    </Radio>
  ))

  return (
    <section className="card" aria-labelledby="adjustment-title">
      <div>
        <h2 id="adjustment-title" ref={title} tabIndex={-1} className="typography-title">
          Score adjustment
        </h2>
        <p className="typography-meta">Optional. You can make it once.</p>
      </div>
      <p role="status" className="visually-hidden">
        {announcement}
      </p>

      <div className="adjustment__groups">
        <div className={`subdecision${current ? ' subdecision--decided' : ''}`}>
          <RadioGroup
            className="subdecision__control"
            orientation="horizontal"
            value={raised}
            onChange={chooseRaise}
            isReadOnly={current !== undefined}
            aria-describedby={current ? ids.reason : undefined}
          >
            <Label className="typography-label">{`Raise one attribute by ${amount}`}</Label>
            <span className="segmented-control segmented-control--wrap">{options}</span>
          </RadioGroup>
        </div>
        <div className={`subdecision${current ? ' subdecision--decided' : ''}`}>
          <RadioGroup
            className="subdecision__control"
            orientation="horizontal"
            value={lowered}
            onChange={(id) => {
              setAnnouncement('')
              setLower(id)
            }}
            isReadOnly={current !== undefined}
            isDisabled={!current && raise === null}
            aria-describedby={current ? ids.reason : ids.lower}
          >
            <Label className="typography-label">{`Lower another attribute by ${amount}`}</Label>
            <span className="segmented-control segmented-control--wrap">
              {current
                ? options
                : slot.options.map((option) => (
                    <Radio
                      key={option.id}
                      value={option.id}
                      isDisabled={option.id === raise}
                      className="segmented-control__segment typography-label"
                      data-focus-ring
                    >
                      {option.name}
                    </Radio>
                  ))}
            </span>
          </RadioGroup>
          {!current && (
            <p id={ids.lower} className="typography-meta adjustment__reason">
              {raise === null ? 'Choose the attribute to raise first.' : "You can't lower the attribute you're raising."}
            </p>
          )}
        </div>
      </div>

      {current ? (
        <div className="adjustment__applied">
          <div>
            <p ref={applied} tabIndex={-1} className="typography-meta">
              {`Applied: ${nameOf(current.increase)} +${amount}, ${nameOf(current.decrease)} −${amount}.`}
            </p>
            <p id={ids.reason} className="typography-meta adjustment__reason">
              To change it, undo the current adjustment first.
            </p>
          </div>
          <Button className="button-secondary typography-label" onPress={undo}>
            Undo adjustment
          </Button>
        </div>
      ) : (
        <>
          {pair && (
            <PreviewBox
              before={view}
              {...preview(rules, document, slot.key, pair)}
              title="If you apply this adjustment"
            />
          )}
          <div className="adjustment__actions">
            {!both && (
              <span id={ids.applyReason} className="typography-meta adjustment__reason">
                Choose both attributes first.
              </span>
            )}
            <Button
              className="button-primary typography-label"
              isDisabled={!both}
              aria-describedby={both ? undefined : ids.applyReason}
              onPress={apply}
            >
              Apply adjustment
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
