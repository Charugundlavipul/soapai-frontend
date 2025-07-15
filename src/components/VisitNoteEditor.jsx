import { useState, useEffect } from "react";
import PropTypes                 from "prop-types";
import axios                     from "axios";

const api = axios.create({
  baseURL : "http://localhost:4000/api",
  headers : { Authorization: `Bearer ${localStorage.getItem("jwt")}` }
});

export default function VisitNoteEditor({
  patientId,
  appointmentId,
  initialNote,
  onSaved = () => {},
  className = ""
}) {
  const [editing , setEditing ] = useState(false);
  const [text    , setText    ] = useState(initialNote);
  const [saving  , setSaving  ] = useState(false);

  /* ⬇️ keep local text up-to-date when parent prop changes */
  useEffect(() => {
    if (!editing) setText(initialNote);
  }, [initialNote, editing]);

  async function save() {
    if (saving) return;
    setSaving(true);

    try {
      // pull current visit row to keep other fields
      const { data: pat } = await api.get(`/clients/${patientId}`);
      const visit = pat.visitHistory.find(
        v => String(v.appointment) === appointmentId
      ) || {};

      // push updated note
      await api.post(`/clients/${patientId}/visit`, {
        visit: { ...visit, note: text }
      });

      setEditing(false);
      onSaved(text);
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || "Failed to save note");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`bg-white rounded-md border p-3 text-sm ${className}`}>
      {editing ? (
        <>
          <textarea
            rows={6}
            className="w-full border rounded p-2 text-sm mb-2"
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setEditing(false); setText(initialNote); }}
              className="px-3 py-1 rounded border"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-1 rounded bg-primary text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </>
      ) : (
        <>
          {text.split("\n").map((ln, i) => (
            <p key={i}>{ln.replace(/^•\s*/, "• ")}</p>
          ))}
          <button
            onClick={() => setEditing(true)}
            className="mt-2 text-xs underline text-primary"
          >
            Edit
          </button>
        </>
      )}
    </div>
  );
}

VisitNoteEditor.propTypes = {
  patientId     : PropTypes.string.isRequired,
  appointmentId : PropTypes.string.isRequired,
  initialNote   : PropTypes.string.isRequired,
  onSaved       : PropTypes.func,
  className     : PropTypes.string
};
