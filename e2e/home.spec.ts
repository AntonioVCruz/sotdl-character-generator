import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { createCharacter, watchCsp } from './flow.ts'

// FEAT-001 (SCR-WEB-001), nos 5 projetos, contra o build com a CSP ativa. Fluxo crítico 1 (UC-001 parcial), pela interface.

const isMobile = (testInfo: TestInfo) => testInfo.project.name.startsWith('mobile')

const NOTICE = "Characters are saved in this browser only. Clearing your browser's data for this site deletes them."

/** De volta à Home pela interface: no celular, o construtor troca a marca pelo "voltar" só de ícone (design.md §3). */
async function backHome(page: Page, testInfo: TestInfo) {
  await page.getByRole('link', { name: isMobile(testInfo) ? 'Back to My characters' : 'SotDL Generator' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'My characters' })).toBeVisible()
}

async function chooseAncestry(page: Page, name: string) {
  await page.locator('label.option-card').filter({ hasText: name }).click()
  await page.getByRole('button', { name: `Choose ${name}` }).click()
  await expect(page.getByRole('radio', { name: `${name}, your choice` })).toBeChecked()
}

const list = (page: Page) => page.getByRole('list', { name: 'Saved characters' })
const cards = (page: Page) => list(page).getByRole('article')
/** Todos se chamam "Unnamed character" (sem etapa de nome no MVP até a Story): o cartão é achado pela linha de contexto. */
const card = (page: Page, context: string) => cards(page).filter({ hasText: context })

/**
 * Dwarf (Complete) e depois Human com Size adiado (Creating · 3 open), na Home. Entre um e outro, a volta é pela
 * interface: um `page.goto` logo depois da escolha descarregaria a página com a gravação ainda em curso (FEAT-007 D11).
 */
async function dwarfThenHuman(page: Page, testInfo: TestInfo) {
  await createCharacter(page)
  await chooseAncestry(page, 'Dwarf')
  await backHome(page, testInfo)
  await page.getByRole('button', { name: 'New character' }).click()
  await expect(page.getByRole('heading', { level: 1, name: "What is your character's ancestry?" })).toBeVisible()
  await chooseAncestry(page, 'Human')
  await backHome(page, testInfo)
  await expect(cards(page)).toHaveCount(2)
}

