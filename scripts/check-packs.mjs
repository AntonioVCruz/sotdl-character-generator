// Validação do pacote oficial no CI (ADR-008, plano §6):
//   1. schema estrito de cada arquivo de packs/ (o mesmo do app: src/content/schemas.ts);
//   2. nenhum id presente na revisão base pode sumir, nem as chaves que formam as chaves das vagas (vagas de etapa,
//      concessões, entradas e efeitos; DEF-017), qualificadas pelo dono (ADR-004: decisões salvas dependem delas).
// Base: PACKS_BASE_REF (no CI: a base do PR ou o commit anterior do push); no local, HEAD.
// A integridade referencial é da FEAT-003.
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runnerImport } from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packsDir = resolve(root, 'packs')

/** Todos os valores de campos "id" de um arquivo, em qualquer profundidade. */
export function collectIds(node, ids = new Set()) {
  if (Array.isArray(node)) node.forEach((child) => collectIds(child, ids))
  else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === 'id' && typeof value === 'string') ids.add(value)
      else collectIds(value, ids)
    }
  }
  return ids
}

/**
 * Campos cujas chaves formam as chaves das vagas (DEF-017; ADR-004), de onde o motor as monta (src/engine/evaluate.ts):
 * `slots` de uma etapa (a chave raiz), `grants` de uma ancestralidade e de uma entrada de tabela (`childKey`), `entries`
 * de uma tabela (`childKey`, e a chave é o valor gravado da decisão) e `effects` de uma entrada (`childKey`).
 */
const KEYED = new Set(['slots', 'grants', 'entries', 'effects'])

/**
 * As chaves desses campos, qualificadas pelo dono (o objeto com `id` mais próximo) e pelo caminho nele, como
 * "table:dwarf-background entries.1.effects.corruption", cada uma com o pai: o id do dono ou a chave que a contém.
 */
export function collectKeys(node, keys = new Map(), owner = null, path = '', parent = null) {
  if (Array.isArray(node)) {
    node.forEach((child, index) => collectKeys(child, keys, owner, `${path}[${index}]`, parent))
    return keys
  }
  if (!node || typeof node !== 'object') return keys
  if (typeof node.id === 'string') {
    owner = node.id
    path = ''
    parent = node.id
  }
  for (const [field, value] of Object.entries(node)) {
    const at = path ? `${path}.${field}` : field
    if (owner && KEYED.has(field) && value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [key, child] of Object.entries(value)) {
        const qualified = `${owner} ${at}.${key}`
        keys.set(qualified, parent)
        collectKeys(child, keys, owner, `${at}.${key}`, qualified)
      }
    } else collectKeys(value, keys, owner, at, parent)
  }
  return keys
}

/**
 * Ids da base que não aparecem mais em nenhum arquivo atual e, com o dono ainda presente, chaves de vaga da base que
 * sumiram dele (ADR-004: ids de concessão e de entrada). Só a chave mais alta que sumiu é acusada, não as de dentro dela.
 */
export function removedIds(baseFiles, currentFiles) {
  const current = new Set(Object.values(currentFiles).flatMap((json) => [...collectIds(json)]))
  const currentKeys = new Set(Object.values(currentFiles).flatMap((json) => [...collectKeys(json).keys()]))
  const ids = Object.entries(baseFiles).flatMap(([file, json]) =>
    [...collectIds(json)].filter((id) => !current.has(id)).map((id) => `${id} (was in packs/${file})`),
  )
  const keys = Object.entries(baseFiles).flatMap(([file, json]) =>
    [...collectKeys(json)]
      .filter(([key, parent]) => !currentKeys.has(key) && (current.has(parent) || currentKeys.has(parent)))
      .map(([key]) => `${key} (was in packs/${file})`),
  )
  return [...ids, ...keys]
}

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

function readBase(ref) {
  try {
    git('rev-parse', '--verify', `${ref}^{commit}`)
  } catch {
    return null
  }
  const files = git('ls-tree', '--name-only', `${ref}`, 'packs/')
    .split('\n')
    .filter((path) => path.endsWith('.json'))
  return Object.fromEntries(files.map((path) => [path.slice('packs/'.length), JSON.parse(git('show', `${ref}:${path}`))]))
}

async function main() {
  const { module: content } = await runnerImport('/src/content/schemas.ts', { root, logLevel: 'silent' })
  const problems = []

  const current = {}
  for (const file of readdirSync(packsDir).filter((f) => f.endsWith('.json'))) {
    const json = JSON.parse(readFileSync(resolve(packsDir, file), 'utf8'))
    current[file] = json
    const schema = file === 'index.json' ? content.bookIndexSchema : content.bookSchema
    const parsed = schema.safeParse(json)
    if (!parsed.success) problems.push(`packs/${file}\n${formatIssues(parsed.error)}`)
    else if (file !== 'index.json' && `${json.id}.json` !== file) problems.push(`packs/${file}: id "${json.id}" does not match the file name`)
  }
  for (const book of current['index.json']?.books ?? []) {
    if (!current[`${book.id}.json`]) problems.push(`packs/index.json lists ${book.id}, but packs/${book.id}.json is missing`)
  }

  const ref = process.env.PACKS_BASE_REF || 'HEAD'
  const base = /^0+$/.test(ref) ? null : readBase(ref)
  if (base) problems.push(...removedIds(base, current).map((id) => `removed id: ${id}`))

  if (problems.length) {
    console.error(`packs: ${problems.length} problem(s)\n\n${problems.join('\n\n')}`)
    process.exit(1)
  }
  console.log(`packs: ${Object.keys(current).length} file(s) valid; ${base ? `no ids or slot keys removed since ${ref}` : `no base at ${ref}, removed-id check skipped`}`)
}

function formatIssues(error) {
  return error.issues.map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`).join('\n')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}
