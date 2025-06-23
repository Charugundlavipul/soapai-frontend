import { useEffect, useState, useRef } from "react";
import Modal            from "../components/Modal";
import { Input }        from "../components/Input";
import {
  getCategories,
  updateCategory          // PATCH /annual-goals/:id  { addGoals: [...] }
} from "../services/api";

export default function NewGoalModal({ open, onClose, onSaved }) {
  /* basic form */
  const [cats, setCats]       = useState([]);     // [{ _id,name }]
  const [catId, setCatId]     = useState("");     // selected category
  const [name , setName ]     = useState("");     // goal name
  const [desc , setDesc ]     = useState("");     // goal description
  const nameRef               = useRef(null);

  /* fetch categories when modal opens */
  useEffect(() => {
    if (open) {
      getCategories().then(r => {
        setCats(r.data);
        setCatId(r.data[0]?._id || "");
      });
      setName(""); setDesc("");
      setTimeout(() => nameRef.current?.focus(), 150);
    }
  }, [open]);

  /* save */
  async function save(e) {
    e.preventDefault();
    if (!catId || !name.trim()) {
      alert("Category and goal name are required.");
      return;
    }
    /* add one new goal to the chosen category */
    const { data: updatedCat } = await updateCategory(catId, {
      addGoals: [{ name: name.trim(), description: desc.trim() }]
    });
    /* pick the freshly-added goal object from response */
    const newGoal = updatedCat.goals.find(g => g.name === name.trim());
    onSaved(newGoal);          // let parent append to its list / refresh
    onClose();
  }

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Create New Goal">
      <form onSubmit={save} className="space-y-6">
        {/* category dropdown */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Category</label>
          <select
            value={catId}
            onChange={e => setCatId(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            {cats.map(c => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* goal name */}
        <Input
          ref={nameRef}
          label="Goal Name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />

        {/* optional description */}
        <Input
          label="Description (optional)"
          value={desc}
          onChange={e => setDesc(e.target.value)}
        />

        {/* footer */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-primary text-primary"
          >
            Cancel
          </button>
          <button className="px-6 py-2 rounded-xl bg-primary text-white">
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
