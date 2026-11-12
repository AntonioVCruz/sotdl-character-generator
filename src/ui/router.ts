import { useSyncExternalStore } from 'react'

// ADR-006: roteamento por hash, porque o GitHub Pages não reescreve rotas da SPA.

export type Route = { name: 'home' } | { name: 'about' } | { name: 'builder'; id: string }

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/'
  if (path === '/about') return { name: 'about' }
  const builder = /^\/characters\/([^/]+)$/.exec(path)
  if (builder) return { name: 'builder', id: decodeURIComponent(builder[1]) }
  return { name: 'home' }
}

export const href = {
  home: '#/',
  about: '#/about',
  builder: (id: string) => `#/characters/${encodeURIComponent(id)}`,
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
