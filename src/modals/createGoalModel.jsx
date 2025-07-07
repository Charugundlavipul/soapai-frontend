"use client"

import { useState, useRef } from "react"
import { PlusIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/solid"
import { postCategory } from "../services/api"

/**
 * Simple Goal Creation Modal - for creating new goal categories and goals
 * Used within NewClientModal when users need to create goals that don't exist
 */
export default function GoalManagementModal({
                                                open,
                                                onClose,
                                                onGoalBankUpdated, // callback to refresh the goal bank in parent
                                            }) {
    /* ───── state ───── */
    const [categoryName, setCategoryName] = useState("")
    const [categoryDesc, setCategoryDesc] = useState("")
    const [goals, setGoals] = useState([]) // [{ name, description }]

    /* single goal draft */
    const [goalName, setGoalName] = useState("")
    const [goalDesc, setGoalDesc] = useState("")
    const [editingGoalIdx, setEditingGoalIdx] = useState(null)

    const nameRef = useRef(null)

    /* ───── reset form when modal opens ───── */
    const resetForm = () => {
        setCategoryName("")
        setCategoryDesc("")
        setGoals([])
        setGoalName("")
        setGoalDesc("")
        setEditingGoalIdx(null)
    }

    /* ───── goal operations ───── */
    const addOrUpdateGoal = () => {
        const name = goalName.trim()
        if (!name) return

        if (editingGoalIdx !== null) {
            // Update existing goal
            setGoals((prevGoals) =>
                prevGoals.map((goal, i) => (i === editingGoalIdx ? { name, description: goalDesc.trim() } : goal)),
            )
        } else if (!goals.find((g) => g.name === name)) {
            // Add new goal
            setGoals((prev) => [...prev, { name, description: goalDesc.trim() }])
        }

        // Reset goal form
        setGoalName("")
        setGoalDesc("")
        setEditingGoalIdx(null)
    }

    const startEditGoal = (index) => {
        const goal = goals[index]
        setGoalName(goal.name)
        setGoalDesc(goal.description || "")
        setEditingGoalIdx(index)
    }

    const removeGoal = (index) => {
        setGoals((prevGoals) => prevGoals.filter((_, i) => i !== index))
        if (editingGoalIdx === index) {
            setGoalName("")
            setGoalDesc("")
            setEditingGoalIdx(null)
        }
    }

    /* ───── save category ───── */
    const saveCategory = async () => {
        if (!categoryName.trim() || goals.length === 0) {
            alert("Category name and at least one goal are required.")
            return
        }

        try {
            const { data } = await postCategory({
                name: categoryName,
                description: categoryDesc,
                goals: goals,
            })

            // Notify parent to refresh goal bank
            onGoalBankUpdated?.()

            // Reset form and close
            resetForm()
            onClose()
        } catch (error) {
            alert(error.response?.data?.message || "Failed to create category")
        }
    }

    const handleClose = () => {
        resetForm()
        onClose()
    }

    if (!open) return null

    /* ───── render ───── */
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">Create New Goal Category</h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-5">
                    {/* Category Name & Description */}
                    <input
                        ref={nameRef}
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        placeholder="Category name"
                        className="w-full border rounded-md px-3 py-2"
                        autoFocus
                    />
                    <textarea
                        value={categoryDesc}
                        onChange={(e) => setCategoryDesc(e.target.value)}
                        rows={3}
                        placeholder="Category description (optional)"
                        className="w-full border rounded-md px-3 py-2 resize-none"
                    />

                    {/* Goal Form */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium">{editingGoalIdx !== null ? "Edit Goal" : "Add Goal"}</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                                value={goalName}
                                onChange={(e) => setGoalName(e.target.value)}
                                placeholder="Goal name"
                                className="border rounded-md px-3 py-2"
                            />
                            <input
                                value={goalDesc}
                                onChange={(e) => setGoalDesc(e.target.value)}
                                placeholder="Goal description (optional)"
                                className="border rounded-md px-3 py-2"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={addOrUpdateGoal}
                            disabled={!goalName.trim()}
                            className="mt-2 inline-flex items-center gap-1 bg-primary text-white px-4 py-2 rounded-md disabled:opacity-40"
                        >
                            {editingGoalIdx !== null ? (
                                <>
                                    <PencilSquareIcon className="h-4 w-4" /> Update Goal
                                </>
                            ) : (
                                <>
                                    <PlusIcon className="h-4 w-4" /> Add Goal
                                </>
                            )}
                        </button>
                    </div>

                    {/* Goals List */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Goals in this category ({goals.length})</label>
                        {goals.length > 0 ? (
                            <div className="space-y-2">
                                {goals.map((goal, index) => (
                                    <div key={index} className="flex items-start justify-between bg-gray-50 rounded-md p-3">
                                        <div className="text-sm">
                                            <p className="font-medium">{goal.name}</p>
                                            {goal.description && <p className="text-gray-600">{goal.description}</p>}
                                        </div>
                                        <div className="flex gap-2">
                                            <PencilSquareIcon
                                                onClick={() => startEditGoal(index)}
                                                className="h-5 w-5 text-primary cursor-pointer"
                                                title="Edit"
                                            />
                                            <TrashIcon
                                                onClick={() => removeGoal(index)}
                                                className="h-5 w-5 text-red-500 cursor-pointer"
                                                title="Delete"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 italic">No goals added yet</p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-6">
                    <button onClick={handleClose} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300">
                        Cancel
                    </button>
                    <button
                        onClick={saveCategory}
                        disabled={!categoryName.trim() || goals.length === 0}
                        className="px-5 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Create Category
                    </button>
                </div>
            </div>
        </div>
    )
}
