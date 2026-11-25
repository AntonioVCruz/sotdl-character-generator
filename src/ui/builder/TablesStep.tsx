import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Check, CircleAlert, Dices } from 'lucide-react'
import { Button, FieldError, Input, Label, Radio, RadioGroup, Text, TextArea, TextField } from 'react-aria-components'
import type { CharacterSession, DecideResult, Snapshot } from '../../app'
import { rollAllKeys, type DiceResult, type SlotView, type StepView, type TableResult } from '../../engine'
import {
  CHOOSE_A_RESULT,
  effectDice,
  effectText,
  enterHelp,
  enterLabel,
  formatModifier,
  LATER,
  MODE_LABEL,
  NO_TEXT,
  NOT_DECIDED,
  outOfRange,
  pendingIn,
  rangeText,
  REGIME_PHRASE,
  resultCalc,
  resultParts,
  ROLL_ALL_IDS,
  ROLL_ALL_TEXT,
  rollAllAnnouncement,
  rollAllLabel,
  slotElementId,
  tableDice,
  WRITE_TEXT,
} from './copy'
import { PendingList } from './FallbackStep'
import { SourceBadge } from './parts'

type Ready = Extract<Snapshot, { status: 'ready' }>
type Decisions = Ready['document']['decisions']
type TableSlot = Extract<SlotView, { kind: 'table' }>
type EffectSlot = Extract<SlotView, { kind: 'roll-effect' }>
type Range = [number, number]
/** Os segmentos do `roll-card`: Enter result fica na linha de ações (FEAT-009). */
type Mode = 'roll' | 'choose' | 'write'

/** O limite do texto escrito, imposto no campo (FEAT-010 D3): a recusa `invalid-value` do comando é só defesa. */
const WRITE_LIMIT = 2000

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
  const decisions = snapshot.document.decisions
  const count = useRef(0)
  const actions = useMemo<Actions>(() => ({ next: () => ++count.current, isLatest: (action) => count.current === action }), [])
  const tables = view.slots.filter((slot): slot is TableSlot => slot.stepId === step.id && slot.kind === 'table')
  const others = pendingIn(step, view.slots).filter((slot) => slot.kind !== 'table' && slot.kind !== 'roll-effect')

  // Roll all undecided (ui-design da FEAT-010, roll-all): presença e quantidade pela regra do comando (D9).
  const undecided = rollAllKeys(view, step.id)
  const [announcement, setAnnouncement] = useState('')
  // A marca do Roll all, posta no clique com as chaves e o `logged` de cada uma, é consumida quando o snapshot mostra outro
  // `logged` em todas, antes da gravação (roll-all-applied; C2): o anúncio e, no quadro seguinte, o foco no motivo (P1 = A),
  // se o botão ficou desabilitado. A continuação só a desfaz numa recusa (`needs-confirmation` conta como recusa: o
  // Apply do diálogo é da moldura, sem anúncio). Nenhum cartão move o foco por ela.
  const rollAllMark = useRef<{ action: number; logged: { key: string; logged: number | undefined }[] } | null>(null)
  useEffect(() => {
    const mark = rollAllMark.current
    if (!mark || mark.logged.some(({ key, logged }) => decisions[key]?.logged === logged)) return
    rollAllMark.current = null
    const lines = mark.logged.flatMap(({ key }) => {
      const slot = view.slots.find((candidate): candidate is TableSlot => candidate.key === key && candidate.kind === 'table')
      return slot ? [resultParts(slot)] : []
    })
    setAnnouncement(rollAllAnnouncement(lines))
    const frame = requestAnimationFrame(() => document.getElementById(ROLL_ALL_IDS.reason)?.focus())
    return () => cancelAnimationFrame(frame)
  }, [decisions, view])

  async function rollAll() {
    const action = actions.next()
    setAnnouncement('')
    rollAllMark.current = { action, logged: undecided.map((key) => ({ key, logged: decisions[key]?.logged })) }
    const outcome = await session.rollAll(step.id)
    if (!outcome.ok && outcome.reason !== 'save-failed' && rollAllMark.current?.action === action) rollAllMark.current = null
  }

  return (
    <>
      <div className="roll-all">
        <Button
          id={ROLL_ALL_IDS.button}
          className="button-secondary typography-label"
          isDisabled={undecided.length === 0}
          aria-describedby={undecided.length === 0 ? ROLL_ALL_IDS.reason : undefined}
          onPress={rollAll}
        >
          <Dices className="icon icon--sm" aria-hidden="true" />
          {rollAllLabel(undecided.length)}
        </Button>
        {undecided.length === 0 && (
          <p id={ROLL_ALL_IDS.reason} tabIndex={-1} className="typography-meta roll-all__reason">
            {ROLL_ALL_TEXT.none}
          </p>
        )}
        <p role="status" className="visually-hidden">
          {announcement}
        </p>
      </div>
      <div className="roll-cards">
        {tables.map((slot) => (
          <RollCard
            key={slot.key}
            session={session}
            slot={slot}
            effects={view.slots.filter((child): child is EffectSlot => child.kind === 'roll-effect' && child.key.startsWith(`${slot.key}=`))}
            decisions={decisions}
            actions={actions}
          />
        ))}
      </div>
      {others.length > 0 && <PendingList pending={others} nameOf={nameOf} />}
    </>
  )
}

