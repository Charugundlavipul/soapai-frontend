import { useEffect, useRef, useState } from "react";
import Modal           from "../components/Modal";
import { Select }      from "../components/Input";
import { getCategories } from "../services/api";
import { XMarkIcon }   from "@heroicons/react/24/solid";

/**
 * open         : boolean
 * onClose      : () => void
 * currentGoals : [string]
 * onSave       : (goals:[string], goalProgressRows:[{…}]) => void
 */
export default function EditGoalsModal({ open, onClose, currentGoals, onSave }) {
  const [bank, setBank] = useState([]);      // [{name,category}]
  const [sel,  setSel ] = useState([]);      // working list
  const [pick, setPick] = useState("");
  const first = useRef(null);

  /* load bank & initialise selection */
  useEffect(() => {
    if (!open) return;
    getCategories().then(r => {
      const flat = r.data.flatMap(cat =>
        cat.goals.map(g => ({ name:g.name, category:cat.name }))
      );
      setBank(flat);
    });
    setSel(currentGoals || []);
    setPick("");
    setTimeout(() => first.current?.focus(), 100);
  }, [open, currentGoals]);

  const add    = () => pick && !sel.includes(pick) && setSel([...sel, pick]);
  const remove = g => setSel(sel.filter(x => x !== g));
  const remain = bank.filter(g => !sel.includes(g.name));

  /* turn list of names → full rows with progress metadata */
  const buildRows = () =>
    sel.map(name => ({
      name,
      progress:   0,
      comment:    "",
      startDate:  new Date(),
      targetDate: null,
      associated: []
    }));

  const save = () => {
    if (!sel.length) return alert("Select at least one goal.");
    onSave(sel, buildRows());     // pass both arrays upward
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Edit Goals">
      <div className="space-y-6 max-h-[420px] overflow-y-auto pr-1">
        {/* dropdown */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Add Goal</label>
          <Select ref={first} value={pick} onChange={e => setPick(e.target.value)}>
            <option value="">Select goal …</option>
            {remain.map(g => (
              <option key={g.name} value={g.name}>
                {g.category} – {g.name} 
              </option>
            ))}
          </Select>
          <button
            type="button"
            onClick={add}
            disabled={!pick}
            className="mt-2 px-4 py-2 bg-primary text-white rounded-md disabled:opacity-40"
          >
            Add
          </button>
        </div>

        {/* pills */}
        <div className="flex flex-wrap gap-2">
          {sel.map(name => {
            const meta = bank.find(b => b.name === name);
            return (
              <span key={name}
                className="flex items-center gap-1 bg-primary text-white rounded-full px-3 py-1 text-sm">
                {meta?.category ? `${meta.category}: ` : ""}{name}
                <XMarkIcon
                  className="h-4 w-4 cursor-pointer text-white/70"
                  onClick={() => remove(name)}
                />
              </span>
            );
          })}
        </div>
      </div>

      {/* footer */}
      <div className="flex justify-end gap-2 pt-4">
        <button onClick={onClose}
          className="px-4 py-2 rounded-xl border border-primary text-primary">
          Cancel
        </button>
        <button onClick={save}
          className="px-6 py-2 rounded-xl bg-primary text-white">
          Save
        </button>
      </div>
    </Modal>
  );
}
