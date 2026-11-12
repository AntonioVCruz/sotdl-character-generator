import { useEffect, useState } from 'react'
import { Button } from 'react-aria-components'
import type { CharacterSession, Snapshot } from '../../app'
import type { StepView } from '../../engine'
import { AppHeader } from '../AppHeader'
import { AncestryStep } from '../builder/AncestryStep'
import { lockReason, OPEN_MESSAGE, SAVE_FAILED, slotElementId } from '../builder/copy'
import { FallbackStep } from '../builder/FallbackStep'
import { LiveSummary, OpenDecisions } from '../builder/LiveSummary'
import { StepHeader } from '../builder/StepHeader'
import { StepMap } from '../builder/StepMap'
import { builderRedirect, href, navigate, replace } from '../router'
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
            <div role="alert" className="inline-alert inline-alert--danger typography-body">
              <p>{OPEN_MESSAGE[snapshot.reason]}</p>
            </div>
            <a className="link typography-body" href={href.home}>
              Back to My characters
            </a>
          </section>
        </main>
      </>
    )
  }
  return <BuilderReady session={session} snapshot={snapshot} route={route} />
}

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

  if (redirect || !current) return <BuilderLoading />

  const nameOf = (itemId: string) => {
    const item = rules.items.get(itemId)
    return item && 'name' in item ? item.name : itemId
  }
  const root = view.slots.find((slot) => slot.stepId === current.id && slot.source === null)
  const ancestryName = view.ancestry ? nameOf(view.ancestry) : null
  const context = ['Unnamed character', ancestryName, 'Level 0'].filter(Boolean).join(' · ')

  return (
    <>
      <AppHeader context={context} />
      <div className="builder">
        <nav className="builder__map" aria-label="Creation steps">
          <StepMap id={id} steps={view.steps} current={current} />
        </nav>
        <main className="builder__step">
          <SaveAlert session={session} snapshot={snapshot} />
          <StepHeader step={current} steps={view.steps} slots={view.slots} rules={rules} />
          {root?.kind === 'choose-entity' && root.of === 'ancestry' ? (
            <AncestryStep session={session} snapshot={snapshot} slot={root} nameOf={nameOf} />
          ) : (
            <FallbackStep step={current} slots={view.slots} nameOf={nameOf} />
          )}
          <StepNav id={id} steps={view.steps} current={current} />
        </main>
        <aside className="builder__summary" aria-label="Summary">
          <LiveSummary view={view} nameOf={nameOf} />
          <OpenDecisions id={id} view={view} nameOf={nameOf} />
        </aside>
      </div>
    </>
  )
}

/** FR-CHAR-010: a decisão fica na tela; "Try again" grava o estado atual. */
function SaveAlert({ session, snapshot }: { session: CharacterSession; snapshot: Ready }) {
  const [retrying, setRetrying] = useState(false)
  if (snapshot.save !== 'failed' && !retrying) return null
  return (
    <div role="alert" className="inline-alert inline-alert--danger typography-body">
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
    </div>
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
            <p id="next-reason" className="typography-meta">
              {lockReason(steps, next)}
            </p>
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
