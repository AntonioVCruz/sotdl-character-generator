import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { createCharacter, watchCsp } from './flow.ts'

// FEAT-011 (fluxo crítico 2, UC-010; ADR-008): Dwarf com Background 1 escolhido e Age rolada → Human pelo diálogo de
// impacto → recarregar → Dwarf de volta pelo diálogo de restauração, com as mesmas faces na Age e Corruption 1; Human
// de novo e "Keep current ancestry" não muda nada. Roda nos 5 projetos, contra o build com a CSP ativa, sem semear o
// IndexedDB. Localizadores do technical-design §7 (C1): o diálogo por `getByRole('dialog')` sem nome, as ações e os
// títulos das listas com `exact`, os itens pelo texto, o foco do Apply pelo `h2` do `section.ancestry-detail`, e o
// resumo vivo só com o diálogo fechado (com ele aberto, o resto da página tem `aria-hidden`).

const isMobile = (testInfo: TestInfo) => testInfo.project.name.startsWith('mobile')

const AGE = 'ancestry=dwarf/age'
const BACKGROUND = 'ancestry=dwarf/background'

const option = (page: Page, name: string) => page.locator('label.option-card').filter({ hasText: name })
const card = (page: Page, name: string) => page.getByRole('region', { name })
const modes = (page: Page, name: string) => card(page, name).getByRole('radiogroup', { name, exact: true })
const grid = (page: Page, name: string) => card(page, name).getByRole('radiogroup', { name: `${name} Choose a result.` })
const detailTitle = (page: Page, name: string) =>
  page.locator('section.ancestry-detail').getByRole('heading', { level: 2, name, exact: true })

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

async function corruption(page: Page, testInfo: TestInfo, value: number) {
  const summary = await liveSummary(page, testInfo)
  await expect(summary.getByRole('button', { name: new RegExp(`^Corruption\\s*${value}$`) })).toBeVisible()
  await closeLiveSummary(page, testInfo)
}

type Stored = { revision: number; decisions: Record<string, { value?: unknown; setAside?: true }>; log: unknown[] }

/** O documento gravado no IndexedDB (um personagem só). */
function stored(page: Page): Promise<Stored> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('sotdl-generator')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const documents = await new Promise<Stored[]>((resolve) => {
      const request = db.transaction('characters').objectStore('characters').getAll()
      request.onsuccess = () => resolve(request.result)
    })
    db.close()
    return documents[0]
  })
}

/**
 * Espera a gravação com a ancestralidade e as duas tabelas do Dwarf, antes de recarregar ou sair: a tela muda antes da
 * gravação (D11), e um reload no meio dela a interromperia.
 */
async function saved(page: Page, ancestry: string, tablesActive: boolean) {
  await page.waitForFunction(
    async ({ ancestry, keys, tablesActive }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('sotdl-generator')
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      const documents = await new Promise<{ decisions?: Record<string, { value?: unknown; setAside?: true }> }[]>((resolve) => {
        const request = db.transaction('characters').objectStore('characters').getAll()
        request.onsuccess = () => resolve(request.result)
      })
      db.close()
      const decisions = documents[0]?.decisions ?? {}
      return decisions.ancestry?.value === ancestry && keys.every((key) => key in decisions && (decisions[key].setAside !== true) === tablesActive)
    },
    { ancestry, keys: [AGE, BACKGROUND], tablesActive },
  )
}

