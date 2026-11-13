// NFR-CAP-001 (FEAT-001 D8): puppeteerScript do Lighthouse CI para a Home com 100 personagens. O LHCI o roda uma vez por
// URL, antes das execuções, no mesmo navegador que elas usam; o IndexedDB fica (o reset padrão do Lighthouse não o
// limpa), e o cache HTTP é limpo a cada execução.
//
// Cria um personagem pela interface, semeia até 100 com a mesma função do E2E (e2e/seed-characters.js, D9), recarrega
// a Home e confere os 100 cartões. Sem eles, lança: o Lighthouse nunca mede a Home vazia (ou com menos) e dá verde.
const { readFileSync } = require('node:fs')
const { join } = require('node:path')

const TOTAL = 100
const SEED = readFileSync(join(__dirname, '..', 'e2e', 'seed-characters.js'), 'utf8')
const CARDS = 'ul[aria-label="Saved characters"] article'

module.exports = async (browser, { url }) => {
  const page = await browser.newPage()
  try {
    await page.goto(url, { waitUntil: 'networkidle0' })
    await page.locator('::-p-aria(New character[role="button"])').click()
    // O createCharacter grava antes de abrir o construtor (FEAT-001 §3.1): na etapa Ancestry, o personagem já está salvo.
    await page.waitForFunction(() => /#\/characters\/[\w-]+\/ancestry$/.test(location.hash) && document.querySelector('h1'))
    await page.goto(url, { waitUntil: 'networkidle0' })
    await page.waitForSelector(CARDS)
    const seeded = await page.evaluate(`(${SEED})(${TOTAL})`)
    await page.reload({ waitUntil: 'networkidle0' })
    await page.waitForSelector(CARDS)
    const cards = await page.$$eval(CARDS, (found) => found.length)
    if (seeded !== TOTAL || cards !== TOTAL) {
      throw new Error(`NFR-CAP-001 seed: expected ${TOTAL} characters on the Home, found ${cards} (seed reported ${seeded})`)
    }
  } finally {
    await page.close()
  }
}