function RollCard({ session, slot, effects, decisions, actions }: {
  session: CharacterSession
  slot: TableSlot
  effects: EffectSlot[]
  /** `decisions` do documento: o `logged` de cada vaga diz quando o snapshot mostra uma decisão nova (FEAT-011). */
  decisions: Decisions
  actions: Actions
}) {
  const { table, result } = slot
  const base = slotElementId(slot.key)
  const ids = { title: `${base}-title`, choose: `${base}-choose` }
  const dice = tableDice(table.dice)
  // Segmento mostrado, estado local (technical-design da FEAT-009 §3.4; ui-design da FEAT-011, decided-choose): o da
  // decisão, até a pessoa trocá-lo; sem decisão, Choose no regime `choice` e Roll nos demais. Volta ao da decisão quando o
  // snapshot muda o modo dela (uma escolha vira Choose; uma rolagem ou um Enter result vira Roll); o Keep não o muda. A
  // escrita vira Write, ou Roll se a tabela não tem `write` em `modes` (ui-design da FEAT-010, write-mode); Write nunca é
  // o inicial de uma tabela sem decisão.
  const canWrite = table.modes.includes('write')
  const decisionMode: Mode | undefined = !result
    ? undefined
    : result.mode === 'chosen'
      ? 'choose'
      : result.mode === 'written' && canWrite
        ? 'write'
        : 'roll'
  const [mode, setMode] = useState<Mode>(decisionMode ?? (table.regime === 'choice' ? 'choose' : 'roll'))
  const [shownFor, setShownFor] = useState(decisionMode)
  if (shownFor !== decisionMode) {
    setShownFor(decisionMode)
    if (decisionMode) setMode(decisionMode)
  }
  // Rascunho do Write, estado do cartão (ui-design da FEAT-010, write-mode, item 4): sobrevive à troca de segmento e às
  // decisões por outro modo, e só se esvazia quando o snapshot mostra a escrita aplicada (outro `logged` escrito). A
  // edição do write-again (`editing`, com o texto atual) fecha do mesmo modo.
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const current = decisions[slot.key]
  const writtenLogged = current?.mode === 'written' ? current.logged : undefined
  const [writtenFor, setWrittenFor] = useState(writtenLogged)
  if (writtenFor !== writtenLogged) {
    setWrittenFor(writtenLogged)
    if (writtenLogged !== undefined) {
      setDraft('')
      setEditing(null)
    }
  }
  // "Change text" abre o write-again com o foco no campo e o cursor no fim (write-again); "Cancel" e o mesmo texto
  // devolvem o foco a "Change text" (written).
  const [focusEdit, setFocusEdit] = useState(false)
  const endFocusEdit = useCallback(() => setFocusEdit(false), [])
  const changeButton = useRef<HTMLButtonElement>(null)
  const toChange = useRef(false)
  useEffect(() => {
    if (editing !== null || !toChange.current) return
    toChange.current = false
    changeButton.current?.focus()
  }, [editing])
  // Foco depois de Roll, Reroll e "Use this result": a marca é posta no clique, com o `logged` da vaga naquele momento, e
  // consumida quando o snapshot mostra outro `logged` em `decisions[key]`, antes da gravação (ui-design da FEAT-011,
  // mode-switch; D11 da FEAT-007; DEF-008). Não pela vaga decidida: um Reroll pode repetir as faces, e o Keep da
  // rerrolagem só muda o contador. O fim da gravação não move o foco.
  const mark = useRef<{ key: string; action: number; logged: number | undefined } | null>(null)
  useEffect(() => {
    const target = mark.current
    if (!target || decisions[target.key]?.logged === target.logged) return
    mark.current = null
    const frame = requestAnimationFrame(() => document.getElementById(resultId(target.key))?.focus())
    return () => cancelAnimationFrame(frame)
  }, [decisions])
  const marked = (key: string, action: number) => (mark.current = { key, action, logged: decisions[key]?.logged })

  function act() {
    return actions.next()
  }

  /**
   * A recusa de um comando (nunca `save-failed`: o resultado já está na tela); desfaz a marca deste clique. A
   * `needs-confirmation` conta como recusa: nada foi aplicado, e o diálogo da moldura cuida do foco (ui-design da FEAT-011).
   */
  function refusal(outcome: DecideResult, action: number) {
    if (outcome.ok || outcome.reason === 'save-failed') return null
    if (mark.current?.action === action) mark.current = null
    return outcome
  }

  async function roll(key: string) {
    const action = act()
    marked(key, action)
    refusal(await session.roll(key), action)
  }

  /** "Use this result": devolve a faixa válida a mostrar no campo, só numa recusa `out-of-range` sem ação depois. */
  async function enter(key: string, sum: number): Promise<Range | null> {
    const action = act()
    marked(key, action)
    const refused = refusal(await session.enter(key, sum), action)
    return refused?.reason === 'out-of-range' && actions.isLatest(action) ? refused.range : null
  }

  async function choose(entry: string) {
    const action = act()
    refusal(await session.decide(slot.key, entry), action)
  }

  /**
   * "Use this text" (ui-design da FEAT-010, write-mode, item 6): o texto como está; o comando apara as pontas (D3). Põe a
   * marca do clique, como o Roll. Devolve `true` só numa recusa `empty-text` sem ação depois do clique (write-refused;
   * DEF-006); a continuação nunca move o foco.
   */
  async function write(text: string): Promise<boolean> {
    const action = act()
    marked(slot.key, action)
    const refused = refusal(await session.write(slot.key, text), action)
    return refused?.reason === 'empty-text' && actions.isLatest(action)
  }

  /** write-again: "Cancel", ou o mesmo texto depois do `trim` (D5, sem comando), voltam ao escrito, com o foco em "Change text". */
  function closeEditing() {
    act()
    toChange.current = true
    setEditing(null)
  }

  const canEnter = table.modes.includes('enter')
  const written = result?.mode === 'written' ? result : undefined
  const entry = result && result.mode !== 'written' ? table.entries.find((candidate) => candidate.key === result.entry) : undefined
  const chosenEntry = result && result.mode !== 'written' ? result.entry : undefined
  // "Reroll {dado}" sobre resultado rolado ou informado; "Roll {dado}" sobre escolhido ou escrito (ui-design da FEAT-011
  // e da FEAT-010, mode-switch-write).
  const decidedActions = result && mode === 'roll' && (
    <DiceActions
      label={`${result.mode === 'rolled' || result.mode === 'entered' ? 'Reroll' : 'Roll'} ${dice}`}
      decided
      dice={dice}
      range={table.enterRange}
      canEnter={canEnter}
      logged={decisions[slot.key]?.logged}
      onRoll={() => roll(slot.key)}
      onEnter={(sum) => enter(slot.key, sum)}
      actions={actions}
    />
  )
  /** A coluna de resultado; no segmento Roll, com a linha de ações no fim (ui-design da FEAT-011, decided-roll). */
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
          logged={decisions[effect.key]?.logged}
          onRoll={() => roll(effect.key)}
          onEnter={(sum) => enter(effect.key, sum)}
          actions={actions}
        />
      ))}
      {decidedActions}
    </div>
  )
  /**
   * A coluna do estado escrito (ui-design da FEAT-010, written): "Your own result" e o texto, sem cálculo, faixa, efeitos
   * nem selo de entrada; "Change text" no segmento Write, "Roll {dado}" (e "Enter result") no Roll, sem ações no Choose.
   */
  const writtenColumn = written && (
    <div id={resultId(slot.key)} tabIndex={-1} className="roll-result__column">
      <p className="typography-label">{WRITE_TEXT.label}</p>
      <p className="typography-body roll-result__text written-text">{written.text}</p>
      {mode === 'write' && (
        <div className="roll-card__actions roll-result__actions">
          <Button
            ref={changeButton}
            className="button-secondary typography-label"
            onPress={() => {
              act()
              setEditing(written.text)
              setFocusEdit(true)
            }}
          >
            {WRITE_TEXT.change}
          </Button>
        </div>
      )}
      {decidedActions}
    </div>
  )
  const writeBody = written && editing === null ? (
    writtenColumn
  ) : (
    <>
      <WriteForm
        value={editing ?? draft}
        onChange={(value) => {
          act()
          if (editing !== null) setEditing(value)
          else setDraft(value)
        }}
        onUse={(text) => {
          if (written && text.trim() === written.text) {
            closeEditing()
            return Promise.resolve(false)
          }
          return write(text)
        }}
        onCancel={editing !== null ? closeEditing : undefined}
        focus={focusEdit}
        onFocused={endFocusEdit}
      />
      {/* Abaixo do formulário: sem decisão, o que espera; com a rolada, escolhida ou informada, a coluna dela, sem ações. */}
      {!written && (resultColumn || <p className="typography-meta roll-result__note">{NOT_DECIDED}</p>)}
    </>
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
          value={mode}
          onChange={(value) => {
            act()
            setMode(value as Mode)
          }}
        >
          {table.modes
            // Enter result fica na linha de ações; Write só onde está em `modes` (roll-or-choose; FEAT-010).
            .filter((candidate): candidate is Mode => candidate !== 'enter')
            .map((candidate) => (
              <Radio key={candidate} value={candidate} className="segmented-control__segment typography-label" data-focus-ring>
                {MODE_LABEL[candidate]}
              </Radio>
            ))}
        </RadioGroup>
      </div>
      <p className="typography-meta roll-card__regime">
        {REGIME_PHRASE[table.regime]} <SourceBadge provenance={table.provenance} />
      </p>
      <div className="roll-card__body">
        {mode === 'choose' ? (
          <>
            <p id={ids.choose} className="typography-meta">
              {CHOOSE_A_RESULT}
            </p>
            <RadioGroup
              className="range-grid"
              aria-labelledby={`${ids.title} ${ids.choose}`}
              value={chosenEntry ?? null}
              onChange={choose}
            >
              {table.entries.map((candidate) => (
                <Radio key={candidate.key} value={candidate.key} className="range-grid__entry" data-focus-ring>
                  {candidate.key === chosenEntry && <Check className="icon icon--sm" aria-hidden="true" />}
                  <span className="typography-badge">{rangeText(candidate.key)}</span>{' '}
                  {candidate.entity ? (
                    <span className="typography-body">{candidate.entity.name}</span>
                  ) : (
                    <SourceBadge provenance={candidate.provenance} />
                  )}
                </Radio>
              ))}
            </RadioGroup>
            {(writtenColumn || resultColumn) ?? <p className="typography-meta roll-result__note">{NOT_DECIDED}</p>}
          </>
        ) : mode === 'write' ? (
          writeBody
        ) : result && result.mode !== 'chosen' && result.mode !== 'written' ? (
          <div className="roll-result">
            <ValueBox result={result} />
            {resultColumn}
          </div>
        ) : result ? (
          // Segmento Roll com a decisão escolhida ou escrita: a coluna sem caixa nem cálculo, e "Roll {dado}" no fim.
          (writtenColumn || resultColumn)
        ) : (
          <DiceActions
            label={`Roll ${dice}`}
            dice={dice}
            range={table.enterRange}
            canEnter={canEnter}
            onRoll={() => roll(slot.key)}
            onEnter={(sum) => enter(slot.key, sum)}
            actions={actions}
          >
            <span className="typography-meta roll-result__note">{NOT_DECIDED}</span>
          </DiceActions>
        )}
      </div>
    </section>
  )
}

