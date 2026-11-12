import { describe, expect, it } from 'vitest'
import type { StepView } from '../engine'
import { builderRedirect, href, parseRoute } from './router'

const step = (slug: string, status: StepView['status']): StepView => ({
  id: `step:${slug}`,
  slug,
  name: slug,
  index: 0,
  status,
  lockedBy: status === 'locked' ? ['step:origin'] : [],
  decided: 0,
  open: 0,
  total: 0,
})

describe('hash routes', () => {
  it('ADR-006: maps hash routes to screens and back', () => {
    expect(parseRoute('')).toEqual({ name: 'home' })
    expect(parseRoute('#/about')).toEqual({ name: 'about' })
    expect(parseRoute(href.builder('a b'))).toEqual({ name: 'builder', id: 'a b' })
    expect(parseRoute('#/nowhere')).toEqual({ name: 'home' })
  })

  it('FR-FLOW-006: the builder route carries the step slug', () => {
    expect(parseRoute(href.builder('c1', 'attributes'))).toEqual({ name: 'builder', id: 'c1', step: 'attributes' })
    expect(href.builder('c1', 'attributes')).toBe('#/characters/c1/attributes')
  })

  it('FR-FLOW-011: ?slot= carries the encoded key of an open decision', () => {
    const link = href.builder('c1', 'ancestry', 'ancestry=human/size')
    expect(link).toBe('#/characters/c1/ancestry?slot=ancestry%3Dhuman%2Fsize')
    expect(parseRoute(link)).toEqual({ name: 'builder', id: 'c1', step: 'ancestry', slot: 'ancestry=human/size' })
  })

  it('FR-FLOW-005: redirects to the first step, and from a locked step to the first open one', () => {
    const steps = [step('origin', 'not-started'), step('traits', 'locked')]
    expect(builderRedirect({ id: 'c1' }, steps)).toBe('#/characters/c1/origin')
    expect(builderRedirect({ id: 'c1', step: 'nowhere' }, steps)).toBe('#/characters/c1/origin')
    expect(builderRedirect({ id: 'c1', step: 'traits' }, steps)).toBe('#/characters/c1/origin')
    expect(builderRedirect({ id: 'c1', step: 'origin' }, steps)).toBeNull()
    expect(builderRedirect({ id: 'c1', step: 'traits' }, [step('origin', 'done'), step('traits', 'not-started')])).toBeNull()
  })
})
