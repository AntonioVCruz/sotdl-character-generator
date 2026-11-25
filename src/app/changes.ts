import type { CharacterDocument, Decision, DecisionEntry, LogEntry, MarkEntry, UndoneEntry } from '../content'
import { candidatesOf, settle, type Rules, type Settled, type SlotView } from '../engine'

// Regras de escrita e entradas de log de uma mudança (FEAT-011 §3.2, "Regras de escrita" e "Entradas de log novas";
// ADR-004 §3, §6). Funções puras sobre o documento: não rolam, não gravam e não leem o log. Os ponteiros (`ref`) vêm do
// `logged` da decisão, nunca de busca no log (ADR-004 §6; SRS §2.5). Revisão, `updatedAt` e gravação são da sessão.

/** A entrada `decision` de uma decisão nova, sem `id` nem `at`, montada pela sessão com os nomes congelados. */
export type DecisionDraft = Omit<DecisionEntry, 'id' | 'at'>

/** A vaga depois de uma regra de escrita, e a ativa que sai dela (vai ao log como desfeita). */
export interface Written {
  document: CharacterDocument
  leaving?: Decision
}

/** `decisions[key]` e `earlier[key]` a partir dos candidatos da vaga; sem candidato, a chave sai; `earlier` vazio sai. */
function withCandidates(document: CharacterDocument, key: string, candidates: Decision[]): CharacterDocument {
  const decisions = { ...document.decisions }
  const earlier = { ...document.earlier }
  delete decisions[key]
  delete earlier[key]
  const [latest, ...older] = candidates
  if (latest !== undefined) decisions[key] = latest
  if (older.length) earlier[key] = older
  const next: CharacterDocument = { ...document, decisions }
  delete next.earlier
  return Object.keys(earlier).length ? { ...next, earlier } : next
}

/** Índice da ativa na vaga da visão atual; `undefined` na vaga aberta. */
const activeIndex = (slot: SlotView) => (slot.decided ? slot.candidate : undefined)

/**
 * Uma decisão nova na vaga (tabela "Regras de escrita", linhas 1 a 4): vaga aberta sem candidatos; vaga reaberta (a
 * que estava em `decisions[k]` passa à frente de `earlier[k]`, com a marca, sem log); substituição com a ativa no
 * índice 0 (`earlier` igual) ou em `earlier` (a de `decisions[k]` à frente, sai a ativa).
 */
export function place(document: CharacterDocument, slot: SlotView, decision: Decision): Written {
  const candidates = candidatesOf(document, slot.key)
  const active = activeIndex(slot)
  if (active === undefined) return { document: withCandidates(document, slot.key, [decision, ...candidates]) }
  const rest = candidates.filter((_, index) => index !== active)
  return { document: withCandidates(document, slot.key, [decision, ...rest]), leaving: candidates[active] }
}

/** `clear` (linha 5): sai só a ativa; o candidato mais recente que sobra ocupa `decisions[k]`, ou a chave sai. */
export function remove(document: CharacterDocument, slot: SlotView): Written {
  const active = activeIndex(slot)
  if (active === undefined) throw new Error(`clear of ${slot.key}, which has no active decision`)
  const candidates = candidatesOf(document, slot.key)
  return { document: withCandidates(document, slot.key, candidates.filter((_, index) => index !== active)), leaving: candidates[active] }
}

const refOf = (decision: Decision) => (decision.logged === undefined ? {} : { ref: decision.logged })

/** A entrada `undone` da ativa que sai (FR-LOG-007, FR-DEC-015, FR-CHG-010), com `ref` e, na substituição, `by`. */
export function undoneEntry(
  id: number,
  at: string,
  slot: string,
  decision: Decision,
  reason: UndoneEntry['reason'],
  by?: number,
): UndoneEntry {
  return { id, at, kind: 'undone', slot, ...refOf(decision), reason, ...(by !== undefined && { by }) }
}

/**
 * Uma entrada `set-aside` por suspensa e uma `restored` por restaurada, nessa ordem, com ids a partir de `firstId`
 * (FR-CHG-011; FR-CONT-016 com `cause: { content: true }`).
 */
export function markEntries(
  transitions: Pick<Settled, 'setAside' | 'restored'>,
  cause: MarkEntry['cause'],
  at: string,
  firstId: number,
): MarkEntry[] {
  const marks = [
    ...transitions.setAside.map((item) => ({ kind: 'set-aside' as const, item })),
    ...transitions.restored.map((item) => ({ kind: 'restored' as const, item })),
  ]
  return marks.map(({ kind, item }, index) => ({ id: firstId + index, at, kind, slot: item.key, ...refOf(item.decision), cause }))
}

/** O id seguinte do log (FEAT-009 §3.3: em sequência no documento). */
export const nextLogId = (document: CharacterDocument) => document.log.reduce((last, entry) => Math.max(last, entry.id), 0) + 1

/**
 * Keep de uma rerrolagem (FR-CHG-010; D5; emenda M1): o valor recusado vai ao log como uma `decision`, com o `rolls` do
 * contador, e uma `undone` `declined` com `ref` nela; na vaga `table`, a ativa passa a ter esse `rolls`. Valor, ficha e
 * cálculo não mudam, e nada vai para `decisions` nem `earlier` além do contador.
 */