/** Caixa de valor (ui-design, Caixa de valor): o total já está no cálculo, então fica fora da árvore de acessibilidade. */
function ValueBox({ result }: { result: Exclude<TableResult, { mode: 'chosen' | 'written' }> | DiceResult }) {
  return (
    <div className="roll-value" aria-hidden="true">
      <span className="typography-stat-lg roll-value__total">{result.total}</span>
      <span className="typography-caption">{result.mode}</span>
    </div>
  )
}

export function EffectChips({ texts }: { texts: string[] }) {
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

/** Vaga `roll-effect` no cartão da tabela (ui-design da FEAT-009, effect-open e effect-decided; FR-STEP-014). */
function EffectBox({ slot, logged, onRoll, onEnter, actions }: {
  slot: EffectSlot
  /** O `logged` da decisão da vaga: o formulário do Enter result fecha quando ele muda. */
  logged: number | undefined
  onRoll: () => void
  onEnter: (sum: number) => Promise<Range | null>
  actions: Actions
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
            {/* effect-reroll (ui-design da FEAT-011): Reroll e Enter result, no lugar do motivo. */}
            <DiceActions
              label={`Reroll ${dice}`}
              decided
              dice={dice}
              range={slot.enterRange}
              canEnter
              logged={logged}
              onRoll={onRoll}
              onEnter={onEnter}
              actions={actions}
            />
          </div>
        </div>
      ) : (
        <>
          <DiceActions label={`Roll ${dice}`} dice={dice} range={slot.enterRange} canEnter onRoll={onRoll} onEnter={onEnter} actions={actions} />
          <p className="typography-meta roll-result__note">{LATER}</p>
        </>
      )}
    </div>
  )
}

