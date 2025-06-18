"use client"

import { useEffect, useState } from "react"
import { CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/solid"

export default function SavingToast({ show, message = "Saved successfully!", onClose, type = "success" }) {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        if (show) {
            setIsVisible(true)
            // Auto-hide after 3 seconds
            const timer = setTimeout(() => {
                setIsVisible(false)
                setTimeout(() => onClose?.(), 300) // Wait for animation to complete
            }, 3000)

            return () => clearTimeout(timer)
        } else {
            setIsVisible(false)
        }
    }, [show, onClose])

    if (!show) return null

    const handleClose = () => {
        setIsVisible(false)
        setTimeout(() => onClose?.(), 300)
    }

    return (
        <div className="fixed inset-0 z-50 pointer-events-none">
            <div className="flex justify-center pt-4">
                <div
                    className={`
            pointer-events-auto
            bg-white rounded-xl shadow-lg border
            px-4 py-3 mx-4
            flex items-center gap-3
            transition-all duration-300 ease-in-out
            ${isVisible ? "transform translate-y-0 opacity-100" : "transform -translate-y-full opacity-0"}
            ${type === "success" ? "border-green-200" : "border-red-200"}
          `}
                >
                    {type === "success" ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : (
                        <XMarkIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
                    )}

                    <span className="text-sm font-medium text-gray-800 flex-1">{message}</span>

                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Close notification"
                    >
                        <XMarkIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