export function decline(
  document: CharacterDocument,
  slot: SlotView,
  refused: Decision,
  draft: DecisionDraft,
  at: string,
): { document: CharacterDocument; entries: LogEntry[] } {
  const id = nextLogId(document)
  // A entrada `decision` é a da rolagem pendente, com id e hora desta escrita.
  const entries: LogEntry[] = [{ ...draft, id, at }, undoneEntry(id + 1, at, slot.key, { ...refused, logged: id }, 'declined')]
  const active = activeIndex(slot)
  const candidates = candidatesOf(document, slot.key)
  const counted =
    slot.kind === 'table' && active !== undefined && refused.rolls !== undefined
      ? withCandidates(document, slot.key, candidates.map((decision, index) => (index === active ? { ...decision, rolls: refused.rolls } : decision)))
      : document
  return { document: { ...counted, log: [...document.log, ...entries] }, entries }
}

/** Uma decisão nova e a entrada dela, ou o `clear` da vaga. */
export type ChangeRequest = { decision: Decision; draft: DecisionDraft } | { clear: true }

export interface Change {
  /** O candidato, assentado (marcas de `settle`) e com as entradas novas no log. */
  document: CharacterDocument
  /** As entradas novas, na ordem do §3.2. */
  entries: LogEntry[]
  /** As transições de `settle` no candidato, que no `commit` são as listas do `impact` (§3.1). */
  settled: Settled
}

/**
 * O documento candidato de uma mudança (§3.2, pipeline, passos 2 e 3): a regra de escrita, `logged` na decisão nova, e
 * as entradas nesta ordem: a `decision` da nova; a `undone` da ativa que sai (`replaced` com `by`, ou `cleared`); uma
 * `set-aside` por suspensa e uma `restored` por restaurada, com `cause` = a entrada da mudança (a nova, ou a desfeita
 * no `clear`). O documento sai com as marcas de `settle`.
 */
export function change(rules: Rules, document: CharacterDocument, slot: SlotView, request: ChangeRequest, at: string): Change {
  let id = nextLogId(document)
  const entries: LogEntry[] = []
  let written: Written
  // A entrada da mudança: a `decision` da nova, ou, no `clear`, a `undone` da ativa.
  const changeEntry = id
  if ('clear' in request) {
    written = remove(document, slot)
    entries.push(undoneEntry(id++, at, slot.key, written.leaving!, 'cleared'))
  } else {
    entries.push({ id: id++, at, ...request.draft })
    written = place(document, slot, { ...request.decision, logged: changeEntry })
    if (written.leaving) entries.push(undoneEntry(id++, at, slot.key, written.leaving, 'replaced', changeEntry))
  }
  const settled = settle(rules, written.document)
  entries.push(...markEntries(settled, { entry: changeEntry }, at, id))
  return { document: { ...settled.document, log: [...document.log, ...entries] }, entries, settled }
}

/** Uma vaga do Roll all undecided: a vaga aberta da visão atual, a decisão rolada e a entrada dela. */
export interface RolledSlot {
  slot: SlotView
  decision: Decision
  draft: DecisionDraft
}

/**
 * O documento candidato do Roll all undecided (FEAT-010 §3.2, passos 2 e 3; D8, D12): uma decisão por vaga, na ordem,
 * pela regra "vaga aberta" (sem candidatos, ou reaberta: a de `decisions[k]` passa à frente de `earlier[k]`, sem log),
 * cada uma com o `logged` da sua entrada `decision`, e as entradas nessa ordem. Nenhuma ativa sai, então não há `undone`.
 * Depois, as de `settle`: cada marca leva `cause.entry` = a entrada da vaga rolada que é ancestral da vaga marcada.
 */
export function rollAllChange(rules: Rules, document: CharacterDocument, rolled: RolledSlot[], at: string): Change {
  let id = nextLogId(document)
  const entries: LogEntry[] = []
  const entryOf = new Map<string, number>()
  let written = document
  for (const { slot, decision, draft } of rolled) {
    const entry = id++
    entries.push({ id: entry, at, ...draft })
    entryOf.set(slot.key, entry)
    written = place(written, slot, { ...decision, logged: entry }).document
  }
  // A vaga rolada mais funda cuja chave é prefixo da marcada (D12); toda restaurada do Roll all descende de uma.
  const causeOf = (key: string) => {
    const ancestors = rolled.map(({ slot }) => slot.key).filter((rolledKey) => key.startsWith(`${rolledKey}=`))
    const nearest = ancestors.sort((a, b) => b.length - a.length)[0] ?? rolled[0].slot.key
    return { entry: entryOf.get(nearest)! }
  }
  const settled = settle(rules, written)
  entries.push(...markEntries(settled, { entry: entryOf.get(rolled[0].slot.key)! }, at, id).map((mark) => ({ ...mark, cause: causeOf(mark.slot) })))
  return { document: { ...settled.document, log: [...document.log, ...entries] }, entries, settled }
}
