import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type TestInfo } from '@playwright/test'

// FEAT-007 (fluxo crítico 1, UC-001 → UC-003; ADR-008): criar, ver as etapas bloqueadas, escolher Dwarf, conferir o
// resumo, trocar para Human com Size adiado, usar o atalho de Open decisions e recarregar. Roda nos 5 projetos,
// inclusive os de celular (SCR-WEB-016), contra o build com a CSP ativa.

const isMobile = (testInfo: TestInfo) => testInfo.project.name.startsWith('mobile')

async function watchCsp(page: Page) {
  const violations: string[] = []
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      console.error(`CSP violation: ${event.violatedDirective} ${event.blockedURI}`)
    })
  })
  page.on('console', (message) => {
    if (/content.security.policy|CSP violation/i.test(message.text())) violations.push(message.text())
  })
  return violations
}

async function createCharacter(page: Page) {
  await page.goto('')
  await page.getByRole('button', { name: 'New character' }).click()
  await expect(page).toHaveURL(/#\/characters\/[\w-]+\/ancestry$/)
  await expect(page.getByRole('heading', { level: 1, name: "What is your character's ancestry?" })).toBeVisible()
  return page.url().replace(/\/ancestry$/, '')
}

/** O mapa de etapas: lista no desktop; no celular, no popover do seletor (fechar com Escape). */
async function stepMap(page: Page, testInfo: TestInfo) {
  if (!isMobile(testInfo)) return page.getByRole('navigation', { name: 'Creation steps' })
  await page.getByRole('button', { name: /^Step \d of 8/ }).click()
  return page.getByRole('dialog', { name: 'Creation steps' })
}

async function closeMap(page: Page, testInfo: TestInfo) {
  if (isMobile(testInfo)) await page.keyboard.press('Escape')
}

/** O resumo: coluna no desktop; no celular, o painel aberto pela barra "Summary". */
async function summary(page: Page, testInfo: TestInfo) {
  const toggle = page.getByRole('button', { name: 'Summary' })
  if (isMobile(testInfo) && (await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click()
  return page.getByRole('complementary', { name: 'Summary' })
}

async function closeSummary(page: Page, testInfo: TestInfo) {
  const toggle = page.getByRole('button', { name: 'Summary' })
  if (isMobile(testInfo) && (await toggle.getAttribute('aria-expanded')) === 'true') await toggle.click()
}

const card = (page: Page, name: string) => page.locator('label.option-card').filter({ hasText: name })

async function choose(page: Page, name: string) {
  await card(page, name).click()
  await page.getByRole('button', { name: `Choose ${name}` }).click()
  await expect(page.getByRole('radio', { name: `${name}, your choice` })).toBeChecked()
}

test('FR-FLOW-004, FR-FLOW-005: a new character has only Ancestry open; the other 7 steps are locked and do not open by URL', async ({
  page,
}, testInfo) => {
  const builder = await createCharacter(page)

  // FR-FLOW-009 (AC-6): regime, pergunta, linha de regra com página e contadores.
  const main = page.getByRole('main')
  await expect(main.getByText('Step 1 of 8 · Choice')).toBeVisible()
  await expect(main.locator('.step-header')).toContainText('CORE p.9')
  await expect(main.getByText('Chosen 0 of 1')).toBeVisible()
  await expect(main.getByText('1 open', { exact: true })).toBeVisible()

  const map = await stepMap(page, testInfo)
  const steps = map.getByRole('listitem')
  await expect(steps).toHaveCount(8)
  await expect(map.getByRole('link')).toHaveCount(1)
  for (let i = 1; i < 8; i++) await expect(steps.nth(i)).toContainText('Locked')
  await expect(steps.nth(1)).toContainText('2. Attributes, locked. Choose an ancestry first.')
  await expect(map).toContainText('Choose an ancestry first to open the other steps.')
  await closeMap(page, testInfo)

  // Next bloqueado com o motivo visível; a URL de uma etapa bloqueada volta para a Ancestry.
  await expect(page.getByRole('button', { name: 'Next: Attributes' })).toBeDisabled()
  await expect(page.getByText('Choose an ancestry first.', { exact: true })).toBeVisible()
  await page.goto(`${builder}/story`)
  await expect(page).toHaveURL(/\/ancestry$/)
})

test('FR-STEP-001, FR-FLOW-012, FR-FLOW-003, FR-DEC-011, FR-FLOW-011, NFR-REL-001: choose Dwarf, switch to Human with Size left open, follow the shortcut, reload', async ({
  page,
}, testInfo) => {
  const csp = await watchCsp(page)
  await createCharacter(page)

  // FR-STEP-001, FR-CONT-009, FR-SRC-010: cada ancestralidade uma vez, com a linha de mecânica e os selos.
  await expect(page.locator('label.option-card')).toHaveCount(2)
  await expect(card(page, 'Dwarf')).toContainText('Health = Strength + 4')
  await expect(card(page, 'Dwarf')).toContainText('Speed 8')
  await expect(card(page, 'Dwarf')).toContainText('Size 1/2')
  await expect(card(page, 'Dwarf')).toContainText('CORE p.17')
  await expect(card(page, 'Human')).toContainText('CORE p.11')
  await expect(card(page, 'Dwarf')).toContainText('Core')

  // FR-STEP-002, FR-FLOW-014: o detalhe e a prévia aparecem antes de confirmar.
  await card(page, 'Dwarf').click()
  await expect(page.getByText('Health +6; one spell or Shake it Off')).toBeVisible()
  await expect(page.getByText('If you choose Dwarf')).toBeVisible()
  await expect(page.getByText('Opens the other 7 steps')).toBeVisible()

  await page.getByRole('button', { name: 'Choose Dwarf' }).click()
  await expect(page.getByRole('radio', { name: 'Dwarf, your choice' })).toBeChecked()

  // FR-FLOW-012: o resumo vivo calcula pelas fórmulas do pacote.
  let aside = await summary(page, testInfo)
  await expect(aside.getByRole('button', { name: /Health\s*14/ })).toBeVisible()
  await expect(aside.getByRole('button', { name: /Perception\s*11/ })).toBeVisible()
  await expect(aside.getByRole('button', { name: /Healing Rate\s*3/ })).toBeVisible()
  await closeSummary(page, testInfo)

  // FR-FLOW-003: as etapas se liberam.
  const map = await stepMap(page, testInfo)
  await expect(map.getByRole('link')).toHaveCount(8)
  await expect(map.getByRole('listitem').nth(6)).toContainText('Optional')
  await closeMap(page, testInfo)

  // Troca sem dependentes aplica direto e recalcula; Size do Human fica em aberto (FR-STEP-003, FR-DEC-011).
  await choose(page, 'Human')
  await expect(page.getByRole('radiogroup', { name: 'Size' })).toBeVisible()
  await expect(page.getByText('Or decide later: it stays in Open decisions.')).toBeVisible()
  aside = await summary(page, testInfo)
  await expect(aside.getByRole('button', { name: /Health\s*10/ })).toBeVisible()
  await closeSummary(page, testInfo)

  // FR-FLOW-018 (AC-9): no celular, Back e Next ficam na região fixa do rodapé.
  if (isMobile(testInfo)) await expect(page.locator('.builder__dock')).toHaveCSS('position', 'fixed')

  // FR-FLOW-007: Next abre a seguinte mesmo com a pendência na atual.
  await page.getByRole('button', { name: 'Next: Attributes' }).click()
  await expect(page).toHaveURL(/\/attributes$/)
  await expect(page.getByRole('heading', { level: 1, name: 'How strong, quick, clever and willful is your character?' })).toBeVisible()
  // FR-DEC-011 (AC-4): o +1 do Human aparece como pendência na etapa dele.
  await expect(page.getByRole('main').getByText('+1 to one attribute')).toBeVisible()

  // FR-FLOW-001, 006, 008 (AC-5): etapa atual destacada no mapa, abrir pelo mapa e voltar com Back.
  let steps = await stepMap(page, testInfo)
  await expect(steps.locator('[aria-current="step"]')).toContainText('2. Attributes')
  await steps.getByRole('link', { name: /3\. Story/ }).click()
  await expect(page).toHaveURL(/\/story$/)
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page).toHaveURL(/\/attributes$/)
  steps = await stepMap(page, testInfo)
  await expect(steps.getByRole('listitem').first()).toContainText('1 open')
  await closeMap(page, testInfo)

  // FR-FLOW-010, FR-FLOW-011: as três pendências do Human e o atalho que abre a Ancestry na vaga do Size.
  aside = await summary(page, testInfo)
  await expect(aside.getByRole('heading', { name: 'Open decisions · 3' })).toBeVisible()
  // AC-4: as três pendências do Human, cada uma na etapa em que se resolve.
  const decisions = aside.locator('a.open-decision')
  await expect(decisions).toHaveCount(3)
  await expect(decisions.nth(0)).toHaveText(/^Size\s*Ancestry · Human$/)
  await expect(decisions.nth(1)).toHaveText(/^\+1 to one attribute\s*Attributes · Human$/)
  await expect(decisions.nth(2)).toHaveText(/^Extra language or profession\s*Professions & languages · Human$/)
  await aside.getByRole('link', { name: /^Size\s*Ancestry · Human$/ }).click()
  await expect(page).toHaveURL(/\/ancestry\?slot=ancestry%3Dhuman%2Fsize$/)
  await expect(page.locator('#slot-ancestry_human_size')).toBeFocused()

  // NFR-REL-001: a decisão sobrevive a recarregar.
  await page.reload()
  await expect(page.getByRole('radio', { name: 'Human, your choice' })).toBeChecked()
  await expect(page.getByRole('radiogroup', { name: 'Size' })).toBeVisible()

  expect(csp).toEqual([])
})

test('FR-STEP-002, FR-FLOW-014: selecting an ancestry shows its detail and what it changes, and saves nothing', async ({ page }) => {
  await createCharacter(page)

  await card(page, 'Dwarf').click()
  const detail = page.locator('section.ancestry-detail')
  await expect(detail.getByRole('heading', { level: 2, name: 'Dwarf' })).toBeVisible()
  await expect(detail).toContainText('Description: CORE p.17')
  await expect(detail).toContainText('Strength 10, Agility 9, Intellect 10, Will 10')
  await expect(detail).toContainText('Perception = Intellect + 1')
  await expect(detail).toContainText('Health = Strength + 4')
  await expect(detail).toContainText('Dwarfish: speak, read, write')
  await expect(detail).toContainText('Robust Constitution')
  await expect(detail).toContainText('Health +6; one spell or Shake it Off')
  // A prévia: atributos, características e etapas, antes de confirmar.
  const line = (name: string) => detail.locator('.preview-box__line').filter({ hasText: name })
  await expect(line('Agility')).toContainText('— → 9')
  await expect(line('Health')).toContainText('— → 14')
  await expect(detail).toContainText('Opens the other 7 steps')

  // No Human, a pendência de idioma ou profissão.
  await card(page, 'Human').click()
  await expect(page.locator('section.ancestry-detail')).toContainText(
    'One extra language or a random profession, chosen in Professions & languages.',
  )

  // Selecionar não grava nada: depois de recarregar, nenhuma escolha e as etapas seguem bloqueadas.
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: "What is your character's ancestry?" })).toBeVisible()
  await expect(page.getByRole('radio', { name: /your choice/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Next: Attributes' })).toBeDisabled()
})

test('FR-FLOW-003, D8: switching Human with Size decided to Dwarf is refused with a warning, and nothing changes', async ({ page }, testInfo) => {
  await createCharacter(page)
  await choose(page, 'Human')
  await page.locator('label.segmented-control__segment').filter({ hasText: /^1$/ }).click()
  await expect(page.getByText('Decided.')).toBeVisible()

  await card(page, 'Dwarf').click()
  await page.getByRole('button', { name: 'Choose Dwarf' }).click()
  await expect(page.getByRole('status').filter({ hasText: "You can't switch" })).toHaveText(
    "You can't switch to Dwarf yet: your Size choice for Human depends on your current ancestry. Changing a choice that others depend on isn't available yet.",
  )

  // Nada muda: Human continua a escolha, o Size continua decidido e o resumo é o do Human.
  const unchanged = async () => {
    await expect(page.getByRole('radio', { name: 'Human, your choice' })).toBeChecked()
    await expect(page.getByRole('radiogroup', { name: 'Size' }).getByRole('radio', { name: '1', exact: true })).toBeChecked()
    const aside = await summary(page, testInfo)
    await expect(aside.getByRole('button', { name: /Health\s*10/ })).toBeVisible()
    await expect(aside.getByRole('heading', { name: 'Open decisions · 2' })).toBeVisible()
    await closeSummary(page, testInfo)
  }
  await unchanged()
  await page.reload()
  await unchanged()
})

// Sem vigiar a CSP: o axe injeta script e estilo. Uma análise por teste (scaffold-notes).
test('NFR-ACC-001: the builder with an ancestry chosen has no serious or critical axe violations', async ({ page }) => {
  await createCharacter(page)
  await choose(page, 'Human')
  const { violations } = await new AxeBuilder({ page })
    .exclude('[data-live-announcer]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
})
