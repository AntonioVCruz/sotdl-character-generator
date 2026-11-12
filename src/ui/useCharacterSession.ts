import { useEffect, useState, useSyncExternalStore } from 'react'
import { app } from '../app'

/** A sessão do personagem aberto, lida pelo React como store externo (ADR-006; technical-design §3.4). */
export function useCharacterSession(id: string) {
  const [session] = useState(() => app.createSession())
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot)

  useEffect(() => {
    void session.open(id)
  }, [session, id])

  return { session, snapshot }
}
