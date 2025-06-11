import { useEffect, useState } from "react";
import Navbar  from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import {
  getCategories,
  postCategory,
  updateCategory,
  deleteGoal,                         // ➊  new helper
} from "../services/api";
import {
  ChevronDownIcon,
  PlusIcon,
  PencilSquareIcon,
  XMarkIcon,                          // ➋  delete icon
} from "@heroicons/react/24/solid";
import AnnualGoalModal from "../modals/AnnualGoalModal"; // edit-category modal

/* ───── 5 fixed category names ───── */
const CAT_ORDER = [
  "Communication",
  "Social Skills",
  "Academic Skills",
  "Behaviour",
  "Other",
];

export default function AnnualGoals() {
  const [list,     setList]   = useState([]);     // all categories
  const [goalCat,  setGoalCat] = useState(null);  // “add goal” modal target
  const [editCat,  setEditCat] = useState(null);  // “edit category” modal

  /* initial fetch */
  useEffect(() => { getCategories().then(r => setList(r.data)); }, []);

  /* helpers */
  const upsert = (cat) =>
    setList(prev => {
      const i = prev.findIndex(c => c._id === cat._id);
      if (i === -1) return [...prev, cat];
      const copy = [...prev];
      copy[i] = cat;
      return copy;
    });

  /* delete-goal handler */
  async function handleDelGoal(catId, goalId) {
    try {
      await deleteGoal(catId, goalId);
      setList(prev =>
        prev.map(c =>
          c._id === catId
            ? { ...c, goals: c.goals.filter(g => (g._id || g.name) !== goalId) }
            : c
        )
      );
    } catch (e) {
      alert(e.response?.data?.message || "Failed to delete goal");
    }
  }

  /* quick map by name for O(1) lookup */
  const map = Object.fromEntries(list.map(c => [c.name, c]));

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="p-6 space-y-6">
          <h2 className="text-2xl font-semibold text-primary mb-4">
            Annual Goals
          </h2>

          {CAT_ORDER.map(name => (
            <CategoryCard
              key={name}
              cat={map[name] ?? { name, description: "", goals: [] }}
              onAddGoal={() =>
                setGoalCat(map[name] ?? { name })            /* may not exist yet */
              }
              onEdit={() =>
                setEditCat(map[name] ?? { name, description: "" })
              }
              onDeleteGoal={handleDelGoal}                    /* ➌  pass handler */
            />
          ))}
        </main>
      </div>

      {/* edit-category modal */}
      <AnnualGoalModal
        open={!!editCat}
        category={editCat}
        onClose={() => setEditCat(null)}
        onSaved={upsert}
      />

      {/* add-goal modal */}
      <GoalModal
        open={!!goalCat}
        category={goalCat}
        onClose={() => setGoalCat(null)}
        onSaved={upsert}
      />
    </div>
  );
}

/* ───────────── Category card ───────────── */
function CategoryCard({ cat, onAddGoal, onEdit, onDeleteGoal }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border rounded-xl p-4 space-y-2">
      {/* header row */}
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setOpen(o => !o)}
      >
        <p className="font-medium">{cat.name}</p>

        <div className="flex items-center gap-3">
          <PencilSquareIcon
            title="Edit category"
            onClick={e => { e.stopPropagation(); onEdit(); }}
            className="h-4 w-4 text-primary cursor-pointer"
          />
          <ChevronDownIcon
            className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {/* body */}
      {open && (
        <>
          <p className="text-sm text-gray-600">
            {cat.description || "— No description —"}
          </p>

          <ul className="list-disc ml-5 space-y-1 text-sm">
            {cat.goals.map(g => (
              <li key={g._id || g.name} className="flex items-start gap-2 group">
                <div>
                  <span className="font-medium">{g.name}</span>
                  {g.description && (
                    <> — <span className="text-gray-600">{g.description}</span></>
                  )}
                </div>
                <XMarkIcon
                  title="Delete goal"
                  onClick={() => onDeleteGoal(cat._id, g._id || g.name)}
                  className="h-3 w-3 mt-0.5 cursor-pointer text-gray-400 opacity-0
                             group-hover:opacity-100 hover:text-red-500 transition"
                />
              </li>
            ))}

            {cat.goals.length === 0 && (
              <li className="italic text-gray-400">No goals yet</li>
            )}
          </ul>

          <button
            onClick={onAddGoal}
            className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <PlusIcon className="h-4 w-4" /> New Goal
          </button>
        </>
      )}
    </div>
  );
}

/* ───── “Add one goal” modal (unchanged) ───── */
function GoalModal({ open, onClose, category, onSaved }) {
  const [gName, setGName] = useState("");
  const [gDesc, setGDesc] = useState("");

  useEffect(() => {
    if (open) { setGName(""); setGDesc(""); }
  }, [open]);

  if (!open) return null;

  async function save() {
    if (!gName.trim()) return alert("Goal name is required.");

    let saved;
    if (category._id) {
      const { data } = await updateCategory(category._id, {
        addGoals: [{ name: gName.trim(), description: gDesc.trim() }],
      });
      saved = data;
    } else {
      const { data } = await postCategory({
        name:  category.name,
        goals: [{ name: gName.trim(), description: gDesc.trim() }],
      });
      saved = data;
    }
    onSaved(saved);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg space-y-5">
        <h3 className="text-lg font-semibold">Add Goal — {category.name}</h3>

        <input
          value={gName}
          onChange={e => setGName(e.target.value)}
          placeholder="Goal name"
          className="w-full border rounded-md px-3 py-2"
        />
        <textarea
          value={gDesc}
          onChange={e => setGDesc(e.target.value)}
          rows={3}
          placeholder="Goal description (optional)"
          className="w-full border rounded-md px-3 py-2 resize-none"
        />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">
            Cancel
          </button>
          <button onClick={save} className="px-4 py-2 bg-primary text-white rounded-lg">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
