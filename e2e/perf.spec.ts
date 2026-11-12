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
  expect(p95).toBeLessThanOrEqual(profile.limit)
})
