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
      
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl p-8 m-10">

      {/* header */}
      <h3 className="text-2xl font-semibold mb-4 text-primary">
        {category?._id ? `Edit Category` : "New Annual-Goal Category"}
      </h3>

      {/* 12-column responsive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* ◀︎ LEFT 5/12 : category + add/edit */}
        <section className="lg:col-span-5 space-y-4">
          {/* category meta */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Category Details</h4>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Category name"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-primary"
            />
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={4}
              placeholder="Category description (optional)"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 resize-none focus:outline-primary"
            />
          </div>

          {/* add / edit goal */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              {editIdx !== null ? "Edit Goal" : "Add Goal"}
            </h4>
            <input
              value={gName}
              onChange={(e) => setGName(e.target.value)}
              placeholder="Goal name"
              className="w-full border border-gray-300 rounded-lg px-4 py-3"
            />
            <textarea
              value={gDesc}
              onChange={(e) => setGDesc(e.target.value)}
              rows={4}
              placeholder="Goal description (optional)"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 resize-none"
            />

            <button
              type="button"
              onClick={addOrUpdateGoal}
              disabled={!gName.trim()}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg disabled:opacity-40 transition"
            >
              {editIdx !== null ? (
                <>
                  <PencilSquareIcon className="h-5 w-5" /> Update Goal
                </>
              ) : (
                <>
                  <PlusIcon className="h-5 w-5" /> Add Goal
                </>
              )}
            </button>
          </div>
        </section>

        {/* ▶︎ RIGHT 7/12 : goal list */}
        <section className="lg:col-span-7">
          <h4 className="text-sm font-medium mb-4">Goals ({goals.length})</h4>
           <div className="border border-gray-200 rounded-lg max-h-[50vh] overflow-y-auto p-4 space-y-4">

            {goals.length === 0 && (
              <p className="text-sm text-gray-400">No goals added yet.</p>
            )}

            {goals.map((g, i) => {
              const open = openRows.has(i);
              return (
                <div
                  key={i}
                  className="bg-gray-50 hover:bg-gray-100 rounded-lg p-4 cursor-pointer group"
                  onClick={(e) => {
                    if (!(e.target.closest("button") || e.target.closest("svg")))
                      toggleRow(i);
                  }}
                >
                  {/* row header */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-start gap-2 flex-1">
                      <ChevronDownIcon
                        className={`h-4 w-4 mt-1 text-gray-400 transition-transform ${
                          open ? "rotate-180" : ""
                        }`}
                      />
                      <p className="font-medium text-sm">{g.name}</p>
                    </div>

                    <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition">
                      <PencilSquareIcon
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(i);
                        }}
                        className="h-5 w-5 text-primary hover:scale-110"
                        title="Edit"
                      />
                      <TrashIcon
                        onClick={(e) => {
                          e.stopPropagation();
                          removeGoal(i);
                        }}
                        className="h-5 w-5 text-red-500 hover:scale-110"
                        title="Delete"
                      />
                    </div>
                  </div>

                  {open && g.description && (
                    <p className="mt-3 text-sm text-gray-600 whitespace-pre-wrap">
                      {g.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* footer */}
      <div className="flex justify-end gap-4">
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
        >
          Cancel
        </button>
        <button
          onClick={save}
          className="px-6 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition"
        >
          Save
        </button>
      </div>
    </div>

    </div>
  );
}
