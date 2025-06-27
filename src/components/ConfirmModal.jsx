import { createPortal } from "react-dom";

/**
 * ConfirmModal
 *
 * Props
 *  open        : boolean
 *  title       : string
 *  message     : string | JSX
 *  onCancel    : () => void
 *  onConfirm   : () => void   // fallback single-button API
 *  actions     : [            // optional multi-button API
 *     { label, onClick, variant: "primary" | "danger" | "danger-outline" }
 *  ]
 */
export default function ConfirmModal({
  open,
  title,
  message,
  onCancel,
  onConfirm,
  actions = null,
}) {
  if (!open) return null;

  /* ---------- button list (legacy fallback) ---------- */
  const btnList =
    Array.isArray(actions) && actions.length
      ? actions
      : [{ label: "Delete", onClick: onConfirm, variant: "danger" }];

  /* ---------- palette helper ---------- */
  const styleOf = (v) =>
    ({
      primary:
        "bg-primary text-white hover:bg-primary/90",
      danger:
        "bg-red-600 text-white hover:bg-red-700",
      "danger-outline":
        "border border-red-600 text-red-600 hover:bg-red-50",
    }[v] || "bg-primary text-white");

  /* ---------- UI ---------- */
  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* dialog */}
      <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-lg space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-primary">{title}</h2>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {message}
          </p>
        </div>

        {/* buttons: full-width, stacked */}
        <div className="flex flex-col gap-3">
          {/* Cancel on top for quick escape */}
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          {btnList.map(({ label, onClick, variant = "primary" }) => (
            <button
              key={label}
              onClick={onClick}
              className={`w-full px-4 py-2 rounded-xl font-medium ${styleOf(
                variant
              )}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
