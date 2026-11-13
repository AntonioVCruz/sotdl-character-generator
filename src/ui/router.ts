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
 * Para onde a rota do construtor deve ir antes de mostrar a etapa (FEAT-007 D10; FEAT-001 §3.5):
 * - com etapa: desconhecida, a primeira; bloqueada, a primeira liberada (FR-FLOW-005); liberada, `null`;
 * - sem etapa: a última visitada (FR-CHAR-007), ou a primeira liberada se ela estiver bloqueada, ou a primeira sem
 *   registro ou se ela não existir mais. Sem etapa, a URL sempre ganha uma, então nunca `null`.
 */
export function builderRedirect(route: { id: string; step?: string }, steps: StepView[], lastStep?: string): string | null {
  const first = steps[0]
  if (!first) return null
  const firstOpen = () => steps.find((candidate) => candidate.status !== 'locked') ?? first
  if (route.step === undefined) {
    const last = steps.find((candidate) => candidate.slug === lastStep)
    const target = !last ? first : last.status === 'locked' ? firstOpen() : last
    return href.builder(route.id, target.slug)
  }
  const step = steps.find((candidate) => candidate.slug === route.step)
  if (!step) return href.builder(route.id, first.slug)
  if (step.status !== 'locked') return null
  return href.builder(route.id, firstOpen().slug)
}

// Navegação dentro do app (ui-design da FEAT-001, Builder frame focus): num carregamento completo da página (recarregar
// ou link direto), nenhum `hashchange` aconteceu ainda, e as telas não movem o foco. Os redirecionamentos por
// `replace` não contam como navegação: eles só completam a URL que o carregamento trouxe.
let navigated = false
let replacing: string | null = null
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    const redirected = replacing !== null && window.location.hash === replacing
    replacing = null
    if (!redirected) navigated = true
  })
}

/** Se a tela atual foi alcançada por navegação dentro do app, e não pelo carregamento da página. */
export const hasNavigatedInApp = () => navigated

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
  replacing = to
  window.location.replace(to)
}
