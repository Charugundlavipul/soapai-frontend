"use client"

import { useEffect, useState } from "react"
import Modal from "../components/Modal"
import CustomDatePicker from "../components/CustomDatePicker"
import CustomTimePicker from "../components/CustomTimePicker"
import { ChevronDown, User } from "lucide-react"
import api from "../services/api"
import { formatISO } from "date-fns"

export default function UpdatedAppointmentModal({ open, onClose, onCreated }) {
    const [type, setType] = useState("group")
    const [clients, setClients] = useState([])
    const [groups, setGroups] = useState([])
    const [selection, setSelection] = useState("")
    const [date, setDate] = useState("")
    const [start, setStart] = useState("")
    const [end, setEnd] = useState("")
    const [showErrorPopup, setShowErrorPopup] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")

    // Popup state management
    const [openPopup, setOpenPopup] = useState(null) // 'date', 'startTime', 'endTime', 'patient'

    useEffect(() => {
        if (open) {
            api.get("/clients").then((r) => setClients(r.data))
            api.get("/groups").then((r) => setGroups(r.data))
        }
    }, [open])

    const validateDateTime = () => {
        if (!date || !start || !end) return true

        const now = new Date()
        const appointmentStart = new Date(`${date} ${start}`)
        const appointmentEnd = new Date(`${date} ${end}`)

        if (appointmentStart <= now) {
            setErrorMessage("Cannot schedule appointments in the past. Please select a future date and time.")
            setShowErrorPopup(true)
            return false
        }

        if (appointmentStart >= appointmentEnd) {
            if (appointmentStart.getTime() === appointmentEnd.getTime()) {
                setErrorMessage("Start time and end time cannot be the same.")
            } else {
                setErrorMessage("Start time cannot be after end time.")
            }
            setShowErrorPopup(true)
            return false
        }

        return true
    }

    const submit = async (e) => {
        e.preventDefault()

        if (!validateDateTime()) {
            return
        }

        const payload = {
            type,
            dateTimeStart: formatISO(new Date(`${date} ${start}`)),
            dateTimeEnd: formatISO(new Date(`${date} ${end}`)),
        }
        if (type === "group") payload.group = selection
        if (type === "individual") payload.patient = selection

        try {
            const { data } = await api.post("/appointments", payload)
            onCreated(data)
            onClose()
        } catch (error) {
            console.error("Error creating appointment:", error)
        }
    }

    const handleTimeChange = (timeType, value) => {
        if (timeType === "start") {
            setStart(value)
        } else {
            setEnd(value)
        }

        if (showErrorPopup) {
            setShowErrorPopup(false)
        }
    }

    const closeErrorPopup = () => {
        setShowErrorPopup(false)
        setErrorMessage("")
        setStart("")
        setEnd("")
    }

    const handleDateChange = (value) => {
        setDate(value)
        if (showErrorPopup) {
            setShowErrorPopup(false)
        }
    }

    const handlePopupToggle = (popupType, isOpen) => {
        if (isOpen) {
            setOpenPopup(popupType)
        } else {
            setOpenPopup(null)
        }
    }

    const getSelectedPatientName = () => {
        if (!selection) return "Select…"
        const selectedItem = (type === "group" ? groups : clients).find((item) => item._id === selection)
        return selectedItem ? selectedItem.name : "Select…"
    }

    return (
        <>
            <Modal open={open} onClose={onClose} title="New Appointment">
                <form onSubmit={submit} className="space-y-6">
                    {/* Visit type toggle */}
                    <div className="flex gap-2">
                        {["group", "individual"].map((v) => (
                            <button
                                key={v}
                                type="button"
                                onClick={() => setType(v)}
                                className={`flex-1 py-2 rounded-xl border transition-colors
                            ${type === v ? "bg-primary text-white " : "bg-gray-100 border-gray-200 hover:bg-gray-200"}`}
                            >
                                {v.charAt(0).toUpperCase() + v.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Patient/Group Picker */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">{type === "group" ? "Group" : "Patient"}</label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => handlePopupToggle("patient", openPopup !== "patient")}
                                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                            >
                                <span className={selection ? "text-gray-900" : "text-gray-400"}>{getSelectedPatientName()}</span>
                                <div className="flex items-center gap-2">
                                    <User className="h-5 w-5 text-gray-400" />
                                    <ChevronDown className="h-4 w-4 text-gray-400" />
                                </div>
                            </button>

                            {openPopup === "patient" && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                                    <div className="p-2">
                                        {(type === "group" ? groups : clients).map((item) => (
                                            <button
                                                key={item._id}
                                                type="button"
                                                onClick={() => {
                                                    setSelection(item._id)
                                                    setOpenPopup(null)
                                                }}
                                                className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors ${
                                                    selection === item._id ? "bg-primary/10 text-primary" : ""
                                                }`}
                                            >
                                                {item.name}
                                            </button>
                                        ))}
                                        {(type === "group" ? groups : clients).length === 0 && (
                                            <div className="px-3 py-2 text-gray-500 text-sm">
                                                No {type === "group" ? "groups" : "clients"} available
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <CustomDatePicker
                        label="Date"
                        value={date}
                        onChange={handleDateChange}
                        isOpen={openPopup === "date"}
                        onToggle={(isOpen) => handlePopupToggle("date", isOpen)}
                    />

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Time</label>
                        <div className="flex gap-3">
                            <CustomTimePicker
                                value={start}
                                onChange={(value) => handleTimeChange("start", value)}
                                placeholder="Start time"
                                isOpen={openPopup === "startTime"}
                                onToggle={(isOpen) => handlePopupToggle("startTime", isOpen)}
                            />
                            <CustomTimePicker
                                value={end}
                                onChange={(value) => handleTimeChange("end", value)}
                                placeholder="End time"
                                isOpen={openPopup === "endTime"}
                                onToggle={(isOpen) => handlePopupToggle("endTime", isOpen)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 rounded-xl border border-primary text-primary hover:bg-primary/10 transition-colors"
                        >
                            Cancel
                        </button>
                        <button className="px-6 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors">
                            Confirm
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Error Popup */}
            <Modal open={showErrorPopup} onClose={closeErrorPopup} title="Invalid Time">
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
                            <h3 className="font-semibold text-gray-900">Time Validation Error</h3>
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
        </>
    )
}
