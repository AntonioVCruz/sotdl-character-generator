import { LoaderCircle } from 'lucide-react'
import { Button, Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import type { CharacterSummary } from '../../app'
import { displayName } from '../copy'
import { InlineAlert } from '../parts'
import { contextLine, deleteConsequence, deleteFailed, deleteTitle, formatEdited, HOME_TEXT } from './copy'

/**
 * Diálogo de exclusão (FR-CHAR-013, 014; ui-design, delete-confirm e delete-failed). Foco inicial em "Cancel"; o
 * backdrop não fecha; Esc e "Cancel" fecham sem excluir, salvo enquanto exclui. Na falha, o diálogo fica aberto (D6).
 */
export function DeleteDialog({ target, deleting, failed, onCancel, onConfirm }: {
  target: CharacterSummary | null
  deleting: boolean
  failed: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <ModalOverlay
      className="dialog-overlay"
      isOpen={target !== null}
      isDismissable={false}
      isKeyboardDismissDisabled={deleting}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
    >
      <Modal className="dialog delete-dialog">
        {target && <DeleteDialogContent target={target} deleting={deleting} failed={failed} onCancel={onCancel} onConfirm={onConfirm} />}
      </Modal>
    </ModalOverlay>
  )
}

function DeleteDialogContent({ target, deleting, failed, onCancel, onConfirm }: {
  target: CharacterSummary
  deleting: boolean
  failed: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const name = displayName(target.name)
  const edited = formatEdited(target.updatedAt)
  const identification = [contextLine(target.ancestry), edited && `Edited ${edited}`].filter(Boolean).join(' · ')
  return (
    <Dialog role="alertdialog" className="dialog__content">
      <Heading slot="title" className="typography-heading delete-dialog__title">
        {deleteTitle(name)}
      </Heading>
      <p className="typography-meta delete-dialog__identification">{identification}</p>
      <p className="typography-body">{deleteConsequence(name)}</p>
      {failed && (
        <InlineAlert tone="danger">
          <p>{deleteFailed(name)}</p>
        </InlineAlert>
      )}
      <div className="dialog__actions delete-dialog__actions">
        <Button className="button-secondary typography-label" autoFocus isDisabled={deleting} onPress={onCancel}>
          {HOME_TEXT.cancel}
        </Button>
        <Button className="button-danger typography-label" isPending={deleting} aria-busy={deleting || undefined} onPress={onConfirm}>
          {deleting && <LoaderCircle className="icon icon--sm spinner" aria-hidden="true" />}
          {HOME_TEXT.deletePermanently}
        </Button>
      </div>
    </Dialog>
  )
}
