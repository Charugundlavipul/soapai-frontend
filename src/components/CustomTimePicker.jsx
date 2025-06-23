"use client"
import { useEffect, useRef } from "react"
import { Clock } from 'lucide-react'

export default function CustomTimePicker({ value, onChange, placeholder = "--:--", isOpen, onToggle }) {
    const popupRef = useRef(null)
    const hours = Array.from({ length: 12 }, (_, i) => i + 1)
    const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"))
    const periods = ["AM", "PM"]

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popupRef.current && !popupRef.current.contains(event.target) && isOpen) {
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

    const formatDisplayTime = (timeStr) => {
        if (!timeStr) return placeholder
        const [hours, minutes] = timeStr.split(":")
        const hour12 =
            Number.parseInt(hours) === 0
                ? 12
                : Number.parseInt(hours) > 12
                    ? Number.parseInt(hours) - 12
                    : Number.parseInt(hours)
        const period = Number.parseInt(hours) >= 12 ? "PM" : "AM"
        return `${hour12.toString().padStart(2, "0")}:${minutes} ${period}`
    }

    const handleTimeSelect = (hour, minute, period) => {
        let hour24 = hour
        if (period === "PM" && hour !== 12) hour24 += 12
        if (period === "AM" && hour === 12) hour24 = 0

        const formattedTime = `${hour24.toString().padStart(2, "0")}:${minute}`
        onChange(formattedTime)
        onToggle(false)
    }

    const getCurrentTime = () => {
        if (!value) return { hour: 1, minute: "00", period: "AM" }
        const [hours, minutes] = value.split(":")
        const hour24 = Number.parseInt(hours)
        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
        const period = hour24 >= 12 ? "PM" : "AM"
        return { hour: hour12, minute: minutes, period }
    }

    const currentTime = getCurrentTime()

    return (
        <div className="relative flex-1" ref={popupRef}>
            <button
                type="button"
                onClick={() => onToggle(!isOpen)}
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
                <span className={value ? "text-gray-900" : "text-gray-400"}>{formatDisplayTime(value)}</span>
                <Clock className="h-5 w-5 text-gray-400" />
            </button>

            {isOpen && (
                <div className="absolute top-0 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-[60]">
                    <div className="p-4">
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <div className="text-xs font-medium text-gray-500 mb-2">Hour</div>
                                <div className="max-h-32 overflow-y-auto">
                                    {hours.map((hour) => (
                                        <button
                                            key={hour}
                                            type="button"
                                            onClick={() => handleTimeSelect(hour, currentTime.minute, currentTime.period)}
                                            className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 ${currentTime.hour === hour ? "bg-primary/10 text-primary" : ""}`}
                                        >
                                            {hour.toString().padStart(2, "0")}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1">
                                <div className="text-xs font-medium text-gray-500 mb-2">Min</div>
                                <div className="max-h-32 overflow-y-auto">
                                    {minutes
                                        .filter((_, i) => i % 5 === 0)
                                        .map((minute) => (
                                            <button
                                                key={minute}
                                                type="button"
                                                onClick={() => handleTimeSelect(currentTime.hour, minute, currentTime.period)}
                                                className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 ${currentTime.minute === minute ? "bg-primary/10 text-primary" : ""}`}
                                            >
                                                {minute}
                                            </button>
                                        ))}
                                </div>
                            </div>

                            <div className="flex-1">
                                <div className="text-xs font-medium text-gray-500 mb-2">Period</div>
                                <div className="space-y-1">
                                    {periods.map((period) => (
                                        <button
                                            key={period}
                                            type="button"
                                            onClick={() => handleTimeSelect(currentTime.hour, currentTime.minute, period)}
                                            className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 ${currentTime.period === period ? "bg-primary/10 text-primary" : ""}`}
                                        >
                                            {period}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}