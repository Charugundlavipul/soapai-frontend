"use client";

import { useEffect, useState } from "react";
import Modal from "../components/Modal";
import CustomDatePicker from "../components/CustomDatePicker";
import CustomTimePicker from "../components/CustomTimePicker";
import { ChevronDown, User } from "lucide-react";
import api from "../services/api";
import { formatISO } from "date-fns";
import SavingToast from "../components/savingToast";

export default function UpdatedAppointmentModal({ open, onClose, onCreated }) {
  /* ─── state ─── */
  const [clients, setClients] = useState([]);
  const [selection, setSelection] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");

  /* which dropdown is open? ("date" | "startTime" | "endTime" | "patient") */
  const [openPopup, setOpenPopup] = useState(null);

  /* ─── fetch patient list on open ─── */
  useEffect(() => {
    if (open) {
      api.get("/clients").then((r) => setClients(r.data));
      // clear form
      setSelection("");
      setDate("");
      setStart("");
      setEnd("");
      setOpenPopup(null);
    }
  }, [open]);

  /* ─── validation helpers ─── */
  const validateDateTime = () => {
    if (!date || !start || !end) return true;

    const now = new Date();
    const startDT = new Date(`${date} ${start}`);
    const endDT = new Date(`${date} ${end}`);

    if (startDT <= now) {
      setErrorMessage(
        "Cannot schedule appointments in the past. Please select a future date and time."
      );
      setShowErrorPopup(true);
      return false;
    }
    if (startDT >= endDT) {
      setErrorMessage(
        startDT.getTime() === endDT.getTime()
          ? "Start time and end time cannot be the same."
          : "Start time cannot be after end time."
      );
      setShowErrorPopup(true);
      return false;
    }
    return true;
  };

  /* ─── submit ─── */
  const submit = async (e) => {
    e.preventDefault();
    if (!validateDateTime()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        type: "individual",
        patient: selection,
        dateTimeStart: formatISO(new Date(`${date} ${start}`)),
        dateTimeEnd: formatISO(new Date(`${date} ${end}`)),
      };
      const { data } = await api.post("/appointments", payload);

      setToastMessage("Appointment created successfully!");
      setToastType("success");
      setShowToast(true);

      setTimeout(() => {
        onCreated(data);
        onClose();
      }, 300);
    } catch (err) {
      console.error("Error creating appointment:", err);
      setToastMessage("Failed to create appointment. Please try again.");
      setToastType("error");
      setShowToast(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ─── misc handlers ─── */
  const handlePopupToggle = (type, isOpen) =>
    setOpenPopup(isOpen ? type : null);

  const handleTimeChange = (which, val) => {
    which === "start" ? setStart(val) : setEnd(val);
    if (showErrorPopup) setShowErrorPopup(false);
  };

  const closeErrorPopup = () => {
    setShowErrorPopup(false);
    setErrorMessage("");
  };

  const getSelectedPatientName = () => {
    if (!selection) return "Select…";
    const p = clients.find((c) => c._id === selection);
    return p ? p.name : "Select…";
  };

  const handleToastClose = () => setShowToast(false);

  /* ─── JSX ─── */
  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="New Appointment"
        className="overflow-visible max-h-[85vh] h-auto w-full max-w-md"
      >
        <div className="relative overflow-visible flex flex-col h-full">
          <form onSubmit={submit} className="flex flex-col h-full">
            <div className="flex-1 space-y-6 relative overflow-visible">
              {/* Patient picker */}
              <div className="space-y-3 relative z-[60]">
                <label className="block text-sm font-medium text-gray-700">
                  Patient<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      handlePopupToggle("patient", openPopup !== "patient")
                    }
                    className="w-full px-4 py-4 bg-gray-50 rounded-xl border border-gray-200 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                  >
                    <span
                      className={selection ? "text-gray-900" : "text-gray-400"}
                    >
                      {getSelectedPatientName()}
                    </span>
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-gray-400" />
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </div>
                  </button>

                  {openPopup === "patient" && (
                    <div className="absolute top-0 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-[100] max-h-48 overflow-y-auto">
                      <div className="p-2">
                        {clients.map((item) => (
                          <button
                            key={item._id}
                            type="button"
                            onClick={() => {
                              setSelection(item._id);
                              setOpenPopup(null);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors ${
                              selection === item._id
                                ? "bg-primary/10 text-primary"
                                : ""
                            }`}
                          >
                            {item.name}
                          </button>
                        ))}
                        {clients.length === 0 && (
                          <div className="px-3 py-2 text-gray-500 text-sm">
                            No clients available
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Date */}
              <div className="relative z-[50]">
                <CustomDatePicker
                  label="Date"
                  value={date}
                  onChange={(v) => {
                    setDate(v);
                    if (showErrorPopup) setShowErrorPopup(false);
                  }}
                  isOpen={openPopup === "date"}
                  onToggle={(isOpen) => handlePopupToggle("date", isOpen)}
                />
              </div>

              {/* Time range */}
              <div className="space-y-3 relative z-[40]">
                <label className="block text-sm font-medium text-gray-700">
                  Time<span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <CustomTimePicker
                    value={start}
                    onChange={(v) => handleTimeChange("start", v)}
                    placeholder="Start time"
                    isOpen={openPopup === "startTime"}
                    onToggle={(o) => handlePopupToggle("startTime", o)}
                  />
                  <CustomTimePicker
                    value={end}
                    onChange={(v) => handleTimeChange("end", v)}
                    placeholder="End time"
                    isOpen={openPopup === "endTime"}
                    onToggle={(o) => handlePopupToggle("endTime", o)}
                  />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-4 pt-2">
              <div className="flex justify-center gap-4">
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
                  {isSubmitting ? "Creating..." : "Confirm"}
                </button>
              </div>
            </div>
            
                    
          </form>
        </div>
      </Modal>

      {/* Error popup */}
      <Modal
        open={showErrorPopup}
        onClose={closeErrorPopup}
        title="Invalid Time"
      >
        <div className="space-y-4">
          <p className="text-gray-700">{errorMessage}</p>
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

      {/* Toast */}
      <SavingToast
        show={showToast}
        message={toastMessage}
        type={toastType}
        onClose={handleToastClose}
      />
    </>
  );
}
