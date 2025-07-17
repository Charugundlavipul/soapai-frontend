/*  client/src/components/VisitNotes.jsx  */
/* ────────────────────────────────────────────────────────────
   Unified Visit-Notes + Short-Term-Goal editor (prettier)
────────────────────────────────────────────────────────────── */
import { useState } from "react";
import PropTypes    from "prop-types";
import { Sparkles, PencilLine, X, Check } from "lucide-react";
import VisitNoteEditor from "./VisitNoteEditor";

const stgForAppt = (p, apptId) =>
  p.stgs?.find((s) => String(s.appointment) === String(apptId))?.text ?? "";

export default function VisitNotes({
  patients,
  appointmentId,
  noteOf,
  onSave,
  onGenStg,
  onSaveStg,
  wrap = true,
  className = "",
}) {
  const [editingId, setEditingId] = useState(null);
  const [draft,     setDraft]     = useState("");

  const body = (
    <div className="space-y-6">
      {patients.map((p) => {
        const stgText = stgForAppt(p, appointmentId);
        const inEdit  = editingId === p._id;

        return (
          <section
            key={p._id}
            className="bg-white rounded-xl shadow-sm p-5 space-y-4"
          >
            {/* patient name */}
            <h5 className="font-semibold text-primary">{p.name}</h5>

            {/* Short-Term Goal */}
            <div className="space-y-2">
              <h6 className="text-xs font-semibold text-gray-500 uppercase">
                Short-Term Goal
              </h6>

              {inEdit ? (
                <>
                  <textarea
                    rows={3}
                    className="w-full border rounded p-2 text-sm"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-1 px-3 py-1 text-xs border rounded"
                    >
                      <X className="w-3 h-3" /> Cancel
                    </button>
                    <button
                      onClick={() => {
                        onSaveStg?.(p._id, draft);
                        setEditingId(null);
                      }}
                      className="flex items-center gap-1 px-3 py-1 bg-primary text-white text-xs rounded"
                    >
                      <Check className="w-3 h-3" /> Save
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-start justify-between">
                  <p className="text-sm max-w-[75%] break-words whitespace-pre-line">
                    {stgText || "—"}
                  </p>

                  <div className="flex items-center gap-2">
                    {onSaveStg && (
                      <button
                        title="Edit ST-Goal"
                        onClick={() => {
                          setDraft(stgText);
                          setEditingId(p._id);
                        }}
                        className="p-1 rounded-full hover:bg-gray-100"
                      >
                        <PencilLine className="w-4 h-4 text-primary" />
                      </button>
                    )}
                    {onGenStg && (
                      <button
                        title="Generate ST-Goal"
                        onClick={() => onGenStg(String(p._id))}
                        className="flex items-center gap-1 text-xs bg-primary text-white px-3 py-1 rounded-full hover:bg-primary/90"
                      >
                        <Sparkles className="w-3 h-3" />
                        {stgText ? "Regenerate" : "Generate"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Visit Note */}
            <div className="space-y-1">
              <h6 className="text-xs font-semibold text-gray-500 uppercase">
                Visit Note
              </h6>
              <VisitNoteEditor
                patientId={p._id}
                appointmentId={appointmentId}
                initialNote={noteOf(p._id)}
                onSaved={(txt) => onSave(p._id, txt)}
              />
            </div>
          </section>
        );
      })}
    </div>
  );

  return wrap ? (
    <div
      className={`bg-[#F5F4FB] rounded-2xl p-6 shadow-sm ${className}`}
    >
      <h4 className="text-xl font-semibold text-gray-800 mb-5">
        Visit Notes
      </h4>
      {body}
    </div>
  ) : (
    body
  );
}

VisitNotes.propTypes = {
  patients     : PropTypes.array.isRequired,
  appointmentId: PropTypes.string.isRequired,
  noteOf       : PropTypes.func.isRequired,
  onSave       : PropTypes.func.isRequired,
  onGenStg     : PropTypes.func,
  onSaveStg    : PropTypes.func,
  wrap         : PropTypes.bool,
  className    : PropTypes.string,
};
