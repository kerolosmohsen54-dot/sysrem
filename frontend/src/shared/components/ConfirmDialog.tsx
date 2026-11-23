import { ar } from '../i18n/ar';
import { Modal } from './Modal';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog(props: ConfirmDialogProps) {
  return (
    <Modal open={props.open} title={props.title} onClose={props.onCancel}>
      <p>{props.message}</p>
      <div className="modal-actions">
        <button className="button button-secondary" type="button" onClick={props.onCancel}>
          {ar.common.cancel}
        </button>
        <button className="button button-primary" type="button" onClick={props.onConfirm}>
          {ar.common.confirm}
        </button>
      </div>
    </Modal>
  );
}
