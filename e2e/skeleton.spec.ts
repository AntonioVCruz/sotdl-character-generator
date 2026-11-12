import { readFileSync } from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// Esqueleto técnico (plano §2), metade local do "pronto quando": criar um personagem, recarregar e vê-lo na Home;
// a CSP do build não registra violação; o axe não acusa violação grave na casca.

const tokens = JSON.parse(readFileSync(new URL('../docs/tokens.json', import.meta.url), 'utf8'))

function hexToRgb(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `rgb(${r}, ${g}, ${b})`
}

/** Violações de CSP: pelo evento do documento e pelo console, que cada navegador escreve de um jeito. */
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
  await page.getByRole('button', { name: 'New character' }).click()
  await expect(page).toHaveURL(/#\/characters\/[\w-]+$/)
  await expect(page.getByRole('navigation', { name: 'Steps' }).getByRole('listitem')).toHaveCount(8)
}

test('FR-CHAR-001, FR-CHAR-009: New character creates a level 0 character that is still on the Home after a reload', async ({
  page,
  baseURL,
}) => {
  const csp = await watchCsp(page)
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))

  await page.goto('')
  await expect(page.getByRole('heading', { name: 'My characters' })).toBeVisible()
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1)

  // A casca usa os tokens: fundo da página vindo de tokens.json pela variável gerada.
  await expect(page.locator('body')).toHaveCSS('background-color', hexToRgb(tokens.color.background.page.$value))

  // NFR-PERF-001: a Home não carrega pacotes nem o construtor.
  expect(requests.filter((url) => url.includes('/packs/') || /Builder-[\w-]+\.js/.test(url))).toEqual([])

  await createCharacter(page)
  const steps = page.getByRole('navigation', { name: 'Steps' }).getByRole('listitem')
  await expect(steps.first()).toContainText('Ancestry')
  await expect(steps.first()).toContainText('Not started')

  // Pacotes buscados a partir da base de caminho, não de "/".
  expect(requests.filter((url) => url.includes('/packs/'))).toEqual(
    expect.arrayContaining([`${baseURL}packs/index.json`, `${baseURL}packs/sotdl.core.json`]),
  )

  await page.getByRole('link', { name: 'SotDL Generator' }).click()
  await page.reload()
  await expect(page.getByRole('list', { name: 'Saved characters' }).getByRole('link')).toHaveText(['Unnamed character'])

  await page.getByRole('link', { name: 'About' }).click()
  await expect(page.getByRole('heading', { name: 'About' })).toBeVisible()

  expect(csp).toEqual([])
})

// Sem vigiar a CSP: o axe injeta script e estilo na página para analisá-la. Uma análise por teste:
// duas análises seguidas na mesma página derrubam o Firefox do Playwright no Windows (scaffold-notes).
async function expectNoSeriousA11yViolations(page: Page) {
  // O anunciador do React Aria guarda por 7 s um nó oculto com aria-labelledby para o botão que acionou
  // a ação; ao navegar, o botão some e o nó fica órfão. Artefato transitório de terceiros (scaffold-notes).
  const { violations } = await new AxeBuilder({ page })
    .exclude('[data-live-announcer]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
}

test('NFR-ACC-001: the Home has no serious or critical axe violations', async ({ page }) => {
  await page.goto('')
  await expect(page.getByRole('heading', { name: 'My characters' })).toBeVisible()
  await expectNoSeriousA11yViolations(page)
})

test('NFR-ACC-001: the builder shell has no serious or critical axe violations', async ({ page }) => {
  await page.goto('')
  await createCharacter(page)
  await expectNoSeriousA11yViolations(page)
})
