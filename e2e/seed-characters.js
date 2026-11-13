// FEAT-001 D9 (NFR-CAP-001): a semente de personagens, uma fonte só para o E2E (`e2e/capacity.spec.ts`) e para o
// Lighthouse (`lighthouse/seed.cjs`). Função de navegador em JavaScript puro, sem dependência e fora do bundle: é lida
// como texto e avaliada na página, `(${source})(total)`.
//
// Parte de um personagem criado pela interface ("New character"): lê o documento e o metadado dele do IndexedDB e
// grava, numa transação, clones com `id` novo, nome "Seed NNN" (no `text.name` e no metadado) e `updatedAt` distinto,
// igual no documento e no metadado, até `total` personagens. Devolve quantos personagens o banco tem no fim.
async function seedCharacters(total) {
  const request = (r) =>
    new Promise((resolve, reject) => {
      r.onsuccess = () => resolve(r.result)
      r.onerror = () => reject(r.error)
    })

  const open = indexedDB.open('sotdl-generator', 1)
  open.onupgradeneeded = () => open.transaction.abort() // sem banco, não há personagem de partida
  const db = await request(open)
  try {
    const read = db.transaction(['characters', 'characterMeta'], 'readonly')
    const documents = await request(read.objectStore('characters').getAll())
    const metas = await request(read.objectStore('characterMeta').getAll())
    const source = documents[0]
    const sourceMeta = source && metas.find((meta) => meta.id === source.id)
    if (!source || !sourceMeta) throw new Error('seed: create a character through the interface first')

    const clones = Math.max(0, total - documents.length)
    const base = Date.parse(source.updatedAt)
    const write = db.transaction(['characters', 'characterMeta'], 'readwrite')
    for (let i = 1; i <= clones; i++) {
      const id = crypto.randomUUID()
      const name = `Seed ${String(i).padStart(3, '0')}`
      // Um minuto mais antigo a cada clone: o personagem criado fica no topo, e os clones em ordem (FR-CHAR-004).
      const updatedAt = new Date(base - i * 60_000).toISOString()
      write.objectStore('characters').put({ ...structuredClone(source), id, text: { ...source.text, name }, updatedAt })
      write.objectStore('characterMeta').put({ ...structuredClone(sourceMeta), id, name, updatedAt })
    }
    await new Promise((resolve, reject) => {
      write.oncomplete = resolve
      write.onerror = () => reject(write.error)
      write.onabort = () => reject(write.error)
    })
    return await request(db.transaction('characterMeta', 'readonly').objectStore('characterMeta').count())
  } finally {
    db.close()
  }
}
