import { useEffect, useState } from 'react'
import { Button } from 'react-aria-components'
import { app, type CharacterSummary } from '../../app'
import { href, navigate } from '../router'

// SCR-WEB-001, casca do esqueleto técnico: criar e listar pelos metadados.
// Cartões, estados, ordenação, exclusão e aviso "só neste navegador" são da FEAT-001.

// Rascunho do technical-design §3.5 (texto final da T5, ui-design Textos), até a tela da T5.
const LIST_FAILURE =
  "This browser didn't let the generator read your saved characters. Nothing was changed. Reload the page to try again. If it keeps happening, check that this site is allowed to store data."

const FAILURE: Record<'pack-load-failed' | 'save-failed', string> = {
  'pack-load-failed': 'The rules could not be loaded, so no character was created. Check your connection and try again.',
  'save-failed': 'Your browser did not save the new character, so it was not created. Try again.',
}

export function Home() {
  const [characters, setCharacters] = useState<CharacterSummary[] | null>(null)
  const [listFailed, setListFailed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    void app.listCharacters().then((result) => {
      if (result.ok) setCharacters(result.characters)
      else setListFailed(true)
    })
  }, [])

  async function create() {
    setCreating(true)
    setError(null)
    const result = await app.createCharacter()
    setCreating(false)
    // FR-CHAR-010: sem gravação, avisa e fica na Home.
    if (!result.ok) return setError(FAILURE[result.reason])
    navigate(href.builder(result.id))
  }

  return (
    <section className="page" aria-labelledby="home-title">
      <h1 id="home-title" className="typography-display">
        My characters
      </h1>
      <Button className="button-primary typography-label" onPress={create} isPending={creating}>
        New character
      </Button>
      {error && (
        <p role="alert" className="notice notice--danger typography-body">
          {error}
        </p>
      )}
      {/* FEAT-007 §8: a falha da lista é um aviso, nunca a lista vazia. */}
      {listFailed && (
        <p role="alert" className="notice notice--danger typography-body">
          {LIST_FAILURE}
        </p>
      )}
      {characters && characters.length > 0 && (
        <ul className="character-list" aria-label="Saved characters">
          {characters.map((character) => (
            <li key={character.id} className="character-list__item">
              <a className="typography-title-sm" href={href.builder(character.id)}>
                {character.name || 'Unnamed character'}
              </a>
              <span className="typography-meta"> · Level 0</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
