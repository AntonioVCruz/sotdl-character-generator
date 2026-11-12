import { defineConfig, devices } from '@playwright/test'

// ADR-008: E2E em Chromium, Firefox e WebKit, mais viewport de celular, contra o build servido pelo
// `vite preview` com a CSP ativa e a base de caminho do Pages (pega URL fixa em "/").
const BASE_PATH = process.env.BASE_PATH || '/sotdl-character-generator/'
const PORT = Number(process.env.E2E_PORT || 4173)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}${BASE_PATH}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 15'] } },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}${BASE_PATH}`,
    env: { BASE_PATH },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
