import { useSyncExternalStore } from 'react'
import type { StepView } from '../engine'

// ADR-006: roteamento por hash, porque o GitHub Pages não reescreve rotas da SPA.

export type Route =
  | { name: 'home' }
  | { name: 'about' }
  // D10: etapa na URL (slug do id da etapa) e `?slot=` para o atalho de uma pendência (FR-FLOW-011).
  | { name: 'builder'; id: string; step?: string; slot?: string }

export function parseRoute(hash: string): Route {
  const [path = '/', query = ''] = (hash.replace(/^#/, '') || '/').split('?')
  if (path === '/about') return { name: 'about' }
  const builder = /^\/characters\/([^/]+)(?:\/([a-z0-9-]+))?$/.exec(path)
  if (builder) {
    const slot = new URLSearchParams(query).get('slot') ?? undefined
    return {
      name: 'builder',
      id: decodeURIComponent(builder[1]),
      ...(builder[2] && { step: builder[2] }),
      ...(slot && { slot }),
    }
  }
  return { name: 'home' }
}

export const href = {
  home: '#/',
  about: '#/about',
  builder: (id: string, step?: string, slot?: string) =>
    `#/characters/${encodeURIComponent(id)}${step ? `/${step}` : ''}${slot ? `?slot=${encodeURIComponent(slot)}` : ''}`,
}

/**
 * Para onde a rota do construtor deve ir antes de mostrar a etapa: sem etapa (ou etapa desconhecida), a primeira;
 * etapa bloqueada, a primeira liberada (FR-FLOW-005). `null` quando a rota já serve.
 */
export function builderRedirect(route: { id: string; step?: string }, steps: StepView[]): string | null {
  const first = steps[0]
  if (!first) return null
  const step = steps.find((candidate) => candidate.slug === route.step)
  if (!step) return href.builder(route.id, first.slug)
  if (step.status !== 'locked') return null
  const open = steps.find((candidate) => candidate.status !== 'locked') ?? first
  return href.builder(route.id, open.slug)
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function useRoute(): Route {
  return parseRoute(useSyncExternalStore(subscribe, () => window.location.hash))
}

export function navigate(to: string) {
  window.location.hash = to
}

/** Troca a rota sem nova entrada no histórico (redirecionamentos). */
export function replace(to: string) {
  window.location.replace(to)
}
