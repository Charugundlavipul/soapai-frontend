import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * @param {Object}  props
 * @param {boolean} props.open
 * @param {Function} props.onClose
 * @param {Object}  props.client
 * @param {Function} props.onSave
 * @param {Array<{_id:string,name:string}>} props.groups
 */
export default function EditClientProfileModal({
  open,
  onClose,
  client,
  onSave,
  groups = [],
}) {
  /* ───── local state ───── */
  const [name, setName]       = useState("");
  const [age, setAge]         = useState("");
  const [address, setAddress] = useState("");
  const [groupId, setGroup]   = useState("");
  const [history, setHistory] = useState([]); // array of strings
  const [histInput, setHistInput] = useState("");
  const [avatarFile, setFile] = useState(null);
  const nameRef = useRef(null);
  const [grade, setGrade]     = useState("");

  /* reset every time the modal opens */
  useEffect(() => {
    if (open && client) {
      setName(client.name ?? "");
      setAge(client.age != null ? String(client.age) : "");
      setAddress(client.address ?? "");
      setGroup(client.group?._id || client.group || "");
      setHistory(Array.isArray(client.pastHistory) ? client.pastHistory : []);
      setHistInput("");
      setGrade(client.grade ?? "");    
      setFile(null);
      setTimeout(() => nameRef.current?.focus(), 140);
    }
  }, [open, client]);

  if (!open) return null;

  /* ───── helpers ───── */
  const addHist = () => {
    const v = histInput.trim();
    if (v && !history.includes(v)) setHistory((h) => [...h, v]);
    setHistInput("");
  };
  const removeHist = (h) => setHistory((arr) => arr.filter((x) => x !== h));

  /* ───── submit ───── */
  const submit = (e) => {
    e.preventDefault();
    onSave({
      name: name.trim(),
      grade: grade.trim(),
      age:  age === "" ? null : Number(age),
      address: address.trim(),
      group: groupId || null,
      pastHistory: history,
      avatarFile,
    });
  };

  /* ───── render ───── */
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
      <form
        onSubmit={submit}
        className="relative bg-white rounded-2xl p-8 w-full max-w-lg shadow-xl space-y-6"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>

        <h3 className="text-xl font-semibold">Edit Client Profile</h3>

        {/* NAME & AGE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field
            ref={nameRef}
            label="Name"
            value={name}
            onChange={setName}
            required
          />
          <Field
            label="Age"
            type="number"
            value={age}
            onChange={setAge}
          />
           
        </div>
        <Field label="Grade" value={grade} onChange={setGrade} />
        {/* <Field label="Address" value={address} onChange={setAddress} /> */}

        {/* GROUP DROPDOWN
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Group</label>
          <select
            value={groupId}
            onChange={(e) => setGroup(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">— No Group —</option>
            {groups.map((g) => (
              <option key={g._id} value={g._id}>
                {g.name}
              </option>
            ))}
          </select>
        </div> */}

        {/* PAST HISTORY chips */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Diagnosis</p>
          <div className="flex gap-2">
            <input
              value={histInput}
              onChange={(e) => setHistInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHist())}
              placeholder="Add condition / note"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <button
              type="button"
              onClick={addHist}
              disabled={!histInput.trim()}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {history.map((h) => (
              <span
                key={h}
                className="flex items-center gap-1 bg-primary text-white rounded-full px-3 py-1 text-xs"
              >
                {h}
                <button
                  onClick={() => removeHist(h)}
                  className="ml-1 font-bold text-white/80 hover:text-white/60"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* AVATAR */}
        <div>
          <p className="text-sm font-medium mb-1">Avatar</p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-primary text-white hover:bg-primary/90"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

/* reusable input */
const Field = ({ label, value, onChange, type = "text", ...rest }, ref) => (
  <div className="flex flex-col">
    <label className="text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      ref={ref}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
      {...rest}
    />
  </div>
);
