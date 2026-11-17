import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test'
import { createCharacter, watchCsp } from './flow.ts'

// FEAT-009 (fluxo crítico 1 até o UC-006; ADR-008): a partir de "New character" com Dwarf, pela interface, a etapa
// Story com os dados reais do pacote do core (seis tabelas). Roda nos 5 projetos, inclusive os de celular (SCR-WEB-016),
// contra o build com a CSP ativa, sem semear o IndexedDB. Localizadores como o ui-design registra (C1): escopo pelo
// cartão, grupo de modos com `exact`, entradas da grade com `exact` ou regex ancorada, atalho no `aside`.

const isMobile = (testInfo: TestInfo) => testInfo.project.name.startsWith('mobile')

const TABLES = ['Dwarf Hatred', 'Dwarf Age', 'Dwarf Build', 'Dwarf Appearance', 'Dwarf Background', 'Dwarf Personality']
const KEYS = ['hated-creature', 'age', 'build', 'appearance', 'background', 'personality'].map((grant) => `ancestry=dwarf/${grant}`)
/** Faixas do pacote do core (p.18), na ordem do início: o total rolado cai numa delas. */
const AGE_RANGES = ['3', '4–7', '8–12', '13–15', '16–17', '18']

/** Escolhe o Dwarf e chega à Story pelos Next (sem `page.goto`, que interromperia a gravação; FEAT-007 D11). */
async function toStory(page: Page) {
  const builder = await createCharacter(page)
  await page.locator('label.option-card').filter({ hasText: 'Dwarf' }).click()
  await page.getByRole('button', { name: 'Choose Dwarf' }).click()
  await expect(page.getByRole('radio', { name: 'Dwarf, your choice' })).toBeChecked()
  await page.getByRole('button', { name: 'Next: Attributes' }).click()
  await expect(page).toHaveURL(/\/attributes$/)
  await page.getByRole('button', { name: 'Next: Story' }).click()
  await expect(page).toHaveURL(/\/story$/)
  await expect(page.getByRole('heading', { level: 1, name: "What is your character's story?" })).toBeVisible()
  return builder
}

const card = (page: Page, name: string) => page.getByRole('region', { name })
const modes = (page: Page, name: string) => card(page, name).getByRole('radiogroup', { name, exact: true })
const grid = (page: Page, name: string) => card(page, name).getByRole('radiogroup', { name: `${name} Choose a result.` })

async function openChoose(page: Page, name: string) {
  await modes(page, name).getByText('Choose', { exact: true }).click()
  await expect(modes(page, name).getByRole('radio', { name: 'Choose', exact: true })).toBeChecked()
}

/** Rola uma tabela de 3d6 e confere o cálculo (faces de 1 a 6, modificador +0, total = soma) e a faixa da entrada. */
async function roll3d6(page: Page, name: string) {
  await card(page, name).getByRole('button', { name: 'Roll 3d6' }).click()
  const calc = card(page, name).locator('.roll-result__calc')
  await expect(calc).toHaveText(/^Rolled 3d6: \d \+ \d \+ \d · Modifier \+0 · Total \d+$/)
  const [, ...numbers] = (await calc.textContent())!.match(/^Rolled 3d6: (\d) \+ (\d) \+ (\d) · Modifier \+0 · Total (\d+)$/)!.map(Number)
  const [a, b, c, total] = numbers
  for (const face of [a, b, c]) {
    expect(face, `${name}: face`).toBeGreaterThanOrEqual(1)
    expect(face, `${name}: face`).toBeLessThanOrEqual(6)
  }
  expect(total, `${name}: total`).toBe(a + b + c)
  const entry = (await card(page, name).locator('.roll-result__entry').textContent())!
  const [start, end = start] = entry.split('–').map(Number)
  expect(total, `${name}: total na faixa ${entry}`).toBeGreaterThanOrEqual(start)
  expect(total, `${name}: total na faixa ${entry}`).toBeLessThanOrEqual(end)
  await expect(card(page, name).locator('.roll-value')).toHaveText(`${total}rolled`)
  return { calc: (await calc.textContent())!, entry }
}

