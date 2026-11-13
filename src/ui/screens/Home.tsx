import { useEffect, useRef, useState } from 'react'
import { Button } from 'react-aria-components'
import { app, type CharacterSummary } from '../../app'
import { displayName, STORAGE_UNAVAILABLE } from '../copy'
import { CharacterCard } from '../home/CharacterCard'
import { cardIds, deleted, HOME_TEXT } from '../home/copy'
import { DeleteDialog } from '../home/DeleteDialog'
import { InlineAlert } from '../parts'
import { hasNavigatedInApp, href, navigate } from '../router'
import '../styles/home.css'

// SCR-WEB-001 (ui-design da FEAT-001): estados loading, error, empty e populated, cartões, menu e exclusão. A Home não
// importa nada de `src/ui/builder/`, para não puxar o construtor para o chunk inicial (NFR-PERF-001).

const FAILURE: Record<'pack-load-failed' | 'save-failed', string> = {
  'pack-load-failed': 'The rules could not be loaded, so no character was created. Check your connection and try again.',
  'save-failed': 'Your browser did not save the new character, so it was not created. Try again.',
}

type List = { state: 'loading' } | { state: 'error' } | { state: 'ready'; characters: CharacterSummary[] }

const EMPTY_TITLE = 'home-empty-title'

export function Home() {
  const [list, setList] = useState<List>({ state: 'loading' })
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [target, setTarget] = useState<CharacterSummary | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteFailed, setDeleteFailed] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  /** Id do elemento que recebe o foco depois de fechar o diálogo (ui-design, Foco na Home). */
  const [focusTo, setFocusTo] = useState<string | null>(null)
  const title = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    void app.listCharacters().then((result) => setList(result.ok ? { state: 'ready', characters: result.characters } : { state: 'error' }))
  }, [])

  // NFR-ACC-001: chegar à Home por navegação dentro do app põe o foco no `h1`; no carregamento da página, nada se move.
  useEffect(() => {
    if (hasNavigatedInApp()) title.current?.focus()
  }, [])

  // Depois de fechar o diálogo: o "···" do cartão (cancelar), o título vizinho ou o do estado vazio (excluir). No
  // quadro seguinte, depois da devolução de foco do React Aria ao fechar o modal.
  useEffect(() => {
    if (!focusTo) return
    const frame = requestAnimationFrame(() => {
      document.getElementById(focusTo)?.focus()
      setFocusTo(null)
    })
    return () => cancelAnimationFrame(frame)
  }, [focusTo])

  async function create() {
    setCreating(true)
    setError(null)
    const result = await app.createCharacter()
    setCreating(false)
    // FR-CHAR-010: sem gravação, avisa e fica na Home.
    if (!result.ok) return setError(FAILURE[result.reason])
    navigate(href.builder(result.id))
  }

  function openDelete(summary: CharacterSummary) {
    setDeleteFailed(false)
    setTarget(summary)
  }

  function cancelDelete() {
    if (deleting || !target) return
    setFocusTo(cardIds(target.id).more)
    setTarget(null)
  }

  async function confirmDelete() {
    if (!target || list.state !== 'ready') return
    setDeleting(true)
    setDeleteFailed(false)
    const result = await app.deleteCharacter(target.id)
    setDeleting(false)
    // D6: a falha mantém o diálogo aberto, com o aviso; o foco fica em "Delete permanently".
    if (!result.ok) return setDeleteFailed(true)

    const index = list.characters.findIndex((character) => character.id === target.id)
    const rest = list.characters.filter((character) => character.id !== target.id)
    const neighbor = rest[index] ?? rest[index - 1]
    setList({ state: 'ready', characters: rest })
    setAnnouncement(deleted(displayName(target.name)))
    setFocusTo(neighbor ? cardIds(neighbor.id).name : EMPTY_TITLE)
    setTarget(null)
  }

  return (
    <section className="home" aria-labelledby="home-title">
      <div className="home__header">
        <h1 id="home-title" ref={title} tabIndex={-1} className="typography-display">
          {HOME_TEXT.title}
        </h1>
        <Button className="button-primary typography-label home__new" onPress={create} isPending={creating}>
          {HOME_TEXT.newCharacter}
        </Button>
      </div>
      {error && (
        <InlineAlert tone="danger">
          <p>{error}</p>
        </InlineAlert>
      )}
      {/* FR-CHAR-016: em todos os estados; texto estático, sem região viva. */}
      <InlineAlert tone="warning" live={false}>
        <p>{HOME_TEXT.browserOnly}</p>
      </InlineAlert>
      <HomeState list={list} onDelete={openDelete} />
      <DeleteDialog target={target} deleting={deleting} failed={deleteFailed} onCancel={cancelDelete} onConfirm={confirmDelete} />
      <p role="status" className="visually-hidden">
        {announcement}
      </p>
    </section>
  )
}

function HomeState({ list, onDelete }: { list: List; onDelete: (summary: CharacterSummary) => void }) {
  switch (list.state) {
    case 'loading':
      return (
        <div aria-busy="true">
          <p className="visually-hidden">{HOME_TEXT.loading}</p>
          <div className="character-grid" aria-hidden="true">
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i} className="skeleton character-card-skeleton" />
            ))}
          </div>
        </div>
      )
    // FEAT-007 §8, FR-HELP-005: a falha da lista é um aviso, nunca o estado vazio.
    case 'error':
      return (
        <InlineAlert tone="danger">
          <p>{STORAGE_UNAVAILABLE}</p>
        </InlineAlert>
      )
    case 'ready':
      if (list.characters.length === 0) {
        return (
          <div className="card home-empty">
            <h2 id={EMPTY_TITLE} tabIndex={-1} className="typography-title">
              {HOME_TEXT.emptyTitle}
            </h2>
            <p className="typography-body">{HOME_TEXT.emptyWhat}</p>
            <p className="typography-body">{HOME_TEXT.emptyBooks}</p>
            <p className="typography-body">{HOME_TEXT.emptyStart}</p>
          </div>
        )
      }
      return (
        <ul className="character-grid" aria-label={HOME_TEXT.listLabel}>
          {list.characters.map((summary) => (
            <CharacterCard key={summary.id} summary={summary} onDelete={onDelete} />
          ))}
        </ul>
      )
  }
}
