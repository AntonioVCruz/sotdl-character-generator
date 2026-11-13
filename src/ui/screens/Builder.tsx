import { ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button, Dialog, DialogTrigger, Popover } from 'react-aria-components'
import type { CharacterSession, Snapshot } from '../../app'
import type { CharacterView, StepView } from '../../engine'
import { AppHeader, PageFooter } from '../AppHeader'
import { AncestryStep } from '../builder/AncestryStep'
import { AttributesStep } from '../builder/AttributesStep'
import { formatValue, lockReason, OPEN_MESSAGE, SAVE_FAILED, slotElementId, statusLabel } from '../builder/copy'
import { FallbackStep } from '../builder/FallbackStep'
import { LiveSummary, OpenDecisions } from '../builder/LiveSummary'
import { InlineAlert } from '../builder/parts'
import { StepHeader } from '../builder/StepHeader'
import { StepMap } from '../builder/StepMap'
import { builderRedirect, href, navigate, replace } from '../router'
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
  const redirect = builderRedirect(route, view.steps)
  const current = view.steps.find((step) => step.slug === route.step)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const dock = useRef<HTMLDivElement>(null)
  const step = useRef<HTMLElement>(null)

  useEffect(() => {
    if (redirect) replace(redirect)
  }, [redirect])

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

  if (redirect || !current) return <BuilderLoading />

  const nameOf = (itemId: string) => {
    const item = rules.items.get(itemId)
    return item && 'name' in item ? item.name : itemId
  }
  const stepRoot = view.slots.find((slot) => slot.stepId === current.id && slot.source === null)
  const detail = [view.ancestry && nameOf(view.ancestry), 'Level 0'].filter(Boolean).join(' · ')

  return (
    <>
      <AppHeader character={{ name: 'Unnamed character', detail }} />
      <div className="builder" ref={root}>
        <nav className="builder__map" aria-label="Creation steps">
          <div className="builder__map-list">
            <StepMap id={id} steps={view.steps} current={current} />
          </div>
          <StepSelector id={id} steps={view.steps} current={current} />
        </nav>
        <main className="builder__step" ref={step}>
          <SaveAlert session={session} snapshot={snapshot} />
          <StepHeader step={current} steps={view.steps} slots={view.slots} rules={rules} />
          {/* O corpo sai do `kind` da vaga raiz da etapa, nunca do nome dela (ADR-003 §6). */}
          {stepRoot?.kind === 'choose-entity' && stepRoot.of === 'ancestry' ? (
            <AncestryStep session={session} snapshot={snapshot} slot={stepRoot} nameOf={nameOf} />
          ) : stepRoot?.kind === 'attribute-shift' ? (
            <AttributesStep session={session} snapshot={snapshot} slot={stepRoot} nameOf={nameOf} />
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
      <PageFooter />
    </>
  )
}

/** Seletor de etapas (SCR-WEB-016, e no intermediário): gatilho no topo e o `step-map` num popover. */
function StepSelector({ id, steps, current }: { id: string; steps: StepView[]; current: StepView }) {
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
            <StepMap id={id} steps={steps} current={current} focusCurrent onNavigate={() => setOpen(false)} />
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
function SaveAlert({ session, snapshot }: { session: CharacterSession; snapshot: Ready }) {
  const [retrying, setRetrying] = useState(false)
  if (snapshot.save !== 'failed' && !retrying) return null
  return (
    <InlineAlert tone="danger">
      <p>{SAVE_FAILED}</p>
      <Button
        className="button-secondary typography-label"
        isPending={retrying}
        onPress={async () => {
          setRetrying(true)
          await session.retrySave()
          setRetrying(false)
        }}
      >
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
