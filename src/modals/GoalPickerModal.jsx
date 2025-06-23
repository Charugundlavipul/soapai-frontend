// src/modals/GoalPickerModal.jsx
import { useEffect, useState } from "react";
import Modal from "../components/Modal";
import { Check } from "lucide-react";
import {
  getCategories,          // GET /annual-goals
} from "../services/api";
import api from "../services/api";

/**
 * Props
 * ──────────────────────────────────────────────────────────
 * open        : boolean
 * onClose     : () => void
 * video       : { _id, appointment, goals:[string|{name,category}] }
 * onSaved     : (updatedVideo) => void
 */
export default function GoalPickerModal({ open, onClose, video, onSaved }) {
  /* ───── state ───── */
  const [cats, setCats]           = useState([]);   // [{ _id,name,goals:[{name,…}] }]
  const [allowed, setAllowed]     = useState(new Set()); // Set<string>
  const [sel, setSel]             = useState([]);   // [goalName,…]
  const [busy, setBusy]           = useState(false);

  /* ───── helper: load goals for a single patient id ───── */
  const fetchPatientGoals = async (pid) => {
    const { data } = await api.get(`/clients/${pid}`);
    return data.goals || [];
  };

  /* ───── load data every time modal opens ───── */
  useEffect(() => {
    if (!open) return;

    (async () => {
      /* 1️⃣  Figure out which goals are *eligible* for this video */
      try {
        const { data: appt } = await api.get(`/appointments/${video.appointment}`);

        let goalSet = new Set();

        if (appt.type === "individual") {
          const pid =
            typeof appt.patient === "string" ? appt.patient : appt.patient?._id;
          (await fetchPatientGoals(pid)).forEach((g) => goalSet.add(g));
        } else {
          const gid =
            typeof appt.group === "string" ? appt.group : appt.group?._id;
          const { data: group } = await api.get(`/groups/${gid}`);
          const uniq = new Set();
          for (const p of group.patients) {
            (await fetchPatientGoals(p._id || p)).forEach((g) => uniq.add(g));
          }
          goalSet = uniq;
        }
        setAllowed(goalSet);
      } catch (err) {
        console.error("Unable to compute eligible goals for GoalPicker:", err);
        setAllowed(new Set());          // fallback → nothing selectable
      }

      /* 2️⃣  Load all categories (we filter them at render-time) */
      getCategories().then((r) => setCats(r.data));

      /* 3️⃣  Pre-select existing goals attached to the video */
      setSel(video.goals?.map((g) => (typeof g === "string" ? g : g.name)) || []);
    })();
  }, [open, video]);

  /* ───── toggle selection ───── */
  const toggle = (name) =>
    setSel((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]));

  /* ───── persist to server ───── */
  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.patch(`/videos/${video._id}/goals`, {
        goals: sel,
      });
      onSaved(data);        // parent does setVideo(…)
      onClose();
    } catch (e) {
      alert(e.response?.data?.message || "Failed to update goals");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  /* ───── UI ───── */
  return (
    <Modal wide open={open} onClose={onClose} title="Select Goals for this Video">
      <div className="max-h-[420px] pr-1 overflow-y-auto space-y-5">
        {cats
          .map((cat) => ({
            ...cat,
            goals: cat.goals.filter((g) => allowed.has(g.name)),
          }))
          .filter((cat) => cat.goals.length)        /* hide empty cats */
          .map((cat) => (
            <div key={cat._id}>
              <h4 className="font-semibold text-primary mb-2">{cat.name}</h4>

              <ul className="space-y-1 pl-2">
                {cat.goals.map((g) => (
                  <li
                    key={g.name}
                    onClick={() => toggle(g.name)}
                    className={`flex items-center gap-2 cursor-pointer px-3 py-1 rounded-md
                      ${
                        sel.includes(g.name)
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-gray-100"
                      }`}
                  >
                    {sel.includes(g.name) && (
                      <Check className="w-4 h-4 shrink-0 text-primary" />
                    )}
                    <span className="text-sm">{g.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </div>

      {/* footer */}
      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl border border-primary text-primary"
        >
          Cancel
        </button>
        <button
          disabled={busy}
          onClick={save}
          className="px-6 py-2 rounded-xl bg-primary text-white disabled:opacity-60"
        >
          Save
        </button>
      </div>
    </Modal>
  );
}
