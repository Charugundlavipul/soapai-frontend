// client/src/pages/GroupRecommendations/NewGroupModal.jsx
import { useEffect, useState } from "react";
import Modal from "../components/Modal";
import { Input } from "../components/Input";
import CustomDatePicker from "../components/CustomDatePicker";
import CustomTimePicker from "../components/CustomTimePicker";
import { ChevronDown, User, Calendar, Clock } from 'lucide-react';
import api from "../services/api";
import { XMarkIcon } from "@heroicons/react/24/solid";

export default function NewGroupModal({ open, onClose, onCreated }) {
  /* fetched clients (includes each client.goals) */
  const [clients, setClients] = useState([]);

  /* form state */
  const [form, setForm] = useState({
    name: "",
    members: [],
    goals: [],
    date: "",
    startTime: "",
    endTime: "",
  });
  const [file, setFile] = useState(null);

  // Popup state management
  const [openPopup, setOpenPopup] = useState(null); // 'date', 'startTime', 'endTime', 'members'

  /* ─── fetch clients on modal open ─── */
  useEffect(() => {
    if (!open) return;
    api.get("/clients").then((r) => setClients(r.data));
    setForm({
      name: "",
      members: [],
      goals: [],
      date: "",
      startTime: "",
      endTime: "",
    });
    setFile(null);
    setOpenPopup(null);
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
      name: nameList,
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
    form.goals.forEach((g) => fd.append("goals", g));
    if (file) fd.append("avatar", file);
    const { data: newGroup } = await api.post("/groups", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    // 2) Create appointment for this group
    if (form.date && form.startTime && form.endTime) {
      await api.post("/appointments", {
        type: "group",
        group: newGroup._id,
        dateTimeStart: new Date(`${form.date} ${form.startTime}`).toISOString(),
        dateTimeEnd: new Date(`${form.date} ${form.endTime}`).toISOString(),
      });
    }

    // 3) Notify parent and close
    onCreated(newGroup);
    onClose();
  };

  const handlePopupToggle = (popupType, isOpen) => {
    if (isOpen) {
      setOpenPopup(popupType);
    } else {
      setOpenPopup(null);
    }
  };

  const handleMemberToggle = (clientId) => {
    setForm((f) => ({
      ...f,
      members: f.members.includes(clientId)
          ? f.members.filter((id) => id !== clientId)
          : [...f.members, clientId],
    }));
  };

  const getSelectedMembersText = () => {
    if (form.members.length === 0) return "Select members...";
    if (form.members.length === 1) {
      const client = clients.find((c) => c._id === form.members[0]);
      return client ? client.name : "1 member selected";
    }
    return `${form.members.length} members selected`;
  };

  return (
      <Modal open={open} onClose={onClose} title="Create Group Session">
        <form onSubmit={submit} className="space-y-6">
          {/* auto‐derived group name */}
          <Input label="Session Name" name="name" value={form.name} disabled />

          {/* Custom Members Dropdown */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Members</label>
            <div className="relative">
              <button
                  type="button"
                  onClick={() => handlePopupToggle("members", openPopup !== "members")}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
              <span className={form.members.length > 0 ? "text-gray-900" : "text-gray-400"}>
                {getSelectedMembersText()}
              </span>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-gray-400" />
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </button>

              {openPopup === "members" && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                    <div className="p-2">
                      {clients.map((client) => (
                          <button
                              key={client._id}
                              type="button"
                              onClick={() => handleMemberToggle(client._id)}
                              className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between ${
                                  form.members.includes(client._id) ? "bg-primary/10 text-primary" : ""
                              }`}
                          >
                            <span>{client.name}</span>
                            {form.members.includes(client._id) && (
                                <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                  <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 8 8">
                                    <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z" />
                                  </svg>
                                </div>
                            )}
                          </button>
                      ))}
                      {clients.length === 0 && (
                          <div className="px-3 py-2 text-gray-500 text-sm">No clients available</div>
                      )}
                    </div>
                  </div>
              )}
            </div>
          </div>

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

          {/* Custom Date Picker */}
          <CustomDatePicker
              label="Date"
              value={form.date}
              onChange={(value) => setForm((f) => ({ ...f, date: value }))}
              isOpen={openPopup === "date"}
              onToggle={(isOpen) => handlePopupToggle("date", isOpen)}
          />

          {/* Custom Time Pickers */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Time</label>
            <div className="flex gap-3">
              <CustomTimePicker
                  value={form.startTime}
                  onChange={(value) => setForm((f) => ({ ...f, startTime: value }))}
                  placeholder="Start time"
                  isOpen={openPopup === "startTime"}
                  onToggle={(isOpen) => handlePopupToggle("startTime", isOpen)}
              />
              <CustomTimePicker
                  value={form.endTime}
                  onChange={(value) => setForm((f) => ({ ...f, endTime: value }))}
                  placeholder="End time"
                  isOpen={openPopup === "endTime"}
                  onToggle={(isOpen) => handlePopupToggle("endTime", isOpen)}
              />
            </div>
          </div>

          {/* footer */}
          <div className="flex justify-end gap-3 pt-4">
            <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-xl border border-primary text-primary hover:bg-primary/10 transition-colors"
            >
              Cancel
            </button>
            <button
                type="submit"
                className="px-6 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              Create Group Session
            </button>
          </div>
        </form>
      </Modal>
  );
}