/**
 * "Roll {dado}" e "Enter result", ou o formulário do Enter result no lugar dos botões (ui-design da FEAT-009, to-decide
 * e entering). "Cancel" volta aos botões sem gravar, com o foco em "Enter result". Na vaga decidida (ui-design da
 * FEAT-011, decided-roll e effect-reroll), os botões são secundários, no fim da coluna de resultado, e o formulário fecha
 * quando o snapshot mostra a decisão nova (outro `logged`); no Keep, ele continua aberto, com a soma digitada.
 */
function DiceActions({ label, decided = false, dice, range, canEnter, logged, onRoll, onEnter, actions, children }: {
  label: string
  decided?: boolean
  dice: string
  range: Range
  canEnter: boolean
  logged?: number
  onRoll: () => void
  onEnter: (sum: number) => Promise<Range | null>
  actions: Actions
  children?: ReactNode
}) {
  const [entering, setEntering] = useState(false)
  const [openFor, setOpenFor] = useState(logged)
  if (openFor !== logged) {
    setOpenFor(logged)
    setEntering(false)
  }
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
        onCancel={() => {
          actions.next()
          returnFocus.current = true
          setEntering(false)
        }}
      />
    )
  }
  return (
    <div className={`roll-card__actions${decided ? ' roll-result__actions' : ''}`}>
      <Button className={`${decided ? 'button-secondary' : 'button-primary'} typography-label`} onPress={onRoll}>
        {label}
      </Button>
      {canEnter && (
        <Button
          ref={enterButton}
          className="button-secondary typography-label"
          onPress={() => {
            actions.next()
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
function EnterForm({ dice, range, onEnter, actions, onCancel }: {
  dice: string
  range: Range
  onEnter: (sum: number) => Promise<Range | null>
  actions: Actions
  onCancel: () => void
}) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<Range | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const text = draft.trim()
    if (!/^-?\d+$/.test(text)) {
      actions.next()
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

/**
 * O formulário do Write (ui-design da FEAT-010, write-mode, write-refused e write-again): `textarea` com o limite no campo
 * e a frase do limite ao chegar nele; sem verificação local do vazio, que é a recusa do comando. A região viva do erro
 * já está no formulário desde que ele abre (`design.md` §4, "error"; D-ERR): a mensagem aparece nela sem mover o foco, e
 * some na próxima edição. Com `onCancel` (write-again), o campo abre com o foco e o cursor no fim do texto.
 */
function WriteForm({ value, onChange, onUse, onCancel, focus, onFocused }: {
  value: string
  onChange: (value: string) => void
  /** Devolve `true` quando a recusa `empty-text` deve aparecer. */
  onUse: (text: string) => Promise<boolean>
  onCancel?: () => void
  /** Pedido de foco no campo, pelo "Change text" (write-again); a troca de segmento nunca o pede. */
  focus: boolean
  onFocused: () => void
}) {
  const [refused, setRefused] = useState(false)
  const field = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const element = field.current
    if (!focus || !element) return
    element.focus()
    element.setSelectionRange(element.value.length, element.value.length)
    onFocused()
  }, [focus, onFocused])

  return (
    <div className="write-form">
      <TextField
        className="write-form__field"
        value={value}
        onChange={(next) => {
          onChange(next)
          setRefused(false)
        }}
        maxLength={WRITE_LIMIT}
        isInvalid={refused}
        validationBehavior="aria"
      >
        <Label className="typography-label">{WRITE_TEXT.label}</Label>
        <TextArea ref={field} rows={3} className="text-area typography-body-lg" />
        <Text slot="description" className="typography-meta write-form__help">
          {value.length >= WRITE_LIMIT ? `${WRITE_TEXT.help} ${WRITE_TEXT.limit}` : WRITE_TEXT.help}
        </Text>
        <div aria-live="polite" className="write-form__error">
          <FieldError className="typography-meta field-error">
            <CircleAlert className="icon icon--sm" aria-hidden="true" />
            {WRITE_TEXT.empty}
          </FieldError>
        </div>
      </TextField>
      <div className="roll-card__actions write-form__actions">
        <Button
          className="button-primary typography-label"
          onPress={async () => {
            if (await onUse(value)) setRefused(true)
          }}
        >
          {WRITE_TEXT.use}
        </Button>
        {onCancel && (
          <Button className="button-secondary typography-label" onPress={onCancel}>
            {WRITE_TEXT.cancel}
          </Button>
        )}
      </div>
    </div>
  )
}