async function openDelete(page: Page, target: ReturnType<typeof card>) {
  await target.getByRole('button', { name: 'More actions for Unnamed character' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  const dialog = page.getByRole('alertdialog', { name: 'Delete Unnamed character?' })
  await expect(dialog).toBeVisible()
  return dialog
}

test.describe('Home flow', () => {
  test('FR-CHAR-015, FR-CHAR-016: with no characters, the Home explains the app and warns that characters stay in this browser', async ({ page }) => {
    const csp = await watchCsp(page)
    await page.goto('')
    const empty = page.getByRole('heading', { level: 2, name: 'No characters yet' })
    await expect(empty).toBeVisible()
    await expect(page.getByText(/^This generator guides you through creating a level 0 character/)).toBeVisible()
    await expect(page.getByText(/The full rules text is in the books\.$/)).toBeVisible()
    await expect(page.getByText('To start, choose New character.')).toBeVisible()
    await expect(page.getByText(NOTICE)).toBeVisible()
    await expect(list(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'New character' })).toBeEnabled()
    expect(csp).toEqual([])
  })

  test('FR-CHAR-001, FR-CHAR-003: a new character shows "Creating · 1 open" and the core source, and the core pack is fetched once', async ({ page }, testInfo) => {
    const csp = await watchCsp(page)
    await page.goto('')
    await expect(page.getByRole('heading', { level: 2, name: 'No characters yet' })).toBeVisible()

    // AC-13: entre a criação e a etapa Ancestry, sotdl.core.json é pedido uma vez só (o carregador é o mesmo).
    const core: string[] = []
    page.on('request', (request) => {
      if (request.url().endsWith('/packs/sotdl.core.json')) core.push(request.url())
    })
    await page.getByRole('button', { name: 'New character' }).click()
    await expect(page.getByRole('heading', { level: 1, name: "What is your character's ancestry?" })).toBeVisible()
    expect(core).toHaveLength(1)

    await backHome(page, testInfo)
    const only = cards(page)
    await expect(only).toHaveCount(1)
    await expect(only).toHaveAccessibleName('Unnamed character')
    await expect(only.getByText('Level 0', { exact: true })).toBeVisible()
    await expect(only.getByText('Creating · 1 open', { exact: true })).toBeVisible()
    await expect(only.getByText('Sources: Shadow of the Demon Lord', { exact: true })).toBeVisible()
    await expect(only.getByText(/^Edited \w{3} \d{1,2}, \d{4}$/)).toBeVisible()
    await expect(only.getByRole('link', { name: 'Continue Unnamed character' })).toBeVisible()
    await expect(page.getByText(NOTICE)).toBeVisible()
    expect(csp).toEqual([])
  })

  test('FR-CHAR-004, FR-CHAR-005, FR-CHAR-006: Dwarf is "Complete", Human with Size deferred is "Creating · 3 open" and on top; only navigating keeps the order', async ({
    page,
  }, testInfo) => {
    const csp = await watchCsp(page)
    await dwarfThenHuman(page, testInfo)

    await expect(cards(page).nth(0)).toContainText('Human · Level 0')
    await expect(cards(page).nth(0).getByText('Creating · 3 open', { exact: true })).toBeVisible()
    await expect(cards(page).nth(1)).toContainText('Dwarf · Level 0')
    await expect(cards(page).nth(1).getByText('Complete', { exact: true })).toBeVisible()

    // Só navegar (Continue, Next) não grava: o Dwarf, abaixo, continua abaixo.
    await card(page, 'Dwarf · Level 0').getByRole('link', { name: 'Continue Unnamed character' }).click()
    await expect(page).toHaveURL(/\/ancestry$/)
    await page.getByRole('button', { name: 'Next: Attributes' }).click()
    await expect(page).toHaveURL(/\/attributes$/)
    await backHome(page, testInfo)
    await expect(cards(page).nth(0)).toContainText('Human · Level 0')
    await expect(cards(page).nth(1)).toContainText('Dwarf · Level 0')
    expect(csp).toEqual([])
  })

  test('FR-CHAR-004: deciding something on the older character brings it to the top', async ({ page }, testInfo) => {
    const csp = await watchCsp(page)
    await dwarfThenHuman(page, testInfo)
    await expect(cards(page).nth(1)).toContainText('Dwarf · Level 0')

    // Uma decisão no Dwarf, o mais antigo: o ajuste de atributos na etapa Attributes.
    await card(page, 'Dwarf · Level 0').getByRole('link', { name: 'Continue Unnamed character' }).click()
    await page.getByRole('button', { name: 'Next: Attributes' }).click()
    await page.getByRole('radiogroup', { name: 'Raise one attribute by 1' }).getByText('Intellect', { exact: true }).click()
    await page.getByRole('radiogroup', { name: 'Lower another attribute by 1' }).getByText('Strength', { exact: true }).click()
    await page.getByRole('button', { name: 'Apply adjustment' }).click()
    await expect(page.getByText('Applied: Intellect +1, Strength −1.')).toBeVisible()

    await backHome(page, testInfo)
    await expect(cards(page).nth(0)).toContainText('Dwarf · Level 0')
    await expect(cards(page).nth(1)).toContainText('Human · Level 0')
    expect(csp).toEqual([])
  })

  test('FR-CHAR-007: "Continue" opens the last visited step, also after a reload', async ({ page }, testInfo) => {
    const csp = await watchCsp(page)
    await createCharacter(page)
    await chooseAncestry(page, 'Human')
    await page.getByRole('button', { name: 'Next: Attributes' }).click()
    await expect(page).toHaveURL(/\/attributes$/)
    await backHome(page, testInfo)

    await cards(page).getByRole('link', { name: 'Continue Unnamed character' }).click()
    await expect(page).toHaveURL(/\/attributes$/)
    await expect(page.getByRole('heading', { level: 1, name: 'How strong, quick, clever and willful is your character?' })).toBeVisible()

    await backHome(page, testInfo)
    await page.reload()
    await cards(page).getByRole('link', { name: 'Continue Unnamed character' }).click()
    await expect(page).toHaveURL(/\/attributes$/)
    await expect(page.getByRole('heading', { level: 1, name: 'How strong, quick, clever and willful is your character?' })).toBeVisible()
    expect(csp).toEqual([])
  })

  test('FR-CHAR-013, FR-CHAR-014, FR-CHAR-015: "Cancel" keeps the character; "Delete permanently" removes it for good; deleting the last leads to the empty state', async ({
    page,
  }, testInfo) => {
    const csp = await watchCsp(page)
    await dwarfThenHuman(page, testInfo)

    let dialog = await openDelete(page, card(page, 'Human · Level 0'))
    await expect(dialog).toContainText("This permanently deletes Unnamed character and its creation log from this browser. You can't undo this.")
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).toBeHidden()
    await expect(cards(page)).toHaveCount(2)

    dialog = await openDelete(page, card(page, 'Human · Level 0'))
    await dialog.getByRole('button', { name: 'Delete permanently' }).click()
    await expect(dialog).toBeHidden()
    await expect(cards(page)).toHaveCount(1)
    await expect(card(page, 'Human · Level 0')).toHaveCount(0)
    await page.reload()
    await expect(cards(page)).toHaveCount(1)
    await expect(cards(page)).toContainText('Dwarf · Level 0')

    dialog = await openDelete(page, cards(page))
    await dialog.getByRole('button', { name: 'Delete permanently' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'No characters yet' })).toBeVisible()
    await expect(list(page)).toHaveCount(0)
    await page.reload()
    await expect(page.getByRole('heading', { level: 2, name: 'No characters yet' })).toBeVisible()
    expect(csp).toEqual([])
  })

  test('NFR-ACC-001, FR-CHAR-013, FR-CHAR-014: cancelling and deleting work with the keyboard only', async ({ page }, testInfo) => {
    const csp = await watchCsp(page)
    await dwarfThenHuman(page, testInfo)

    // Ponto de partida pelo teclado: o "Continue" do primeiro cartão; o Tab seguinte é o "···" dele (ui-design, ordem de Tab).
    await cards(page).nth(0).getByRole('link', { name: 'Continue Unnamed character' }).focus()
    await page.keyboard.press('Tab')
    const more = cards(page).nth(0).getByRole('button', { name: 'More actions for Unnamed character' })
    await expect(more).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeFocused()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('alertdialog', { name: 'Delete Unnamed character?' })
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(more).toBeFocused()
    await expect(cards(page)).toHaveCount(2)

    await page.keyboard.press('Enter')
    await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(dialog.getByRole('button', { name: 'Delete permanently' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(dialog).toBeHidden()
    await expect(cards(page)).toHaveCount(1)
    // O foco vai ao título do cartão que ocupou o lugar do excluído (ui-design, Foco na Home).
    await expect(cards(page).getByRole('heading', { level: 2, name: 'Unnamed character' })).toBeFocused()
    expect(csp).toEqual([])
  })
})

// Sem vigiar a CSP: o axe injeta script e estilo na página. Uma análise por teste: duas análises seguidas na mesma
// página derrubam o Firefox do Playwright no Windows (scaffold-notes).
async function expectNoSeriousA11yViolations(page: Page) {
  // O anunciador do React Aria guarda um nó oculto e transitório com aria-labelledby (scaffold-notes).
  const { violations } = await new AxeBuilder({ page })
    .exclude('[data-live-announcer]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
}

test.describe('Home accessibility', () => {
  test('NFR-ACC-001: the Home with characters has no serious or critical axe violations', async ({ page }, testInfo) => {
    await dwarfThenHuman(page, testInfo)
    await expectNoSeriousA11yViolations(page)
  })

  test('NFR-ACC-001: the Home with the delete dialog open has no serious or critical axe violations', async ({ page }, testInfo) => {
    await dwarfThenHuman(page, testInfo)
    await openDelete(page, card(page, 'Human · Level 0'))
    // A análise espera o fim da animação de abertura (--duration-normal): no meio dela, a opacidade parcial muda o
    // contraste. O primeiro quadro tem opacidade 0 e ainda não tem data-entering, por isso a espera é pela opacidade.
    await expect(page.locator('.dialog-overlay')).toHaveCSS('opacity', '1')
    await expect(page.locator('.dialog')).toHaveCSS('opacity', '1')
    await expect(page.locator('[data-entering]')).toHaveCount(0)
    await expectNoSeriousA11yViolations(page)
  })
})

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
