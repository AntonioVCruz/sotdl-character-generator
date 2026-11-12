import { useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Button, Label, Radio, RadioGroup } from 'react-aria-components'
import type { CharacterSession, Snapshot } from '../../app'
import { ancestryDetail, formatNumber, preview, type CharacterView, type SlotView } from '../../engine'
import { href } from '../router'
import { decisionTitle, formatValue, hasDependentsMessage, lockReason, slotElementId, statusLabel } from './copy'
import { Eyebrow, SourceBadge, TypeBadge } from './parts'

type Ready = Extract<Snapshot, { status: 'ready' }>
type EntitySlot = Extract<SlotView, { kind: 'choose-entity' }>

/** Corpo da etapa Ancestry (SCR-WEB-003): grade de `option-card`, detalhe com prévia, confirmação e Size. */
export function AncestryStep({ session, snapshot, slot, nameOf }: {
  session: CharacterSession
  snapshot: Ready
  slot: EntitySlot
  nameOf: (id: string) => string
}) {
  // Aviso de `has-dependents` (D8); some na próxima ação do jogador nesta etapa.
  const [notice, onNotice] = useState<string | null>(null)
  const current = slot.decided ? (slot.value as string) : null
  const [selected, setSelected] = useState<string | null>(null)
  const shown = selected ?? current
  const detailTitle = useRef<HTMLHeadingElement>(null)

  function select(id: string) {
    onNotice(null)
    setSelected(id === current ? null : id)
  }

  async function choose(id: string) {
    onNotice(null)
    const result = await session.decide(slot.key, id)
    if (!result.ok && result.reason === 'has-dependents') {
      const titles = result.dependents.map((key) => {
        const dependent = snapshot.view.slots.find((candidate) => candidate.key === key)
        return dependent ? decisionTitle({ kind: dependent.kind, target: 'target' in dependent ? dependent.target : undefined }, nameOf) : ''
      })
      onNotice(hasDependentsMessage(nameOf(id), current ? nameOf(current) : '', titles))
      setSelected(null)
      return
    }
    setSelected(null)
    // O foco vai para o título do detalhe da escolha (ui-design, selected).
    requestAnimationFrame(() => detailTitle.current?.focus())
  }

  return (
    <>
      {notice && (
        <div role="status" className="inline-alert inline-alert--warning typography-body">
          <p>{notice}</p>
        </div>
      )}
      <RadioGroup
        id={slotElementId(slot.key)}
        aria-label="What is your character's ancestry?"
        className="option-grid"
        value={shown}
        onChange={select}
      >
        {slot.options.map((option) => {
          const isCurrent = option.id === current
          return (
            <Radio
              key={option.id}
              value={option.id}
              aria-label={isCurrent ? `${option.name}, your choice` : option.name}
              className={`option-card${isCurrent ? ' option-card--current' : ''}`}
            >
              {isCurrent && <span className="option-card__current typography-caption">Your choice</span>}
              <span className="typography-title-sm">{option.name}</span>
              <span className="typography-meta option-card__mechanics">{option.mechanics.join(' · ')}</span>
              <span className="option-card__badges">
                <SourceBadge provenance={option.provenance} />
                <TypeBadge provenance={option.provenance} />
              </span>
            </Radio>
          )
        })}
      </RadioGroup>
      {shown && (
        <AncestryDetailCard
          key={shown}
          ancestryId={shown}
          isCurrent={shown === current}
          snapshot={snapshot}
          session={session}
          titleRef={detailTitle}
          onChoose={() => choose(shown)}
          nameOf={nameOf}
        />
      )}
    </>
  )
}

function AncestryDetailCard({ ancestryId, isCurrent, snapshot, session, titleRef, onChoose, nameOf }: {
  ancestryId: string
  isCurrent: boolean
  snapshot: Ready
  session: CharacterSession
  titleRef: RefObject<HTMLHeadingElement | null>
  onChoose: () => void
  nameOf: (id: string) => string
}) {
  const { rules, document, view } = snapshot
  const detail = useMemo(() => ancestryDetail(rules, ancestryId), [rules, ancestryId])
  const languageGrant = detail.grants.find((grant) => grant.kind === 'language-or-profession')

  return (
    <section className="card ancestry-detail" aria-labelledby="ancestry-detail-title">
      <div className="ancestry-detail__head">
        <h2 id="ancestry-detail-title" ref={titleRef} tabIndex={-1} className="typography-heading">
          {detail.name}
        </h2>
        <span className="option-card__badges">
          <SourceBadge provenance={detail.provenance} />
          <TypeBadge provenance={detail.provenance} />
        </span>
        <p className="typography-meta ancestry-detail__description">
          Description: <SourceBadge provenance={{ abbr: detail.provenance.abbr, page: detail.page }} />
        </p>
      </div>

      <div className="ancestry-detail__blocks">
        <DetailBlock title="Starting attributes">
          <p>{detail.attributes.map((attribute) => `${attribute.name} ${formatValue(attribute.score)}`).join(', ')}</p>
        </DetailBlock>
        <DetailBlock title="Characteristics">
          {detail.characteristics.map((characteristic) => (
            <p key={characteristic.id}>{characteristic.text}</p>
          ))}
        </DetailBlock>
        <DetailBlock title="Languages and professions">
          {detail.languages.map((language) => (
            <p key={language.id}>{`${language.name}: ${language.abilities.join(', ')}`}</p>
          ))}
          {languageGrant && <p>{`One extra language or a random profession, chosen in ${languageGrant.stepName}.`}</p>}
        </DetailBlock>
        {detail.talents.length > 0 && (
          <DetailBlock title="Talents">
            {detail.talents.map((talent) => (
              <p key={talent.id}>
                {talent.name} <SourceBadge provenance={talent.provenance} />
              </p>
            ))}
          </DetailBlock>
        )}
        {detail.level4 && (
          <DetailBlock title="Level 4">
            <p>{detail.level4}</p>
          </DetailBlock>
        )}
      </div>

      {isCurrent ? (
        <DecideNow snapshot={snapshot} session={session} ancestryId={ancestryId} nameOf={nameOf} />
      ) : (
        <>
          <PreviewBox before={view} {...preview(rules, document, 'ancestry', ancestryId)} name={detail.name} />
          <div className="ancestry-detail__action">
            <Button className="button-primary typography-label" onPress={onChoose}>
              {`Choose ${detail.name}`}
            </Button>
          </div>
        </>
      )}
    </section>
  )
}

