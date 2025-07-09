import { useState, useEffect, useRef } from "react";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/solid";
import {
  postCategory,
  updateCategory,
  deleteGoal,
} from "../services/api";

/**
 * @param {boolean}  open
 * @param {Function} onClose
 * @param {Function} onSaved
 * @param {Object?}  category   // if supplied → “edit” mode
 */
export default function AnnualGoalModal({
  open,
  onClose,
  onSaved,
  category = null,
}) {
  /* ─────────────── form state ─────────────── */
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [goals, setGoals] = useState([]); // [{ name, description, _id? }]
  const nameRef = useRef(null);

  /* draft for add / edit one goal */
  const [gName, setGName] = useState("");
  const [gDesc, setGDesc] = useState("");
  const [editIdx, setEditIdx] = useState(null); // number | null

  /* which rows are expanded – store goal indexes */
  const [openRows, setOpenRows] = useState(new Set());

  /* reset when modal opens / category changes */
  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setDesc(category?.description ?? "");
    setGoals(category?.goals ?? []);
    setGName("");
    setGDesc("");
    setEditIdx(null);
    setOpenRows(new Set());
    setTimeout(() => nameRef.current?.focus(), 120);
  }, [open, category]);

  /* ─────────────── helpers ─────────────── */
  const addOrUpdateGoal = () => {
    const n = gName.trim();
    if (!n) return;

    if (editIdx !== null) {
      setGoals((g) =>
        g.map((goal, i) =>
          i === editIdx ? { ...goal, name: n, description: gDesc.trim() } : goal
        )
      );
    } else if (!goals.find((g) => g.name === n)) {
      setGoals([...goals, { name: n, description: gDesc.trim() }]);
    }
    // reset draft
    setGName("");
    setGDesc("");
    setEditIdx(null);
  };

  const startEdit = (i) => {
    setEditIdx(i);
    setGName(goals[i].name);
    setGDesc(goals[i].description);
  };

  const removeGoal = (i) => {
    const goal = goals[i];
    /* if goal is persisted, delete immediately */
    if (category?._id && goal?._id) {
      deleteGoal(category._id, goal._id).catch((e) =>
        alert(e.response?.data?.message || "Failed to delete goal")
      );
    }
    setGoals((g) => g.filter((_, idx) => idx !== i));
    setOpenRows((set) => {
      const s = new Set(set);
      s.delete(i);
      return s;
    });
    if (editIdx === i) {
      setGName("");
      setGDesc("");
      setEditIdx(null);
    }
  };

  const toggleRow = (i) =>
    setOpenRows((set) => {
      const s = new Set(set);
      s.has(i) ? s.delete(i) : s.add(i);
      return s;
    });

  const save = async () => {
    if (!name.trim() || goals.length === 0)
      return alert("Category name and at least one goal are required.");

    let saved;
    if (category?._id) {
      /* send only *new* goals */
      const existing = new Set((category.goals ?? []).map((g) => g.name));
      const addGoals = goals.filter((g) => !existing.has(g.name));

      const { data } = await updateCategory(category._id, {
        name,
        description: desc,
        addGoals,
      });
      saved = data;
    } else {
      const { data } = await postCategory({
        name,
        description: desc,
        goals,
      });
      saved = data;
    }
    onSaved(saved);
    onClose();
  };

  if (!open) return null;

  /* ─────────────── UI ─────────────── */
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl space-y-6">
        <h3 className="text-xl font-semibold">
          {category = "New Annual-Goal Category"}
        </h3>

        {/* ------------ category meta ------------ */}
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category name"
          className="w-full border rounded-md px-3 py-2"
        />
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          placeholder="Category description (optional)"
          className="w-full border rounded-md px-3 py-2 resize-none"
        />

        {/* ------------ goal draft ------------ */}
        <div className="space-y-1">
          <label className="text-sm font-medium">
            {editIdx !== null ? "Edit Goal" : "Add Goal"}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              value={gName}
              onChange={(e) => setGName(e.target.value)}
              placeholder="Goal name"
              className="border rounded-md px-3 py-2"
            />
            <input
              value={gDesc}
              onChange={(e) => setGDesc(e.target.value)}
              placeholder="Goal description (optional)"
              className="border rounded-md px-3 py-2"
            />
          </div>
          <button
            type="button"
            onClick={addOrUpdateGoal}
            disabled={!gName.trim()}
            className="mt-2 inline-flex items-center gap-1 bg-primary text-white px-4 py-2 rounded-md disabled:opacity-40"
          >
            {editIdx !== null ? (
              <>
                <PencilSquareIcon className="h-4 w-4" /> Update Goal
              </>
            ) : (
              <>
                <PlusIcon className="h-4 w-4" /> Add Goal
              </>
            )}
          </button>
        </div>

        {/* ------------ goal list (scrollable) ------------ */}
        <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
          {goals.map((g, i) => {
            const open = openRows.has(i);
            return (
              <div
                key={i}
                className="bg-gray-50 rounded-md p-3"
                onClick={(e) => {
                  // ignore clicks coming from the icons
                  if (!(e.target.closest("button") || e.target.closest("svg")))
                    toggleRow(i);
                }}
              >
                {/* header row (always visible) */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-1 flex-1">
                    <ChevronDownIcon
                      className={`h-4 w-4 text-gray-400 mt-1 transition-transform ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                    <p className="font-medium text-sm break-words">{g.name}</p>
                  </div>
                  <div className="flex-shrink-0 flex gap-2">
                    <PencilSquareIcon
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(i);
                      }}
                      className="h-5 w-5 text-primary cursor-pointer"
                      title="Edit"
                    />
                    <TrashIcon
                      onClick={(e) => {
                        e.stopPropagation();
                        removeGoal(i);
                      }}
                      className="h-5 w-5 text-red-500 cursor-pointer"
                      title="Delete"
                    />
                  </div>
                </div>

                {/* description (toggle) */}
                {open && g.description && (
                  <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
                    {g.description}
                  </p>
                )}
              </div>
            );
          })}
          {goals.length === 0 && (
            <p className="text-sm text-gray-400">No goals added yet.</p>
          )}
        </div>

        {/* ------------ footer buttons ------------ */}
        <div className="flex justify-end gap-3 pt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="px-5 py-2 rounded-lg bg-primary text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
