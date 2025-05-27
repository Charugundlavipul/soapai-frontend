import { createPortal } from 'react-dom';

export default function ConfirmModal({ open, title, message, onCancel, onConfirm }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div onClick={onCancel} className="absolute inset-0 bg-black/30" />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
        <h2 className="text-xl font-semibold text-primary">{title}</h2>
        <p className="text-sm">{message}</p>
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-primary text-primary"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 rounded-xl bg-primary text-white"
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
