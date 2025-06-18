// ────────────────────────────────────
// src/pages/AnnualGoals.jsx
// ────────────────────────────────────
import { useEffect, useState } from "react";
import Navbar  from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import {
  getCategories,
  postCategory,
  updateCategory,
  deleteCategory,
  deleteGoal,
} from "../services/api";
import {
  ChevronDownIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import SavingToast from "../components/savingToast";
import AnnualGoalModal from "../modals/AnnualGoalModal";

/* ───────────────────────────────────── */

export default function AnnualGoals() {
  const [cats,     setCats   ] = useState([]);
  const [goalCat,  setGoalCat] = useState(null);           // “Add goal” modal
  const [editCat,  setEditCat] = useState(null);           // “Edit cat” modal
  const [confirm,  setConfirm] = useState(null);           // { type, catId, goalId?, label }
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  /* initial fetch – make sure NOT to return the Promise */
  useEffect(() => { refresh(); }, []);
  const refresh = () => getCategories().then(r => setCats(r.data));


  /* replace / insert a category in state */
  const upsert = (cat) => {
    setCats(prev => {
      const i = prev.findIndex(c => c._id === cat._id);
      return i === -1 ? [...prev, cat] : prev.map((c,idx)=>idx===i?cat:c);
    });
    setToast({ show: true, message: "Changes saved successfully!", type: "success" });
  };

  /* ---------- confirmation helpers ---------- */
  const askDelCat  = (id,name)      =>
      setConfirm({ type:"cat",  catId:id,           label:`category “${name}”` });
  const askDelGoal = (catId,goal)   =>
      setConfirm({ type:"goal", catId, goalId:(goal._id||goal.name),
        label:`goal “${goal.name}”` });

  async function doDelete() {
    if (!confirm) return;
    try {
      if (confirm.type === "cat") {
        await deleteCategory(confirm.catId);
        setCats(prev => prev.filter(c => c._id !== confirm.catId));
        setToast({ show: true, message: "Category deleted successfully!", type: "success" });
      } else {
        await deleteGoal(confirm.catId, confirm.goalId);
        setCats(prev => prev.map(c =>
            c._id === confirm.catId
                ? { ...c, goals: c.goals.filter(g => (g._id||g.name) !== confirm.goalId) }
                : c
        ));
        setToast({ show: true, message: "Goal deleted successfully!", type: "success" });
      }
    } catch (e) {
      alert(e.response?.data?.message || "Delete failed");
      setToast({ show: true, message: "Delete failed. Please try again.", type: "error" });
    } finally {
      setConfirm(null);
    }
  }

  /* ---------- render ---------- */
  return (

      <div className="min-h-screen flex flex-col font-sans">

        {/* –– purple bar full-width –– */}
        <Navbar />

        {/* –– sidebar (left)    scrollable main (right) –– */}
        <div className="flex flex-1">

          <Sidebar className="h-screen" />

          {/* 2️⃣  main work-area */}
          <main className="flex-1 p-6 space-y-6">
            <h2 className="text-2xl font-semibold text-primary">Annual Goals</h2>

            {cats.map(cat => (
                <CategoryTile
                    key={cat._id}
                    cat={cat}
                    onAddGoal    ={() => setGoalCat(cat)}
                    onEdit       ={() => setEditCat(cat)}
                    onDeleteCat  ={() => askDelCat(cat._id, cat.name)}
                    onDeleteGoal ={goal => askDelGoal(cat._id, goal)}
                />
            ))}

            <button
                onClick={() => setEditCat({ name:"", description:"", goals:[] })}
                className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <PlusIcon className="h-5 w-5"/> New Category
            </button>
          </main>
        </div>

        {/* create / edit category */}
        <AnnualGoalModal
            open    = {!!editCat}
            category={editCat}
            onClose ={() => setEditCat(null)}
            onSaved ={upsert}
        />

        {/* add-goal */}
        <GoalModal
            open    = {!!goalCat}
            category={goalCat}
            onClose ={() => setGoalCat(null)}
            onSaved ={upsert}
        />

        {/* confirm dialog */}
        {confirm && (
            <ConfirmModal
                text={`Are you sure you want to delete ${confirm.label}?`}
                onCancel={() => setConfirm(null)}
                onConfirm={doDelete}
            />
        )}

        {/* Toast notification */}
        <SavingToast
            show={toast.show}
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ show: false, message: "", type: "success" })}
        />
      </div>
  );
}

