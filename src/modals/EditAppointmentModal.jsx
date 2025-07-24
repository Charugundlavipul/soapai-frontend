/* client/src/modals/EditAppointmentModal.jsx – DROP-IN REPLACEMENT (rev-4 – final)
   ──────────────────────────────────────────────────────────────────────────────
   Mirrors EditGroupAppointmentModal UI.
   • Only **date** and **time** are editable
   • Hooks order is stable (ESLint-safe)
   • Guarantees the parent receives a fully-populated appointment record
*/

"use client";

import { useEffect, useState } from "react";
import Modal            from "../components/Modal";
import CustomDatePicker from "../components/CustomDatePicker";
import CustomTimePicker from "../components/CustomTimePicker";
import Avatar           from "../components/Avatar";
import { User, Users }  from "lucide-react";
import api              from "../services/api";
import SavingToast      from "../components/savingToast";

export default function EditAppointmentModal({ open, onClose, appt, onUpdated, onDeleted }) {
  /* ─── hooks (always run) ─── */
  const [entity , setEntity ] = useState(null);   // patient or group doc
  const [date   , setDate  ] = useState("");
  const [start  , setStart ] = useState("");
  const [end    , setEnd   ] = useState("");
  const [busy   , setBusy  ] = useState(false);

  const [openPopup, setOpenPopup] = useState(null);   // 'date' | 'startTime' | 'endTime'
  const [toast, setToast]       = useState({ show: false, msg: "", type: "success" });

  /* ─── load data when modal opens ─── */
  useEffect(() => {
    if (!open || !appt) return;

    (async () => {
      try {
        // Fetch the full entity (group or patient) so we can reuse it later
        if (appt.type === "group") {
          const { data } = await api.get(`/groups/${appt.group._id}`);
          setEntity({ ...data, label: "Group", icon: <Users className="h-3 w-3" /> });
        } else {
          const { data } = await api.get(`/clients/${appt.patient._id}`);
          setEntity({ ...data, label: "Individual", icon: <User className="h-3 w-3" /> });
        }

        // Populate form fields from appointment
        const s   = new Date(appt.dateTimeStart);
        const e   = new Date(appt.dateTimeEnd);
        const pad = (n) => String(n).padStart(2, "0");
        setDate (`${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`);
        setStart(`${pad(s.getHours())}:${pad(s.getMinutes())}`);
        setEnd  (`${pad(e.getHours())}:${pad(e.getMinutes())}`);
      } catch (err) {
        console.error(err);
        setToast({ show: true, msg: "Failed to load appointment", type: "error" });
      }
    })();
  }, [open, appt]);

  /* ─── helpers ─── */
  const showToast = (msg, type = "success") => setToast({ show: true, msg, type });

  const isValid = () => {
    if (!date || !start || !end) return false;
    const now   = new Date();
    const d1    = new Date(`${date} ${start}`);
    const d2    = new Date(`${date} ${end}`);
    const mins  = (d2 - d1) / 60000;
    if (d1 <= now)  return showToast("Cannot schedule in the past", "error"), false;
    if (d1 >= d2)   return showToast("Start must precede end",      "error"), false;
    if (mins < 15)  return showToast("Session < 15 minutes",        "error"), false;
    if (mins > 480) return showToast("Session > 8 hours",           "error"), false;
    return true;
  };

  /* ─── save ─── */
  const save = async (e) => {
    e.preventDefault();
    if (!isValid()) return;

    setBusy(true);
    try {
      /* 1️⃣  patch date/time */
      const body = {
        type        : appt.type, 
        dateTimeStart: new Date(`${date} ${start}`).toISOString(),
        dateTimeEnd  : new Date(`${date} ${end}`).toISOString(),
      };

      if (appt.type === "group") {
        body.group = (appt.group && appt.group._id) || entity._id;
      } else {
        body.patient = (appt.patient && appt.patient._id) || entity._id;
      }
      const { data: patched } = await api.patch(`/appointments/${appt._id}`, body);

      /* 2️⃣  ensure the object we send back is populated */
      let full = patched;
      if (patched.type === "group" && (!patched.group || typeof patched.group === "string")) {
        full = { ...patched, group: entity };
      } else if (patched.type === "individual" && (!patched.patient || typeof patched.patient === "string")) {
        full = { ...patched, patient: entity };
      }

      showToast("Appointment updated!");
      onUpdated?.(full);
      setTimeout(onClose, 300);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Update failed", "error");
    } finally {
      setBusy(false);
    }
  };

  /* ─── delete ─── */
  const del = async () => {
    if (!window.confirm("Delete this appointment?")) return;
    try {
      await api.delete(`/appointments/${appt._id}`);
      onDeleted?.(appt);
      onClose();
    } catch (err) {
      console.error(err);
      showToast("Delete failed", "error");
    }
  };

  /* ─── early exit when closed ─── */
  if (!open) return null;

  /* ─── UI ─── */
  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Edit Appointment"
        className="overflow-visible max-h-[85vh] w-full max-w-md"
      >
        {!entity ? (
          <div className="p-6 text-center text-gray-500">Loading…</div>
        ) : (
          <form onSubmit={save} className="space-y-6">
            {/* summary */}
            <div className="flex items-center gap-3">
              <Avatar url={entity.avatarUrl} name={entity.name} className="w-10 h-10" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate" title={entity.name}>{entity.name}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  {entity.icon}
                  {appt.type === "group" ? `${entity.patients?.length ?? 0} members` : "Patient"}
                </p>
              </div>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">
                {entity.label}
              </span>
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
            <div className="pt-2 flex justify-between gap-4">
              <button
                type="button"
                onClick={del}
                className="px-4 py-2 rounded-xl border border-red-500 text-red-500"
              >
                Delete
              </button>
              <div className="flex gap-2">
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
            </div>
          </form>
        )}
      </Modal>

      {/* toast */}
      <SavingToast
        show={toast.show}
        message={toast.msg}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      />
    </>
  );
}
