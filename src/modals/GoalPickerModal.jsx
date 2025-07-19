"use client"

// src/modals/GoalPickerModal.jsx
import { useEffect, useState } from "react"
import Modal from "../components/Modal"
import { ChevronRightIcon, XMarkIcon } from "@heroicons/react/24/solid" // Changed icons from lucide-react to heroicons
import SavingToast from "../components/savingToast" // Added SavingToast import
import { getCategories } from "../services/api"
import api from "../services/api"

/**
 * Props
 * ──────────────────────────────────────────────────────────
 * open        : boolean
 * onClose     : () => void
 * video       : { _id, appointment, goals:[string|{name,category}] }
 * onSaved     : (updatedVideo) => void
 */
export default function GoalPickerModal({ open, onClose, video, onSaved }) {
  /* ───── state ───── */
  const [cats, setCats] = useState([]) // [{ _id,name,goals:[{name,…}] }]
  const [allowed, setAllowed] = useState(new Set()) // Set<string>
  const [sel, setSel] = useState([]) // [goalName,…]
  const [busy, setBusy] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState(new Set()) // Added for category expansion
  const [showToast, setShowToast] = useState(false) // Added for toast
  const [toastMessage, setToastMessage] = useState("") // Added for toast

  /* ───── helper: load goals for a single patient id ───── */
  const fetchPatientGoals = async (pid) => {
    const { data } = await api.get(`/clients/${pid}`)
    return data.goals || []
  }

  /* ───── load data every time modal opens ───── */
  useEffect(() => {
    if (!open) {
      // Reset toast state when modal closes
      setShowToast(false)
      setToastMessage("")
      return
    }

    // Reset toast state when modal opens
    setShowToast(false)
    setToastMessage("")
    ;(async () => {
      let goalSet = new Set() // Move this declaration outside the try block

      /* 1️⃣  Figure out which goals are *eligible* for this video */
      try {
        // For client profile editing, we'll allow all goals from categories
        // or if appointment is provided, use the original logic
        if (video.appointment && video.appointment !== "individual-session") {
          const { data: appt } = await api.get(`/appointments/${video.appointment}`)

          if (appt.type === "individual") {
            const pid = typeof appt.patient === "string" ? appt.patient : appt.patient?._id
            ;(await fetchPatientGoals(pid)).forEach((g) => goalSet.add(g))
          } else {
            const gid = typeof appt.group === "string" ? appt.group : appt.group?._id
            const { data: group } = await api.get(`/groups/${gid}`)
            const uniq = new Set()
            for (const p of group.patients) {
              ;(await fetchPatientGoals(p._id || p)).forEach((g) => uniq.add(g))
            }
            goalSet = uniq
          }
        } else {
          // For client profile editing, load all available goals from categories
          const categoriesResponse = await getCategories()
          categoriesResponse.data.forEach((cat) => {
            cat.goals.forEach((goal) => goalSet.add(goal.name))
          })
        }
        setAllowed(goalSet)
      } catch (err) {
        console.error("Unable to compute eligible goals for GoalPicker:", err)
        // Fallback: load all goals from categories
        try {
          const categoriesResponse = await getCategories()
          categoriesResponse.data.forEach((cat) => {
            cat.goals.forEach((goal) => goalSet.add(goal.name))
          })
          setAllowed(goalSet)
        } catch (fallbackErr) {
          setAllowed(new Set()) // ultimate fallback → nothing selectable
        }
      }

      /* 2️⃣  Load all categories (we filter them at render-time) */
      const categoriesResponse = await getCategories() // Re-fetch to ensure latest categories
      const r = categoriesResponse
      setCats(r.data)
      // Auto-expand categories that have allowed goals
      const categoriesToExpand = new Set()
      r.data.forEach((cat) => {
        if (cat.goals.some((g) => goalSet.has(g.name))) {
          categoriesToExpand.add(cat._id)
        }
      })
      setExpandedCategories(categoriesToExpand)

      /* 3️⃣  Pre-select existing goals attached to the video */
      setSel(video.goals?.map((g) => (typeof g === "string" ? g : g.name)) || [])
    })()
  }, [open, video])

  /* ───── toggle selection ───── */
  const toggle = (name) => setSel((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]))

  /* ───── remove goal from selection ───── */
  const removeGoal = (goalName) => setSel((s) => s.filter((x) => x !== goalName)) // Added for selected goals display

  /* ───── toggle category expansion ───── */
  const toggleCategoryExpansion = (categoryId) => { // Added for category expansion
    setExpandedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  /* ───── persist to server ───── */
  const save = async () => {
    setBusy(true)
    try {
      // For client profile editing, update the client's goals directly
      const { data } = await api.patch(`/clients/${video._id}/goals`, { // Changed API endpoint
        goals: sel,
      })
      onSaved({ ...video, goals: sel }) // parent does setClient(…)
      onClose()

      // Show success toast AFTER modal is closed
      setTimeout(() => {
        setToastMessage(`Goals updated successfully! ${sel.length} goal${sel.length === 1 ? "" : "s"} selected.`)
        setShowToast(true)
      }, 200)
    } catch (e) {
      // Show error toast immediately for errors (don't close modal)
      setToastMessage(e.response?.data?.message || "Failed to update goals")
      setShowToast(true)
    } finally {
      setBusy(false)
    }
  }

  if (!open)
    return (
        <>
          {/* Toast Notification - Show outside modal when closed */}
          <SavingToast
              show={showToast}
              message={toastMessage}
              onClose={() => setShowToast(false)}
              type={toastMessage.includes("successfully") ? "success" : "error"}
          />
        </>
    )

  // Filter categories to only show those with allowed goals
  const filteredCategories = cats
      .map((cat) => ({
        ...cat,
        goals: cat.goals.filter((g) => allowed.has(g.name)),
      }))
      .filter((cat) => cat.goals.length) // hide empty cats

  /* ───── UI ───── */
  return (
      <>
        <Modal wide open={open} onClose={onClose} title="Select Goals"> {/* Changed title */}
          <div className="space-y-6">
            {/* Goals Selection Area */}
            <div className="space-y-4">
              <div className="max-h-[400px] overflow-y-auto border border-gray-200 rounded-xl">
                {filteredCategories.length > 0 ? (
                    <>
                      {filteredCategories.map((category) => (
                          <div key={category._id} className="border-b border-gray-100 last:border-b-0">
                            {/* Category Header */}
                            <button
                                type="button"
                                onClick={() => toggleCategoryExpansion(category._id)}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex justify-between items-center font-medium text-sm text-gray-900 bg-gray-25"
                            >
                              <div className="flex items-center gap-2">
                                <ChevronRightIcon
                                    className={`h-4 w-4 transition-transform text-gray-400 ${
                                        expandedCategories.has(category._id) ? "rotate-90" : ""
                                    }`}
                                />
                                <span>{category.name}</span>
                              </div>
                              <span className="text-xs text-gray-400">{category.goals?.length || 0} goals</span>
                            </button>

                            {/* Category Goals */}
                            {expandedCategories.has(category._id) && category.goals && category.goals.length > 0 && (
                                <div className="bg-gray-25">
                                  {category.goals.map((goal) => {
                                    const isSelected = sel.includes(goal.name)
                                    return (
                                        <button
                                            key={goal._id || goal.name}
                                            type="button"
                                            onClick={() => toggle(goal.name)}
                                            className={`w-full pl-12 pr-4 py-2.5 text-left hover:bg-gray-100 text-sm font-medium flex justify-between items-center transition-colors ${
                                                isSelected ? "bg-primary/5" : "hover:bg-gray-50"
                                            }`}
                                        >
                                          <span className={isSelected ? "text-primary" : "text-gray-700"}>{goal.name}</span>
                                          {isSelected && (
                                              <div className="w-4 h-4 bg-[#3D298D] rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                                                <svg className="w-2 h-2 text-white" viewBox="0 0 8 8" fill="currentColor">
                                                  <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z" />
                                                </svg>
                                              </div>
                                          )}
                                        </button>
                                    )
                                  })}
                                </div>
                            )}

                            {/* Empty category message */}
                            {expandedCategories.has(category._id) && (!category.goals || category.goals.length === 0) && (
                                <div className="pl-12 pr-4 py-2.5 text-xs text-gray-400 italic bg-gray-25">
                                  No goals available for this client
                                </div>
                            )}
                          </div>
                      ))}
                    </>
                ) : (
                    <div className="px-4 py-8 text-gray-400 text-center text-sm">No goals available for this client.</div>
                )}
              </div>
            </div>

            {/* Selected Goals Display */}
            {sel.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-900">Selected Goals ({sel.length})</label>
                    <button
                        type="button"
                        onClick={() => setSel([])}
                        className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sel.map((goalName) => (
                        <span
                            key={goalName}
                            className="inline-flex items-center gap-1.5 bg-primary/10 text-primary rounded-full px-3 py-1.5 text-sm font-medium"
                        >
                    {goalName}
                          <button
                              type="button"
                              onClick={() => removeGoal(goalName)}
                              className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                          >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                    ))}
                  </div>
                </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-6">
            <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl border border-primary text-primary font-medium hover:bg-primary/5 transition-colors"
            >
              Cancel
            </button>
            <button
                disabled={busy}
                onClick={save}
                className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy ? "Saving..." : `Save ${sel.length > 0 ? `(${sel.length})` : ""}`}
            </button>
          </div>
        </Modal>

        {/* Toast Notification - Only show error toasts when modal is open */}
        {!toastMessage.includes("successfully") && (
            <SavingToast show={showToast} message={toastMessage} onClose={() => setShowToast(false)} type="error" />
        )}
      </>
  )
}
