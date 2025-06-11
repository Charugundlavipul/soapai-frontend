import { useState, useEffect, useRef } from "react";
import Modal from "../components/Modal";
import { Input } from "../components/Input";
import api, { getCategories } from "../services/api";
import ChipInput from "../components/ChipInput";
import { ChevronDownIcon, XMarkIcon } from "@heroicons/react/24/solid";

export default function NewClientModal({ open, onClose, onCreated }) {
  /* ─── basic form ─── */
  const [form, setForm] = useState({
    name: "",
    age: "",
    pastHistory: [],
    goals: [],           // array of goal *names*
  });
  const [file, setFile] = useState(null);

  /* ─── goal bank (once per open) ─── */
  const [goalBank, setGoalBank] = useState([]);          // [{ name, category }]
  const [ddOpen,   setDdOpen ]  = useState(false);
  const ddRef                   = useRef(null);

  useEffect(() => {
    if (!open) return;
    getCategories().then(r => {
      const flat = r.data.flatMap(cat =>
        cat.goals.map(g => ({ name: g.name, category: cat.name }))
      );
      setGoalBank(flat);
    });
  }, [open]);

  /* click-outside dropdown */
  useEffect(() => {
    const h = e => ddRef.current && !ddRef.current.contains(e.target) && setDdOpen(false);
    if (ddOpen) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ddOpen]);

  const change = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  /* add/remove goal name */
  const addGoal    = g => !form.goals.includes(g.name) &&
                          setForm(f => ({ ...f, goals:[...f.goals, g.name] }));
  const removeGoal = g => setForm(f => ({ ...f, goals:f.goals.filter(x => x!==g) }));

  /* ---------- submit ---------- */
  const submit = async e => {
    e.preventDefault();

    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("age",  form.age);
    form.pastHistory.forEach(h => fd.append("pastHistory", h));
    form.goals.forEach( g => fd.append("goals", g));

    /* ▶ initialise goalProgress rows */
    form.goals.forEach(g =>
      fd.append(
        "goalProgress",
        JSON.stringify({
          name:        g,
          progress:    0,
          comment:     "",
          startDate:   new Date(),
          targetDate:  null,
          associated:  []          // history of activities
        })
      )
    );

    if (file) fd.append("avatar", file);

    const { data } = await api.post("/clients", fd, {
      headers:{ "Content-Type":"multipart/form-data" }
    });
    onCreated(data);
    onClose();
  };

  /* ---------- UI ---------- */
  return (
    <Modal open={open} onClose={onClose} title="Create New Client">
      <form onSubmit={submit} className="space-y-6">
        {/* avatar upload */}
        <input
          type="file"
          accept="image/*"
          onChange={e => setFile(e.target.files[0])}
          className="w-full border rounded-xl p-4 text-center text-sm cursor-pointer"
        />

        <Input label="Name" name="name" value={form.name} onChange={change} required />
        <Input label="Age"  name="age"  value={form.age}  onChange={change} />

        {/* past-history chips */}
        <ChipInput
          label="Past History"
          value={form.pastHistory}
          onChange={v => setForm(f => ({ ...f, pastHistory:v }))}
          placeholder="Type and press Enter"
        />

        {/* goals dropdown → chips */}
        <div ref={ddRef} className="space-y-1">
          <label className="text-sm font-medium">Goals</label>

          <button
            type="button"
            onClick={() => setDdOpen(o => !o)}
            className="w-full flex justify-between items-center px-3 py-2 border rounded-md bg-white"
          >
            <span className="text-gray-500">
              {ddOpen ? "Select goal…" : "+ Click to select goal"}
            </span>
            <ChevronDownIcon className={`h-4 w-4 transition ${ddOpen ? "rotate-180":""}`} />
          </button>

          {ddOpen && (
            <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-white border rounded-md shadow-lg text-sm">
              {goalBank.map(g => (
                <li
                  key={g.name}
                  onClick={() => { addGoal(g); setDdOpen(false); }}
                  className="px-4 py-2 hover:bg-primary/10 cursor-pointer flex justify-between"
                >
                  {g.name}
                  <span className="text-gray-400">({g.category})</span>
                </li>
              ))}
            </ul>
          )}

          {/* selected chips */}
          <div className="flex flex-wrap gap-2 mt-3">
            {form.goals.map(g => (
              <span
                key={g}
                className="flex items-center gap-1 bg-primary text-white rounded-full px-3 py-1 text-xs"
              >
                {g}
                <XMarkIcon
                  onClick={() => removeGoal(g)}
                  className="h-3 w-3 cursor-pointer text-white/80"
                />
              </span>
            ))}
          </div>
        </div>

        {/* footer */}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl border border-primary text-primary">
            Cancel
          </button>
          <button className="px-6 py-2 rounded-xl bg-primary text-white">
            Confirm
          </button>
        </div>
      </form>
    </Modal>
  );
}
