import { appendFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

// NFR-PERF-002 (FEAT-008 technical-design §5; ADR-008, teste de tempo): do clique que confirma uma decisão até a etapa
// e o resumo vivo mostrarem o valor novo. Só no Chromium (o CDP só existe nele): `chromium` como notebook médio e
// `mobile-chrome` com 4× de CPU como celular médio. Tudo é instalado pelo teste; o app não tem código de medição.

const PROFILES: Record<string, { limit: number; throttle?: number; summary: string }> = {
  chromium: { limit: 100, summary: '#builder-summary .live-summary__attributes li' },
  // Abaixo de --bp-md o resumo fica recolhido (SCR-WEB-016): a barra com os quatro scores.
  'mobile-chrome': { limit: 200, throttle: 4, summary: '.summary-bar__attributes li' },
}
const WARMUP = 5
const SAMPLES = 40

declare global {
  interface Window {
    __perf?: { start: number | null; result: number | null }
  }
}

/**
 * Arma a medida: o início é o `timeStamp` do próximo clique (ouvinte em captura no `document`); o fim é o primeiro
 * quadro depois que a linha do atributo na etapa e o item dele no resumo mostram `expected`.
 */
function arm(page: Page, attribute: string, expected: string, summary: string) {
  return page.evaluate(
    ({ attribute, expected, summary }) => {
      const perf = { start: null as number | null, result: null as number | null }
      window.__perf = perf
      const onClick = (event: MouseEvent) => {
        perf.start = event.timeStamp
        document.removeEventListener('click', onClick, true)
      }
      document.addEventListener('click', onClick, true)

      // A linha na etapa: `main` + botão com nome (do conteúdo) começando por "{Attribute} ".
      const stepValue = () =>
        [...document.querySelectorAll('main button')]
          .find((button) => button.textContent?.trim().startsWith(`${attribute} `))
          ?.querySelector('.characteristic-row__value')
          ?.textContent?.trim()
      const summaryValue = () =>
        [...document.querySelectorAll(summary)]
          .find((item) => item.querySelector('.typography-caption')?.textContent?.trim() === attribute)
          ?.querySelector('.typography-stat-sm, .summary-bar__value')
          ?.textContent?.trim()
      const observer = new MutationObserver(() => {
        if (perf.start === null || stepValue() !== expected || summaryValue() !== expected) return
        observer.disconnect()
        requestAnimationFrame(() => {
          perf.result = performance.now() - perf.start!
        })
      })
      observer.observe(document.body, { subtree: true, childList: true, characterData: true })
    },
    { attribute, expected, summary },
  )
}

async function measure(page: Page, button: string, expected: string, summary: string): Promise<number> {
  await arm(page, 'Intellect', expected, summary)
  await page.getByRole('button', { name: button }).click()
  await page.waitForFunction(() => window.__perf?.result !== null)
  return page.evaluate(() => window.__perf!.result!)
}

test('NFR-PERF-002: after a decision the step and the live summary update within 100 ms (desktop) and 200 ms (mobile) at p95', async ({ page }, testInfo) => {
  const profile = PROFILES[testInfo.project.name]
  test.skip(!profile, 'CPU throttling and the measured profiles exist only in Chromium')
  test.setTimeout(120_000)

  await page.goto('')
  await page.getByRole('button', { name: 'New character' }).click()
  await page.locator('label.option-card').filter({ hasText: 'Dwarf' }).click()
  await page.getByRole('button', { name: 'Choose Dwarf' }).click()
  await page.getByRole('button', { name: 'Next: Attributes' }).click()
  await expect(page.getByRole('heading', { name: 'Score adjustment' })).toBeVisible()

  if (profile.throttle) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.throttle })
  }

  // Aplicar e desfazer, alternados: as 5 primeiras medidas aquecem e são descartadas.
  const samples: number[] = []
  for (let run = 0; run < WARMUP + SAMPLES; run++) {
    let time: number
    if (run % 2 === 0) {
      // Escolher o par é estado local, fora da medida.
      await page.getByRole('radiogroup', { name: 'Raise one attribute by 1' }).getByText('Intellect', { exact: true }).click()
      await page.getByRole('radiogroup', { name: 'Lower another attribute by 1' }).getByText('Strength', { exact: true }).click()
      time = await measure(page, 'Apply adjustment', '11', profile.summary)
    } else {
      time = await measure(page, 'Undo adjustment', '10', profile.summary)
    }
    if (run >= WARMUP) samples.push(time)
  }

  // p95 pelo posto mais próximo: a 38ª de 40 amostras em ordem.
  const sorted = [...samples].sort((a, b) => a - b)
  const p95 = sorted[Math.ceil(0.95 * SAMPLES) - 1]
  const result = { profile: testInfo.project.name, cpuThrottling: profile.throttle ?? 1, limitMs: profile.limit, p95Ms: p95, samplesMs: samples }
  await testInfo.attach('NFR-PERF-002', { body: JSON.stringify(result, null, 2), contentType: 'application/json' })
  testInfo.annotations.push({ type: 'NFR-PERF-002', description: `p95 ${p95.toFixed(1)} ms (limit ${profile.limit} ms)` })
  // O p95 de cada perfil no log e, no CI, no resumo do job (o relatório HTML só sobe quando o job falha).
  const line = `NFR-PERF-002 ${result.profile} (CPU ${result.cpuThrottling}×): p95 ${p95.toFixed(1)} ms, limit ${profile.limit} ms, ${SAMPLES} samples`
  console.log(line)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- ${line} (attempt ${testInfo.retry + 1})\n`)
  expect(p95).toBeLessThanOrEqual(profile.limit)
})

// NFR-PERF-003 (FEAT-011 technical-design §5): do clique que pede a troca de Dwarf completo para Human até o diálogo
// de impacto visível. Mesmos perfis do caso acima; a NFR-PERF-003 não distingue aparelho, então o limite é o mesmo.
const DIALOG_PROFILES: Record<string, { limit: number; throttle?: number }> = {
  chromium: { limit: 300 },
  'mobile-chrome': { limit: 300, throttle: 4 },
}
const DIALOG_TITLE = 'Switch from Dwarf to Human?'

/**
 * Arma a medida: o início é o `timeStamp` do próximo clique (ouvinte em captura no `document`); o fim é o primeiro
 * quadro depois que o diálogo aparece com o título da troca.
 */
function armDialog(page: Page, title: string) {
  return page.evaluate((title) => {
    const perf = { start: null as number | null, result: null as number | null }
    window.__perf = perf
    const onClick = (event: MouseEvent) => {
      perf.start = event.timeStamp
      document.removeEventListener('click', onClick, true)
    }
    document.addEventListener('click', onClick, true)
    const observer = new MutationObserver(() => {
      if (perf.start === null || document.querySelector('[role="dialog"] h2')?.textContent?.trim() !== title) return
      observer.disconnect()
      requestAnimationFrame(() => {
        perf.result = performance.now() - perf.start!
      })
    })
    observer.observe(document.body, { subtree: true, childList: true, characterData: true })
  }, title)
}

test('NFR-PERF-003: switching a complete Dwarf to Human shows the impact dialog within 300 ms at p95 (desktop and mobile)', async ({ page }, testInfo) => {
  const profile = DIALOG_PROFILES[testInfo.project.name]
  test.skip(!profile, 'CPU throttling and the measured profiles exist only in Chromium')
  test.setTimeout(120_000)

  // Dwarf completo: o ajuste e as seis tabelas (Hatred e Background escolhidos, as outras quatro roladas).
  await page.goto('')
  await page.getByRole('button', { name: 'New character' }).click()
  await page.locator('label.option-card').filter({ hasText: 'Dwarf' }).click()
  await page.getByRole('button', { name: 'Choose Dwarf' }).click()
  await page.getByRole('button', { name: 'Next: Attributes' }).click()
  await page.getByRole('radiogroup', { name: 'Raise one attribute by 1' }).getByText('Intellect', { exact: true }).click()
  await page.getByRole('radiogroup', { name: 'Lower another attribute by 1' }).getByText('Strength', { exact: true }).click()
  await page.getByRole('button', { name: 'Apply adjustment' }).click()
  await expect(page.getByText('Applied: Intellect +1, Strength −1.')).toBeVisible()
  await page.getByRole('button', { name: 'Next: Story' }).click()
  const card = (name: string) => page.getByRole('region', { name })
  const grid = (name: string) => card(name).getByRole('radiogroup', { name: `${name} Choose a result.` })
  await grid('Dwarf Hatred').getByText('Troglodytes', { exact: true }).click()
  await card('Dwarf Background').getByRole('radiogroup', { name: 'Dwarf Background', exact: true }).getByText('Choose', { exact: true }).click()
  await grid('Dwarf Background').getByText('1', { exact: true }).click()
  for (const name of ['Dwarf Age', 'Dwarf Build', 'Dwarf Appearance', 'Dwarf Personality']) {
    await card(name).getByRole('button', { name: 'Roll 3d6', exact: true }).click()
    await expect(card(name).locator('.roll-result__calc')).toBeVisible()
  }
  await expect(page.getByRole('main').getByText('6 of 6 decided', { exact: true })).toBeVisible()

  // A Ancestry pelo Back (sem `page.goto`, que interromperia a gravação; FEAT-007 D11), com a prévia do Human.
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page).toHaveURL(/\/attributes$/)
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: "What is your character's ancestry?" })).toBeVisible()
  await page.locator('label.option-card').filter({ hasText: 'Human' }).click()
  const choose = page.getByRole('button', { name: 'Choose Human' })
  await expect(choose).toBeVisible()

  if (profile.throttle) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.throttle })
  }

  // Pedir e manter, alternados: o Keep fecha o diálogo e deixa a prévia aberta, fora da medida. As 5 primeiras medidas
  // aquecem e são descartadas.
  const dialog = page.getByRole('dialog')
  const samples: number[] = []
  for (let run = 0; run < WARMUP + SAMPLES; run++) {
    await armDialog(page, DIALOG_TITLE)
    await choose.click()
    await page.waitForFunction(() => window.__perf?.result !== null)
    const time = await page.evaluate(() => window.__perf!.result!)
    if (run >= WARMUP) samples.push(time)
    await dialog.getByRole('button', { name: 'Keep current ancestry', exact: true }).click()
    await expect(dialog).toHaveCount(0)
  }

  // p95 pelo posto mais próximo: a 38ª de 40 amostras em ordem.
  const sorted = [...samples].sort((a, b) => a - b)
  const p95 = sorted[Math.ceil(0.95 * SAMPLES) - 1]
  const result = { profile: testInfo.project.name, cpuThrottling: profile.throttle ?? 1, limitMs: profile.limit, p95Ms: p95, samplesMs: samples }
  await testInfo.attach('NFR-PERF-003', { body: JSON.stringify(result, null, 2), contentType: 'application/json' })
  testInfo.annotations.push({ type: 'NFR-PERF-003', description: `p95 ${p95.toFixed(1)} ms (limit ${profile.limit} ms)` })
  // O p95 de cada perfil no log e, no CI, no resumo do job (o relatório HTML só sobe quando o job falha).
  const line = `NFR-PERF-003 ${result.profile} (CPU ${result.cpuThrottling}×): p95 ${p95.toFixed(1)} ms, limit ${profile.limit} ms, ${SAMPLES} samples`
  console.log(line)
  console.log(`NFR-PERF-003 ${result.profile} samples (ms): ${samples.map((sample) => sample.toFixed(1)).join(', ')}`)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- ${line} (attempt ${testInfo.retry + 1})\n`)
  expect(p95).toBeLessThanOrEqual(profile.limit)
})
