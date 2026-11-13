import { readFileSync } from 'node:fs'
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test'
import { createCharacter } from './flow.ts'

// NFR-CAP-001 (FEAT-001 D8, D9; AC-15), nos 5 projetos: a Home com 100 personagens, semeados a partir de um criado pela
// interface. As medidas de largura são as do ui-design (Medidas de capacidade; NFR-COMP-002).

const SEED = readFileSync(new URL('./seed-characters.js', import.meta.url), 'utf8')
const isMobile = (testInfo: TestInfo) => testInfo.project.name.startsWith('mobile')

const cards = (page: Page) => page.getByRole('list', { name: 'Saved characters' }).getByRole('article')

/** Cria um personagem pela interface, volta à Home, semeia até 100 e recarrega. Devolve os pedidos depois do reload. */
async function hundredCharacters(page: Page, testInfo: TestInfo) {
  await createCharacter(page)
  await page.getByRole('link', { name: isMobile(testInfo) ? 'Back to My characters' : 'SotDL Generator' }).click()
  await expect(cards(page)).toHaveCount(1)
  expect(await page.evaluate(`(${SEED})(100)`)).toBe(100)

  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  await page.reload()
  await expect(cards(page)).toHaveCount(100)
  return requests
}

/** Bordas horizontais dentro da janela (ui-design, Medidas de capacidade). */
async function expectInsideViewport(locator: Locator, what: string) {
  const { left, right, innerWidth } = await locator.evaluate((el) => {
    const box = el.getBoundingClientRect()
    return { left: box.left, right: box.right, innerWidth: window.innerWidth }
  })
  expect(left, `${what}: borda esquerda`).toBeGreaterThanOrEqual(0)
  expect(right, `${what}: borda direita`).toBeLessThanOrEqual(innerWidth)
}

test('NFR-CAP-001, FR-CHAR-004: with 100 saved characters, the Home lists all of them in order, without packs or the builder', async ({ page }, testInfo) => {
  const requests = await hundredCharacters(page, testInfo)

  // O criado pela interface é o mais recente; os clones vêm um minuto mais antigos cada (seed-characters.js).
  const names = await cards(page).getByRole('heading', { level: 2 }).allTextContents()
  expect(names).toEqual(['Unnamed character', ...Array.from({ length: 99 }, (_, i) => `Seed ${String(i + 1).padStart(3, '0')}`)])

  // NFR-PERF-001 (FEAT-001): com 100 personagens, a Home recarregada não pede pacotes nem o construtor.
  expect(requests.filter((url) => url.includes('/packs/') || /Builder-[\w-]+\.js/.test(url))).toEqual([])
})

test('NFR-CAP-001, NFR-COMP-002: with 100 characters at 320 and 360 px, no horizontal scroll, and the menu and the delete dialog stay inside the window', async ({
  page,
}, testInfo) => {
  await hundredCharacters(page, testInfo)
  const noHorizontalScroll = () =>
    page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)

  await page.setViewportSize({ width: 360, height: 740 })
  await expect(cards(page)).toHaveCount(100)
  expect(await noHorizontalScroll(), '360 px: sem rolagem horizontal').toBe(true)

  await page.setViewportSize({ width: 320, height: 568 })
  await expect(cards(page)).toHaveCount(100)
  expect(await noHorizontalScroll(), '320 px: sem rolagem horizontal').toBe(true)

  // O popover do menu "···" do último cartão da grade.
  const last = cards(page).last()
  await last.getByRole('button', { name: /^More actions for / }).click()
  const menu = page.getByRole('menu')
  await expect(menu.getByRole('menuitem', { name: 'Delete' })).toBeVisible()
  await expectInsideViewport(page.locator('.menu-popover'), 'popover do menu')

  // O diálogo de exclusão e os dois botões dele.
  await menu.getByRole('menuitem', { name: 'Delete' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible()
  await expect(page.locator('.dialog')).toHaveCSS('opacity', '1')
  await expectInsideViewport(page.locator('.dialog'), 'diálogo')
  await expectInsideViewport(dialog.getByRole('button', { name: 'Cancel' }), '"Cancel"')
  await expectInsideViewport(dialog.getByRole('button', { name: 'Delete permanently' }), '"Delete permanently"')
})
