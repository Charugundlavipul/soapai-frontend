"use client"

import { useState, useRef, useEffect } from "react"
import { XMarkIcon, ChevronDownIcon } from "@heroicons/react/24/solid"
import { getCategories, updateCategory } from "../services/api"

/**
 * Goal Creation Modal - for adding new goals to existing categories
 * Used within NewClientModal when users need to create goals that don't exist
 */
export default function GoalManagementModal({
                                                open,
                                                onClose,
                                                onGoalBankUpdated, // callback to refresh the goal bank in parent
                                            }) {
    /* ───── state ───── */
    const [categories, setCategories] = useState([])
    const [selectedCategory, setSelectedCategory] = useState(null)
    const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)

    /* single goal draft */
    const [goalName, setGoalName] = useState("")
    const [goalDesc, setGoalDesc] = useState("")

    const nameRef = useRef(null)
    const categoryRef = useRef(null)

    /* ───── fetch categories when modal opens ───── */
    useEffect(() => {
        if (open) {
            fetchCategories()
            resetForm()
        }
    }, [open])

    const fetchCategories = async () => {
        try {
            const { data } = await getCategories()
            setCategories(data)
        } catch (error) {
            console.error("Failed to fetch categories:", error)
        }
    }

    /* ───── reset form when modal opens ───── */
    const resetForm = () => {
        setSelectedCategory(null)
        setGoalName("")
        setGoalDesc("")
        setCategoryDropdownOpen(false)
    }

    /* click-outside dropdown */
    useEffect(() => {
        const h = (e) => categoryRef.current && !categoryRef.current.contains(e.target) && setCategoryDropdownOpen(false)
        if (categoryDropdownOpen) document.addEventListener("mousedown", h)
        return () => document.removeEventListener("mousedown", h)
    }, [categoryDropdownOpen])

    /* ───── save goal to selected category ───── */
    const saveGoal = async () => {
        if (!selectedCategory) {
            alert("Please select a category.")
            return
        }

        if (!goalName.trim()) {
            alert("Goal name is required.")
            return
        }

        try {
            const { data } = await updateCategory(selectedCategory._id, {
                addGoals: [{ name: goalName.trim(), description: goalDesc.trim() }],
            })

            // Notify parent to refresh goal bank
            onGoalBankUpdated?.()

            // Reset form and close
            resetForm()
            onClose()
        } catch (error) {
            alert(error.response?.data?.message || "Failed to add goal")
        }
    }

    const handleClose = () => {
        resetForm()
        onClose()
    }

    if (!open) return null

    /* ───── render ───── */
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-6 pb-4">
                    <h2 className="text-xl font-semibold text-primary">Add New Goal</h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 pb-6 space-y-6">
                    {/* Category Selection */}
                    <div ref={categoryRef} className="space-y-2 relative">
                        <label className="text-sm font-medium text-gray-900">Select Category</label>
                        <button
                            type="button"
                            onClick={() => setCategoryDropdownOpen((o) => !o)}
                            className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors"
                        >
              <span className={selectedCategory ? "text-gray-900" : ""}>
                {selectedCategory ? selectedCategory.name : "Choose a category..."}
              </span>
                            <ChevronDownIcon className={`h-4 w-4 transition-transform ${categoryDropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {categoryDropdownOpen && (
                            <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg">
                                {categories.length > 0 ? (
                                    categories.map((category) => (
                                        <button
                                            key={category._id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedCategory(category)
                                                setCategoryDropdownOpen(false)
                                            }}
                                            className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm font-medium text-gray-900"
                                        >
                                            {category.name}
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-4 py-6 text-gray-400 text-center text-sm">
                                        No categories available. Please create categories first.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Goal Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-900">Goal Name</label>
                        <input
                            ref={nameRef}
                            value={goalName}
                            onChange={(e) => setGoalName(e.target.value)}
                            placeholder="Enter goal name"
                            className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            autoFocus
                        />
                    </div>

                    {/* Goal Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-900">Goal Description (Optional)</label>
                        <textarea
                            value={goalDesc}
                            onChange={(e) => setGoalDesc(e.target.value)}
                            rows={3}
                            placeholder="Enter goal description"
                            className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>

                    {/* Selected Category Preview - Simplified */}
                    {selectedCategory && (
                        <div className="bg-primary/10 border border-primary/40 rounded-xl p-4">
                            <h4 className="text-sm font-medium text-primary">Adding to: {selectedCategory.name}</h4>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 pt-4 border-t border-gray-100">
                    <button
                        onClick={handleClose}
                        className="px-6 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={saveGoal}
                        disabled={!selectedCategory || !goalName.trim()}
                        className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        Add Goal
                    </button>
                </div>
            </div>
        </div>
    )
}
