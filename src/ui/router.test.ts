import { describe, expect, it } from 'vitest'
import { href, parseRoute } from './router'

describe('hash routes', () => {
  it('ADR-006: maps hash routes to screens and back', () => {
    expect(parseRoute('')).toEqual({ name: 'home' })
    expect(parseRoute('#/about')).toEqual({ name: 'about' })
    expect(parseRoute(href.builder('a b'))).toEqual({ name: 'builder', id: 'a b' })
    expect(parseRoute('#/nowhere')).toEqual({ name: 'home' })
  })
})
