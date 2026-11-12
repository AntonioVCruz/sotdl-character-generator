// Configuração comum do Lighthouse CI. Relatórios ficam em .lighthouseci/, sem envio para fora.
const base = process.env.BASE_PATH || '/'
const port = Number(process.env.LHCI_PORT || 4174)

module.exports = ({ preset, maxLcp }) => ({
  ci: {
    collect: {
      startServerCommand: `npm run preview -- --port ${port} --strictPort`,
      startServerReadyPattern: 'Local',
      url: [`http://localhost:${port}${base}`],
      numberOfRuns: 3,
      settings: { ...(preset && { preset }), chromeFlags: '--headless=new' },
    },
    assert: {
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: maxLcp, aggregationMethod: 'median' }],
      },
    },
    upload: { target: 'filesystem', outputDir: `.lighthouseci/${preset ?? 'mobile'}` },
  },
})
