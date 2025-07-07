"use client"

import { useState, useEffect, useRef } from "react"
import api, { getCategories } from "../services/api"
import { ChevronDownIcon, XMarkIcon, PlusIcon, ChevronRightIcon } from "@heroicons/react/24/solid"
import GoalManagementModal from "./createGoalModel"

export default function NewClientModal({ open, onClose, onCreated }) {
  /* ─── basic form ─── */
  const [form, setForm] = useState({
    name: "",
    age: "",
    pastHistory: [],
    goals: [], // array of goal *names*
  })
  const [file, setFile] = useState(null)

  /* ─── goal bank organized by categories ─── */
  const [goalCategories, setGoalCategories] = useState([]) // [{ name, description, goals: [...] }]
  const [expandedCategories, setExpandedCategories] = useState(new Set()) // Start with all closed
  const [ddOpen, setDdOpen] = useState(false)
  const [showGoalManagement, setShowGoalManagement] = useState(false)
  const ddRef = useRef(null)

  useEffect(() => {
    if (!open) return
    refreshGoalBank()
  }, [open])

  const refreshGoalBank = async () => {
    try {
      const r = await getCategories()
      setGoalCategories(r.data)
      // Keep categories closed by default - remove auto-expansion
      setExpandedCategories(new Set())
    } catch (error) {
      console.error("Failed to fetch goal bank:", error)
    }
  }

  /* click-outside dropdown */
  useEffect(() => {
    const h = (e) => ddRef.current && !ddRef.current.contains(e.target) && setDdOpen(false)
    if (ddOpen) document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [ddOpen])

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  /* toggle goal selection (add/remove) */
  const toggleGoal = (goalName) => {
    setForm((f) => ({
      ...f,
      goals: f.goals.includes(goalName)
          ? f.goals.filter((x) => x !== goalName) // Remove if already selected
          : [...f.goals, goalName], // Add if not selected
    }))
  }

  const removeGoal = (goalName) => setForm((f) => ({ ...f, goals: f.goals.filter((x) => x !== goalName) }))

  /* toggle category expansion in dropdown */
  const toggleCategoryExpansion = (categoryId) => {
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

  /* handle goal management modal */
  const handleGoalManagementClose = () => {
    setShowGoalManagement(false)
    refreshGoalBank() // Refresh the goal bank when closing goal management
  }

  /* ---------- submit ---------- */
  const submit = async (e) => {
    e.preventDefault()

    const fd = new FormData()
    fd.append("name", form.name)
    fd.append("age", form.age)
    form.pastHistory.forEach((h) => fd.append("pastHistory", h))
    form.goals.forEach((g) => fd.append("goals", g))

    /* ▶ initialise goalProgress rows */
    form.goals.forEach((g) =>
        fd.append(
            "goalProgress",
            JSON.stringify({
              name: g,
              progress: 0,
              comment: "",
              startDate: new Date(),
              targetDate: null,
              associated: [], // history of activities
            }),
        ),
    )

    if (file) fd.append("avatar", file)

    try {
      const { data } = await api.post("/clients", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      onCreated(data)
      onClose()

      // Reset form
      setForm({
        name: "",
        age: "",
        pastHistory: [],
        goals: [],
      })
      setFile(null)
    } catch (error) {
      console.error("Failed to create client:", error)
      alert(error.response?.data?.message || "Failed to create client")
    }
  }

  /* ---------- UI ---------- */
  return (
      <>
        <div className={`fixed inset-0 z-40 ${open ? "block" : "hidden"}`}>
          <div className="fixed inset-0 bg-black/40" onClick={onClose}></div>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[95vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex justify-between items-center p-6 pb-4 flex-shrink-0">
                <h2 className="text-xl font-semibold text-primary">Create New Client</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 overflow-y-auto">
                <form onSubmit={submit} className="px-6 pb-6 space-y-6">
                  {/* Avatar Upload */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Profile Picture</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFile(e.target.files[0])}
                        className="w-full border border-gray-200 rounded-xl p-4 text-center text-sm cursor-pointer hover:border-gray-300 transition-colors"
                    />
                  </div>

                  {/* Name and Age - Side by side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Name</label>
                      <input
                          name="name"
                          value={form.name}
                          onChange={change}
                          required
                          className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Age</label>
                      <input
                          name="age"
                          value={form.age}
                          onChange={change}
                          type="number"
                          className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  {/* Diagnosis */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Diagnosis</label>
                    <div className="flex gap-2">
                      <input
                          placeholder="Type and press Enter"
                          className="flex-1 bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              const value = e.target.value.trim()
                              if (value && !form.pastHistory.includes(value)) {
                                setForm((f) => ({ ...f, pastHistory: [...f.pastHistory, value] }))
                                e.target.value = ""
                              }
                            }
                          }}
                      />
                      <button
                          type="button"
                          className="px-4 py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                          onClick={(e) => {
                            const input = e.target.parentElement.querySelector("input")
                            const value = input.value.trim()
                            if (value && !form.pastHistory.includes(value)) {
                              setForm((f) => ({ ...f, pastHistory: [...f.pastHistory, value] }))
                              input.value = ""
                            }
                          }}
                      >
                        Add
                      </button>
                    </div>

                    {/* Diagnosis chips */}
                    {form.pastHistory.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {form.pastHistory.map((item, index) => (
                              <span
                                  key={index}
                                  className="inline-flex items-center gap-1 bg-primary text-white rounded-full px-3 py-1 text-xs"
                              >
                          {item}
                                <button
                                    type="button"
                                    onClick={() =>
                                        setForm((f) => ({ ...f, pastHistory: f.pastHistory.filter((_, i) => i !== index) }))
                                    }
                                    className="hover:bg-white/20 rounded-full p-0.5"
                                >
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </span>
                          ))}
                        </div>
                    )}
                  </div>

                  {/* Goals */}
                  <div ref={ddRef} className="space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900">Goals</label>
                      <button
                          type="button"
                          onClick={() => setShowGoalManagement(true)}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Create New Goal
                      </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setDdOpen((o) => !o)}
                        className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                    <span>
                      {form.goals.length > 0
                          ? `${form.goals.length} goal${form.goals.length === 1 ? "" : "s"} selected`
                          : "Select goals..."}
                    </span>
                      <ChevronDownIcon className={`h-4 w-4 transition-transform ${ddOpen ? "rotate-180" : ""}`} />
                    </button>

                    {ddOpen && (
                        <div className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg">
                          {goalCategories.length > 0 ? (
                              <>
                                {goalCategories.map((category) => (
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

                                      {/* Category Goals - Multi-select with checkmarks */}
                                      {expandedCategories.has(category._id) && category.goals && category.goals.length > 0 && (
                                          <div className="bg-gray-25">
                                            {category.goals.map((goal) => {
                                              const isSelected = form.goals.includes(goal.name)
                                              return (
                                                  <button
                                                      key={goal._id || goal.name}
                                                      type="button"
                                                      onClick={() => toggleGoal(goal.name)}
                                                      className={`w-full pl-12 pr-4 py-2.5 text-left hover:bg-gray-100 text-sm font-medium flex justify-between items-center border-l-2 transition-colors ${
                                                          isSelected
                                                              ? "border-l-primary/40 bg-primary/5"
                                                              : "border-l-transparent hover:border-l-primary/20"
                                                      }`}
                                                  >
                                        <span className={isSelected ? "text-primary" : "text-gray-700"}>
                                          {goal.name}
                                        </span>
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
                                      {expandedCategories.has(category._id) &&
                                          (!category.goals || category.goals.length === 0) && (
                                              <div className="pl-12 pr-4 py-2.5 text-xs text-gray-400 italic bg-gray-25">
                                                No goals in this category
                                              </div>
                                          )}
                                    </div>
                                ))}

                                {/* Done button to close dropdown */}
                                {form.goals.length > 0 && (
                                    <div className="p-3 border-t border-gray-100">
                                      <button
                                          type="button"
                                          onClick={() => setDdOpen(false)}
                                          className="w-full px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                                      >
                                        Done ({form.goals.length} selected)
                                      </button>
                                    </div>
                                )}

                                {/* Bottom padding for better spacing */}
                                <div className="h-3"></div>
                              </>
                          ) : (
                              <div className="px-4 py-6 text-gray-400 text-center text-sm">
                                No goal categories available. Click "Create New Goal" to create some.
                              </div>
                          )}
                        </div>
                    )}

                    {/* Selected goal chips */}
                    {form.goals.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-600">Goals (auto-collected)</label>
                          <div className="flex flex-wrap gap-2">
                            {form.goals.map((goalName) => (
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
                </form>
              </div>

              {/* Footer - Fixed at bottom */}
              <div className="flex justify-end gap-3 p-6 pt-4 border-t border-gray-100 flex-shrink-0">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl border border-primary text-primary font-medium hover:bg-primary/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                    type="submit"
                    onClick={submit}
                    className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Goal Management Modal */}
        <GoalManagementModal
            open={showGoalManagement}
            onClose={handleGoalManagementClose}
            onGoalBankUpdated={refreshGoalBank}
        />
      </>
  )
}
