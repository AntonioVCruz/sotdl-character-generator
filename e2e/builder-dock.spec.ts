import { expect, test, type Locator, type Page } from '@playwright/test'
import { createCharacter } from './flow.ts'

// FEAT-007, moldura do construtor no celular (SCR-WEB-016; ui-design "Builder frame"). DEF-001: a região fixa do
// rodapé (`.builder__dock`: Back/Next e a barra de resumo) tem de caber na tela a 320 e a 360 CSS px, com o gutter de
// 16 px (design.md §3 e §5, reflow a 320 px; NFR-ACC-001). `scrollWidth` não conta elementos fixos, por isso a medida é
// a borda de cada controle visível da região.

const GUTTER = 16

type Control = { name: string; left: number; right: number; height: number }

/** Os controles visíveis da região fixa, a largura da janela, o alvo de toque e a rolagem horizontal da página. */
async function measureDock(page: Page) {
  return page.evaluate(() => {
    const controls: Control[] = [...document.querySelectorAll<HTMLElement>('.builder__dock button, .builder__dock a')]
      .filter((element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden')
      .map((element) => {
        const box = element.getBoundingClientRect()
        return { name: element.textContent?.trim() || element.getAttribute('aria-label') || '', left: box.left, right: box.right, height: box.height }
      })
    const root = document.documentElement
    return {
      controls,
      viewport: window.innerWidth,
      touchTarget: parseFloat(getComputedStyle(root).getPropertyValue('--size-touch-target')),
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
    }
  })
}

async function expectDockFits(page: Page, state: string) {
  const { controls, viewport, touchTarget, scrollWidth, clientWidth } = await measureDock(page)
  expect(controls.length, `${state}: controles visíveis na região fixa`).toBeGreaterThan(0)
  expect(touchTarget, '--size-touch-target').toBeGreaterThan(0)
  const problems = controls.flatMap(({ name, left, right, height }) => [
    ...(left < GUTTER ? [`${state} · "${name}": left ${left} < ${GUTTER}`] : []),
    ...(right > viewport - GUTTER ? [`${state} · "${name}": right ${right} > ${viewport - GUTTER}`] : []),
    ...(height < touchTarget ? [`${state} · "${name}": height ${height} < ${touchTarget}`] : []),
  ])
  expect.soft(problems, `${state}: controles dentro do gutter e com alvo de toque`).toEqual([])
  expect.soft(scrollWidth, `${state}: sem rolagem horizontal`).toBeLessThanOrEqual(clientWidth)
}

for (const width of [320, 360]) {
  test(`NFR-ACC-001 (DEF-001): at ${width} px the fixed builder dock keeps every control inside the 16 px gutter, with touch-size targets`, async ({
    page,
  }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'), 'A região fixa só existe abaixo de --bp-md (projetos de celular).')
    await page.setViewportSize({ width, height: testInfo.project.use.viewport?.height ?? 800 })

    const builder = await createCharacter(page)
    await expect(page.getByRole('button', { name: 'Next: Attributes' })).toBeDisabled()
    await expectDockFits(page, 'Ancestry, no choice')

    await page.locator('label.option-card').filter({ hasText: 'Human' }).click()
    await page.getByRole('button', { name: 'Choose Human' }).click()
    await expect(page.getByRole('radio', { name: 'Human, your choice' })).toBeChecked()
    await expect(page.getByRole('button', { name: 'Next: Attributes' })).toBeEnabled()
    await expectDockFits(page, 'Ancestry, Human chosen')

    await page.getByRole('button', { name: 'Next: Attributes' }).click()
    await expect(page).toHaveURL(/\/attributes$/)
    await expect(page.locator('#slot-ancestry_human_attribute-increase')).toContainText('+1 to one attribute')
    await expectDockFits(page, 'Attributes, Human +1 pending')

    await page.goto(`${builder}/review`)
    await expect(page).toHaveURL(/\/review$/)
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible()
    await expectDockFits(page, 'Review')
  })
}

// Foco não escondido (WCAG 2.4.11; ui-design da FEAT-007, SCR-WEB-016, emenda de 2026-11-13): percorrendo a etapa com
// Tab, cada controle focado do corpo fica inteiro acima do topo da região fixa.

type Focused = { name: string; bottom: number; dockTop: number; inStep: boolean; inDock: boolean }

/**
 * Tab a partir do gatilho do seletor de etapas (o último controle antes do `main`) até o foco entrar na região fixa;
 * devolve cada parada no corpo da etapa, medida depois que a rolagem para (o WebKit rola de forma assíncrona). O input
 * oculto de um `option-card` ou de um segmento conta pelo `label` visível que mostra o foco.
 */
async function tabThroughStep(page: Page) {
  await page.getByRole('button', { name: /^Step \d of 8/ }).focus()
  const stops: Focused[] = []
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press('Tab')
    const stop = await page.evaluate(async () => {
      const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
      for (let last = -1; last !== window.scrollY; ) {
        last = window.scrollY
        await frame()
        await frame()
      }
      const element = document.activeElement as HTMLElement | null
      const dock = document.querySelector<HTMLElement>('.builder__dock')
      if (!element || element === document.body || !dock) return null
      const visible = element instanceof HTMLInputElement ? (element.closest('label') ?? element) : element
      return {
        name: (element.getAttribute('aria-label') || visible.textContent || element.tagName).trim().slice(0, 60),
        bottom: visible.getBoundingClientRect().bottom,
        dockTop: dock.getBoundingClientRect().top,
        inStep: !!element.closest('main'),
        inDock: dock.contains(element),
      }
    })
    if (!stop) continue
    if (stop.inDock) return stops
    if (stop.inStep) stops.push(stop)
  }
  return stops
}

async function expectFocusNotObscured(page: Page, state: string) {
  const stops = await tabThroughStep(page)
  expect(stops.length, `${state}: controles da etapa percorridos com Tab`).toBeGreaterThan(0)
  const hidden = stops.filter(({ bottom, dockTop }) => bottom > dockTop).map(({ name, bottom, dockTop }) => `${state} · "${name}": bottom ${bottom} > dock top ${dockTop}`)
  expect.soft(hidden, `${state}: foco acima da região fixa`).toEqual([])
}

for (const width of [320, 412]) {
  test(`NFR-ACC-001: at ${width} px, tabbing through the Ancestry and Attributes steps never leaves the focused control under the fixed builder dock`, async ({
    page,
  }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'), 'A região fixa só existe abaixo de --bp-md (projetos de celular).')
    await page.setViewportSize({ width, height: testInfo.project.use.viewport?.height ?? 800 })

    await createCharacter(page)
    await page.locator('label.option-card').filter({ hasText: 'Human' }).click()
    await page.getByRole('button', { name: 'Choose Human' }).click()
    await expect(page.getByRole('radio', { name: 'Human, your choice' })).toBeChecked()
    await expectFocusNotObscured(page, 'Ancestry, Human chosen')

    await page.getByRole('button', { name: 'Next: Attributes' }).click()
    await expect(page).toHaveURL(/\/attributes$/)
    await expect(page.locator('#slot-ancestry_human_attribute-increase')).toContainText('+1 to one attribute')
    await expectFocusNotObscured(page, 'Attributes, Human')
  })
}

// DEF-002, pior caso: antes do Tab, a página fica rolada de modo que o topo do contêiner que desenha o anel (o
// `option-card`, ou o segmento de um `segmented-control`) apareça e a base fique sob a região fixa, com o input oculto
// já visível. Sem tratamento, o navegador não rola, e a base do contêiner focado fica coberta.

async function settle(page: Page) {
  await page.evaluate(async () => {
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
    for (let last = -1; last !== window.scrollY; ) {
      last = window.scrollY
      await frame()
      await frame()
    }
  })
}

/** Tab até o `target`, com a página rolada no pior caso logo antes do último Tab; devolve a base do contêiner e o topo da região. */
async function tabIntoPartlyCovered(page: Page, target: Locator) {
  const element = await target.elementHandle()
  const trigger = page.getByRole('button', { name: /^Step \d of 8/ })
  const isFocused = () => page.evaluate((el) => document.activeElement === el, element)

  // Tab até o alvo e Shift+Tab de volta ao controle anterior: o próximo Tab volta ao alvo (num grupo de rádio, ao
  // marcado ou ao primeiro), sem depender de contar Tabs enquanto a etapa ainda se acomoda.
  await trigger.focus()
  for (let presses = 0; !(await isFocused()); presses++) {
    expect(presses, 'o alvo está na ordem de Tab da etapa').toBeLessThan(80)
    await page.keyboard.press('Tab')
  }
  await page.keyboard.press('Shift+Tab')
  expect(await isFocused(), 'foco no controle anterior ao alvo').toBe(false)
  // A base do input fica 16 px acima do topo da região: visível mesmo com a folga de rolagem do 432636b. Repete até a
  // posição ficar estável, porque o WebKit ainda pode rolar até o controle anterior depois do Shift+Tab.
  for (let attempt = 0, delta = Infinity; Math.abs(delta) >= 1 && attempt < 5; attempt++) {
    await settle(page)
    delta = await page.evaluate((el) => {
      const container = el!.closest('label') ?? el!
      const dockTop = document.querySelector<HTMLElement>('.builder__dock')!.getBoundingClientRect().top
      const inputToContainerTop = el!.getBoundingClientRect().bottom - container.getBoundingClientRect().top
      const delta = container.getBoundingClientRect().top - (dockTop - 16 - inputToContainerTop)
      window.scrollBy(0, delta)
      return delta
    }, element)
  }
  await settle(page)
  const before = await page.evaluate((el) => {
    const box = (el!.closest('label') ?? el!).getBoundingClientRect()
    return { top: box.top, bottom: box.bottom, dockTop: document.querySelector<HTMLElement>('.builder__dock')!.getBoundingClientRect().top }
  }, element)
  expect(before.top, 'pior caso: o topo do contêiner aparece').toBeLessThan(before.dockTop)
  expect(before.bottom, 'pior caso: a base do contêiner fica sob a região fixa').toBeGreaterThan(before.dockTop)

  await page.keyboard.press('Tab')
  expect(await isFocused()).toBe(true)
  await settle(page)
  return page.evaluate((el) => ({
    bottom: (el!.closest('label') ?? el!).getBoundingClientRect().bottom,
    dockTop: document.querySelector<HTMLElement>('.builder__dock')!.getBoundingClientRect().top,
  }), element)
}

for (const width of [320, 412]) {
  test(`NFR-ACC-001 (DEF-002): at ${width} px, tabbing into an option card or segment partly under the fixed builder dock brings it entirely above the dock`, async ({
    page,
  }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'), 'A região fixa só existe abaixo de --bp-md (projetos de celular).')
    // Altura de 568 px (a do risco de janelas baixas no ui-design): nela o cartão do topo da etapa pode ficar sob a região.
    await page.setViewportSize({ width, height: 568 })

    await createCharacter(page)
    await page.locator('label.option-card').filter({ hasText: 'Human' }).click()
    await page.getByRole('button', { name: 'Choose Human' }).click()
    const human = page.getByRole('radio', { name: 'Human, your choice' })
    await expect(human).toBeChecked()
    const card = await tabIntoPartlyCovered(page, human)
    expect.soft(card.bottom, 'Ancestry: "Human, your choice" acima da região fixa').toBeLessThanOrEqual(card.dockTop)

    await page.getByRole('button', { name: 'Next: Attributes' }).click()
    await expect(page).toHaveURL(/\/attributes$/)
    const strength = page.getByRole('radiogroup', { name: 'Raise one attribute by 1' }).getByRole('radio', { name: 'Strength' })
    const segment = await tabIntoPartlyCovered(page, strength)
    expect.soft(segment.bottom, 'Attributes: segmento "Strength" acima da região fixa').toBeLessThanOrEqual(segment.dockTop)
  })
}
