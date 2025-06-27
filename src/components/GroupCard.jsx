import { useState } from "react";
import {
  ChevronDownIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import Avatar from "./Avatar";

/**
 * GroupCard
 * -------------------------------------------------
 * Props
 *  g             – full Group document (name, avatar, patients[])
 *  appt          – the **next upcoming appointment** for that group
 *  futureCount   – total future appointments *including* `appt`
 *  isExpanded    – controlled open state  (optional)
 *  onToggleExpanded()
 *  onEdit(appt)  – edit that single appointment
 *  onDelete(appt)– open delete/confirm modal (can cascade to whole group)
 */
export default function GroupCard({
  g,
  appt,
  futureCount = 1,
  isExpanded,
  onToggleExpanded,
  onEdit,
  onDelete,
}) {
  /* allow either controlled or uncontrolled accordion */
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isExpanded !== undefined ? isExpanded : internalOpen;

  const toggle = () =>
    isExpanded !== undefined
      ? onToggleExpanded?.()
      : setInternalOpen((o) => !o);

  /* friendly date-time label */
  const nextLabel = appt
    ? new Date(appt.dateTimeStart).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div
      onClick={toggle}
      className="border rounded-xl p-3 cursor-pointer hover:bg-gray-50 transition"
    >
      {/* ── Header row ── */}
      <div className="flex items-center gap-3">
        <Avatar url={g.avatarUrl} name={g.name} className="w-10 h-10" />

        <div className="flex-1">
          <p className="font-medium">{g.name}</p>
          <p className="text-xs text-gray-500">
            Clients: {g.patients?.length ?? 0}
          </p>

          {nextLabel && (
            <p className="text-xs text-gray-500">
              Next: {nextLabel}
              {futureCount > 1 && (
                <span className="ml-1 text-primary font-semibold">
                  &nbsp;+{futureCount - 1}
                </span>
              )}
            </p>
          )}
        </div>

        <ChevronDownIcon
          className={`h-4 w-4 text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* ── Expanded content ── */}
      {open && (
        <div className="mt-3 space-y-2 pl-13">
          {nextLabel && (
            <p className="text-xs text-gray-400">
              Upcoming session:&nbsp;{nextLabel}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(appt); // pass the appointment
              }}
              className="flex-1 py-1 rounded bg-primary text-white text-sm flex items-center justify-center gap-1"
            >
              <PencilIcon className="h-4 w-4" />
              Edit Session
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(appt); // also pass the appointment
              }}
              className="flex-1 py-1 rounded border border-primary text-primary text-sm flex items-center justify-center gap-1"
            >
              <TrashIcon className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
