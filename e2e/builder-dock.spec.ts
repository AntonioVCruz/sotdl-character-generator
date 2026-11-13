import { expect, test, type Page } from '@playwright/test'
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
