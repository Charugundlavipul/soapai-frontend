"use client"

import { useState } from "react"
import Modal from "../components/Modal"
import BehaviourSelect from "../components/BehaviourSelect"
import { uploadVideo } from "../services/api"

export default function UploadVideoModal({ open, onClose, appointment }) {
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [behavs, setBehavs] = useState([])

  if (!appointment) return null // safety

  const save = async (e) => {
    e.preventDefault()
    if (!file) return alert("Please choose a video")
    const fd = new FormData()
    fd.append("title", title || "Session video")
    fd.append("notes", notes)
    behavs.forEach((b) => fd.append("behaviours", b._id))
    fd.append("video", file)

    await uploadVideo(appointment._id, fd)
    onClose()
  }

  return (
      <Modal open={open} onClose={onClose} title="Upload Your Video">
        <form onSubmit={save} className="space-y-6">
          {/* Main content grid - responsive layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
            {/* Left section - Form fields */}
            <div className="space-y-4 md:space-y-5 xl:col-span-2">
              {/* Title input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Video Title</label>
                <input
                    placeholder="Enter video title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm
                         focus:ring-2 focus:ring-primary focus:border-transparent
                         transition-colors duration-200"
                />
              </div>

              {/* Visit information - responsive grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Visit Type</label>
                  <div className="border border-gray-200 rounded-lg px-4 py-3 bg-gray-50">
                    <p className="text-sm text-gray-900 font-medium">{appointment.type}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {appointment.type === "group" ? "Group" : "Patient"}
                  </label>
                  <div className="border border-gray-200 rounded-lg px-4 py-3 bg-gray-50">
                    <p className="text-sm text-gray-900 font-medium">
                      {appointment.type === "group" ? appointment.group?.name : appointment.patient?.name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Behaviour selection */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Behaviours</label>
                <BehaviourSelect value={behavs} onChange={setBehavs} />
              </div>

              {/* Notes textarea - responsive height */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
                <textarea
                    placeholder="Add any additional notes about this session..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm
                         resize-none focus:ring-2 focus:ring-primary focus:border-transparent
                         transition-colors duration-200"
                />
              </div>
            </div>

            {/* Right section - File upload */}
            <div className="flex flex-col space-y-4 md:space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Video File</label>

                {/* File upload area - responsive sizing */}
                <label className="group relative block w-full">
                  <input type="file" accept="video/*" className="sr-only" onChange={(e) => setFile(e.target.files[0])} />

                  <div
                      className={`
                  border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer
                  min-h-[200px] md:min-h-[250px] xl:min-h-[300px]
                  flex flex-col items-center justify-center p-6
                  ${
                          file
                              ? "border-green-300 bg-green-50"
                              : "border-gray-300 bg-gray-50 hover:border-primary hover:bg-primary/5"
                      }
                  group-hover:border-primary group-hover:bg-primary/5
                `}
                  >
                    {file ? (
                        <div className="text-center space-y-2">
                          <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <p className="text-sm font-medium text-green-700">File Selected</p>
                          <p className="text-xs text-green-600 break-all px-2">{file.name}</p>
                          <p className="text-xs text-gray-500">Click to change file</p>
                        </div>
                    ) : (
                        <div className="text-center space-y-3">
                          <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-primary/10">
                            <svg
                                className="w-6 h-6 text-gray-400 group-hover:text-primary"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                              <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                              />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Drop your video here</p>
                            <p className="text-xs text-gray-500 mt-1">
                              or <span className="text-primary font-medium">browse files</span>
                            </p>
                          </div>
                          <p className="text-xs text-gray-400">Supports: MP4, MOV, AVI, WMV</p>
                        </div>
                    )}
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Action buttons - responsive positioning */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-gray-200">
            <button
                type="button"
                onClick={onClose}
                className="order-2 sm:order-1 px-6 py-3 text-sm font-medium text-gray-700
                     bg-white border border-gray-300 rounded-lg hover:bg-gray-50
                     focus:ring-2 focus:ring-offset-2 focus:ring-primary
                     transition-colors duration-200"
            >
              Cancel
            </button>

            <button
                type="submit"
                className="order-1 sm:order-2 sm:ml-auto px-8 py-3 text-sm font-medium
                     text-white bg-primary rounded-lg hover:bg-primary/90
                     focus:ring-2 focus:ring-offset-2 focus:ring-primary
                     transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!file}
            >
              Upload Video
            </button>
          </div>
        </form>
      </Modal>
  )
}
