"use client"

import { useEffect, useState } from "react"
import Modal from "../components/Modal"
import api from "../services/api"
import { formatISO } from "date-fns"
import SingleSelectDropdown from "../components/single-select-dropdown"
import CustomDatePicker from "../components/CustomDatePicker"
import CustomTimePicker from "./../components/CustomTimePicker"
import SavingToast from "../components/savingToast"

export default function EditAppointmentModal({ open, onClose, appt, onUpdated, onDeleted }) {
  const [groups, setGroups] = useState([])
  const [clients, setClients] = useState([])
  const [form, setForm] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  // Toast states
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [toastType, setToastType] = useState("success")

  // Date/Time picker states
  const [startDatePickerOpen, setStartDatePickerOpen] = useState(false)
  const [startTimePickerOpen, setStartTimePickerOpen] = useState(false)
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false)
  const [endTimePickerOpen, setEndTimePickerOpen] = useState(false)

  useEffect(() => {
    if (open && appt) {
      // Reset all picker states when modal opens
      setStartDatePickerOpen(false)
      setStartTimePickerOpen(false)
      setEndDatePickerOpen(false)
      setEndTimePickerOpen(false)

      // Load data
      api.get("/groups").then((r) => setGroups(r.data || []))
      api.get("/clients").then((r) => setClients(r.data || []))

      // Initialize form
      const startDate = new Date(appt.dateTimeStart)
      const endDate = new Date(appt.dateTimeEnd)

      setForm({
        type: appt.type || "",
        group: appt.group?._id || "",
        patient: appt.patient?._id || "",
        startDate: formatISO(startDate).slice(0, 10),
        startTime: formatISO(startDate).slice(11, 16),
        endDate: formatISO(endDate).slice(0, 10),
        endTime: formatISO(endDate).slice(11, 16),
      })
    }
  }, [open, appt])

  // Options for dropdowns
  const typeOptions = [
    { id: "individual", label: "Individual" },
    { id: "group", label: "Group" },
  ]

  const groupOptions = groups.map((g) => ({
    id: g._id,
    label: g.name,
  }))

  const clientOptions = clients.map((c) => ({
    id: c._id,
    label: c.name,
  }))

  // Event handlers
  const handleTypeChange = (selectedId) => {
    setForm((f) => ({
      ...f,
      type: selectedId,
      group: "",
      patient: "",
    }))
  }

  const handleGroupChange = (selectedId) => {
    setForm((f) => ({ ...f, group: selectedId || "" }))
  }

  const handlePatientChange = (selectedId) => {
    setForm((f) => ({ ...f, patient: selectedId || "" }))
  }

  const handleStartDateChange = (date) => {
    setForm((f) => ({ ...f, startDate: date }))
  }

  const handleStartTimeChange = (time) => {
    setForm((f) => ({ ...f, startTime: time }))
  }

  const handleEndDateChange = (date) => {
    setForm((f) => ({ ...f, endDate: date }))
  }

  const handleEndTimeChange = (time) => {
    setForm((f) => ({ ...f, endTime: time }))
  }

  const showSuccessToast = (message) => {
    setToastMessage(message)
    setToastType("success")
    setShowToast(true)
  }

  const showErrorToast = (message) => {
    setToastMessage(message)
    setToastType("error")
    setShowToast(true)
  }

  const save = async (e) => {
    e.preventDefault()

    if (!form.type || !form.startDate || !form.startTime || !form.endDate || !form.endTime) {
      showErrorToast("Please fill in all required fields")
      return
    }

    if (form.type === "group" && !form.group) {
      showErrorToast("Please select a group")
      return
    }

    if (form.type === "individual" && !form.patient) {
      showErrorToast("Please select a patient")
      return
    }

    setIsLoading(true)

    try {
      const startDateTime = new Date(`${form.startDate}T${form.startTime}`)
      const endDateTime = new Date(`${form.endDate}T${form.endTime}`)

      if (endDateTime <= startDateTime) {
        showErrorToast("End time must be after start time")
        setIsLoading(false)
        return
      }

      const payload = {
        type: form.type,
        dateTimeStart: startDateTime,
        dateTimeEnd: endDateTime,
      }

      if (form.type === "group") payload.group = form.group
      if (form.type === "individual") payload.patient = form.patient

      const { data } = await api.patch(`/appointments/${appt._id}`, payload)

      onUpdated(data)
      showSuccessToast("Appointment updated successfully!")

      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error) {
      console.error("Error updating appointment:", error)
      showErrorToast("Failed to update appointment. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const del = async () => {
    if (!window.confirm("Are you sure you want to delete this appointment?")) {
      return
    }

    setIsLoading(true)

    try {
      await api.delete(`/appointments/${appt._id}`)

      onDeleted(appt)
      showSuccessToast("Appointment deleted successfully!")

      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error) {
      console.error("Error deleting appointment:", error)
      showErrorToast("Failed to delete appointment. Please try again.")
      setIsLoading(false)
    }
  }

  if (!appt) return null

  return (
      <>
        <Modal open={open} onClose={onClose} title="Edit Appointment">
          <div className="p-6">
            <form onSubmit={save} className="space-y-6">
              {/* Appointment Type */}
              <div>
                <SingleSelectDropdown
                    options={typeOptions}
                    selectedId={form.type}
                    onSelectionChange={handleTypeChange}
                    placeholder="Select appointment type..."
                    label="Appointment Type"
                    size="md"
                    disabled={isLoading}
                    required
                />
              </div>

              {/* Group/Patient Selection */}
              {form.type === "group" && (
                  <div>
                    <SingleSelectDropdown
                        options={groupOptions}
                        selectedId={form.group}
                        onSelectionChange={handleGroupChange}
                        placeholder="Select group..."
                        label="Group"
                        size="md"
                        disabled={isLoading}
                        required
                    />
                  </div>
              )}

              {form.type === "individual" && (
                  <div>
                    <SingleSelectDropdown
                        options={clientOptions}
                        selectedId={form.patient}
                        onSelectionChange={handlePatientChange}
                        placeholder="Select patient..."
                        label="Patient"
                        size="md"
                        disabled={isLoading}
                        required
                    />
                  </div>
              )}

              {/* Start Date & Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Start Date & Time</label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <button
                          type="button"
                          onClick={() => setStartDatePickerOpen(!startDatePickerOpen)}
                          className="w-full px-3 py-3 bg-gray-50 rounded-xl border border-gray-200 text-left flex items-center justify-between hover:bg-gray-100"
                      >
                      <span className={form.startDate ? "text-gray-900 text-sm" : "text-gray-400 text-sm"}>
                        {form.startDate ? new Date(form.startDate + "T00:00:00").toLocaleDateString() : "mm/dd/yyyy"}
                      </span>
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                      </button>
                      {startDatePickerOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-[200] max-w-xs">
                            <CustomDatePicker
                                value={form.startDate}
                                onChange={handleStartDateChange}
                                label=""
                                isOpen={true}
                                onToggle={setStartDatePickerOpen}
                            />
                          </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="relative">
                      <CustomTimePicker
                          value={form.startTime}
                          onChange={handleStartTimeChange}
                          placeholder="Start Time"
                          isOpen={startTimePickerOpen}
                          onToggle={setStartTimePickerOpen}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* End Date & Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">End Date & Time</label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <button
                          type="button"
                          onClick={() => setEndDatePickerOpen(!endDatePickerOpen)}
                          className="w-full px-3 py-3 bg-gray-50 rounded-xl border border-gray-200 text-left flex items-center justify-between hover:bg-gray-100"
                      >
                      <span className={form.endDate ? "text-gray-900 text-sm" : "text-gray-400 text-sm"}>
                        {form.endDate ? new Date(form.endDate + "T00:00:00").toLocaleDateString() : "mm/dd/yyyy"}
                      </span>
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                      </button>
                      {endDatePickerOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-[200] max-w-xs">
                            <CustomDatePicker
                                value={form.endDate}
                                onChange={handleEndDateChange}
                                label=""
                                isOpen={true}
                                onToggle={setEndDatePickerOpen}
                            />
                          </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="relative">
                      <CustomTimePicker
                          value={form.endTime}
                          onChange={handleEndTimeChange}
                          placeholder="End Time"
                          isOpen={endTimePickerOpen}
                          onToggle={setEndTimePickerOpen}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                <button
                    type="button"
                    onClick={del}
                    disabled={isLoading}
                    className="px-6 py-3 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-xl hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isLoading ? "Deleting..." : "Delete"}
                </button>

                <div className="flex gap-3">
                  <button
                      type="button"
                      onClick={onClose}
                      disabled={isLoading}
                      className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                      type="submit"
                      disabled={isLoading}
                      className="px-8 py-3 text-sm font-medium text-white bg-primary border border-transparent rounded-xl hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isLoading ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </Modal>

        {/* Toast Notification */}
        <SavingToast show={showToast} message={toastMessage} type={toastType} onClose={() => setShowToast(false)} />
      </>
  )
}
