import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { createCharacter, watchCsp } from './flow.ts'

// FEAT-008 (fluxo crítico 1 até o UC-004; ADR-008): a partir de "New character", pela interface, a etapa Attributes
// com Dwarf (ver, ajustar, tentar de novo, desfazer, recarregar) e com Human (+1 pendente). Roda nos 5 projetos,
// inclusive os de celular (SCR-WEB-016), contra o build com a CSP ativa, sem semear o IndexedDB.

const isMobile = (testInfo: TestInfo) => testInfo.project.name.startsWith('mobile')

/** Escolhe a ancestralidade como no ancestry.spec.ts e abre a etapa Attributes pelo Next. */
async function toAttributes(page: Page, ancestry: string) {
  await createCharacter(page)
  await page.locator('label.option-card').filter({ hasText: ancestry }).click()
  await page.getByRole('button', { name: `Choose ${ancestry}` }).click()
  await expect(page.getByRole('radio', { name: `${ancestry}, your choice` })).toBeChecked()
  await page.getByRole('button', { name: 'Next: Attributes' }).click()
  await expect(page).toHaveURL(/\/attributes$/)
  await expect(page.getByRole('heading', { level: 1, name: 'How strong, quick, clever and willful is your character?' })).toBeVisible()
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

const raiseGroup = (page: Page) => page.getByRole('radiogroup', { name: 'Raise one attribute by 1' })
const lowerGroup = (page: Page) => page.getByRole('radiogroup', { name: 'Lower another attribute by 1' })

async function adjust(page: Page, raise: string, lower: string) {
  await raiseGroup(page).getByText(raise, { exact: true }).click()
  await lowerGroup(page).getByText(lower, { exact: true }).click()
  await page.getByRole('button', { name: 'Apply adjustment' }).click()
  await expect(page.getByText(`Applied: ${raise} +1, ${lower} −1.`)).toBeVisible()
}

const row = (page: Page, name: string | RegExp) => page.getByRole('main').getByRole('button', { name })

/**
 * Espera o ajuste gravado no IndexedDB antes de recarregar: a tela muda antes da gravação (NFR-PERF-002), e um reload
 * no meio dela a interromperia.
 */
async function saved(page: Page, adjustment: { decrease: string; increase: string }) {
  await page.waitForFunction(async ({ decrease, increase }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('sotdl-generator')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const documents = await new Promise<{ decisions?: Record<string, { value?: { decrease?: string; increase?: string } }> }[]>(
      (resolve) => {
        const request = db.transaction('characters').objectStore('characters').getAll()
        request.onsuccess = () => resolve(request.result)
      },
    )
    db.close()
    const value = documents[0]?.decisions?.adjustment?.value
    return value?.decrease === decrease && value?.increase === increase
  }, adjustment)
}

test('FR-STEP-007, FR-CALC-003: from New character, a Dwarf sees the four attributes and the ten characteristics with formula, limits and value', async ({
  page,
}) => {
  const csp = await watchCsp(page)
  await toAttributes(page, 'Dwarf')

  const main = page.getByRole('main')
  await expect(main.getByText('Step 2 of 8 · Choice')).toBeVisible()
  await expect(main.locator('.step-header')).toContainText('CORE p.10')
  await expect(main.getByText('Nothing required')).toBeVisible()
  // FR-FLOW-001 (AC-15): no mapa de etapas, Attributes fica "Done" logo ao escolher o Dwarf.
  const map = page.locator('.builder__map-list .step-map__row')
  await expect(map.nth(1)).toContainText('Done')

  for (const name of ['Strength 10 Modifier +0', 'Agility 9 Modifier −1', 'Intellect 10 Modifier +0', 'Will 10 Modifier +0']) {
    await expect(row(page, name)).toBeVisible()
  }
  await row(page, 'Strength 10 Modifier +0').click()
  await expect(main.locator('.value-composition:not([hidden])')).toContainText('Dwarf starting score')

  const characteristics: [string, string][] = [
    ['Perception 11', 'Intellect + 1, maximum 25'],
    ['Defense 9', 'Agility, maximum 25'],
    ['Health 14', 'Strength + 4'],
    ['Healing Rate 3', 'Health / 4, rounded down, minimum 1'],
    ['Size 1/2', 'Fixed'],
    ['Speed 8', 'Fixed'],
    ['Power 0', 'Fixed'],
    ['Damage 0', 'Fixed'],
    ['Insanity 0', 'Fixed, maximum Will (10)'],
    ['Corruption 0', 'Fixed'],
  ]
  await expect(main.getByRole('list', { name: 'Characteristics' }).getByRole('listitem')).toHaveCount(10)
  // O nome vem do conteúdo da linha: nome, valor e linha de fórmula (WCAG 2.5.3; ui-design, emenda da T8).
  for (const [name, line] of characteristics) await expect(row(page, `${name} ${line}`)).toBeVisible()

  expect(csp).toEqual([])
})

test('FR-STEP-009, FR-CALC-002, FR-CALC-009: applying Strength −1 / Intellect +1 updates the step and the live summary (Strength 9, Intellect 11, Perception 12, Health 13)', async ({
  page,
}, testInfo) => {
  const csp = await watchCsp(page)
  await toAttributes(page, 'Dwarf')

  // A prévia antes de aplicar (FR-FLOW-014).
  await raiseGroup(page).getByText('Intellect', { exact: true }).click()
  await lowerGroup(page).getByText('Strength', { exact: true }).click()
  const previewLine = (name: string) => page.locator('.preview-box__line').filter({ hasText: name })
  await expect(page.getByText('If you apply this adjustment')).toBeVisible()
  await expect(previewLine('Intellect')).toContainText('10 → 11')
  await expect(previewLine('Strength')).toContainText('10 → 9')
  await expect(previewLine('Perception')).toContainText('11 → 12')
  await expect(previewLine('Health')).toContainText('14 → 13')

  await page.getByRole('button', { name: 'Apply adjustment' }).click()
  await expect(page.getByText('Applied: Intellect +1, Strength −1.')).toBeFocused()
  await expect(page.getByRole('main').getByText('Adjustment used')).toBeVisible()

  await expect(row(page, 'Strength 9 Modifier −1')).toBeVisible()
  await expect(row(page, 'Intellect 11 Modifier +1')).toBeVisible()
  await expect(row(page, 'Perception 12')).toBeVisible()
  await expect(row(page, 'Health 13')).toBeVisible()
  await expect(row(page, 'Healing Rate 3')).toBeVisible()

  // A composição lista a base e a parcela do ajuste; o total é a soma.
  await row(page, 'Intellect 11 Modifier +1').click()
  const lines = page.getByRole('main').locator('.value-composition:not([hidden]) li')
  await expect(lines).toHaveText([/^Dwarf starting score\s*10$/, /^Score adjustment\s*\+1$/, /^Intellect\s*11$/])

  const aside = await liveSummary(page, testInfo)
  await expect(aside.getByRole('button', { name: /^Strength\s*9/ })).toBeVisible()
  await expect(aside.getByRole('button', { name: /^Intellect\s*11/ })).toBeVisible()
  await expect(aside.getByRole('button', { name: /^Perception\s*12/ })).toBeVisible()
  await expect(aside.getByRole('button', { name: /^Health\s*13/ })).toBeVisible()
  await closeLiveSummary(page, testInfo)

  expect(csp).toEqual([])
})

test('FR-STEP-010: a second adjustment is refused and the step offers to undo', async ({ page }) => {
  const csp = await watchCsp(page)
  await toAttributes(page, 'Dwarf')
  await adjust(page, 'Intellect', 'Strength')

  // Os grupos ficam só leitura: tentar outro par não muda nada, e o motivo e o desfazer estão visíveis.
  await raiseGroup(page).getByText('Will', { exact: true }).click()
  await lowerGroup(page).getByText('Agility', { exact: true }).click()
  await expect(raiseGroup(page).getByRole('radio', { name: 'Intellect' })).toBeChecked()
  await expect(lowerGroup(page).getByRole('radio', { name: 'Strength' })).toBeChecked()
  await expect(raiseGroup(page)).toHaveAccessibleDescription('To change it, undo the current adjustment first.')
  await expect(page.getByRole('button', { name: 'Undo adjustment' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Apply adjustment' })).toHaveCount(0)
  await expect(row(page, 'Will 10 Modifier +0')).toBeVisible()
  await expect(row(page, 'Agility 9 Modifier −1')).toBeVisible()

  // Nada foi gravado: depois de recarregar, o mesmo ajuste.
  await saved(page, { decrease: 'attribute:strength', increase: 'attribute:intellect' })
  await page.reload()
  await expect(page.getByText('Applied: Intellect +1, Strength −1.')).toBeVisible()
  await expect(row(page, 'Intellect 11 Modifier +1')).toBeVisible()

  expect(csp).toEqual([])
})

test('FR-STEP-011, FR-CALC-009: undoing restores the scores, a new adjustment applies, and it survives reload', async ({ page }) => {
  const csp = await watchCsp(page)
  await toAttributes(page, 'Dwarf')
  await adjust(page, 'Intellect', 'Strength')

  await page.getByRole('button', { name: 'Undo adjustment' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Score adjustment' })).toBeFocused()
  await expect(page.getByRole('status').filter({ hasText: 'Adjustment undone.' })).toHaveCount(1)
  await expect(row(page, 'Strength 10 Modifier +0')).toBeVisible()
  await expect(row(page, 'Intellect 10 Modifier +0')).toBeVisible()
  await expect(row(page, 'Perception 11')).toBeVisible()
  await expect(row(page, 'Health 14')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Apply adjustment' })).toBeDisabled()
  await expect(page.getByRole('main').getByText('Adjustment used')).toHaveCount(0)

  // Um ajuste novo, que sobrevive a recarregar (NFR-REL-001).
  await adjust(page, 'Will', 'Agility')
  await saved(page, { decrease: 'attribute:agility', increase: 'attribute:will' })
  await page.reload()
  await expect(page.getByText('Applied: Will +1, Agility −1.')).toBeVisible()
  await expect(row(page, 'Will 11 Modifier +1')).toBeVisible()
  await expect(row(page, 'Agility 8 Modifier −2')).toBeVisible()
  await expect(row(page, 'Defense 8')).toBeVisible()
  await expect(row(page, 'Insanity 0 Fixed, maximum Will (11)')).toBeVisible()

  expect(csp).toEqual([])
})

test('FR-STEP-008: a Human sees the +1 as pending in Attributes, and the Open decisions shortcut focuses it', async ({ page }, testInfo) => {
  const csp = await watchCsp(page)
  await toAttributes(page, 'Human')

  const main = page.getByRole('main')
  const pending = page.locator('#slot-ancestry_human_attribute-increase')
  await expect(pending).toContainText('+1 to one attribute')
  await expect(pending).toContainText(
    "From Human. Choosing it here isn't available yet. It stays in Open decisions, and your scores don't include it until then.",
  )
  await expect(main.getByText("You can't make this choice here yet. It stays in Open decisions.")).toHaveCount(0)
  await expect(main.getByText('Chosen 0 of 1')).toBeVisible()
  await expect(main.getByText('1 open', { exact: true })).toBeVisible()
  // FR-FLOW-001 (AC-15): com Human, Attributes e Professions & languages com "1 open" no mapa; Story segue "Not started".
  const map = page.locator('.builder__map-list .step-map__row')
  await expect(map.nth(1)).toContainText('1 open')
  await expect(map.nth(2)).toContainText('Not started')
  await expect(map.nth(3)).toContainText('1 open')

  // AC-9: Story a Review continuam com o FallbackStep, e o texto provisório da FEAT-007 segue lá.
  await page.getByRole('button', { name: 'Next: Story' }).click()
  await expect(page).toHaveURL(/\/story$/)
  await expect(main.getByText("There's nothing to decide in this step yet.")).toBeVisible()
  await page.getByRole('button', { name: 'Next: Professions & languages' }).click()
  await expect(main.getByText("You can't make this choice here yet. It stays in Open decisions.")).toBeVisible()

  // O atalho de Open decisions, a partir de outra etapa (aqui, Professions & languages), abre Attributes com o foco
  // na pendência.
  await expect(page).toHaveURL(/\/professions-languages$/)
  const aside = await liveSummary(page, testInfo)
  await aside.getByRole('link', { name: /^\+1 to one attribute\s*Attributes · Human$/ }).click()
  await expect(page).toHaveURL(/\/attributes\?slot=ancestry%3Dhuman%2Fattribute-increase$/)
  await expect(pending).toBeFocused()

  // AC-9: as demais etapas, até Review, também continuam com o FallbackStep (nenhuma tem vaga com Human).
  const character = page.url().replace(/\/attributes\?.*$/, '')
  for (const step of ['wealth-equipment', 'interesting-thing', 'roleplaying', 'review']) {
    await page.goto(`${character}/${step}`)
    await expect(main.getByText("There's nothing to decide in this step yet.")).toBeVisible()
    await expect(main.getByRole('heading', { name: 'Score adjustment' })).toHaveCount(0)
  }

  expect(csp).toEqual([])
})

// Sem vigiar a CSP: o axe injeta script e estilo. Uma análise por teste (scaffold-notes).
test('NFR-ACC-001: the Attributes step with an adjustment applied has no serious axe violations', async ({ page }) => {
  await toAttributes(page, 'Dwarf')
  await adjust(page, 'Intellect', 'Strength')
  const { violations } = await new AxeBuilder({ page })
    .exclude('[data-live-announcer]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
})
