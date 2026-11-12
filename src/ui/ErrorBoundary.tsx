import { Component, type ReactNode } from 'react'

// FR-HELP-005 (base): erro inesperado mostra mensagem compreensível, sem termos internos.
// Raiz e por zona; o texto definitivo e a recuperação são da FEAT-022.

interface State {
  failed: boolean
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="notice notice--danger typography-body">
        Something went wrong on this screen. Your saved characters are safe. Reload the page to try again.
      </div>
    )
  }
}
