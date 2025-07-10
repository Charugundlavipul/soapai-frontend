"use client"

import { useEffect, useRef, useState } from "react"
import Modal from "../components/Modal"
import { getCategories } from "../services/api"
import { XMarkIcon, CheckIcon, ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/solid"

/**
 * open         : boolean
 * onClose      : () => void
 * currentGoals : [string]
 * onSave       : (goals:[string], goalProgressRows:[{…}]) => void
 */
export default function EditGoalsModal({ open, onClose, currentGoals, onSave }) {
  const [goalCategories, setGoalCategories] = useState([]) // [{name, description, goals: [...]}]
  const [expandedCategories, setExpandedCategories] = useState(new Set()) // Start with all closed
  const [sel, setSel] = useState([]) // working list
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [ddOpen, setDdOpen] = useState(false)
  const ddRef = useRef(null)

  /* load bank & initialise selection */
  useEffect(() => {
    if (!open) return

    setIsLoading(true)
    setError("")

    getCategories()
        .then((r) => {
          setGoalCategories(r.data)
          // Keep categories closed by default
          setExpandedCategories(new Set())
        })
        .catch(() => {
          setError("Failed to load goals. Please try again.")
        })
        .finally(() => {
          setIsLoading(false)
        })

    setSel(currentGoals || [])
  }, [open, currentGoals])

  /* click-outside dropdown */
  useEffect(() => {
    const h = (e) => ddRef.current && !ddRef.current.contains(e.target) && setDdOpen(false)
    if (ddOpen) document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [ddOpen])

  /* toggle goal selection (add/remove) */
  const toggleGoal = (goalName) => {
    setSel(
        (prev) =>
            prev.includes(goalName)
                ? prev.filter((x) => x !== goalName) // Remove if already selected
                : [...prev, goalName], // Add if not selected
    )
    setError("")
  }

  const removeGoal = (goalName) => setSel((prev) => prev.filter((x) => x !== goalName))

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

  /* turn list of names → full rows with progress metadata */
  const buildRows = () =>
      sel.map((name) => ({
        name,
        progress: 0,
        comment: "",
        startDate: new Date(),
        targetDate: null,
        associated: [],
      }))

  const save = () => {
    if (!sel.length) {
      setError("Please select at least one goal")
      setTimeout(() => setError(""), 3000)
      return
    }
    onSave(sel, buildRows()) // pass both arrays upward
  }

  if (!open) return null

  return (
      <Modal open={open} onClose={onClose} title="Edit Goals">
        <div className="space-y-6">
          {/* Error Message */}
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

          {/* Goal Selection Section */}
          <div ref={ddRef} className="space-y-2 relative">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-900">Select Goals</label>
            </div>

            <button
                type="button"
                onClick={() => setDdOpen((o) => !o)}
                disabled={isLoading}
                className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
            <span>
              {isLoading
                  ? "Loading goals..."
                  : sel.length > 0
                      ? `${sel.length} goal${sel.length === 1 ? "" : "s"} selected`
                      : "Select goals..."}
            </span>
              <ChevronDownIcon className={`h-4 w-4 transition-transform ${ddOpen ? "rotate-180" : ""}`} />
            </button>

            {ddOpen && !isLoading && (
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
                                      const isSelected = sel.includes(goal.name)
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
                                    No goals in this category
                                  </div>
                              )}
                            </div>
                        ))}

                        {/* Done button to close dropdown */}
                        {sel.length > 0 && (
                            <div className="p-3 border-t border-gray-100">
                              <button
                                  type="button"
                                  onClick={() => setDdOpen(false)}
                                  className="w-full px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                              >
                                Done ({sel.length} selected)
                              </button>
                            </div>
                        )}

                        {/* Bottom padding for better spacing */}
                        <div className="h-3"></div>
                      </>
                  ) : (
                      <div className="px-4 py-6 text-gray-400 text-center text-sm">No goal categories available.</div>
                  )}
                </div>
            )}
          </div>

          {/* Selected Goals Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-green-500" />
                Selected Goals
              </h3>
              {sel.length > 0 && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                {sel.length} goal{sel.length !== 1 ? "s" : ""}
              </span>
              )}
            </div>

            {sel.length === 0 ? (
                <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                  <div className="text-sm font-medium">No goals selected yet</div>
                  <div className="text-xs mt-1">Choose goals from the dropdown above to get started</div>
                </div>
            ) : (
                <div className="space-y-2">
                  {sel.map((goalName) => {
                    // Find the goal's category for display
                    const goalMeta = goalCategories
                        .flatMap((cat) => cat.goals?.map((g) => ({ ...g, category: cat.name })) || [])
                        .find((g) => g.name === goalName)

                    return (
                        <div
                            key={goalName}
                            className="group flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 shadow-sm"
                        >
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-medium text-gray-900 text-sm truncate">{goalName}</span>
                            {goalMeta?.category && <span className="text-xs text-gray-500 mt-0.5">{goalMeta.category}</span>}
                          </div>
                          <button
                              onClick={() => removeGoal(goalName)}
                              className="ml-3 p-1.5 rounded-full hover:bg-red-100 transition-colors duration-200 group flex-shrink-0"
                              title="Remove goal"
                          >
                            <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-red-500 transition-colors duration-200" />
                          </button>
                        </div>
                    )
                  })}
                </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-6 mt-8 border-t border-gray-100">
          <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
          >
            Cancel
          </button>
          <button
              onClick={save}
              className="px-8 py-2.5 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={sel.length === 0}
          >
            Save Goals ({sel.length})
          </button>
        </div>
      </Modal>
  )
}
