import { expect, test, type TestInfo } from '@playwright/test'
import { createCharacter } from './flow.ts'

// FEAT-001 (SCR-WEB-001), nos 5 projetos, contra o build com a CSP ativa.

const isMobile = (testInfo: TestInfo) => testInfo.project.name.startsWith('mobile')

test.describe('Home focus', () => {
  test('NFR-ACC-001: arriving at the Home by navigation inside the app puts the focus on the "My characters" h1', async ({ page }, testInfo) => {
    await createCharacter(page)
    // No celular, o construtor troca a marca pelo "voltar" só de ícone (design.md §3).
    await page.getByRole('link', { name: isMobile(testInfo) ? 'Back to My characters' : 'SotDL Generator' }).click()
    const title = page.getByRole('heading', { level: 1, name: 'My characters' })
    await expect(title).toBeFocused()

    // E pela marca, vindo do About.
    await page.goto('#/about')
    await page.getByRole('link', { name: 'SotDL Generator' }).click()
    await expect(title).toBeFocused()
  })

  test('NFR-ACC-001: the first load of the Home does not move the focus', async ({ page }) => {
    await page.goto('')
    await expect(page.getByRole('heading', { level: 1, name: 'My characters' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'No characters yet' })).toBeVisible()
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true)

    await page.reload()
    await expect(page.getByRole('heading', { level: 2, name: 'No characters yet' })).toBeVisible()
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true)
  })
})
