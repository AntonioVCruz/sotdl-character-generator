import { lazy, Suspense } from 'react'
import { AppHeader } from './AppHeader'
import { ErrorBoundary } from './ErrorBoundary'
import { useRoute } from './router'
import { About } from './screens/About'
import { Home } from './screens/Home'

// NFR-PERF-001: a Home não carrega o construtor; ele vem sob demanda.
const Builder = lazy(() => import('./screens/Builder'))

export function App() {
  const route = useRoute()
  // O construtor monta a própria moldura: header, nav, main e aside irmãos (design.md §5).
  if (route.name === 'builder') {
    return (
      <ErrorBoundary key={route.id}>
        <Suspense fallback={<p className="typography-body" aria-busy="true">Loading…</p>}>
          <Builder route={route} />
        </Suspense>
      </ErrorBoundary>
    )
  }
  return (
    <>
      <AppHeader />
      <main className="app-main">
        <ErrorBoundary key={route.name}>
          {route.name === 'home' && <Home />}
          {route.name === 'about' && <About />}
        </ErrorBoundary>
      </main>
    </>
  )
}
