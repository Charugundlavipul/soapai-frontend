/* client/src/modals/EditGroupAppointmentModal.jsx */
"use client";

import { useEffect, useState } from "react";
import Modal            from "../components/Modal";
import CustomDatePicker from "../components/CustomDatePicker";
import CustomTimePicker from "../components/CustomTimePicker";
import Avatar           from "../components/Avatar";
import { Users }        from "lucide-react";
import api              from "../services/api";
import SavingToast      from "../components/savingToast";

/**
 * Props
 * ─────────────────────────────────────────────
 * open       : boolean
 * appt       : { _id, group:{_id,name}, dateTimeStart, dateTimeEnd }
 * onClose    : () => void
 * onUpdated  : (updatedAppointment) => void
 */
export default function EditGroupAppointmentModal({
  open,
  onClose,
  appt,
  onUpdated,
}) {
  /* ─── local state ─── */
  const [group , setGroup ] = useState(null);   // full group doc
  const [date  , setDate  ] = useState("");     // YYYY-MM-DD
  const [start , setStart ] = useState("");     // HH:MM
  const [end   , setEnd   ] = useState("");     // HH:MM
  const [busy  , setBusy  ] = useState(false);

  /* which picker is open?  'date' | 'startTime' | 'endTime' | null */
  const [openPopup, setOpenPopup] = useState(null);

  /* toast */
  const [showToast, setShowToast] = useState(false);
  const [toastMsg , setToastMsg ] = useState("");
  const [toastTyp , setToastTyp ] = useState("success");

  /* ─── load appointment info on open ─── */
  useEffect(() => {
    if (!open || !appt) return;

    (async () => {
      const { data } = await api.get(`/groups/${appt.group._id}`);
      setGroup(data);

      const s   = new Date(appt.dateTimeStart);
      const e   = new Date(appt.dateTimeEnd);
      const pad = (n) => String(n).padStart(2, "0");

      setDate (`${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`);
      setStart(`${pad(s.getHours())}:${pad(s.getMinutes())}`);
      setEnd  (`${pad(e.getHours())}:${pad(e.getMinutes())}`);
      setOpenPopup(null);
    })();
  }, [open, appt]);

  /* ─── helpers ─── */
  const toast = (msg, type = "success") => {
    setToastMsg(msg);
    setToastTyp(type);
    setShowToast(true);
  };

  const isValid = () => {
    if (!date || !start || !end) return false;

    const now   = new Date();
    const d1    = new Date(`${date} ${start}`);
    const d2    = new Date(`${date} ${end}`);
    const mins  = (d2 - d1) / 60000;

    if (d1 <= now)            return toast("Cannot schedule in the past", "error"), false;
    if (d1 >= d2)             return toast("Start must be before end", "error"),   false;
    if (mins < 15)            return toast("Session < 15 minutes", "error"),      false;
    if (mins > 480)           return toast("Session > 8 hours",   "error"),      false;
    return true;
  };

  /* ─── save ─── */
  const save = async (e) => {
    e.preventDefault();
    if (!isValid()) return;

    setBusy(true);
    try {
      const body = {
        type          : "group",
        group         : group._id,
        dateTimeStart : new Date(`${date} ${start}`).toISOString(),
        dateTimeEnd   : new Date(`${date} ${end}`).toISOString(),
      };
      const { data: updated } = await api.patch(`/appointments/${appt._id}`, body);
      toast("Appointment updated!");
      onUpdated?.(updated);
      setTimeout(onClose, 300);
    } catch (err) {
      console.error(err);
      toast(err.response?.data?.message || "Update failed", "error");
    } finally {
      setBusy(false);
    }
  };

  /* ─── UI ─── */
  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Edit Group Appointment"
        className="overflow-visible max-h-[85vh] w-full max-w-md"
      >
        {!group ? (
          <div className="p-6 text-center text-gray-500">Loading…</div>
        ) : (
          <form onSubmit={save} className="space-y-6">
            {/* summary */}
            <div className="flex items-center gap-3">
              <Avatar url={group.avatarUrl} name={group.name} className="w-10 h-10" />
              <div className="flex-1">
                <p className="font-semibold">{group.name}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {group.patients.length} members
                </p>
              </div>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                Group
              </span>
            </div>

            {/* goals (read-only) */}
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">Group Goals</p>
              <div className="flex flex-wrap gap-1">
                {group.goals.length ? (
                  group.goals.map((g) => (
                    <span
                      key={g}
                      className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[11px]"
                    >
                      {g}
                    </span>
                  ))
                ) : (
                  <span className="italic text-gray-400 text-xs">None</span>
                )}
              </div>
            </div>

            {/* date */}
            <CustomDatePicker
              label="Date"
              value={date}
              onChange={setDate}
              isOpen={openPopup === "date"}
              onToggle={(isOpen) => setOpenPopup(isOpen ? "date" : null)}
            />

            {/* times */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-700">Time</p>
              <div className="flex gap-2">
                <CustomTimePicker
                  value={start}
                  onChange={setStart}
                  placeholder="Start"
                  isOpen={openPopup === "startTime"}
                  onToggle={(isOpen) => setOpenPopup(isOpen ? "startTime" : null)}
                />
                <CustomTimePicker
                  value={end}
                  onChange={setEnd}
                  placeholder="End"
                  isOpen={openPopup === "endTime"}
                  onToggle={(isOpen) => setOpenPopup(isOpen ? "endTime" : null)}
                />
              </div>
            </div>

            {/* actions */}
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-primary text-primary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-6 py-2 rounded-xl bg-primary text-white disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <SavingToast
        show={showToast}
        message={toastMsg}
        type={toastTyp}
        onClose={() => setShowToast(false)}
      />
    </>
  );
}
