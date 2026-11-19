import { useRef, type RefObject } from 'react'
import { Button } from 'react-aria-components'
import type { CharacterSession, OpenNotice as Notice, Snapshot } from '../../app'
import { DecisionLine } from './DecisionLine'
import { earlierDecisions, IMPACT_TEXT, NOTICE_TEXT, partsOf, partsOfLogged, type LineParts } from './copy'
import { InlineAlert } from '../parts'

type Ready = Extract<Snapshot, { status: 'ready' }>
type Item = Notice['setAside'][number] | Notice['restored'][number]

/**
 * Aviso da abertura com diferença (FR-CONT-016; ui-design da FEAT-011, open-notice): estático, no topo do `main`, com
 * as suspensas e as restauradas, até "Dismiss". Sai pelo snapshot (`dismissNotice`).
 */
export function OpenNotice({ session, snapshot, titleRef, nameOf }: {
  session: CharacterSession
  snapshot: Ready
  /** O `h1` da etapa: destino do foco quando "Dismiss" tira o aviso com o foco nele (regra do save-failed). */
  titleRef: RefObject<HTMLHeadingElement | null>
  nameOf: (id: string) => string
}) {
  const dismiss = useRef<HTMLButtonElement>(null)
  const { notice } = snapshot
  if (!notice) return null
  // Reabre uma vaga que a regra ainda exige: item com vaga gerada e sem decisão ativa.
  const reopens = notice.setAside.some((item) => item.slot !== undefined && !item.slot.decided)

  return (
    <InlineAlert tone="warning" live={false}>
      <div className="open-notice">
        <p className="typography-label">{NOTICE_TEXT.title}</p>
        {notice.setAside.length > 0 && (
          <>
            <p id="open-notice-set-aside" className="typography-body">
              {NOTICE_TEXT.setAside}
            </p>
            <NoticeList labelledBy="open-notice-set-aside" items={notice.setAside} snapshot={snapshot} nameOf={nameOf} />
            {reopens && <p className="typography-body">{NOTICE_TEXT.reopened}</p>}
            <p className="typography-meta">{IMPACT_TEXT.d40}</p>
          </>
        )}
        {notice.restored.length > 0 && (
          <>
            <p id="open-notice-restored" className="typography-body">
              {NOTICE_TEXT.restored}
            </p>
            <NoticeList labelledBy="open-notice-restored" items={notice.restored} snapshot={snapshot} nameOf={nameOf} />
          </>
        )}
        <Button
          ref={dismiss}
          className="button-secondary typography-label"
          onPress={() => {
            const inside = dismiss.current === document.activeElement
            session.dismissNotice()
            if (inside) titleRef.current?.focus()
          }}
        >
          {NOTICE_TEXT.dismiss}
        </Button>
      </div>
    </InlineAlert>
  )
}

/**
 * As linhas de decisão do aviso. Sem vaga (vaga não gerada), os nomes da entrada original, pelo `logged`; sem ela
 * (decisão gravada antes da FEAT-011), uma linha só, "{n} earlier {decision|decisions}".
 */
function NoticeList({ labelledBy, items, snapshot, nameOf }: {
  labelledBy: string
  items: Item[]
  snapshot: Ready
  nameOf: (id: string) => string
}) {
  const lines: { key: string; parts: LineParts }[] = []
  let earlier = 0
  for (const item of items) {
    const parts = item.slot ? partsOf(item.slot, item.decision, nameOf) : partsOfLogged(snapshot.document.log, item.decision.logged)
    if (parts) lines.push({ key: `${item.key}/${item.index}`, parts })
    else earlier += 1
  }
  return (
    <ul className="open-notice__list" aria-labelledby={labelledBy}>
      {lines.map((line) => (
        <li key={line.key}>
          <DecisionLine parts={line.parts} />
        </li>
      ))}
      {earlier > 0 && <li className="typography-body">{earlierDecisions(earlier)}</li>}
    </ul>
  )
}
