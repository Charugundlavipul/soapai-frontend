"use client"

import { useEffect, useRef, useState } from "react"
import Modal from "../components/Modal"
import { getCategories } from "../services/api"
import { XMarkIcon, PlusIcon, CheckIcon } from "@heroicons/react/24/solid"

/**
 * open         : boolean
 * onClose      : () => void
 * currentGoals : [string]
 * onSave       : (goals:[string], goalProgressRows:[{…}]) => void
 */
export default function EditGoalsModal({ open, onClose, currentGoals, onSave }) {
  const [bank, setBank] = useState([]) // [{name,category}]
  const [sel, setSel] = useState([]) // working list
  const [pick, setPick] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const first = useRef(null)
  const dropdownRef = useRef(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  /* load bank & initialise selection */
  useEffect(() => {
    if (!open) return

    setIsLoading(true)
    setError("")

    getCategories()
        .then((r) => {
          const flat = r.data.flatMap((cat) => cat.goals.map((g) => ({ name: g.name, category: cat.name })))
          setBank(flat)
        })
        .catch(() => {
          setError("Failed to load goals. Please try again.")
        })
        .finally(() => {
          setIsLoading(false)
        })

    setSel(currentGoals || [])
    setPick("")
    setTimeout(() => first.current?.focus(), 100)
  }, [open, currentGoals])

  const add = () => {
    if (!pick) return
    if (sel.includes(pick)) {
      setError("Goal already selected")
      setTimeout(() => setError(""), 3000)
      return
    }
    setSel([...sel, pick])
    setPick("")
    setDropdownOpen(false)
    setError("")
  }

  const remove = (g) => setSel(sel.filter((x) => x !== g))
  const remain = bank.filter((g) => !sel.includes(g.name))

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [dropdownOpen])

  if (!open) return null

  return (
      <Modal open={open} onClose={onClose} title="Edit Goals">
        <div className="space-y-6">
          {/* Error Message */}
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

          {/* Add Goal Section */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Add New Goal</label>
                <div className="flex gap-3">
                  <div className="flex-1 relative" ref={dropdownRef}>
                    {/* Custom Dropdown */}
                    <div className="relative">
                      <button
                          ref={first}
                          type="button"
                          onClick={() => setDropdownOpen(!dropdownOpen)}
                          disabled={isLoading}
                          className="w-full rounded-lg border border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm disabled:bg-gray-100 disabled:cursor-not-allowed px-3 py-2.5 text-left bg-white flex items-center justify-between"
                      >
                      <span className={pick ? "text-gray-900" : "text-gray-500"}>
                        {isLoading ? "Loading goals..." : pick || "Choose a goal to add..."}
                      </span>
                        <svg
                            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Dropdown Menu */}
                      {dropdownOpen && !isLoading && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {remain.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-gray-500 text-center">No more goals available</div>
                            ) : (
                                <div className="py-1">
                                  {remain.map((g) => (
                                      <button
                                          key={g.name}
                                          type="button"
                                          onClick={() => {
                                            setPick(g.name)
                                            setDropdownOpen(false)
                                          }}
                                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors duration-150"
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium text-gray-900">{g.name}</span>
                                          <span className="text-xs text-gray-500">{g.category}</span>
                                        </div>
                                      </button>
                                  ))}
                                </div>
                            )}
                          </div>
                      )}
                    </div>
                  </div>
                  <button
                      type="button"
                      onClick={add}
                      disabled={!pick || isLoading}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add
                  </button>
                </div>
              </div>
            </div>
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
                <div>
                  <div className="space-y-2">
                    {sel.map((name) => {
                      const meta = bank.find((b) => b.name === name)
                      return (
                          <div
                              key={name}
                              className="group flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 shadow-sm"
                          >
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="font-medium text-gray-900 text-sm truncate">{name}</span>
                              {meta?.category && <span className="text-xs text-gray-500 mt-0.5">{meta.category}</span>}
                            </div>
                            <button
                                onClick={() => remove(name)}
                                className="ml-3 p-1.5 rounded-full hover:bg-red-100 transition-colors duration-200 group flex-shrink-0"
                                title="Remove goal"
                            >
                              <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-red-500 transition-colors duration-200" />
                            </button>
                          </div>
                      )
                    })}
                  </div>
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
