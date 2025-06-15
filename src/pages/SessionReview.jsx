"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import NewGoalModal from "../modals/NewGoalModal"
import GoalPickerModal from "../modals/GoalPickerModal"
import { getTranscript, chatLLM, getVideo, getProfile } from "../services/api"

import {
  ChevronDown,
  ChevronUp,
  Send,
  Volume2,
  RefreshCcw,
  ThumbsDown,
  Paperclip,
  Mic2,
  BarChart3,
  FileText,
  Target,
  Loader2,
} from "lucide-react"

import ReactPlayer from "react-player"
import Navbar from "../components/Navbar"
import EmojiBtn from "../components/EmojiBtn"

const primaryBtn = "bg-primary hover:bg-primary/90 text-white transition-colors"

export default function SessionReview() {
  /* ─── basic data ─── */
  const { id } = useParams()
  const navigate = useNavigate()
  const [video, setVideo] = useState(null)
  const [user, setUser] = useState(null)

  /* UI toggles */
  const [showTx, setShowTx] = useState(false)
  const [showNewGoal, setShowNewGoal] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)

  /* ─── fetch video + profile ─── */
  useEffect(() => {
    getVideo(id).then((r) => setVideo(r.data))
  }, [id])
  useEffect(() => {
    getProfile().then((r) => setUser(r.data))
  }, [])

  /* fetch transcript lazily */
  useEffect(() => {
    if (!showTx || video?.transcript?.length > 0) return

    setIsTranscribing(true)
    getTranscript(id)
        .then((r) => {
          setVideo((v) => ({ ...v, transcript: r.data }))
          setIsTranscribing(false)
        })
        .catch(() => {
          alert("Failed to fetch transcript")
          setIsTranscribing(false)
          setShowTx(false) // Close transcript on error
        })
  }, [showTx, id, video?.transcript?.length])

  /* poll until transcript ready */
  useEffect(() => {
    if (!video || (video.transcript?.length ?? 0) > 0) return
    const h = setInterval(() => {
      getVideo(id).then((r) => {
        if (r.data.transcript?.length) {
          setVideo(r.data)
          clearInterval(h)
        }
      })
    }, 3000)
    return () => clearInterval(h)
  }, [video, id])

  /* ─── helpers ─── */
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

  /* ─── chat state ─── */
  const [msgs, setMsgs] = useState([
    {
      role: "assistant",
      content: "Hello! 👋 I'm your AI assistant ready to help you analyze your session and achieve your goals.",
    },
  ])
  const [draft, setDraft] = useState("")
  const [files, setFiles] = useState([])
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [msgs])

  /* speech-to-text */
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)
  const toggleMic = () => {
    if (!("webkitSpeechRecognition" in window)) return alert("Speech-to-text not supported")
    if (!recRef.current) {
      const R = new window.webkitSpeechRecognition()
      R.lang = "en-US"
      R.continuous = true
      R.interimResults = false
      R.onresult = (e) => setDraft((d) => `${d}${d ? " " : ""}${e.results[0][0].transcript}`)
      recRef.current = R
    }
    listening ? recRef.current.stop() : recRef.current.start()
    setListening(!listening)
  }

  /* send chat */
  const doSend = async (e) => {
    e?.preventDefault()
    if (!draft.trim() && !files.length) return

    const userMsg = { role: "user", content: draft, time: new Date(), files }
    setMsgs((m) => [...m, userMsg])
    setDraft("")
    setFiles([])

    const body = files.length
        ? (() => {
          const fd = new FormData()
          fd.append("messages", JSON.stringify([...msgs, userMsg]))
          files.forEach((f) => fd.append("attachment", f))
          return fd
        })()
        : { messages: [...msgs, userMsg] }

    const { data } = await chatLLM(body)
    setMsgs((m) => [...m, { role: "assistant", content: data.reply, time: new Date() }])
  }

  /* loading guard */
  if (!video || !user)
    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
          <Navbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-3 text-slate-600">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-lg">Loading session...</span>
            </div>
          </div>
        </div>
    )

  const handleTranscriptToggle = () => {
    if (!showTx) {
      setIsTranscribing(true)
      setShowTx(true)
      // Simulate the transcription process
      setTimeout(() => {
        setIsTranscribing(false)
      }, 2000)
    } else {
      setShowTx(false)
      setIsTranscribing(false)
    }
  }

  /* ─── render ─── */
  return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
        <Navbar />

        <main className="flex-1 p-4 lg:p-6">
          {/* Page Header */}
          <div className="max-w-7xl mx-auto mb-4">
            <div className="bg-white rounded-lg shadow-sm p-3 border border-slate-200">
              <h1 className="text-lg font-semibold text-slate-800">Session Analysis</h1>
              <p className="text-sm text-slate-500">Review your session progress and get AI-powered insights</p>
            </div>
          </div>

          <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-5 gap-6 h-full">
            {/* VIDEO SECTION - Takes up 3 columns on xl screens */}
            <div className="xl:col-span-3 space-y-6">
              {/* Video Player */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="aspect-video w-full">
                  <ReactPlayer url={video.fileUrl} controls width="100%" height="100%" className="rounded-2xl" />
                </div>
              </div>

              {/* Analysis Panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Goals Panel */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold text-slate-800">Selected Goals</h3>
                    </div>
                    <button
                        onClick={() => setShowPicker(true)}
                        className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                    >
                      Change
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(video.goals ?? []).map((g, i) => {
                      const label = typeof g === "string" ? g : g.category ? `${g.category}: ${g.name}` : g.name
                      return (
                          <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                            <span className="text-sm font-medium text-slate-700">{label}</span>
                          </div>
                      )
                    })}
                  </div>

                  <button
                      className="w-full mt-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                      onClick={() => {
                        const apptId = video.appointment
                        apptId
                            ? navigate(`/appointments/${apptId}/recommendations`)
                            : alert("No appointment linked to this video.")
                      }}
                  >
                    <BarChart3 className="w-4 h-4" />
                    Get AI Recommendations
                  </button>
                </div>

                {/* Transcript Panel */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <button
                      onClick={handleTranscriptToggle}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      <span className="font-medium text-slate-800">Video Transcript</span>
                    </div>
                    {showTx ? (
                        <ChevronUp className="w-5 h-5 text-slate-600 group-hover:text-primary transition-colors" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-slate-600 group-hover:text-primary transition-colors" />
                    )}
                  </button>

                  {/* Transcription Animation */}
                  {showTx && isTranscribing && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                            <div
                                className="w-2 h-2 bg-primary rounded-full animate-bounce"
                                style={{ animationDelay: "0.1s" }}
                            ></div>
                            <div
                                className="w-2 h-2 bg-primary rounded-full animate-bounce"
                                style={{ animationDelay: "0.2s" }}
                            ></div>
                          </div>
                          <span className="text-primary font-medium">Transcribing video...</span>
                        </div>
                        <div className="mt-2 text-sm text-blue-600">Processing audio and generating transcript</div>
                      </div>
                  )}

                  {/* Transcript Content */}
                  {showTx && !isTranscribing && video?.transcript?.length > 0 && (
                      <div className="mt-4 max-h-80 overflow-y-auto">
                        <div className="space-y-2">
                          {video.transcript.map((u, i) => (
                              <div key={i} className="p-3 bg-slate-50 rounded-lg">
                                <div className="flex gap-2 text-xs text-slate-500 mb-1">
                                  <span>{fmt(u.start)}</span>
                                  <span>-</span>
                                  <span>{fmt(u.end)}</span>
                                </div>
                                <p className="text-sm text-slate-700">{u.text}</p>
                              </div>
                          ))}
                        </div>
                      </div>
                  )}

                  {/* No transcript message */}
                  {showTx && !isTranscribing && (!video?.transcript || video.transcript.length === 0) && (
                      <div className="mt-4 p-4 bg-slate-50 rounded-xl text-center">
                        <p className="text-slate-600">No transcript available for this video.</p>
                      </div>
                  )}

                  {/* Progress Visualization Button */}
                  <button
                      onClick={() => alert("Coming soon")}
                      className="w-full mt-4 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-slate-600 group-hover:text-primary transition-colors" />
                      <span className="font-medium text-slate-700 group-hover:text-primary transition-colors">
                      Visualized Progress
                    </span>
                    </div>
                    <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                  </button>
                </div>
              </div>
            </div>

            {/* CHAT SECTION - Takes up 2 columns on xl screens */}
            <div className="xl:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg flex flex-col h-[700px]">
                {/* Chat Header */}
                <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-blue-50 rounded-t-2xl flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">S</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">Chat with SOAP</h3>
                      <p className="text-sm text-slate-600">Your AI session assistant</p>
                    </div>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                  {msgs.map((m, i) =>
                      m.role === "assistant" ? (
                          <Bubble key={i} side="left" avatar="S" msg={m} />
                      ) : (
                          <Bubble key={i} side="right" avatar={user.avatarUrl} msg={m} />
                      ),
                  )}
                  <div ref={chatEndRef} />

                  {/* Chat Actions */}
                  <div className="flex gap-4 text-slate-400 pt-2">
                    <Volume2 className="w-5 h-5 hover:text-primary cursor-pointer transition-colors" />
                    <RefreshCcw className="w-5 h-5 hover:text-primary cursor-pointer transition-colors" />
                    <ThumbsDown className="w-5 h-5 hover:text-primary cursor-pointer transition-colors" />
                  </div>
                </div>

                {/* Chat Input */}
                <form onSubmit={doSend} className="border-t p-4 bg-slate-50 rounded-b-2xl flex-shrink-0">
                  <div className="flex items-center gap-2 bg-white rounded-xl p-3 border border-slate-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                    <Paperclip
                        className="w-5 h-5 text-slate-400 cursor-pointer hover:text-primary transition-colors flex-shrink-0"
                        onClick={() => document.getElementById("fileInput")?.click()}
                    />
                    <input
                        id="fileInput"
                        type="file"
                        multiple
                        hidden
                        onChange={(e) => setFiles([...files, ...Array.from(e.target.files || [])])}
                    />

                    <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Message SOAP..."
                        className="flex-1 outline-none text-slate-700 placeholder-slate-400 min-w-0"
                    />

                    {typeof EmojiBtn === "function" && (
                        <div className="flex-shrink-0">
                          <EmojiBtn onSelect={(e) => setDraft((d) => d + e)} />
                        </div>
                    )}

                    <Mic2
                        className={`w-5 h-5 cursor-pointer transition-colors flex-shrink-0 ${
                            listening ? "text-primary" : "text-slate-400 hover:text-primary"
                        }`}
                        onClick={toggleMic}
                    />

                    <button
                        type="submit"
                        className={`px-3 py-2 rounded-lg flex items-center gap-1 text-sm font-medium flex-shrink-0 ${primaryBtn}`}
                        disabled={!draft.trim() && !files.length}
                    >
                      <Send className="w-4 h-4" />
                      Send
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* ─── Modals ─── */}
          <NewGoalModal
              open={showNewGoal}
              onClose={() => setShowNewGoal(false)}
              onSaved={(g) => setVideo((v) => ({ ...v, goals: [...(v.goals || []), g] }))}
          />

          <GoalPickerModal open={showPicker} onClose={() => setShowPicker(false)} video={video} onSaved={setVideo} />
        </main>
      </div>
  )
}

/* Chat bubble component */
const Bubble = ({ side, avatar, msg }) => {
  const left = side === "left"
  const time = msg.time?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  return (
      <div className={`flex gap-3 ${left ? "" : "justify-end"}`}>
        {left && <Avatar avatar={avatar} />}
        <div className="flex flex-col items-start max-w-[400px]">
          <div
              className={`${
                  left ? "bg-slate-100 text-slate-800 border border-slate-200" : "bg-primary text-white"
              } rounded-2xl p-4 shadow-sm`}
          >
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
          </div>
          {time && <span className={`mt-1 text-xs ${left ? "text-slate-400" : "text-slate-400 self-end"}`}>{time}</span>}
        </div>
        {!left && <Avatar avatar={avatar} />}
      </div>
  )
}

const Avatar = ({ avatar }) =>
    avatar?.startsWith("http") ? (
        <img
            src={avatar || "/placeholder.svg"}
            alt="Profile"
            className="h-8 w-8 rounded-full object-cover ring-2 ring-white shadow-sm"
        />
    ) : (
        <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-sm">
          {avatar}
        </div>
    )
