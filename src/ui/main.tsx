import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/spectral/600.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/ibm-plex-mono/500.css'
import './styles/tokens.generated.css'
import './styles/base.css'
import './styles/print.css'
import { App } from './App'
import { ErrorBoundary } from './ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