/** Dwarf escolhido, Background 1 escolhido e Age rolada, gravados; devolve o endereço do personagem e o cálculo da Age. */
async function dwarfWithTables(page: Page) {
  const builder = await createCharacter(page)
  await option(page, 'Dwarf').click()
  await page.getByRole('button', { name: 'Choose Dwarf' }).click()
  await expect(page.getByRole('radio', { name: 'Dwarf, your choice' })).toBeChecked()
  await page.getByRole('button', { name: 'Next: Attributes' }).click()
  await expect(page).toHaveURL(/\/attributes$/)
  await page.getByRole('button', { name: 'Next: Story' }).click()
  await expect(page.getByRole('heading', { level: 1, name: "What is your character's story?" })).toBeVisible()

  await modes(page, 'Dwarf Background').getByText('Choose', { exact: true }).click()
  await grid(page, 'Dwarf Background').getByText('1', { exact: true }).click()
  await expect(grid(page, 'Dwarf Background').getByRole('radio', { name: /^1 CORE p\.19$/ })).toBeChecked()
  await card(page, 'Dwarf Age').getByRole('button', { name: 'Roll 3d6', exact: true }).click()
  const calc = card(page, 'Dwarf Age').locator('.roll-result__calc')
  await expect(calc).toHaveText(/^Rolled 3d6: \d \+ \d \+ \d · Modifier \+0 · Total \d+$/)
  const age = { calc: (await calc.textContent())!, entry: (await card(page, 'Dwarf Age').locator('.roll-result__entry').textContent())! }
  await saved(page, 'ancestry:dwarf', true)
  return { builder, age }
}

async function toAncestry(page: Page, builder: string) {
  await page.goto(`${builder}/ancestry`)
  await expect(page.getByRole('heading', { level: 1, name: "What is your character's ancestry?" })).toBeVisible()
}

