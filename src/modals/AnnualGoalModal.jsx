import { useState, useEffect, useRef } from "react";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import { postCategory, updateCategory, deleteGoal } from "../services/api";

/**
 * @param {boolean}  open
 * @param {Function} onClose
 * @param {Function} onSaved
 * @param {Object?}  category   // optional – if supplied modal becomes “edit”
 */
export default function AnnualGoalModal({
  open,
  onClose,
  onSaved,
  category = null,
}) {
  /* ───── state ───── */
  const [name,  setName]  = useState("");
  const [desc,  setDesc]  = useState("");
  const [goals, setGoals] = useState([]);          // [{ name, description }]
  const nameRef           = useRef(null);

  /* single-goal draft */
  const [gName, setGName] = useState("");
  const [gDesc, setGDesc] = useState("");
  const [editIdx, setEditIdx] = useState(null);    // index being edited

  /* reset each time modal opens */
  useEffect(() => {
    if (open) {
      setName(category?.name || "");
      setDesc(category?.description || "");
      setGoals(category?.goals || []);
      setGName(""); setGDesc(""); setEditIdx(null);
      setTimeout(() => nameRef.current?.focus(), 120);
    }
  }, [open, category]);

  /* ───── goal ops ───── */
  const addOrUpdateGoal = () => {
    const n = gName.trim();
    if (!n) return;

    if (editIdx !== null) {
      // update existing
      setGoals((g) =>
        g.map((goal, i) =>
          i === editIdx ? { name: n, description: gDesc.trim() } : goal
        )
      );
    } else if (!goals.find((g) => g.name === n)) {
      // add new
      setGoals([...goals, { name: n, description: gDesc.trim() }]);
    }

    // reset draft
    setGName(""); setGDesc(""); setEditIdx(null);
  };

  const startEdit = (i) => {
    setEditIdx(i);
    setGName(goals[i].name);
    setGDesc(goals[i].description);
  };

  const removeGoal = (i) => {
    const goal = goals[i];

    /* If the goal already lives in MongoDB (== has _id) delete it
       immediately so UI and DB never drift out-of-sync.                */
    if (category?._id && goal?._id) {
      deleteGoal(category._id, goal._id).catch((e) =>
        alert(e.response?.data?.message || "Failed to delete goal")
      );
    }

    /* Optimistic UI update */
    setGoals((g) => g.filter((_, idx) => idx !== i));
    if (editIdx === i) {
      setGName("");
      setGDesc("");
      setEditIdx(null);
    }
  };

  /* ───── save category ───── */
  const save = async () => {
    if (!name.trim() || goals.length === 0)
      return alert("Category name and at least one goal are required.");

    let saved;
    if (category?._id) {
    // only send goals that are NEW
    const existingNames = new Set((category.goals ?? []).map(g => g.name));
    const addGoals = goals.filter(g => !existingNames.has(g.name));

    const { data } = await updateCategory(category._id, {
      name,
      description: desc,
      addGoals,          // server will append these
    });
    saved = data;
  }
 else {
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

  /* ───── UI ───── */
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl space-y-6">
        <h3 className="text-xl font-semibold">
          {category = "New Annual-Goal Category"}
        </h3>

        <div className="space-y-5">
          {/* name + description */}
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

          {/* goal draft */}
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

          {/* goal list */}
          <div className="space-y-2">
            {goals.map((g, i) => (
              <div
                key={i}
                className="flex items-start justify-between bg-gray-50 rounded-md p-3"
              >
                <div className="text-sm">
                  <p className="font-medium">{g.name}</p>
                  {g.description && (
                    <p className="text-gray-600">{g.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <PencilSquareIcon
                    onClick={() => startEdit(i)}
                    className="h-5 w-5 text-primary cursor-pointer"
                    title="Edit"
                  />
                  <TrashIcon
                    onClick={() => removeGoal(i)}
                    className="h-5 w-5 text-red-500 cursor-pointer"
                    title="Delete"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
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
