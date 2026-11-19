import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Check, CircleAlert } from 'lucide-react'
import { Button, FieldError, Input, Label, Radio, RadioGroup, Text, TextField } from 'react-aria-components'
import type { CharacterSession, DecideResult, Snapshot } from '../../app'
import { type DiceResult, type SlotView, type StepView, type TableResult } from '../../engine'
import {
  CHOOSE_A_RESULT,
  effectDice,
  effectText,
  enterHelp,
  enterLabel,
  formatModifier,
  LATER,
  LOCKED_CHOSEN,
  LOCKED_ROLLED,
  NO_TEXT,
  NOT_DECIDED,
  outOfRange,
  pendingIn,
  rangeText,
  REGIME_PHRASE,
  resultCalc,
  slotElementId,
  tableDice,
} from './copy'
import { PendingList } from './FallbackStep'
import { InlineAlert } from '../parts'
import { SourceBadge } from './parts'

type Ready = Extract<Snapshot, { status: 'ready' }>
type TableSlot = Extract<SlotView, { kind: 'table' }>
type EffectSlot = Extract<SlotView, { kind: 'roll-effect' }>
type Range = [number, number]

/**
 * Ações da pessoa nesta etapa (DEF-006): cada clique ou edição ganha um número. A continuação depois do `await` de um
 * comando só mostra uma recusa se nenhuma ação veio depois daquele clique.
 */
interface Actions {
  next: () => number
  isLatest: (action: number) => boolean
}

/** Id da coluna de resultado de uma vaga, destino do foco depois de Roll e "Use this result" (ui-design, rolled). */
const resultId = (key: string) => `${slotElementId(key)}-result`

/**
 * Corpo de uma etapa de tabelas (SCR-WEB-009; ui-design da FEAT-009): um `roll-card` por vaga `table`, na ordem das
 * vagas, e as pendências não-tabela da etapa como no `FallbackStep` (technical-design §3.4).
 */
export function TablesStep({ session, snapshot, step, nameOf }: {
  session: CharacterSession
  snapshot: Ready
  step: StepView
  nameOf: (id: string) => string
}) {
  const { view } = snapshot
  const count = useRef(0)
  const actions = useMemo<Actions>(() => ({ next: () => ++count.current, isLatest: (action) => count.current === action }), [])
  const tables = view.slots.filter((slot): slot is TableSlot => slot.stepId === step.id && slot.kind === 'table')
  const others = pendingIn(step, view.slots).filter((slot) => slot.kind !== 'table' && slot.kind !== 'roll-effect')

  return (
    <>
      <div className="roll-cards">
        {tables.map((slot) => (
          <RollCard
            key={slot.key}
            session={session}
            slot={slot}
            effects={view.slots.filter((child): child is EffectSlot => child.kind === 'roll-effect' && child.key.startsWith(`${slot.key}=`))}
            actions={actions}
          />
        ))}
      </div>
      {others.length > 0 && <PendingList pending={others} nameOf={nameOf} />}
    </>
  )
}

