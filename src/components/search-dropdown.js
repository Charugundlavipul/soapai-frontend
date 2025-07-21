"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, X, User } from "lucide-react"

export default function SearchDropDown({
                                           // Core props
                                           options = [],
                                           selectedIds = [],
                                           onSelectionChange,

                                           // Display props
                                           placeholder = "Search and select...",
                                           label,
                                           required = false,
                                           disabled = false,
                                           icon,

                                           // Styling props
                                           className = "",
                                           maxHeight = "max-h-56",
                                           error = false,
                                           size = "md",

                                           // Other props
                                           emptyMessage = "No items available",
                                           maxSelections = null, // null for unlimited
                                       }) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [inputValue, setInputValue] = useState("")
    const dropdownRef = useRef(null)
    const inputRef = useRef(null)

    const sizeConfig = {
        xs: {
            input: "px-2 py-1.5 text-xs",
            icon: "h-3 w-3",
            chevron: "h-3 w-3",
            dropdown: "text-xs",
            dropdownItem: "px-2 py-1.5",
            tag: "px-1.5 py-0.5 text-xs",
            tagIcon: "h-2.5 w-2.5",
            label: "text-xs",
        },
        sm: {
            input: "px-3 py-2 text-sm",
            icon: "h-4 w-4",
            chevron: "h-3 w-3",
            dropdown: "text-sm",
            dropdownItem: "px-2.5 py-2",
            tag: "px-2 py-1 text-xs",
            tagIcon: "h-3 w-3",
            label: "text-sm",
        },
        md: {
            input: "px-4 py-3 text-base",
            icon: "h-5 w-5",
            chevron: "h-4 w-4",
            dropdown: "text-base",
            dropdownItem: "px-3 py-2.5",
            tag: "px-2.5 py-1 text-sm",
            tagIcon: "h-3.5 w-3.5",
            label: "text-sm",
        },
        lg: {
            input: "px-5 py-4 text-lg",
            icon: "h-6 w-6",
            chevron: "h-5 w-5",
            dropdown: "text-base",
            dropdownItem: "px-4 py-3",
            tag: "px-3 py-1.5 text-sm",
            tagIcon: "h-4 w-4",
            label: "text-base",
        },
        xl: {
            input: "px-6 py-5 text-xl",
            icon: "h-7 w-7",
            chevron: "h-6 w-6",
            dropdown: "text-lg",
            dropdownItem: "px-5 py-4",
            tag: "px-3.5 py-2 text-base",
            tagIcon: "h-5 w-5",
            label: "text-lg",
        },
    }

    const config = sizeConfig[size]

    // Filter options based on search term
    const filteredOptions = options.filter((option) => option.label.toLowerCase().includes(searchTerm.toLowerCase()))

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
                updateInputDisplay()
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Update search term when input value changes
    useEffect(() => {
        setSearchTerm(inputValue)
    }, [inputValue])

    // Update input display based on selections
    const updateInputDisplay = () => {
        const selectedOptions = getSelectedOptions()
        if (selectedOptions.length === 0) {
            setInputValue("")
        } else if (selectedOptions.length === 1) {
            setInputValue(selectedOptions[0].label)
        } else {
            setInputValue(`${selectedOptions.length} members selected`)
        }
    }

    // Update display when selections change
    useEffect(() => {
        if (!isOpen) {
            updateInputDisplay()
        }
    }, [selectedIds, isOpen])

    const handleToggleSelection = (id) => {
        if (selectedIds.includes(id)) {
            // Remove from selection
            onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id))
        } else {
            // Add to selection (if not at max limit)
            if (maxSelections === null || selectedIds.length < maxSelections) {
                onSelectionChange([...selectedIds, id])
            }
        }
    }

    const getSelectedOptions = () => {
        return selectedIds.map((id) => options.find((option) => option.id === id)).filter(Boolean)
    }

    const handleInputFocus = () => {
        setIsOpen(true)
        if (selectedIds.length > 0) {
            setInputValue("") // Clear input to show search
            setSearchTerm("")
        }
    }

    const handleInputChange = (e) => {
        setInputValue(e.target.value)
        if (!isOpen) {
            setIsOpen(true)
        }
    }

    const handleClearAll = (e) => {
        e.stopPropagation()
        onSelectionChange([])
        setInputValue("")
        setSearchTerm("")
        inputRef.current?.focus()
    }

    return (
        <div className={`space-y-2 ${className}`} ref={dropdownRef}>
            {/* Label */}
            {label && (
                <label className={`block font-medium text-gray-700 ${config.label}`}>
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            {/* Input Field */}
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`w-full bg-gray-50 rounded-lg border transition-colors pr-20
            ${config.input}
            ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-white focus:bg-white"}
            ${error ? "border-red-300 bg-red-50" : "border-gray-200"}
            ${isOpen ? "bg-white border-primary ring-2 ring-primary/20" : ""}
            focus:outline-none`}
                />

                {/* Right side icons */}
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                    {selectedIds.length > 0 && (
                        <button
                            type="button"
                            onClick={handleClearAll}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className={config.tagIcon} />
                        </button>
                    )}
                    {icon || <User className={`${config.icon} text-gray-400`} />}
                    <ChevronDown
                        className={`${config.chevron} text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                </div>
            </div>

            {/* Selected items tags (shown below input when items are selected) */}
            {selectedIds.length > 0 && !isOpen && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {getSelectedOptions().map((option) => (
                        <span
                            key={option.id}
                            className={`bg-primary/10 text-primary rounded-full flex items-center gap-1 ${config.tag}`}
                        >
              {option.label}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleToggleSelection(option.id)
                                }}
                                className="text-primary/60 hover:text-primary"
                            >
                <X className={config.tagIcon} />
              </button>
            </span>
                    ))}
                </div>
            )}

            {/* Dropdown Menu */}
            {isOpen && (
                <div className={`mt-1 border border-gray-200 rounded-lg shadow-lg bg-white ${maxHeight} overflow-y-auto z-50`}>
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option) => {
                            const isSelected = selectedIds.includes(option.id)
                            const isDisabled = maxSelections !== null && selectedIds.length >= maxSelections && !isSelected

                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => !isDisabled && handleToggleSelection(option.id)}
                                    disabled={isDisabled}
                                    className={`w-full text-left flex justify-between items-center transition-colors border-b border-gray-50 last:border-b-0
                    ${config.dropdownItem}
                    ${isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"}
                    ${isSelected ? "bg-primary/5 text-primary" : "text-gray-600"}`}
                                >
                                    <span className="truncate">{option.label}</span>
                                    {isSelected && (
                                        <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                                            <svg className="w-2 h-2 text-white" viewBox="0 0 8 8" fill="currentColor">
                                                <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z" />
                                            </svg>
                                        </div>
                                    )}
                                </button>
                            )
                        })
                    ) : (
                        <div className={`${config.dropdownItem} text-gray-500`}>
                            {searchTerm ? `No results for "${searchTerm}"` : emptyMessage}
                        </div>
                    )}

                    {/*/!* Selection Summary *!/*/}
                    {/*{selectedIds.length > 0 && (*/}
                    {/*    <div className="p-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-600">*/}
                    {/*        {selectedIds.length} selected*/}
                    {/*        {maxSelections && ` (max ${maxSelections})`}*/}
                    {/*    </div>*/}
                    {/*)}*/}
                </div>
            )}
        </div>
    )
}