/** Prévia da ancestralidade e "Choose {name}": com dependentes, o diálogo abre pelo snapshot. */
async function requestSwitch(page: Page, name: string) {
  await option(page, name).click()
  await page.getByRole('button', { name: `Choose ${name}` }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  return dialog
}

test('FR-STEP-005, FR-CHG-001, FR-CHG-003, FR-CHG-004, FR-CHG-006, FR-CHG-008, FR-CHG-009, FR-CHG-018: Dwarf with Background 1 and a rolled Age → Human → reload → Dwarf restores the same faces and Corruption 1; Keep current changes nothing (AC-15)', async ({
  page,
}, testInfo) => {
  const csp = await watchCsp(page)
  const { builder, age } = await dwarfWithTables(page)
  await corruption(page, testInfo, 1)

  // Dwarf → Human: o diálogo com as duas tabelas em "set aside" e Corruption 1 → 0 (FR-CHG-003, 004, 006).
  await toAncestry(page, builder)
  let dialog = await requestSwitch(page, 'Human')
  await expect(dialog.getByRole('heading', { level: 2 })).toHaveText('Switch from Dwarf to Human?')
  await expect(dialog.getByRole('heading', { level: 3, name: 'Will be set aside', exact: true })).toBeVisible()
  await expect(dialog.getByRole('listitem').filter({ hasText: `Dwarf Age: ${age.entry} · rolled` })).toBeVisible()
  await expect(dialog.getByRole('listitem').filter({ hasText: 'Dwarf Background: 1 · chosen' })).toBeVisible()
  await expect(dialog.getByRole('heading', { level: 3, name: 'Will be restored', exact: true })).toHaveCount(0)
  await expect(dialog.getByRole('listitem').filter({ hasText: 'Corruption' })).toHaveText(/^Corruption\s*1 → 0$/)

  // Apply: o diálogo fecha, o Human passa a escolha e o foco vai para o `h2` do detalhe (ui-design, switch-applied).
  await dialog.getByRole('button', { name: 'Apply new ancestry', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(detailTitle(page, 'Human')).toBeFocused()
  await expect(page.getByRole('radio', { name: 'Human, your choice' })).toBeChecked()
  await corruption(page, testInfo, 0)
  await saved(page, 'ancestry:human', false)

  // Recarregar: o Human continua; Human → Dwarf abre o diálogo só de restauração, com os valores gravados (FR-CHG-018).
  await page.reload()
  await expect(page.getByRole('radio', { name: 'Human, your choice' })).toBeChecked()
  dialog = await requestSwitch(page, 'Dwarf')
  await expect(dialog.getByRole('heading', { level: 2 })).toHaveText('Switch from Human to Dwarf?')
  await expect(dialog.getByRole('heading', { level: 3, name: 'Will be restored', exact: true })).toBeVisible()
  await expect(dialog.getByRole('heading', { level: 3, name: 'Will be set aside', exact: true })).toHaveCount(0)
  await expect(dialog.getByRole('listitem').filter({ hasText: `Dwarf Age: ${age.entry} · rolled` })).toBeVisible()
  await expect(dialog.getByRole('listitem').filter({ hasText: 'Dwarf Background: 1 · chosen' })).toBeVisible()
  await expect(dialog.getByRole('listitem').filter({ hasText: 'Corruption' })).toHaveText(/^Corruption\s*0 → 1$/)
  await dialog.getByRole('button', { name: 'Apply new ancestry', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(detailTitle(page, 'Dwarf')).toBeFocused()
  await corruption(page, testInfo, 1)
  await saved(page, 'ancestry:dwarf', true)

  // A Story volta com as mesmas faces na Age (Apply não rola de novo) e o Background 1.
  await page.goto(`${builder}/story`)
  await expect(page.getByRole('heading', { level: 1, name: "What is your character's story?" })).toBeVisible()
  await expect(card(page, 'Dwarf Age').locator('.roll-result__calc')).toHaveText(age.calc)
  await expect(card(page, 'Dwarf Age').locator('.roll-result__entry')).toHaveText(age.entry)
  await expect(grid(page, 'Dwarf Background').getByRole('radio', { name: /^1 CORE p\.19$/ })).toBeChecked()

  // Human de novo e "Keep current ancestry": nada muda, nem na tela nem no documento gravado (FR-CHG-009).
  const before = await stored(page)
  await toAncestry(page, builder)
  dialog = await requestSwitch(page, 'Human')
  await dialog.getByRole('button', { name: 'Keep current ancestry', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Choose Human' })).toBeFocused()
  await expect(page.getByRole('radio', { name: 'Dwarf, your choice' })).toBeVisible()
  await corruption(page, testInfo, 1)
  await page.reload()
  await expect(page.getByRole('radio', { name: 'Dwarf, your choice' })).toBeChecked()
  await corruption(page, testInfo, 1)
  expect(await stored(page)).toEqual(before)

  expect(csp).toEqual([])
})

// Sem vigiar a CSP: o axe injeta script e estilo. Uma análise por teste (scaffold-notes).
test('NFR-ACC-001: the impact dialog of Dwarf → Human has no serious or critical axe violations (AC-15)', async ({ page, context }, testInfo) => {
  const { builder } = await dwarfWithTables(page)

  // Contorno só no Firefox; remover ao atualizar para o Playwright 1.66, junto com o do story.spec.ts. O Firefox do
  // Playwright 1.65 (firefox-1572) derruba o processo de conteúdo ("Page crashed") quando o `ariaLabelledByElements` do
  // mesmo elemento é lido no mundo isolado do Playwright (o `getByRole` com `name` sobre os cartões e os radiogroups da
  // Story, que têm aria-labelledby) e depois no mundo da página (o axe). Corrigido no firefox-1578. O diálogo abre de
  // novo numa página nova do mesmo contexto, no mesmo personagem (a pendente não é gravada), sem localizador por nome
  // sobre elementos com aria-labelledby (scaffold-notes, "Desvios encontrados ao rodar").
  let target = page
  if (testInfo.project.name === 'firefox') target = await context.newPage()
  await target.goto(`${builder}/ancestry`)
  await expect(target.locator('h1')).toHaveText("What is your character's ancestry?")
  await target.locator('label.option-card').filter({ hasText: 'Human' }).click()
  await target.getByRole('button', { name: 'Choose Human' }).click()
  await expect(target.getByRole('dialog')).toBeVisible()
  await expect(target.getByRole('dialog').locator('h2')).toHaveText('Switch from Dwarf to Human?')
  // A análise espera o fim da animação de abertura, como o caso do diálogo da Home (home.spec.ts): no meio dela, a
  // opacidade parcial muda o contraste.
  await expect(target.locator('.dialog-overlay')).toHaveCSS('opacity', '1')
  await expect(target.locator('.dialog')).toHaveCSS('opacity', '1')
  await expect(target.locator('[data-entering]')).toHaveCount(0)

  const { violations } = await new AxeBuilder({ page: target })
    .exclude('[data-live-announcer]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
})
