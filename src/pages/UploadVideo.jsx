"use client"
import { format } from "date-fns"
import { useEffect, useState, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ChevronDown,
  UploadIcon,
  ArrowLeft,
  Cloud,
  X,
  FileVideo,
  Calendar,
  Users,
  Target,
  FileText,
} from "lucide-react"

import Navbar from "../components/Navbar"
import { uploadVideo, getCategories } from "../services/api"
import api from "../services/api"

const primaryBtn = "bg-primary hover:bg-primary/90 text-white transition-all duration-200 shadow-lg hover:shadow-xl"

export default function UploadVideo() {
  const { id: apptId } = useParams()
  const nav = useNavigate()

  /* ───────── appointment meta ───────── */
  const [appt, setAppt] = useState(null)
  useEffect(() => {
    api.get("/appointments").then((r) => {
      const a = r.data.find((x) => x._id === apptId)
      if (!a) return nav("/")
      setAppt(a)

      // ───── auto-populate title ─────
      const dt = new Date(a.dateTimeStart)
      const dateStr = format(dt, "MMM d, yyyy h:mm aa")
      const who = a.type === "group" ? a.group?.name || "" : a.patient?.name || ""
      setTitle(`${who} - ${dateStr}`)
    })
  }, [apptId, nav])

  /* ───────── form state ───────── */
  const [title, setTitle] = useState("")
  const [file, setFile] = useState(null)
  const [notes, setNotes] = useState("")

  /* ───────── goal selector ───────── */
  const [goalBank, setGoalBank] = useState([])
  const [selGoals, setSelGoals] = useState([])
  const [ddOpen, setDdOpen] = useState(false)
  const ddRef = useRef(null)

  /* click-outside → close dropdown */
  useEffect(() => {
    const h = (e) => ddRef.current && !ddRef.current.contains(e.target) && setDdOpen(false)
    if (ddOpen) document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [ddOpen])

  /* pull every goal belonging to every participant */
  useEffect(() => {
    if (!appt) return

    const fetchGoals = async () => {
      const { data: cats } = await getCategories()
      const allGoals = cats.flatMap((c) => c.goals.map((g) => ({ ...g, category: c.name })))

      const patientGoals = async (pid) => {
        const { data } = await api.get(`/clients/${pid}`)
        return new Set(data.goals ?? [])
      }

      let allowed = new Set()

      if (appt.type === "individual") {
        const pid = typeof appt.patient === "string" ? appt.patient : appt.patient?._id
        allowed = await patientGoals(pid)
      } else {
        const gid = typeof appt.group === "string" ? appt.group : appt.group?._id
        const { data: grp } = await api.get(`/groups/${gid}`)
        for (const p of grp.patients) {
          const gs = await patientGoals(p._id)
          gs.forEach((g) => allowed.add(g))
        }
      }

      setGoalBank(allGoals.filter((g) => allowed.has(g.name)))
    }
    fetchGoals()
  }, [appt])

  const addGoal = (g) => {
    if (!selGoals.includes(g.name)) setSelGoals((p) => [...p, g.name])
    setDdOpen(false)
  }
  const removeGoal = (gN) => setSelGoals((p) => p.filter((x) => x !== gN))

  /* ───────── submit ───────── */
  const save = async (e) => {
    e.preventDefault()
    if (!file) return alert("Please choose a video first")

    const fd = new FormData()
    fd.append("title", title || "Session video")
    fd.append("notes", notes)
    selGoals.forEach((g) => fd.append("goals", g))
    fd.append("video", file)

    const { data } = await uploadVideo(apptId, fd)
    nav(`/videos/${data._id}/review`)
  }

  if (!appt)
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
          <Navbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">Loading appointment...</p>
            </div>
          </div>
        </div>
    )

  return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        {/* Header Section */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                    onClick={() => nav(-1)}
                    className="flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200 hover:bg-gray-100 px-3 py-2 rounded-lg"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Dashboard
                </button>
              </div>
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Session Video</h1>
                <p className="text-gray-600">Upload and organize your therapy session recordings</p>
              </div>
              <div className="w-32"></div> {/* Spacer for centering */}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-8 py-8">
          <form onSubmit={save} className="grid grid-cols-12 gap-8">
            {/* Left Column - Form Fields */}
            <div className="col-span-7 space-y-8">
              {/* Session Information Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center mb-6">
                  <FileVideo className="w-6 h-6 text-primary mr-3" />
                  <h2 className="text-xl font-semibold text-gray-900">Session Information</h2>
                </div>

                <div className="space-y-6">
                  {/* Title Field */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Session Title</label>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter a descriptive title for this session"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all duration-200 text-lg"
                    />
                  </div>

                  {/* Session Details Grid */}
                  <div className="grid grid-cols-2 gap-6">
                    <InfoCard icon={<Calendar className="w-5 h-5 text-primary" />} label="Visit Type" value={appt.type} />
                    <InfoCard
                        icon={<Users className="w-5 h-5 text-primary" />}
                        label={appt.type === "group" ? "Group" : "Patient"}
                        value={appt.type === "group" ? appt.group?.name : appt.patient?.name}
                    />
                  </div>
                </div>
              </div>

              {/* Goals Selection Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center mb-6">
                  <Target className="w-6 h-6 text-primary mr-3" />
                  <h2 className="text-xl font-semibold text-gray-900">Treatment Goals</h2>
                </div>

                <div ref={ddRef} className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Select Goals ({goalBank.length} available)
                  </label>
                  <button
                      type="button"
                      onClick={() => setDdOpen((o) => !o)}
                      className="w-full flex justify-between items-center px-4 py-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors duration-200 text-left"
                  >
                    <span className="text-gray-600">Click to select treatment goals...</span>
                    <ChevronDown
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${ddOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {ddOpen && (
                      <div className="absolute z-50 mt-2 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                        {goalBank.map((g) => (
                            <div
                                key={g.name}
                                onClick={() => addGoal(g)}
                                className="px-4 py-3 hover:bg-primary/10 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-gray-900">{g.name}</span>
                                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{g.category}</span>
                              </div>
                            </div>
                        ))}
                      </div>
                  )}

                  {selGoals.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-3">Selected Goals:</p>
                        <div className="flex flex-wrap gap-2">
                          {selGoals.map((g) => (
                              <span
                                  key={g}
                                  className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium"
                              >
                          {g}
                                <X
                                    onClick={() => removeGoal(g)}
                                    className="w-4 h-4 cursor-pointer hover:text-blue-600 transition-colors"
                                />
                        </span>
                          ))}
                        </div>
                      </div>
                  )}
                </div>
              </div>

              {/* Notes Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center mb-6">
                  <FileText className="w-6 h-6 text-primary mr-3" />
                  <h2 className="text-xl font-semibold text-gray-900">Session Notes</h2>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Additional Notes (Optional)</label>
                  <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={6}
                      placeholder="Add any additional notes about this session..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none transition-all duration-200"
                  />
                </div>
              </div>
            </div>

            {/* Right Column - File Upload */}
            <div className="col-span-5">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sticky top-8">
                <div className="flex items-center mb-6">
                  <Cloud className="w-6 h-6 text-primary mr-3" />
                  <h2 className="text-xl font-semibold text-gray-900">Video Upload</h2>
                </div>

                <label className="block border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 cursor-pointer group min-h-[400px] flex flex-col justify-center">
                  <input type="file" accept="video/*" hidden onChange={(e) => setFile(e.target.files[0])} />

                  <div className="flex flex-col items-center justify-center">
                    {file ? (
                        <div className="text-center">
                          <FileVideo className="w-16 h-16 text-green-600 mx-auto mb-4" />
                          <p className="text-lg font-semibold text-gray-900 mb-2">File Selected</p>
                          <p className="text-gray-600 break-all px-4">{file.name}</p>
                          <p className="text-sm text-gray-500 mt-2">Size: {(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                    ) : (
                        <>
                          <Cloud className="w-20 h-20 text-gray-400 group-hover:text-gray-500 mb-6 transition-colors duration-200" />
                          <p className="text-xl font-semibold text-gray-700 mb-2">Drop your video here</p>
                          <p className="text-gray-600 mb-4">
                            or <span className="text-primary font-semibold">browse files</span>
                          </p>
                          <div className="bg-white rounded-lg px-4 py-2 border border-gray-200">
                            <p className="text-sm text-gray-500">Supported: MP4, MOV, AVI, WMV, MKV, WebM, FLV</p>
                          </div>
                        </>
                    )}
                  </div>
                </label>

                <div className="mt-8 flex justify-center">
                  <button
                      type="submit"
                      disabled={!file}
                      className={`${primaryBtn} px-8 py-4 rounded-xl flex items-center gap-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200`}
                  >
                    <UploadIcon className="w-5 h-5" />
                    Upload Session Video
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
  )
}

/* Enhanced Info Card Component */
const InfoCard = ({ icon, label, value }) => (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center mb-2">
        {icon}
        <label className="text-sm font-semibold text-gray-700 ml-2">{label}</label>
      </div>
      <p className="text-gray-900 font-medium text-lg capitalize">{value}</p>
    </div>
)
