import { useState } from "react";
import Modal from "../components/Modal";
import { postBehaviour, patchVidBeh } from "../services/api";

/**
 * Props
 * ──────────────────────────────────────────────
 * open          : boolean
 * onClose       : ()       – close handler
 * video         : {_id, title, behaviours:[{_id…}]}
 * onSaved       : (video)  – called after the video is patched
 * sessionTitle? : string   – optional; falls back to video.title
 */
export default function NewBehaviourModal({
  open,
  onClose,
  video,
  onSaved,
  sessionTitle: sessionProp
}) {
  /* ───────── form state ───────── */
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [rows, setRows] = useState([]);

  /* make sure we always have a title to show */
  const sessionTitle = sessionProp || video?.title || "Session";

  /* ----- row helpers ----- */
  const addRow = () =>
    setRows((r) => [
      ...r,
      { startTime: "", endTime: "", aiDesc: "", session: sessionTitle }
    ]);

  const change = (i, field, val) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)));

  const removeRow = (i) => setRows((r) => r.filter((_, idx) => idx !== i));

  /* ----- save ----- */
  const save = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    /* 1. create behaviour */
    const { data: beh } = await postBehaviour({
      name,
      description: desc,
      instances: rows
    });

    /* 2. patch video behaviours */
    const ids = [...video.behaviours.map((b) => b._id), beh._id];
    const { data: updatedVideo } = await patchVidBeh(video._id, {
      behaviours: ids
    });

    /* 3. bubble up + reset */
    onSaved(updatedVideo);
    onClose();
    setName("");
    setDesc("");
    setRows([]);
  };

  /* ───────── render ───────── */
  return (
    <Modal open={open} onClose={onClose} title="Create Behaviour" wide>
      <form onSubmit={save} className=" space-y-6 w-[740px]">
        {/* name */}
        <div>
          <label className="font-medium block mb-1">Behaviour Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add Behaviour Name"
            className="w-full border rounded-lg p-3 bg-[#F5F4FB]"
            required
          />
        </div>

        {/* description */}
        <div>
          <label className="font-medium block mb-1">Behaviour Description</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
            placeholder="Description"
            className="w-full border rounded-lg p-3 bg-[#F5F4FB] resize-none"
          />
        </div>

        {/* instances table */}
        <p className="font-medium">Instances of Behaviour</p>
        <div className="max-h-[240px] overflow-y-auto">
          <table className="w-full text-sm border-collapse table-fixed">
            <thead className="text-primary">
              <tr>
                <th className="border px-3 py-2 w-24">Start&nbsp;Time</th>
                <th className="border px-3 py-2 w-24">End&nbsp;Time</th>
                <th className="border px-3 py-2">AI Description</th>
                <th className="border px-3 py-2 w-32">Session</th>
                <th className="border px-3 py-2 w-6" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="border">
                    <input
                      type="time"
                      value={r.startTime}
                      onChange={(e) => change(i, "startTime", e.target.value)}
                      className="w-full p-1"
                    />
                  </td>
                  <td className="border">
                    <input
                      type="time"
                      value={r.endTime}
                      onChange={(e) => change(i, "endTime", e.target.value)}
                      className="w-full p-1"
                    />
                  </td>
                  <td className="border">
                    <input
                      value={r.aiDesc}
                      onChange={(e) => change(i, "aiDesc", e.target.value)}
                      className="w-full p-1 whitespace-normal break-words"
                    />
                  </td>
                  <td className="border text-center whitespace-normal break-words">
                    {sessionTitle}
                  </td>
                  <td className="border text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="text-red-500 px-2"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* add-row link */}
        <p className="text-primary cursor-pointer text-sm" onClick={addRow}>
          + Add New Row
        </p>

        {/* footer */}
        <div className="flex justify-center gap-6 pt-4">
          <button type="submit" className="px-8 py-2 rounded-xl bg-primary text-white">
            Save Behaviour
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-2 rounded-xl border border-primary text-primary"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
