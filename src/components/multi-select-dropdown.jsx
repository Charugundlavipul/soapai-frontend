"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, User } from "lucide-react"
import { XMarkIcon } from "@heroicons/react/24/solid"

const sizeConfig = {
    xs: {
        button: "px-2 py-1.5 text-xs",
        icon: "h-3 w-3",
        chevron: "h-3 w-3",
        dropdown: "text-xs",
        dropdownItem: "px-2 py-1.5",
        checkmark: "w-3 h-3",
        checkmarkIcon: "w-1.5 h-1.5",
        label: "text-xs",
        tag: "px-1.5 py-0.5 text-xs",
        tagIcon: "h-2.5 w-2.5",
        tagGap: "gap-1",
    },
    sm: {
        button: "px-3 py-2 text-sm",
        icon: "h-4 w-4",
        chevron: "h-3 w-3",
        dropdown: "text-sm",
        dropdownItem: "px-2.5 py-2",
        checkmark: "w-3.5 h-3.5",
        checkmarkIcon: "w-1.5 h-1.5",
        label: "text-sm",
        tag: "px-2 py-1 text-xs",
        tagIcon: "h-3 w-3",
        tagGap: "gap-1",
    },
    md: {
        button: "px-4 py-3 text-base",
        icon: "h-5 w-5",
        chevron: "h-4 w-4",
        dropdown: "text-base",
        dropdownItem: "px-3 py-2.5",
        checkmark: "w-4 h-4",
        checkmarkIcon: "w-2 h-2",
        label: "text-sm",
        tag: "px-3 py-1 text-xs",
        tagIcon: "h-3 w-3",
        tagGap: "gap-1",
    },
    lg: {
        button: "px-5 py-4 text-lg",
        icon: "h-6 w-6",
        chevron: "h-5 w-5",
        dropdown: "text-base",
        dropdownItem: "px-4 py-3",
        checkmark: "w-5 h-5",
        checkmarkIcon: "w-2.5 h-2.5",
        label: "text-base",
        tag: "px-3 py-1.5 text-sm",
        tagIcon: "h-3.5 w-3.5",
        tagGap: "gap-1.5",
    },
    xl: {
        button: "px-6 py-5 text-xl",
        icon: "h-7 w-7",
        chevron: "h-6 w-6",
        dropdown: "text-lg",
        dropdownItem: "px-5 py-4",
        checkmark: "w-6 h-6",
        checkmarkIcon: "w-3 h-3",
        label: "text-lg",
        tag: "px-4 py-2 text-base",
        tagIcon: "h-4 w-4",
        tagGap: "gap-2",
    },
}

export default function MultiSelectDropdown({
                                                // Core props
                                                options = [],
                                                selectedIds = [],
                                                onSelectionChange,

                                                // Display props
                                                placeholder = "Select items...",
                                                label,
                                                required = false,
                                                disabled = false,
                                                icon,

                                                // Styling props
                                                className = "",
                                                maxHeight = "max-h-56",
                                                error = false,
                                                size = "md",

                                                // Tags props
                                                showTags = false,
                                                tagClassName = "",
                                                emptyTagsMessage = "No items selected",

                                                // Other props
                                                emptyMessage = "No items available",
                                            }) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef(null)

    const config = sizeConfig[size]

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const toggleSelection = (id) => {
        const newSelection = selectedIds.includes(id)
            ? selectedIds.filter((selectedId) => selectedId !== id)
            : [...selectedIds, id]

        onSelectionChange(newSelection)
    }

    const removeSelection = (idToRemove) => {
        onSelectionChange(selectedIds.filter((id) => id !== idToRemove))
    }

    const getDisplayText = () => {
        if (!selectedIds.length) return placeholder

        if (selectedIds.length === 1) {
            const selectedOption = options.find((option) => option.id === selectedIds[0])
            return selectedOption?.label || "1 selected"
        }

        return `${selectedIds.length} items selected`
    }

    const getSelectedOptions = () => {
        return selectedIds.map((id) => options.find((option) => option.id === id)).filter(Boolean)
    }

    const getEmptyTagsTextSize = () => {
        switch (size) {
            case "xs":
                return "text-xs"
            case "sm":
                return "text-sm"
            case "xl":
                return "text-base"
            default:
                return "text-sm"
        }
    }

    return (
        <div className={`space-y-${showTags ? "4" : "2"} ${className}`} ref={dropdownRef}>
            {/* Label */}
            {label && (
                <label className={`block font-medium ${config.label}`}>
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            {/* Dropdown Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full bg-gray-50 rounded-xl border flex justify-between items-center transition-colors
          ${config.button}
          ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100"}
          ${error ? "border-red-300 bg-red-50" : "border-gray-200"}
          ${isOpen ? "ring-2 ring-[#3D298D]/20" : ""}`}
            >
                <span className={selectedIds.length ? "text-gray-600" : "text-gray-400"}>{getDisplayText()}</span>
                <div className="flex items-center gap-1">
                    {icon || <User className={`${config.icon} text-gray-400`} />}
                    <ChevronDown
                        className={`${config.chevron} text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                </div>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className={`mt-2 border border-gray-200 rounded-xl shadow-lg bg-white ${maxHeight} overflow-y-auto z-50 ${config.dropdown}`}
                >
                    {options.length > 0 ? (
                        options.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => toggleSelection(option.id)}
                                className={`w-full text-left flex justify-between items-center
                  hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0
                  ${config.dropdownItem}
                  ${selectedIds.includes(option.id) ? "bg-[#3D298D]/10 text-[#3D298D]" : "text-gray-600"}`}
                            >
                                <span className="truncate">{option.label}</span>
                                {selectedIds.includes(option.id) && (
                                    <div
                                        className={`${config.checkmark} bg-[#3D298D] rounded-full flex items-center justify-center flex-shrink-0 ml-2`}
                                    >
                                        <svg className={`${config.checkmarkIcon} text-white`} viewBox="0 0 8 8" fill="currentColor">
                                            <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z" />
                                        </svg>
                                    </div>
                                )}
                            </button>
                        ))
                    ) : (
                        <div className={`${config.dropdownItem} text-gray-500`}>{emptyMessage}</div>
                    )}
                </div>
            )}

            {/* Tags Display */}
            {showTags && (
                <div>
                    <div className={`flex flex-wrap ${config.tagGap}`}>
                        {getSelectedOptions().length > 0 ? (
                            getSelectedOptions().map((option) => (
                                <span
                                    key={option.id}
                                    className={`${config.tag} rounded-full bg-[#3D298D] text-white flex items-center gap-1 ${tagClassName}`}
                                >
                  {option.label}
                                    <button
                                        type="button"
                                        onClick={() => removeSelection(option.id)}
                                        className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                                    >
                    <XMarkIcon className={config.tagIcon} />
                  </button>
                </span>
                            ))
                        ) : (
                            <span className={`italic text-gray-400 ${getEmptyTagsTextSize()}`}>{emptyTagsMessage}</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
