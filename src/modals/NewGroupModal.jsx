"use client"

import { useEffect, useState, useRef } from "react";
import Modal from "../components/Modal";
import { Input } from "../components/Input";
import CustomDatePicker from "../components/CustomDatePicker";
import CustomTimePicker from "../components/CustomTimePicker";
import { ChevronDown, User } from 'lucide-react';
import api from "../services/api";
import { XMarkIcon } from "@heroicons/react/24/solid";
import SavingToast from "../components/savingToast";

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
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");

  // Popup state management
  const [openPopup, setOpenPopup] = useState(null); // 'date', 'startTime', 'endTime', 'members'
  const membersContainerRef = useRef(null);

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
    setShowErrorPopup(false);
    setErrorMessage("");
    setIsSubmitting(false);
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

  // Handle click outside for members dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (membersContainerRef.current && !membersContainerRef.current.contains(event.target) && openPopup === "members") {
        setOpenPopup(null);
      }
    };

    if (openPopup === "members") {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openPopup]);

  const validateForm = () => {
    // Check if members are selected
    if (form.members.length === 0) {
      setErrorMessage("Please select at least one member for the group session.");
      setShowErrorPopup(true);
      return false;
    }

    // Check if date and times are provided
    if (!form.date || !form.startTime || !form.endTime) {
      setErrorMessage("Please fill in all required fields: date, start time, and end time.");
      setShowErrorPopup(true);
      return false;
    }

    return validateDateTime();
  };

  const validateDateTime = () => {
    if (!form.date || !form.startTime || !form.endTime) return true;

    const now = new Date();
    const sessionStart = new Date(`${form.date} ${form.startTime}`);
    const sessionEnd = new Date(`${form.date} ${form.endTime}`);

    if (sessionStart <= now) {
      setErrorMessage("Cannot schedule group sessions in the past. Please select a future date and time.");
      setShowErrorPopup(true);
      return false;
    }

    if (sessionStart >= sessionEnd) {
      if (sessionStart.getTime() === sessionEnd.getTime()) {
        setErrorMessage("Start time and end time cannot be the same.");
      } else {
        setErrorMessage("Start time cannot be after end time.");
      }
      setShowErrorPopup(true);
      return false;
    }

    // Check if session is too short (less than 15 minutes)
    const durationMinutes = (sessionEnd - sessionStart) / (1000 * 60);
    if (durationMinutes < 15) {
      setErrorMessage("Group session must be at least 15 minutes long.");
      setShowErrorPopup(true);
      return false;
    }

    // Check if session is too long (more than 8 hours)
    if (durationMinutes > 480) {
      setErrorMessage("Group session cannot be longer than 8 hours.");
      setShowErrorPopup(true);
      return false;
    }

    return true;
  };

  /* ─── submit: create group + appointment ─── */
  const submit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
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

      // Show success toast
      setToastMessage("Group session created successfully!");
      setToastType("success");
      setShowToast(true);

      // Wait for toast animation to start before closing modal
      setTimeout(() => {
        onCreated(newGroup);
        onClose();
      }, 300);
    } catch (error) {
      console.error("Error creating group session:", error);
      setErrorMessage(
          error.response?.data?.message ||
          "Failed to create group session. Please try again."
      );
      setShowErrorPopup(true);
      setToastMessage("Failed to create group session. Please try again.");
      setToastType("error");
      setShowToast(true);
    } finally {
      setIsSubmitting(false);
    }
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

    // Clear error if user starts selecting members
    if (showErrorPopup && form.members.length === 0) {
      setShowErrorPopup(false);
    }
  };

  const handleTimeChange = (timeType, value) => {
    setForm((f) => ({
      ...f,
      [timeType]: value,
    }));

    // Clear error if user changes time
    if (showErrorPopup) {
      setShowErrorPopup(false);
    }
  };

  const handleDateChange = (value) => {
    setForm((f) => ({ ...f, date: value }));

    // Clear error if user changes date
    if (showErrorPopup) {
      setShowErrorPopup(false);
    }
  };

  const closeErrorPopup = () => {
    setShowErrorPopup(false);
    setErrorMessage("");
  };

  const handleToastClose = () => {
    setShowToast(false);
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
      <>
        <Modal
            open={open}
            onClose={onClose}
            title="Create Group Session"
            className="overflow-visible max-h-[85vh] h-auto w-full max-w-md"
        >
          <div className="relative overflow-visible flex flex-col h-full">
            <form onSubmit={submit} className="flex flex-col h-full">
              <div className="flex-1 space-y-6 relative overflow-visible">
                {/* auto‐derived group name */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Session Name</label>
                  <input
                      type="text"
                      value={form.name || "Untitled Group Session"}
                      disabled
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900 cursor-not-allowed"
                  />
                </div>

                {/* Custom Members Dropdown */}
                <div className="space-y-3 relative z-[60]">
                  <label className="block text-sm font-medium text-gray-700">
                    Members <span className="text-red-500">*</span>
                  </label>
                  <div className="relative" ref={membersContainerRef}>
                    <button
                        type="button"
                        onClick={() => handlePopupToggle("members", openPopup !== "members")}
                        className={`w-full px-4 py-4 bg-gray-50 rounded-xl border border-gray-200 text-left flex items-center justify-between hover:bg-gray-100 transition-colors ${
                            form.members.length === 0 && showErrorPopup ? 'border-red-300 bg-red-50' : ''
                        }`}
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
                        <div className="absolute top-0 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-[100] max-h-48 overflow-y-auto">
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
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
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
                <div className="relative z-[50]">
                  <CustomDatePicker
                      label="Date"
                      value={form.date}
                      onChange={handleDateChange}
                      isOpen={openPopup === "date"}
                      onToggle={(isOpen) => handlePopupToggle("date", isOpen)}
                  />
                </div>

                {/* Custom Time Pickers */}
                <div className="space-y-3 relative z-[40]">
                  <label className="block text-sm font-medium text-gray-700">
                    Time <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4 relative">
                    <div className="flex-1">
                      <CustomTimePicker
                          value={form.startTime}
                          onChange={(value) => handleTimeChange("startTime", value)}
                          placeholder="Start time"
                          isOpen={openPopup === "startTime"}
                          onToggle={(isOpen) => handlePopupToggle("startTime", isOpen)}
                      />
                    </div>
                    <div className="flex-1">
                      <CustomTimePicker
                          value={form.endTime}
                          onChange={(value) => handleTimeChange("endTime", value)}
                          placeholder="End time"
                          isOpen={openPopup === "endTime"}
                          onToggle={(isOpen) => handlePopupToggle("endTime", isOpen)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Button container at bottom */}
              <div className="mt-4 pt-2">
                <div className="flex justify-end gap-4">
                  <button
                      type="button"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="px-4 py-2 rounded-xl border border-primary text-primary"
                  >
                    Cancel
                  </button>
                  <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2 rounded-xl bg-primary text-white"
                  >
                    {isSubmitting ? "Creating..." : "Create Group Session"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </Modal>

        {/* Error Popup */}
        <Modal open={showErrorPopup} onClose={closeErrorPopup} title="Validation Error">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Unable to Create Group Session</h3>
                <p className="text-gray-600">{errorMessage}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                  onClick={closeErrorPopup}
                  className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </Modal>

        {/* Success/Error Toast */}
        <SavingToast
            show={showToast}
            message={toastMessage}
            type={toastType}
            onClose={handleToastClose}
        />
      </>
  );
}