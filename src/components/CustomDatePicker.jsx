"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight, Calendar, ChevronDown } from 'lucide-react'

export default function CustomDatePicker({ value, onChange, label, isOpen, onToggle }) {
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [showMonthPicker, setShowMonthPicker] = useState(false)
    const [showYearPicker, setShowYearPicker] = useState(false)
    const containerRef = useRef(null)

    const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ]

    // Handle click outside to close popup
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target) && isOpen) {
                onToggle(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, onToggle])

    const formatDisplayDate = (dateStr) => {
        if (!dateStr) return "mm/dd/yyyy"
        const date = new Date(dateStr)
        return date.toLocaleDateString("en-US")
    }

    const getDaysInMonth = (date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const daysInMonth = lastDay.getDate()
        const startingDayOfWeek = firstDay.getDay()

        const days = []
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null)
        }
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day)
        }
        return days
    }

    const handleDateSelect = (day) => {
        const year = currentMonth.getFullYear()
        const month = currentMonth.getMonth()
        const selectedDate = new Date(year, month, day)
        const formattedDate = selectedDate.toISOString().split("T")[0]
        onChange(formattedDate)
        onToggle(false)
    }

    const navigateMonth = (direction) => {
        setCurrentMonth((prev) => {
            const newDate = new Date(prev)
            if (direction === "prev") {
                newDate.setMonth(prev.getMonth() - 1)
            } else {
                newDate.setMonth(prev.getMonth() + 1)
            }
            return newDate
        })
    }

    const handleMonthSelect = (monthIndex) => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev)
            newDate.setMonth(monthIndex)
            return newDate
        })
        setShowMonthPicker(false)
    }

    const handleYearSelect = (year) => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev)
            newDate.setFullYear(year)
            return newDate
        })
        setShowYearPicker(false)
    }

    const isSelectedDate = (day) => {
        if (!value) return false
        const selectedDate = new Date(value)
        const currentDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
        return selectedDate.toDateString() === currentDate.toDateString()
    }

    const generateYears = () => {
        const currentYear = new Date().getFullYear()
        const years = []
        for (let i = currentYear - 10; i <= currentYear + 10; i++) {
            years.push(i)
        }
        return years
    }

    const toggleMonthPicker = () => {
        setShowMonthPicker(!showMonthPicker)
        setShowYearPicker(false)
    }

    const toggleYearPicker = () => {
        setShowYearPicker(!showYearPicker)
        setShowMonthPicker(false)
    }

    const renderCalendarView = () => {
        if (showMonthPicker) {
            return (
                <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            type="button"
                            onClick={() => setShowMonthPicker(false)}
                            className="text-sm text-gray-600 hover:text-gray-800"
                        >
                            ← Back to Calendar
                        </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {months.map((month, index) => (
                            <button
                                key={month}
                                type="button"
                                onClick={() => handleMonthSelect(index)}
                                className={`p-2 text-sm rounded hover:bg-gray-100 ${
                                    currentMonth.getMonth() === index ? "bg-primary/10 text-primary" : ""
                                }`}
                            >
                                {month}
                            </button>
                        ))}
                    </div>
                </div>
            )
        }

        if (showYearPicker) {
            return (
                <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            type="button"
                            onClick={() => setShowYearPicker(false)}
                            className="text-sm text-gray-600 hover:text-gray-800"
                        >
                            ← Back to Calendar
                        </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                        {generateYears().map((year) => (
                            <button
                                key={year}
                                type="button"
                                onClick={() => handleYearSelect(year)}
                                className={`p-2 text-sm rounded hover:bg-gray-100 ${
                                    currentMonth.getFullYear() === year ? "bg-primary/10 text-primary" : ""
                                }`}
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                </div>
            )
        }

        return (
            <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <button
                        type="button"
                        onClick={() => navigateMonth("prev")}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={toggleMonthPicker}
                            className="font-medium hover:bg-gray-100 px-2 py-1 rounded flex items-center gap-1"
                        >
                            {months[currentMonth.getMonth()]}
                            <ChevronDown className="h-3 w-3" />
                        </button>
                        <button
                            type="button"
                            onClick={toggleYearPicker}
                            className="font-medium hover:bg-gray-100 px-2 py-1 rounded flex items-center gap-1"
                        >
                            {currentMonth.getFullYear()}
                            <ChevronDown className="h-3 w-3" />
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigateMonth("next")}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                        <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {getDaysInMonth(currentMonth).map((day, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => day && handleDateSelect(day)}
                            disabled={!day}
                            className={`
                                h-8 w-8 text-sm rounded-lg flex items-center justify-center
                                ${!day ? "invisible" : ""}
                                ${isSelectedDate(day || 0) ? "bg-primary text-white" : "hover:bg-gray-100 text-gray-700"}
                            `}
                        >
                            {day}
                        </button>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="relative" ref={containerRef}>
                <button
                    type="button"
                    onClick={() => onToggle(!isOpen)}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                >
                    <span className={value ? "text-gray-900" : "text-gray-400"}>{formatDisplayDate(value)}</span>
                    <Calendar className="h-5 w-5 text-gray-400" />
                </button>

                {isOpen && (
                    <div className="absolute top-0 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-[70]">
                        {renderCalendarView()}
                    </div>
                )}
            </div>
        </div>
    )
}