/* ────────── accordion tile ────────── */
function CategoryTile({ cat, onAddGoal, onEdit, onDeleteCat, onDeleteGoal }) {
  const [open, setOpen] = useState(false);

  return (
      <div className="border rounded-xl p-4">
        {/* header */}
        <div className="flex justify-between items-start">


        <div className="max-w-md">
            <p className="font-medium truncate">{cat.name}</p>
            <p className="text-xs text-gray-600 truncate">
              {cat.description || "— No description —"}
            </p>
          </div>

          <div
              className="flex items-center gap-3"
              onClick={e => e.stopPropagation()}            /* keep accordion state */
          >
            <PencilSquareIcon
                title="Edit category"
                onClick={() => { onEdit(); }}
                className="h-6 w-6 text-primary cursor-pointer"
            />
            <TrashIcon
                title="Delete category"
                onClick={() => { onDeleteCat(); }}
                className="h-6 w-6 text-red-500 cursor-pointer"
            />
            <ChevronDownIcon
                onClick={() => setOpen(o => !o)}
                className={`h-6 w-6 transition ${open ? "rotate-180" : ""} cursor-pointer hover:text-blue-500 hover:scale-110`}
            />

          </div>
        </div>

        {/* body */}
        {open && (
            <div className="mt-4 space-y-3">
              <div className="flex justify-between items-center">
                <p className="font-medium">Goals</p>
                <button
                    onClick={() => { onAddGoal(); }}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <PlusIcon className="h-4 w-4" /> New goal
                </button>
              </div>

              <ul className="space-y-1">
                {cat.goals.length ? (
                    cat.goals.map(g => (
                        <li
                            key={g._id || g.name}
                            className="bg-gray-50 rounded-md px-3 py-2 flex justify-between"
                        >
                          <div className="text-sm">
                            <p className="font-medium">{g.name}</p>
                            {g.description && (
                                <p className="text-xs text-gray-600">
                                  {g.description}
                                </p>
                            )}
                          </div>
                          <TrashIcon
                              title="Delete goal"
                              onClick={() => { onDeleteGoal(g); }}   /* wrapped – no Promise returned */
                              className="h-6 w-6 text-gray-400 hover:text-red-500 cursor-pointer"
                          />
                        </li>
                    ))
                ) : (
                    <p className="italic text-gray-400 text-sm">No goals yet</p>
                )}
              </ul>
            </div>
        )}
      </div>
  );
}

/* ───────── confirmation modal ───────── */
function ConfirmModal({ text, onCancel, onConfirm }) {
  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl p-6 w-full max-w-xs space-y-5 shadow-lg">
          <p className="text-center text-sm">{text}</p>
          <div className="flex justify-center gap-4">
            <button
                onClick={onCancel}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
                onClick={onConfirm}
                className="px-4 py-2 rounded-lg bg-red-600 text-white"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
  );
}

/* ───────── add-goal modal (unchanged logic) ───────── */
function GoalModal({ open, onClose, category, onSaved }) {
  const [gName, setGName] = useState("");
  const [gDesc, setGDesc] = useState("");

  useEffect(() => { if (open) { setGName(""); setGDesc(""); } }, [open]);
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
        name: category.name,
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
          <h3 className="text-lg font-semibold">
            Add Goal — {category.name || "New Category"}
          </h3>

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

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose}
                    className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
            <button onClick={save}
                    className="px-4 py-2 bg-primary text-white rounded-lg">Save</button>
          </div>
        </div>
      </div>
  );
}