/** O resumo vivo: coluna no desktop; no celular, o painel aberto pela barra "Summary". */
async function liveSummary(page: Page, testInfo: TestInfo) {
  const toggle = page.getByRole('button', { name: 'Summary' })
  if (isMobile(testInfo) && (await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click()
  return page.getByRole('complementary', { name: 'Summary' })
}

async function closeLiveSummary(page: Page, testInfo: TestInfo) {
  const toggle = page.getByRole('button', { name: 'Summary' })
  if (isMobile(testInfo) && (await toggle.getAttribute('aria-expanded')) === 'true') await toggle.click()
}

/**
 * Espera as decisões gravadas no IndexedDB antes de recarregar ou sair: a tela muda antes da gravação (NFR-PERF-002), e
 * um reload no meio dela a interromperia.
 */
async function saved(page: Page, keys: string[]) {
  await page.waitForFunction(async (expected) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('sotdl-generator')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const documents = await new Promise<{ decisions?: Record<string, unknown> }[]>((resolve) => {
      const request = db.transaction('characters').objectStore('characters').getAll()
      request.onsuccess = () => resolve(request.result)
    })
    db.close()
    const decisions = documents[0]?.decisions ?? {}
    return expected.every((key) => key in decisions)
  }, keys)
}

const checked = (radio: Locator) => expect(radio).toBeChecked()

test('FR-STEP-012, FR-STEP-013, FR-DEC-001, FR-DEC-002, FR-FLOW-011: with Dwarf, Story shows the six tables in order with their page and regime, Roll and Choose, no Write, and the shortcut focuses a card', async ({
  page,
}, testInfo) => {
  const csp = await watchCsp(page)
  await toStory(page)
  const main = page.getByRole('main')
  await expect(main.getByText('Step 3 of 8 · Roll or choose')).toBeVisible()
  await expect(main.locator('.step-header')).toContainText('CORE p.11')
  await expect(main.getByText('0 of 6 decided', { exact: true })).toBeVisible()
  await expect(main.getByText('6 open', { exact: true })).toBeVisible()

  // AC-1: um cartão por tabela, na ordem do pacote, com o selo da página e Roll e Choose; sem Write (FEAT-010).
  await expect(main.locator('.roll-card h2')).toHaveText(TABLES)
  for (const [index, name] of TABLES.entries()) {
    await expect(card(page, name).locator('.roll-card__regime')).toContainText(index < 4 ? 'CORE p.18' : 'CORE p.19')
    await expect(modes(page, name).getByRole('radio')).toHaveCount(2)
    await expect(modes(page, name).getByRole('radio', { name: 'Roll', exact: true })).toHaveCount(1)
    await expect(modes(page, name).getByRole('radio', { name: 'Choose', exact: true })).toHaveCount(1)
  }
  await expect(main.getByText(/write/i)).toHaveCount(0)

  // AC-2: a Hatred (regime choice) abre em Choose, com as faixas do d20 e as criaturas; as outras dizem roll or choose.
  await expect(card(page, 'Dwarf Hatred').locator('.roll-card__regime')).toHaveText('The book says to choose. CORE p.18')
  await expect(card(page, 'Dwarf Age').locator('.roll-card__regime')).toHaveText('The book says to roll or choose. CORE p.18')
  await expect(grid(page, 'Dwarf Hatred').getByRole('radio')).toHaveCount(10)
  await expect(grid(page, 'Dwarf Hatred').getByRole('radio', { name: '1–2 Ogres', exact: true })).toHaveCount(1)
  await expect(grid(page, 'Dwarf Hatred').getByRole('radio', { name: '19–20 Demons', exact: true })).toHaveCount(1)
  await expect(card(page, 'Dwarf Age').getByRole('button', { name: 'Roll 3d6' })).toBeVisible()
  await expect(card(page, 'Dwarf Age').getByRole('button', { name: 'Enter result' })).toHaveCount(0)

  // AC-12: as seis em Open decisions; o atalho leva ao cartão e põe o foco nele (FR-FLOW-011).
  const summary = await liveSummary(page, testInfo)
  await expect(summary.getByRole('heading', { name: 'Open decisions · 6' })).toBeVisible()
  await summary.getByRole('link', { name: /^Dwarf Personality\s*Story · Dwarf$/ }).click()
  await expect(page).toHaveURL(/\/story\?slot=ancestry%3Ddwarf%2Fpersonality$/)
  await expect(card(page, 'Dwarf Personality')).toBeFocused()

  expect(csp).toEqual([])
})

test('FR-CHAR-006, FR-DEC-005, FR-DEC-007, FR-DEC-024, FR-CALC-010, NFR-REL-001: choose the Hatred, roll a table, choose Background 1 (Corruption 1), reload, decide the six and see "Complete" on the Home', async ({
  page,
}, testInfo) => {
  const csp = await watchCsp(page)
  await toStory(page)

  // Choose na grade: decidir é marcar (D5).
  await grid(page, 'Dwarf Hatred').getByText('Troglodytes', { exact: true }).click()
  await checked(grid(page, 'Dwarf Hatred').getByRole('radio', { name: '3–4 Troglodytes', exact: true }))
  await expect(card(page, 'Dwarf Hatred').locator('.roll-result__entry')).toHaveText('3–4 Troglodytes')

  // Roll: faces, modificador, total e entrada coerentes com as faixas (AC-4).
  const age = await roll3d6(page, 'Dwarf Age')
  expect(AGE_RANGES).toContain(age.entry)
  await expect(card(page, 'Dwarf Age').locator('.roll-result__column')).toContainText('No text added for this entry · CORE p.18')

  // Background 1: Corruption +1 no resultado e no resumo vivo, com a parcela da tabela (AC-9).
  await openChoose(page, 'Dwarf Background')
  await grid(page, 'Dwarf Background').getByText('1', { exact: true }).click()
  await checked(grid(page, 'Dwarf Background').getByRole('radio', { name: /^1 CORE p\.19$/ }))
  await expect(card(page, 'Dwarf Background').locator('.effect-chip')).toHaveText('Corruption +1')
  let summary = await liveSummary(page, testInfo)
  const corruption = summary.getByRole('button', { name: /^Corruption\s*1$/ })
  await expect(corruption).toBeVisible()
  await corruption.click()
  await expect(summary.locator('.value-composition:not([hidden])')).toContainText('Dwarf Background: 1')
  await closeLiveSummary(page, testInfo)
  await expect(page.getByRole('main').getByText('3 of 6 decided', { exact: true })).toBeVisible()

  // Recarregar não rola de novo: o mesmo resultado (AC-13).
  await saved(page, KEYS.filter((key) => /hated|age|background/.test(key)))
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: "What is your character's story?" })).toBeVisible()
  await expect(card(page, 'Dwarf Age').locator('.roll-result__calc')).toHaveText(age.calc)
  await expect(card(page, 'Dwarf Age').locator('.roll-result__entry')).toHaveText(age.entry)
  await checked(grid(page, 'Dwarf Hatred').getByRole('radio', { name: '3–4 Troglodytes', exact: true }))
  await checked(grid(page, 'Dwarf Background').getByRole('radio', { name: /^1 CORE p\.19$/ }))
  summary = await liveSummary(page, testInfo)
  await expect(summary.getByRole('button', { name: /^Corruption\s*1$/ })).toBeVisible()
  await closeLiveSummary(page, testInfo)

  // As outras três: Story fica Done (AC-12).
  for (const name of ['Dwarf Build', 'Dwarf Appearance', 'Dwarf Personality']) await roll3d6(page, name)
  await expect(page.getByRole('main').getByText('6 of 6 decided', { exact: true })).toBeVisible()
  await expect(page.getByRole('main').getByText(/^\d+ open$/)).toHaveCount(0)
  await saved(page, KEYS)

  // FR-CHAR-006: na Home, o personagem fica "Complete" (a expectativa que saiu do home.spec.ts na T6).
  await page.getByRole('link', { name: isMobile(testInfo) ? 'Back to My characters' : 'SotDL Generator' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'My characters' })).toBeVisible()
  const only = page.getByRole('list', { name: 'Saved characters' }).getByRole('article')
  await expect(only).toHaveCount(1)
  await expect(only).toContainText('Dwarf · Level 0')
  await expect(only.getByText('Complete', { exact: true })).toBeVisible()

  expect(csp).toEqual([])
})

