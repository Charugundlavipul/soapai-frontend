"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"

export default function CustomDatePicker({ value, onChange, label, isOpen, onToggle }) {
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [showMonthYearPicker, setShowMonthYearPicker] = useState(false)

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

    const handleMonthYearSelect = (month, year) => {
        setCurrentMonth(new Date(year, month))
        setShowMonthYearPicker(false)
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

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => onToggle(!isOpen)}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                >
                    <span className={value ? "text-gray-900" : "text-gray-400"}>{formatDisplayDate(value)}</span>
                    <Calendar className="h-5 w-5 text-gray-400" />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                        <div className="p-4">
                            {!showMonthYearPicker ? (
                                <>
                                    <div className="flex items-center justify-between mb-4">
                                        <button
                                            type="button"
                                            onClick={() => navigateMonth("prev")}
                                            className="p-1 hover:bg-gray-100 rounded"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowMonthYearPicker(true)}
                                            className="font-medium hover:bg-gray-100 px-2 py-1 rounded"
                                        >
                                            {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                                        </button>
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
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={() => setShowMonthYearPicker(false)}
                                            className="text-sm text-gray-600 hover:text-gray-800"
                                        >
                                            ← Back to Calendar
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                                        {months.map((month, index) => (
                                            <button
                                                key={month}
                                                type="button"
                                                onClick={() => handleMonthYearSelect(index, currentMonth.getFullYear())}
                                                className={`p-2 text-sm rounded hover:bg-gray-100 ${
                                                    currentMonth.getMonth() === index ? "bg-primary/10 text-primary" : ""
                                                }`}
                                            >
                                                {month}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                                        {generateYears().map((year) => (
                                            <button
                                                key={year}
                                                type="button"
                                                onClick={() => handleMonthYearSelect(currentMonth.getMonth(), year)}
                                                className={`p-2 text-sm rounded hover:bg-gray-100 ${
                                                    currentMonth.getFullYear() === year ? "bg-primary/10 text-primary" : ""
                                                }`}
                                            >
                                                {year}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
