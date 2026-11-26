import { expect, test, type Page } from '@playwright/test'
import { createCharacter } from './flow.ts'

// DEF-016 (NFR-REL-001; ui-design da FEAT-007, Builder frame, "Saída com gravação pendente"): enquanto a decisão grava,
// fechar a aba pede a confirmação do navegador. A gravação fica retida por uma transação `readwrite` mantida noutra
// página do mesmo contexto sobre o store `characters`, sem alterar o personagem (como na revisão externa). Essa
// transação é a única espera: nada de tempo fixo.

const DATABASE = 'sotdl-generator'

/** Abre uma transação `readwrite` em `characters` e a mantém viva com leituras até `release()`. */
async function holdCharacters(other: Page) {
  await other.evaluate(
    (name) =>
      new Promise<void>((ready, fail) => {
        const open = indexedDB.open(name)
        open.onerror = () => fail(open.error)
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction('characters', 'readwrite')
          const store = tx.objectStore('characters')
          let held = true
          const spin = () => {
            if (held) store.get('hold').onsuccess = spin
          }
          ;(window as unknown as { releaseHold: () => Promise<void> }).releaseHold = () =>
            new Promise<void>((done) => {
              tx.oncomplete = () => {
                db.close()
                done()
              }
              held = false
            })
          spin()
          ready()
        }
      }),
    DATABASE,
  )
  return { release: () => other.evaluate(() => (window as unknown as { releaseHold: () => Promise<void> }).releaseHold()) }
}

/** O documento gravado: revisão, entradas do log e a ancestralidade decidida. */
function stored(page: Page, id: string) {
  return page.evaluate(
    ([name, key]) =>
      new Promise<{ revision: number; log: number; ancestry: unknown } | null>((done, fail) => {
        const open = indexedDB.open(name)
        open.onerror = () => fail(open.error)
        open.onsuccess = () => {
          const db = open.result
          const get = db.transaction('characters').objectStore('characters').get(key)
          get.onerror = () => fail(get.error)
          get.onsuccess = () => {
            db.close()
            const doc = get.result
            done(doc ? { revision: doc.revision, log: doc.log.length, ancestry: doc.decisions.ancestry?.value ?? null } : null)
          }
        }
      }),
    [DATABASE, id] as const,
  )
}

async function chooseDwarf(page: Page) {
  await page.locator('label.option-card').filter({ hasText: 'Dwarf' }).click()
  await page.getByRole('button', { name: 'Choose Dwarf' }).click()
  await expect(page.getByRole('radio', { name: 'Dwarf, your choice' })).toBeChecked()
}

/** Fecha a aba rodando o `beforeunload`: devolve o tipo do diálogo emitido, ou "closed" se a página fechou sem ele. */
async function closeAsking(page: Page, answer: 'dismiss' | 'accept') {
  page.on('dialog', (dialog) => void (answer === 'dismiss' ? dialog.dismiss() : dialog.accept()))
  const asked = page.waitForEvent('dialog').then((dialog) => dialog.type())
  const closed = page.waitForEvent('close').then(() => 'closed')
  await page.close({ runBeforeUnload: true })
  return Promise.race([asked, closed])
}

test('DEF-016 NFR-REL-001 FR-CHAR-009: with the save held by another page, closing the tab asks first, and the choice survives', async ({
  page,
  context,
}) => {
  const builder = await createCharacter(page)
  const id = builder.slice(builder.lastIndexOf('/') + 1)
  const other = await context.newPage()
  await other.goto('#/about')
  const hold = await holdCharacters(other)

  await chooseDwarf(page)
  expect(await closeAsking(page, 'dismiss')).toBe('beforeunload')
  expect(page.isClosed()).toBe(false)

  await hold.release()
  await expect.poll(() => stored(other, id)).toEqual({ revision: 2, log: 1, ancestry: 'ancestry:dwarf' })
  await page.close()

  const again = await context.newPage()
  await again.goto(`${builder}/ancestry`)
  await expect(again.getByRole('radio', { name: 'Dwarf, your choice' })).toBeChecked()
  expect(await stored(again, id)).toEqual({ revision: 2, log: 1, ancestry: 'ancestry:dwarf' })
})

test('DEF-016 NFR-REL-001: with nothing being saved, closing the tab asks nothing', async ({ page, context }) => {
  const builder = await createCharacter(page)
  const id = builder.slice(builder.lastIndexOf('/') + 1)
  await chooseDwarf(page)
  const other = await context.newPage()
  await other.goto('#/about')
  await expect.poll(() => stored(other, id)).toEqual({ revision: 2, log: 1, ancestry: 'ancestry:dwarf' })

  expect(await closeAsking(page, 'accept')).toBe('closed')
})
