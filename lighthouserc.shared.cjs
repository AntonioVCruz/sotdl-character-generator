// Configuração comum do Lighthouse CI. Relatórios ficam em .lighthouseci/, sem envio para fora.
const base = process.env.BASE_PATH || '/'
const port = Number(process.env.LHCI_PORT || 4174)
const chromeFlags = '--headless=new'

/**
 * `capacity`: a Home com 100 personagens (NFR-CAP-001, FEAT-001 D8). Um puppeteerScript semeia antes das execuções;
 * com ele, o LHCI lança o navegador pelo puppeteer-core (que exige `chromePath`) e ignora o `chromeFlags`. Sem
 * `disableStorageReset`: o reset padrão limpa o cache HTTP e mantém o IndexedDB.
 */
module.exports = ({ preset, maxLcp, capacity = false }) => ({
  ci: {
    collect: {
      startServerCommand: `npm run preview -- --port ${port} --strictPort`,
      startServerReadyPattern: 'Local',
      url: [`http://localhost:${port}${base}`],
      numberOfRuns: 3,
      settings: { ...(preset && { preset }), chromeFlags },
      ...(capacity && {
        puppeteerScript: './lighthouse/seed.cjs',
        puppeteerLaunchOptions: { headless: true, args: [chromeFlags] },
        chromePath: require('chrome-launcher').Launcher.getInstallations()[0],
      }),
    },
    assert: {
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: maxLcp, aggregationMethod: 'median' }],
      },
    },
    upload: { target: 'filesystem', outputDir: `.lighthouseci/${capacity ? 'capacity-' : ''}${preset ?? 'mobile'}` },
  },
})