function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="ancestry-detail__block typography-body">
      <Eyebrow as="h3" secondary>
        {title}
      </Eyebrow>
      {children}
    </div>
  )
}

/** Prévia do que muda (FR-FLOW-014): atributos, características e etapas, antigo → novo. */
function PreviewBox({ before, view, changes, name }: {
  before: CharacterView
  view: CharacterView
  changes: ReturnType<typeof preview>['changes']
  name: string
}) {
  const values = [...changes.attributes, ...changes.characteristics]
  const unlocked = changes.steps.filter((step) => step.from === 'locked')
  const others = changes.steps.filter((step) => step.from !== 'locked')
  const label = (steps: CharacterView['steps'], stepId: string) => statusLabel(steps.find((step) => step.id === stepId)!)
  const stepLines = [...others, ...(unlocked.length > 6 ? [] : unlocked)]
  return (
    <div className="preview-box">
      <Eyebrow secondary>{`If you choose ${name}`}</Eyebrow>
      <ul className="preview-box__lines">
        {values.map((change) => (
          <li key={change.id} className="preview-box__line typography-meta">
            <span>{change.name}</span>
            <span className="typography-badge">{`${formatValue(change.from)} → ${formatValue(change.to)}`}</span>
          </li>
        ))}
        {stepLines.map((change) => (
          <li key={change.id} className="preview-box__line typography-meta">
            <span>{`${change.name}: ${label(before.steps, change.id)} → ${label(view.steps, change.id)}`}</span>
          </li>
        ))}
        {unlocked.length > 6 && (
          <li className="preview-box__line typography-meta">
            <span>{`Opens the other ${unlocked.length} steps`}</span>
          </li>
        )}
      </ul>
    </div>
  )
}

/** Bloco "Decide now" da escolha atual: Size e as pendências que a ancestralidade abre em outras etapas. */
function DecideNow({ snapshot, session, ancestryId, nameOf }: {
  snapshot: Ready
  session: CharacterSession
  ancestryId: string
  nameOf: (id: string) => string
}) {
  const { view, id } = snapshot
  const ancestryStep = view.steps.find((step) => view.slots.some((slot) => slot.stepId === step.id && slot.source === null))
  const granted = view.slots.filter((slot) => slot.source?.id === ancestryId)
  if (granted.length === 0) return null
  const here = granted.filter((slot) => slot.stepId === ancestryStep?.id)
  const elsewhere = granted.filter((slot) => slot.stepId !== ancestryStep?.id)

  return (
    <div className="decide-now">
      <p className="typography-label">Decide now</p>
      <p className="typography-meta">You can also leave these for later.</p>
      {here.map(
        (slot) =>
          slot.kind === 'choose-value' && (
            <div
              key={slot.key}
              id={slotElementId(slot.key)}
              tabIndex={-1}
              className={`subdecision${slot.decided ? ' subdecision--decided' : ''}`}
            >
              <RadioGroup
                className="subdecision__control"
                orientation="horizontal"
                value={slot.decided ? String(slot.value) : null}
                onChange={(value) => void session.decide(slot.key, Number(value))}
              >
                <Label className="typography-label">{nameOf(slot.target)}</Label>
                <span className="segmented-control">
                  {slot.options.map((option) => (
                    <Radio key={option} value={String(option)} className="segmented-control__segment typography-label">
                      {formatNumber(option)}
                    </Radio>
                  ))}
                </span>
              </RadioGroup>
              <p className="typography-meta">{slot.decided ? 'Decided.' : 'Or decide later: it stays in Open decisions.'}</p>
            </div>
          ),
      )}
      {elsewhere.map((slot) => {
        const step = view.steps.find((candidate) => candidate.id === slot.stepId)!
        return (
          <div key={slot.key} className="decide-now__elsewhere">
            <p className="typography-label">
              {decisionTitle({ kind: slot.kind, target: 'target' in slot ? slot.target : undefined }, nameOf)}
            </p>
            <p className="typography-meta">
              {`Chosen in ${step.name}. `}
              {step.status === 'locked' ? (
                lockReason(view.steps, step)
              ) : (
                <a className="link" href={href.builder(id, step.slug, slot.key)}>{`Go to ${step.name}`}</a>
              )}
            </p>
          </div>
        )
      })}
    </div>
  )
}
