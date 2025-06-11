// client/src/pages/GroupRecommendations/NewGroupModal.jsx
import { useEffect, useState } from "react";
import Modal from "../components/Modal";
import { Input } from "../components/Input";
import api from "../services/api";
import MemberSelect from "../components/MemberSelect";
import { XMarkIcon } from "@heroicons/react/24/solid";

export default function NewGroupModal({ open, onClose, onCreated }) {
  /* fetched clients (includes each client.goals) */
  const [clients, setClients] = useState([]);

  /* form state */
  const [form, setForm] = useState({
    name:            "",
    members:         [],
    goals:           [],
    dateTimeStart:   "",
    dateTimeEnd:     "",
  });
  const [file, setFile] = useState(null);

  /* ─── fetch clients on modal open ─── */
  useEffect(() => {
    if (!open) return;
    api.get("/clients").then((r) => setClients(r.data));
    setForm({
      name:            "",
      members:         [],
      goals:           [],
      dateTimeStart:   "",
      dateTimeEnd:     "",
    });
    setFile(null);
  }, [open]);

  /* ─── whenever members change → recompute union of goals & auto‐set name ─── */
  useEffect(() => {
    // collect goals
    const selectedGoals = new Set();
    form.members.forEach((id) => {
      const c = clients.find((cl) => cl._id === id);
      (c?.goals ?? []).forEach((g) => selectedGoals.add(g));
    });
    // build comma‐joined name
    const nameList = form.members
      .map((id) => clients.find((c) => c._id === id)?.name)
      .filter(Boolean)
      .join(", ");
    setForm((f) => ({
      ...f,
      goals: Array.from(selectedGoals),
      name:  nameList,
    }));
  }, [form.members, clients]);

  /* ─── submit: create group + appointment ─── */
  const submit = async (e) => {
    e.preventDefault();
    // 1) Create group
    const fd = new FormData();
    // always include computed name (may be empty)
    fd.append("name", form.name);
    form.members.forEach((id) => fd.append("patients", id));
    form.goals.forEach((g)   => fd.append("goals", g));
    if (file) fd.append("avatar", file);
    const { data: newGroup } = await api.post("/groups", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    // 2) Create appointment for this group
    if (form.dateTimeStart && form.dateTimeEnd) {
      await api.post("/appointments", {
        type:           "group",
        group:          newGroup._id,
        dateTimeStart:  new Date(form.dateTimeStart).toISOString(),
        dateTimeEnd:    new Date(form.dateTimeEnd).toISOString(),
      });
    }

    // 3) Notify parent and close
    onCreated(newGroup);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Group Session">
      <form onSubmit={submit} className="space-y-6">
        {/* avatar (optional) */}
        {/* <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])}
          className="w-full border rounded-xl p-4 text-center text-sm cursor-pointer"
        /> */}

        {/* auto‐derived group name */}
        <Input
          label="Session Name"
          name="name"
          value={form.name}
          disabled
        />

        {/* members */}
        <MemberSelect
          clients={clients}
          value={form.members}
          onChange={(v) => setForm((f) => ({ ...f, members: v }))}
        />

        {/* read-only goals */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Goals (auto-collected)
          </label>
          <div className="flex flex-wrap gap-2">
            {form.goals.length ? (
              form.goals.map((g) => (
                <span
                  key={g}
                  className="flex items-center gap-1 bg-primary text-white rounded-full px-3 py-1 text-xs"
                >
                  {g}
                  <XMarkIcon className="h-3 w-3 opacity-30" />
                </span>
              ))
            ) : (
              <span className="italic text-gray-400 text-sm">
                Select members to see their goals
              </span>
            )}
          </div>
        </div>

        {/* appointment date/time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date & Time
            </label>
            <input
              type="datetime-local"
              value={form.dateTimeStart}
              onChange={(e) =>
                setForm((f) => ({ ...f, dateTimeStart: e.target.value }))
              }
              className="w-full border rounded-md px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date & Time
            </label>
            <input
              type="datetime-local"
              value={form.dateTimeEnd}
              onChange={(e) =>
                setForm((f) => ({ ...f, dateTimeEnd: e.target.value }))
              }
              className="w-full border rounded-md px-3 py-2"
              required
            />
          </div>
        </div>

        {/* footer */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-primary text-primary"
          >
            Cancel
          </button>
          <button type="submit" className="px-6 py-2 rounded-xl bg-primary text-white">
            Create Group Session
          </button>
        </div>
      </form>
    </Modal>
  );
}
