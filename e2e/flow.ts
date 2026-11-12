import { expect, type Page } from '@playwright/test'

// Ajudantes comuns aos specs do fluxo crítico 1 (ancestry.spec.ts, attributes.spec.ts).

export async function watchCsp(page: Page) {
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

export async function createCharacter(page: Page) {
  await page.goto('')
  await page.getByRole('button', { name: 'New character' }).click()
  await expect(page).toHaveURL(/#\/characters\/[\w-]+\/ancestry$/)
  await expect(page.getByRole('heading', { level: 1, name: "What is your character's ancestry?" })).toBeVisible()
  return page.url().replace(/\/ancestry$/, '')
}
