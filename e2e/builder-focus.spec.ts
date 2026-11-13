import { expect, test, type Page } from '@playwright/test'
import { createCharacter } from './flow.ts'

// FEAT-001 T4 (ui-design, Builder frame focus): chegar a uma etapa por navegação dentro do app põe o foco no `h1` da
// etapa; num carregamento completo da página (link direto ou recarregar), o foco não é movido.

const ANCESTRY = "What is your character's ancestry?"
const ATTRIBUTES = 'How strong, quick, clever and willful is your character?'

async function chooseHuman(page: Page) {
  await page.locator('label.option-card').filter({ hasText: 'Human' }).click()
  await page.getByRole('button', { name: 'Choose Human' }).click()
  await expect(page.getByRole('radio', { name: 'Human, your choice' })).toBeChecked()
}

/** Espera dois quadros: o foco no `h1` é adiado para o quadro seguinte à troca de etapa. */
async function frames(page: Page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

test('FR-FLOW-006: choosing a step in the mobile step selector leaves the focus on the step h1, not on the trigger', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'O seletor de etapas é do celular (SCR-WEB-016).')
  await createCharacter(page)
  await chooseHuman(page)

  // Por clique e por teclado: o popover fecha e devolve o foco ao gatilho, e o `h1` vence essa devolução.
  await page.getByRole('button', { name: /^Step 1 of 8/ }).click()
  await page.getByRole('dialog', { name: 'Creation steps' }).getByRole('link', { name: /^2\. Attributes/ }).click()
  await expect(page).toHaveURL(/\/attributes$/)
  await frames(page)
  await expect(page.getByRole('heading', { level: 1, name: ATTRIBUTES })).toBeFocused()

  await page.getByRole('button', { name: /^Step 2 of 8/ }).click()
  const back = page.getByRole('dialog', { name: 'Creation steps' }).getByRole('link', { name: /^1\. Ancestry/ })
  await back.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/ancestry$/)
  await frames(page)
  await expect(page.getByRole('heading', { level: 1, name: ANCESTRY })).toBeFocused()
  await expect(page.getByRole('button', { name: /^Step 1 of 8/ })).not.toBeFocused()
})

test('NFR-ACC-001: a full load of the builder URL (direct link or reload) does not move the focus', async ({ page }) => {
  const builder = await createCharacter(page)
  await chooseHuman(page)
  await page.getByRole('button', { name: 'Next: Attributes' }).click()
  await expect(page.getByRole('heading', { level: 1, name: ATTRIBUTES })).toBeFocused()

  const unmoved = async (heading: string) => {
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    await frames(page)
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true)
  }

  // Recarregar a etapa.
  await page.reload()
  await unmoved(ATTRIBUTES)

  // Link direto para a etapa, numa página nova.
  await page.goto('about:blank')
  await page.goto(`${builder}/ancestry`)
  await unmoved(ANCESTRY)

  // Link direto sem etapa: o redirecionamento para a última etapa visitada não conta como navegação.
  await page.goto('about:blank')
  await page.goto(builder)
  await expect(page).toHaveURL(/\/ancestry$/)
  await unmoved(ANCESTRY)
})