function RollCard({ session, slot, effects, actions }: {
  session: CharacterSession
  slot: TableSlot
  effects: EffectSlot[]
  actions: Actions
}) {
  const { table, result } = slot
  const base = slotElementId(slot.key)
  const ids = { title: `${base}-title`, choose: `${base}-choose`, reason: `${base}-reason` }
  const dice = tableDice(table.dice)
  // Modo aberto, estado local (technical-design §3.4): Choose no regime `choice`, Roll nos demais; decidida, o da decisão.
  const [localMode, setLocalMode] = useState<'roll' | 'choose'>(table.regime === 'choice' ? 'choose' : 'roll')
  const mode = result ? (result.mode === 'chosen' ? 'choose' : 'roll') : localMode
  // Aviso de `has-dependents` no Choose → Choose (dependents-blocked); some na próxima ação neste cartão.
  const [notice, setNotice] = useState<string | null>(null)

  // Foco depois de Roll e "Use this result": a marca é posta no clique e consumida quando o snapshot mostra a vaga
  // decidida, antes da gravação (ui-design, rolled; D11 da FEAT-007; DEF-008). O fim da gravação não move o foco.
  const mark = useRef<{ key: string; action: number } | null>(null)
  const decided = [slot, ...effects].filter((candidate) => candidate.decided).map((candidate) => candidate.key).join(' ')
  useEffect(() => {
    const target = mark.current
    if (!target || !decided.split(' ').includes(target.key)) return
    mark.current = null
    const frame = requestAnimationFrame(() => document.getElementById(resultId(target.key))?.focus())
    return () => cancelAnimationFrame(frame)
  }, [decided])

  function act() {
    setNotice(null)
    return actions.next()
  }

  /** A recusa de um comando (nunca `save-failed`: o resultado já está na tela); desfaz a marca deste clique. */
  function refusal(outcome: DecideResult, action: number) {
    if (outcome.ok || outcome.reason === 'save-failed') return null
    if (mark.current?.action === action) mark.current = null
    return outcome
  }

  async function roll(key: string) {
    const action = act()
    mark.current = { key, action }
    refusal(await session.roll(key), action)
  }

  /** "Use this result": devolve a faixa válida a mostrar no campo, só numa recusa `out-of-range` sem ação depois. */
  async function enter(key: string, sum: number): Promise<Range | null> {
    const action = act()
    mark.current = { key, action }
    const refused = refusal(await session.enter(key, sum), action)
    return refused?.reason === 'out-of-range' && actions.isLatest(action) ? refused.range : null
  }

  async function choose(entry: string) {
    const action = act()
    refusal(await session.decide(slot.key, entry), action)
  }

  const entry = result && table.entries.find((candidate) => candidate.key === result.entry)
  const resultColumn = result && entry && (
    <div id={resultId(slot.key)} tabIndex={-1} className="roll-result__column">
      {result.mode !== 'chosen' && <p className="typography-meta roll-result__calc">{resultCalc(dice, result)}</p>}
      <p className="roll-result__entry">
        <span className="typography-badge">{rangeText(entry.key)}</span>
        {entry.entity && (
          <>
            {' '}
            <span className="typography-title-sm">{entry.entity.name}</span>
          </>
        )}
      </p>
      <p className="typography-meta roll-result__note">
        {NO_TEXT}
        <SourceBadge provenance={entry.provenance} />
      </p>
      {entry.effects.length > 0 && <EffectChips texts={entry.effects.map((effect) => effectText(effect))} />}
      {effects.map((effect) => (
        <EffectBox
          key={effect.key}
          slot={effect}
          onRoll={() => roll(effect.key)}
          onEnter={(sum) => enter(effect.key, sum)}
          actions={actions}
          onAction={() => setNotice(null)}
        />
      ))}
      <p id={ids.reason} className="typography-meta roll-result__note">
        {result.mode === 'chosen' ? LOCKED_CHOSEN : LOCKED_ROLLED}
      </p>
    </div>
  )

  return (
    <section id={base} tabIndex={-1} className="card roll-card" aria-labelledby={ids.title}>
      <div className="roll-card__head">
        <div className="roll-card__title">
          <h2 id={ids.title} className="typography-title">
            {table.name}
          </h2>
          <span className="typography-badge roll-card__dice">{dice}</span>
        </div>
        <RadioGroup
          className="segmented-control"
          orientation="horizontal"
          aria-labelledby={ids.title}
          aria-describedby={result ? ids.reason : undefined}
          value={mode}
          isReadOnly={result !== undefined}
          onChange={(value) => {
            act()
            setLocalMode(value as 'roll' | 'choose')
          }}
        >
          {table.modes
            .filter((candidate) => candidate !== 'enter')
            .map((candidate) => (
              <Radio key={candidate} value={candidate} className="segmented-control__segment typography-label" data-focus-ring>
                {candidate === 'roll' ? 'Roll' : 'Choose'}
              </Radio>
            ))}
        </RadioGroup>
      </div>
      <p className="typography-meta roll-card__regime">
        {REGIME_PHRASE[table.regime]} <SourceBadge provenance={table.provenance} />
      </p>
      {notice && (
        <InlineAlert tone="warning">
          <p>{notice}</p>
        </InlineAlert>
      )}
      <div className="roll-card__body">
        {mode === 'choose' ? (
          <>
            <p id={ids.choose} className="typography-meta">
              {CHOOSE_A_RESULT}
            </p>
            <RadioGroup
              className="range-grid"
              aria-labelledby={`${ids.title} ${ids.choose}`}
              value={result?.entry ?? null}
              onChange={choose}
            >
              {table.entries.map((candidate) => (
                <Radio key={candidate.key} value={candidate.key} className="range-grid__entry" data-focus-ring>
                  {candidate.key === result?.entry && <Check className="icon icon--sm" aria-hidden="true" />}
                  <span className="typography-badge">{rangeText(candidate.key)}</span>{' '}
                  {candidate.entity ? (
                    <span className="typography-body">{candidate.entity.name}</span>
                  ) : (
                    <SourceBadge provenance={candidate.provenance} />
                  )}
                </Radio>
              ))}
            </RadioGroup>
            {resultColumn ?? <p className="typography-meta roll-result__note">{NOT_DECIDED}</p>}
          </>
        ) : result && result.mode !== 'chosen' ? (
          <div className="roll-result">
            <ValueBox result={result} />
            {resultColumn}
          </div>
        ) : (
          <DiceActions
            dice={dice}
            range={table.enterRange}
            canEnter={table.modes.includes('enter')}
            onRoll={() => roll(slot.key)}
            onEnter={(sum) => enter(slot.key, sum)}
            actions={actions}
            onAction={() => setNotice(null)}
          >
            <span className="typography-meta roll-result__note">{NOT_DECIDED}</span>
          </DiceActions>
        )}
      </div>
    </section>
  )
}

/** Caixa de valor (ui-design, Caixa de valor): o total já está no cálculo, então fica fora da árvore de acessibilidade. */
function ValueBox({ result }: { result: Exclude<TableResult, { mode: 'chosen' }> | DiceResult }) {
  return (
    <div className="roll-value" aria-hidden="true">
      <span className="typography-stat-lg roll-value__total">{result.total}</span>
      <span className="typography-caption">{result.mode}</span>
    </div>
  )
}