// Sem vigiar a CSP: o axe injeta script e estilo. Uma análise por teste (scaffold-notes).
test('NFR-ACC-001: the Story step with rolled and chosen tables has no serious axe violations', async ({ page, context }, testInfo) => {
  await toStory(page)
  await grid(page, 'Dwarf Hatred').getByText('Troglodytes', { exact: true }).click()
  const age = await roll3d6(page, 'Dwarf Age')
  await openChoose(page, 'Dwarf Background')
  await grid(page, 'Dwarf Background').getByText('1', { exact: true }).click()
  await checked(grid(page, 'Dwarf Background').getByRole('radio', { name: /^1 CORE p\.19$/ }))

  // Contorno só no Firefox; remover ao atualizar para o Playwright 1.66. O Firefox do Playwright 1.65 (firefox-1572)
  // derruba o processo de conteúdo ("Page crashed") quando o `ariaLabelledByElements` do mesmo elemento é lido no mundo
  // isolado do Playwright (o `getByRole` com `name` sobre os cartões e os radiogroups, que têm aria-labelledby) e depois
  // no mundo da página (o axe). Corrigido no firefox-1578. O axe roda numa página nova do mesmo contexto, no mesmo
  // personagem, com o estado decidido esperado sem localizador por nome (scaffold-notes, "Desvios encontrados ao rodar").
  let target = page
  if (testInfo.project.name === 'firefox') {
    await saved(page, KEYS.filter((key) => /hated|age|background/.test(key)))
    target = await context.newPage()
    await target.goto(page.url())
    await expect(target.locator('h1')).toHaveText("What is your character's story?")
    await expect(target.getByText(age.calc, { exact: true })).toBeVisible()
    await expect(target.getByText('3 of 6 decided', { exact: true })).toBeVisible()
  }

  const { violations } = await new AxeBuilder({ page: target })
    .exclude('[data-live-announcer]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
})
