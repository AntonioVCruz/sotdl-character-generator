import { ChevronDown, ChevronUp, LoaderCircle } from 'lucide-react'
import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button, Dialog, DialogTrigger, Popover } from 'react-aria-components'
import type { CharacterSession, PendingChange, Snapshot } from '../../app'
import type { CharacterView, StepView } from '../../engine'
import { AppHeader, PageFooter } from '../AppHeader'
import { AncestryStep } from '../builder/AncestryStep'
import { AttributesStep } from '../builder/AttributesStep'
import { formatValue, isTablesStep, lockReason, OPEN_MESSAGE, SAVE_FAILED, slotElementId, statusLabel } from '../builder/copy'
import { FallbackStep } from '../builder/FallbackStep'
import { ImpactDialog } from '../builder/ImpactDialog'
import { OpenNotice } from '../builder/OpenNotice'
import { TablesStep } from '../builder/TablesStep'
import { LiveSummary, OpenDecisions } from '../builder/LiveSummary'
import { StepHeader } from '../builder/StepHeader'
import { StepMap } from '../builder/StepMap'
import { displayName } from '../copy'
import { InlineAlert } from '../parts'
import { builderRedirect, hasNavigatedInApp, href, navigate, replace } from '../router'
import '../styles/builder.css'
import { mediaQuery } from '../styles/breakpoints.generated'
import { useCharacterSession } from '../useCharacterSession'

// Construtor (SCR-WEB-003, SCR-WEB-016; technical-design §3.4, ui-design): estados da sessão e moldura das etapas.

type Ready = Extract<Snapshot, { status: 'ready' }>

export default function Builder({ route }: { route: { id: string; step?: string; slot?: string } }) {
  const { session, snapshot } = useCharacterSession(route.id)

  if (snapshot.status === 'loading' || snapshot.id !== route.id) return <BuilderLoading />
  if (snapshot.status === 'error') {
    return (
      <>
        <AppHeader />
        <main className="app-main">
          <section className="card builder-error" aria-labelledby="builder-error-title">
            <h1 id="builder-error-title" className="typography-display">
              Can&apos;t open this character
            </h1>
            <InlineAlert tone="danger">
              <p>{OPEN_MESSAGE[snapshot.reason]}</p>
            </InlineAlert>
            <a className="link typography-body" href={href.home}>
              Back to My characters
            </a>
          </section>
        </main>
        <PageFooter />
      </>
    )
  }
  return <BuilderReady session={session} snapshot={snapshot} route={route} />
}

/** Esqueletos com fundo `sunken`, sem spinner (design.md §4, loading). */
function BuilderLoading() {
  return (
    <>
      <AppHeader />
      <div className="builder">
        <div className="builder__map skeleton-list" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="skeleton skeleton--row" />
          ))}
        </div>
        <main className="builder__step" aria-busy="true">
          <p className="visually-hidden">Loading character…</p>
          <span className="skeleton skeleton--header" aria-hidden="true" />
          <span className="skeleton-grid" aria-hidden="true">
            <span className="skeleton skeleton--card" />
            <span className="skeleton skeleton--card" />
          </span>
        </main>
        <div className="builder__summary skeleton-grid skeleton-grid--four" aria-hidden="true">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className="skeleton skeleton--mini" />
          ))}
        </div>
      </div>
    </>
  )
}