function EffectChips({ texts }: { texts: string[] }) {
  return (
    <ul className="effect-chips">
      {texts.map((text, index) => (
        <li key={index} className="effect-chip typography-caption">
          {text}
        </li>
      ))}
    </ul>
  )
}

/** Vaga `roll-effect` no cartão da tabela (ui-design, effect-open e effect-decided; FR-STEP-014). */
function EffectBox({ slot, onRoll, onEnter, actions, onAction }: {
  slot: EffectSlot
  onRoll: () => void
  onEnter: (sum: number) => Promise<Range | null>
  actions: Actions
  onAction: () => void
}) {
  const dice = effectDice(slot.dice)
  const { result } = slot
  return (
    <div id={slotElementId(slot.key)} tabIndex={-1} className={`subdecision roll-effect${result ? ' subdecision--decided' : ''}`}>
      <p className="typography-label">{`${slot.target.name} ${dice}`}</p>
      {result ? (
        <div className="roll-result">
          <ValueBox result={result} />
          <div id={resultId(slot.key)} tabIndex={-1} className="roll-result__column">
            <p className="typography-meta roll-result__calc">{resultCalc(dice, result)}</p>
            <EffectChips texts={[`${slot.target.name} ${formatModifier(result.total)}`]} />
            <p className="typography-meta roll-result__note">{LOCKED_ROLLED}</p>
          </div>
        </div>
      ) : (
        <>
          <DiceActions dice={dice} range={slot.enterRange} canEnter onRoll={onRoll} onEnter={onEnter} actions={actions} onAction={onAction} />
          <p className="typography-meta roll-result__note">{LATER}</p>
        </>
      )}
    </div>
  )
}

/**
 * "Roll {dado}" e "Enter result", ou o formulário do Enter result no lugar dos botões (ui-design, to-decide e entering).
 * "Cancel" volta aos botões sem gravar, com o foco em "Enter result".
 */
function DiceActions({ dice, range, canEnter, onRoll, onEnter, actions, onAction, children }: {
  dice: string
  range: Range
  canEnter: boolean
  onRoll: () => void
  onEnter: (sum: number) => Promise<Range | null>
  actions: Actions
  onAction: () => void
  children?: ReactNode
}) {
  const [entering, setEntering] = useState(false)
  const enterButton = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef(false)
  useEffect(() => {
    if (entering || !returnFocus.current) return
    returnFocus.current = false
    enterButton.current?.focus()
  }, [entering])

  if (entering) {
    return (
      <EnterForm
        dice={dice}
        range={range}
        onEnter={onEnter}
        actions={actions}
        onAction={onAction}
        onCancel={() => {
          actions.next()
          onAction()
          returnFocus.current = true
          setEntering(false)
        }}
      />
    )
  }
  return (
    <div className="roll-card__actions">
      <Button className="button-primary typography-label" onPress={onRoll}>
        {`Roll ${dice}`}
      </Button>
      {canEnter && (
        <Button
          ref={enterButton}
          className="button-secondary typography-label"
          onPress={() => {
            actions.next()
            onAction()
            setEntering(true)
          }}
        >
          Enter result
        </Button>
      )}
      {children}
    </div>
  )
}

/**
 * Enter result (ui-design, entering; E9): um campo por expressão de dado, validado ao confirmar. Vazio ou não inteiro dá
 * o erro local, sem comando; a recusa `out-of-range` mostra a faixa devolvida. O campo mantém o valor e o foco.
 */
function EnterForm({ dice, range, onEnter, actions, onAction, onCancel }: {
  dice: string
  range: Range
  onEnter: (sum: number) => Promise<Range | null>
  actions: Actions
  onAction: () => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<Range | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const text = draft.trim()
    if (!/^-?\d+$/.test(text)) {
      actions.next()
      onAction()
      setError(range)
      return
    }
    const refused = await onEnter(Number(text))
    if (refused) setError(refused)
  }

  return (
    <form className="enter-form" onSubmit={submit}>
      <TextField
        className="enter-form__field"
        value={draft}
        onChange={(value) => {
          actions.next()
          onAction()
          setDraft(value)
          setError(null)
        }}
        isInvalid={error !== null}
        validationBehavior="aria"
        autoFocus
      >
        <Label className="typography-label">{enterLabel(dice)}</Label>
        <Input className="text-input typography-body-lg" inputMode="numeric" />
        <Text slot="description" className="typography-meta enter-form__help">
          {enterHelp(range)}
        </Text>
        <FieldError className="typography-meta field-error">
          <CircleAlert className="icon icon--sm" aria-hidden="true" />
          {error && outOfRange(error)}
        </FieldError>
      </TextField>
      <div className="enter-form__actions">
        <Button type="submit" className="button-primary typography-label">
          Use this result
        </Button>
        <Button className="button-secondary typography-label" onPress={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
