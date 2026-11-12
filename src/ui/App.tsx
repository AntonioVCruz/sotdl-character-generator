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
  return (
    <>
      <AppHeader />
      <main className="app-main">
        <ErrorBoundary key={route.name}>
          {route.name === 'home' && <Home />}
          {route.name === 'about' && <About />}
          {route.name === 'builder' && (
            <Suspense fallback={<p className="typography-body" aria-busy="true">Loading…</p>}>
              <Builder id={route.id} />
            </Suspense>
          )}
        </ErrorBoundary>
      </main>
    </>
  )
}
