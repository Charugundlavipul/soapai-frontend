import { useState } from "react";

export default function EditActivityModal({ open, onClose, activity, onSave }) {
  const [name, setName]         = useState(activity?.name || "");
  const [description, setDesc]  = useState(activity?.description || "");

  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-xl space-y-4">
        <h3 className="text-lg font-semibold">Edit Activity</h3>

        <label className="block text-sm font-medium">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border px-3 py-2 rounded-md"
        />

        <label className="block text-sm font-medium">Description (Markdown)</label>
        <textarea
          rows={6}
          value={description}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full border px-3 py-2 rounded-md"
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ name, description })}
            className="px-4 py-2 bg-primary text-white rounded-md"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