function BuilderReady({ session, snapshot, route }: {
  session: CharacterSession
  snapshot: Ready
  route: { id: string; step?: string; slot?: string }
}) {
  const { view, rules, id } = snapshot
  const redirect = builderRedirect(route, view.steps, snapshot.lastStep)
  const current = view.steps.find((step) => step.slug === route.step)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const dock = useRef<HTMLDivElement>(null)
  const step = useRef<HTMLElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const shown = redirect ? undefined : current?.slug

  useEffect(() => {
    if (redirect) replace(redirect)
  }, [redirect])

  // FR-CHAR-007: a etapa mostrada é a última visitada; registrar não grava o documento (FEAT-001 §3.4).
  useEffect(() => {
    if (shown) session.visit(shown)
  }, [session, shown])

  // Foco no `h1` da etapa ao chegar a ela por navegação dentro do app (ui-design da FEAT-001, Builder frame focus):
  // "Continue", "New character", Next, Back, mapa e seletor. Com `?slot=`, o foco é da vaga (FR-FLOW-011); num
  // carregamento completo da página, nada é movido. Pelo seletor, o popover fecha e devolve o foco ao gatilho: o `h1`
  // vence essa devolução no quadro seguinte. Só nesse caso o foco é adiado, para nunca chegar depois de outro foco.
  const fromSelector = useRef(false)
  useEffect(() => {
    const deferred = fromSelector.current
    fromSelector.current = false
    if (!shown || route.slot || !hasNavigatedInApp()) return
    title.current?.focus()
    if (!deferred) return
    const frame = requestAnimationFrame(() => title.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [shown, route.slot])

  // FR-FLOW-011: o atalho de uma pendência abre a etapa no ponto exato e põe o foco nele.
  useEffect(() => {
    if (!route.slot || redirect) return
    const target = document.getElementById(slotElementId(route.slot))
    target?.scrollIntoView?.({ block: 'center' })
    target?.focus()
  }, [route.slot, route.step, redirect])

  // SCR-WEB-016: o corpo reserva no fim a altura medida da região fixa, para nada ficar escondido atrás dela.
  useEffect(() => {
    const region = dock.current
    if (!region || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => root.current?.style.setProperty('--dock-height', `${region.offsetHeight}px`))
    observer.observe(region)
    return () => observer.disconnect()
  }, [redirect, current])

  // Foco não escondido (WCAG 2.4.11; DEF-002): com a região fixa (abaixo de --bp-md), o foco por teclado na etapa leva
  // à vista o contêiner que desenha o anel (`data-focus-ring`), não só o input oculto dentro dele. Foco por toque ou
  // clique não rola. A folga da região é o scroll-margin-bottom da etapa (builder.css); sem `smooth`, nada se anima.
  useEffect(() => {
    const main = step.current
    if (!main || typeof window.matchMedia !== 'function') return
    const docked = window.matchMedia(mediaQuery['below-md'])
    const reveal = (event: FocusEvent) => {
      const element = event.target
      if (!docked.matches || !(element instanceof Element) || dock.current?.contains(element)) return
      if (!element.matches(':focus-visible')) return
      ;(element.closest('[data-focus-ring]') ?? element).scrollIntoView({ block: 'nearest' })
    }
    main.addEventListener('focusin', reveal)
    return () => main.removeEventListener('focusin', reveal)
  }, [redirect, current])

  // Diálogo de impacto (SCR-WEB-007; ui-design da FEAT-011): abre e fecha pelo `snapshot.pending` (C2). Apply e Keep põem
  // uma marca, consumida quando o snapshot perde a pendente; a continuação depois do `await` só a desfaz numa recusa.
  const closing = useRef<{ via: 'apply'; pending: PendingChange } | { via: 'keep' } | null>(null)
  // O controle que abriu o diálogo, guardado quando a pendente aparece, antes de o foco ir para o título.
  const opener = useRef<HTMLElement | null>(null)
  useLayoutEffect(() => {
    if (snapshot.pending) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
  }, [snapshot.pending])
  useEffect(() => {
    const mark = closing.current
    if (!mark || snapshot.pending) return
    closing.current = null
    const back = opener.current
    opener.current = null
    // No quadro seguinte ao fechamento (ui-design, kept e applied).
    const frame = requestAnimationFrame(() => {
      if (mark.via === 'apply') return appliedTarget(mark.pending)?.focus()
      // Keep: o foco volta ao controle que abriu; se uma troca de rota o tirou da tela, vai para o `h1` da etapa.
      ;(back?.isConnected ? back : title.current)?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [snapshot.pending])

  if (redirect || !current) return <BuilderLoading />

  const nameOf = (itemId: string) => {
    const item = rules.items.get(itemId)
    return item && 'name' in item ? item.name : itemId
  }
  const stepRoot = view.slots.find((slot) => slot.stepId === current.id && slot.source === null)
  const detail = [view.ancestry && nameOf(view.ancestry), 'Level 0'].filter(Boolean).join(' · ')

  async function apply() {
    const now = session.getSnapshot()
    if (now.status !== 'ready' || !now.pending) return
    closing.current = { via: 'apply', pending: now.pending }
    const result = await session.confirm()
    if (!result.ok && result.reason === 'no-pending' && closing.current?.via === 'apply') closing.current = null
  }

  async function keep() {
    closing.current = { via: 'keep' }
    const result = await session.keep()
    if (!result.ok && closing.current?.via === 'keep') closing.current = null
  }

  return (
    <>
      <AppHeader character={{ name: displayName(snapshot.document.text.name), detail }} />
      <div className="builder" ref={root}>
        <nav className="builder__map" aria-label="Creation steps">
          <div className="builder__map-list">
            <StepMap id={id} steps={view.steps} current={current} />
          </div>
          <StepSelector id={id} steps={view.steps} current={current} onNavigate={() => (fromSelector.current = true)} />
        </nav>
        <main className="builder__step" ref={step}>
          <SaveAlert session={session} snapshot={snapshot} titleRef={title} />
          <OpenNotice session={session} snapshot={snapshot} titleRef={title} nameOf={nameOf} />
          <StepHeader step={current} steps={view.steps} slots={view.slots} rules={rules} titleRef={title} />
          {/* O corpo sai do `kind` da vaga raiz da etapa, nunca do nome dela (ADR-003 §6). */}
          {stepRoot?.kind === 'choose-entity' && stepRoot.of === 'ancestry' ? (
            <AncestryStep session={session} snapshot={snapshot} slot={stepRoot} nameOf={nameOf} />
          ) : stepRoot?.kind === 'attribute-shift' ? (
            <AttributesStep session={session} snapshot={snapshot} slot={stepRoot} nameOf={nameOf} />
          ) : isTablesStep(current, view.slots) ? (
            // Sem vaga raiz e com vagas `table` (technical-design da FEAT-009 §3.4); o motor não sabe que é a Story.
            <TablesStep session={session} snapshot={snapshot} step={current} nameOf={nameOf} />
          ) : (
            <FallbackStep step={current} slots={view.slots} nameOf={nameOf} />
          )}
          <div className="builder__dock" ref={dock}>
            <StepNav id={id} steps={view.steps} current={current} />
            <SummaryBar view={view} expanded={summaryOpen} onToggle={() => setSummaryOpen((open) => !open)} />
          </div>
        </main>
        <aside
          id="builder-summary"
          className={`builder__summary${summaryOpen ? ' builder__summary--open' : ''}`}
          aria-label="Summary"
        >
          <LiveSummary view={view} nameOf={nameOf} />
          <OpenDecisions id={id} view={view} nameOf={nameOf} onNavigate={() => setSummaryOpen(false)} />
        </aside>
      </div>
      <ImpactDialog pending={snapshot.pending} nameOf={nameOf} onKeep={keep} onApply={apply} />
      <PageFooter />
    </>
  )
}

/**
 * Destino do foco depois do Apply, pela variante (ui-design da FEAT-011, applied): o `h2` do detalhe na troca de
 * ancestralidade, a coluna de resultado depois de Roll e Enter result, o `h2` do card no `clear`. No Choose → Choose, a
 * própria restauração do `Modal` devolve o foco à entrada acionada.
 */
function appliedTarget({ kind, key, impact }: PendingChange): HTMLElement | null {
  const slotKind = (impact.change.from ?? impact.change.to)?.kind
  if (kind === 'clear') return document.getElementById(slotKind === 'attribute-shift' ? 'adjustment-title' : slotElementId(key))
  if (slotKind === 'choose-entity') return document.getElementById('ancestry-detail-title')
  if (kind === 'roll' || kind === 'enter') return document.getElementById(`${slotElementId(key)}-result`)
  return null
}

/** Seletor de etapas (SCR-WEB-016, e no intermediário): gatilho no topo e o `step-map` num popover. */
function StepSelector({ id, steps, current, onNavigate }: {
  id: string
  steps: StepView[]
  current: StepView
  /** Um item do popover foi escolhido: a troca de etapa que vem adia o foco no `h1` (Builder frame focus). */
  onNavigate: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="step-selector">
      <DialogTrigger isOpen={open} onOpenChange={setOpen}>
        <Button className="step-selector__trigger" aria-haspopup="dialog">
          <span className="step-selector__current">
            <span className="typography-eyebrow eyebrow--secondary">{`Step ${current.index + 1} of ${steps.length}`}</span>
            <span className="typography-title-sm">{current.name}</span>
          </span>
          <span className="step-selector__state typography-meta">
            {statusLabel(current)}
            {open ? (
              <ChevronUp className="icon icon--sm" aria-hidden="true" />
            ) : (
              <ChevronDown className="icon icon--sm" aria-hidden="true" />
            )}
          </span>
        </Button>
        <Popover className="step-selector__popover" placement="bottom">
          <Dialog className="step-selector__dialog" aria-label="Creation steps">
            <StepMap
              id={id}
              steps={steps}
              current={current}
              focusCurrent
              onNavigate={() => {
                onNavigate()
                setOpen(false)
              }}
            />
          </Dialog>
        </Popover>
      </DialogTrigger>
    </div>
  )
}

/** Barra de resumo recolhível do celular: os quatro atributos e o gatilho "Summary" (FR-FLOW-018). */
function SummaryBar({ view, expanded, onToggle }: { view: CharacterView; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="summary-bar">
      <ul className="summary-bar__attributes" aria-hidden={expanded}>
        {view.summary.attributes.map((attribute) => (
          <li key={attribute.id}>
            <span className="typography-caption">{attribute.name}</span>
            <span className="typography-title-sm summary-bar__value">{formatValue(attribute.score)}</span>
          </li>
        ))}
      </ul>
      <Button className="button-secondary typography-label summary-bar__toggle" aria-expanded={expanded} aria-controls="builder-summary" onPress={onToggle}>
        Summary
        {expanded ? (
          <ChevronDown className="icon icon--sm" aria-hidden="true" />
        ) : (
          <ChevronUp className="icon icon--sm" aria-hidden="true" />
        )}
      </Button>
    </div>
  )
}

/** FR-CHAR-010: a decisão fica na tela; "Try again" grava o estado atual. */
function SaveAlert({ session, snapshot, titleRef }: {
  session: CharacterSession
  snapshot: Ready
  /** O `h1` da etapa, destino do foco quando o alerta sai com o foco dentro dele (ui-design da FEAT-007, save-failed). */
  titleRef: RefObject<HTMLHeadingElement | null>
}) {
  const [retrying, setRetrying] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  if (snapshot.save !== 'failed' && !retrying) return null
  return (
    <InlineAlert tone="danger">
      <p>{SAVE_FAILED}</p>
      <Button
        ref={button}
        className="button-secondary typography-label"
        isPending={retrying}
        onPress={async () => {
          setRetrying(true)
          await session.retrySave()
          // DEF-012: se a nova tentativa deu certo, o alerta sai agora. O foco só vai para o `h1` se ainda está dentro do
          // alerta; se a pessoa o levou para fora durante a gravação, fica onde ela o pôs (C2). Na falha, nada se move.
          const now = session.getSnapshot()
          const leaving = now.status === 'ready' && now.save !== 'failed'
          if (leaving && button.current?.closest('[role="alert"]')?.contains(document.activeElement)) titleRef.current?.focus()
          setRetrying(false)
        }}
      >
        {retrying && <LoaderCircle className="icon icon--sm spinner" aria-hidden="true" />}
        Try again
      </Button>
    </InlineAlert>
  )
}

/** Back e Next pela ordem das etapas; Next só para etapa liberada, mesmo com pendência na atual (FR-FLOW-007, 008). */
function StepNav({ id, steps, current }: { id: string; steps: StepView[]; current: StepView }) {
  const previous = steps[current.index - 1]
  const next = steps[current.index + 1]
  const blocked = next?.status === 'locked'
  return (
    <div className="step-nav">
      {previous && (
        <Button className="button-secondary typography-label" onPress={() => navigate(href.builder(id, previous.slug))}>
          Back
        </Button>
      )}
      {next && (
        <span className="step-nav__next">
          {blocked && (
            <span id="next-reason" className="typography-meta step-nav__reason">
              {lockReason(steps, next)}
            </span>
          )}
          <Button
            className="button-primary typography-label"
            isDisabled={blocked}
            aria-describedby={blocked ? 'next-reason' : undefined}
            onPress={() => navigate(href.builder(id, next.slug))}
          >
            {`Next: ${next.name}`}
          </Button>
        </span>
      )}
    </div>
  )
}
