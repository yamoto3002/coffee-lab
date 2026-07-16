'use client';

import Modal from './Modal';

export default function ConfirmDialog({ open, title, description, consequence, confirmLabel = '削除する', onConfirm, onClose }: { open: boolean; title: string; description: string; consequence: string; confirmLabel?: string; onConfirm: () => void; onClose: () => void }) {
  return <Modal isOpen={open} onClose={onClose} title={title}>
    <p className="text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
    <p className="mt-3 rounded-[10px] border border-[color-mix(in_oklab,var(--status-error)_35%,var(--border-subtle))] bg-[color-mix(in_oklab,var(--status-error)_10%,transparent)] p-3 text-sm text-[var(--status-error)]">{consequence}</p>
    <div className="mt-5 flex justify-end gap-3">
      <button type="button" onClick={onClose} className="btn-secondary">キャンセル</button>
      <button type="button" onClick={onConfirm} className="btn-danger">{confirmLabel}</button>
    </div>
  </Modal>;
}
