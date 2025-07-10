"use client"

/* ──────────────────────────────────────────────────────────
   ActivityGenerator.jsx  (UPDATED VERSION)
   - Uses MultiSelectDropdown and SingleSelectDropdown
   - Added SavingToast for notifications
   - Icon buttons for edit/delete with confirmation dialog
   - Enhanced styling to match design system
   - All API functionality preserved
   ────────────────────────────────────────────────────────── */

import { useState, useEffect, useRef } from "react"
import PropTypes from "prop-types"
import { marked } from "marked"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import qs from "qs"
import AccordionRow from "./AccordionRow"
import MultiSelectDropdown from "./multi-select-dropdown"
import SingleSelectDropdown from "./single-select-dropdown"
import SavingToast from "../components/savingToast"
import axios from "axios"
import { Users, Target, Clock, Edit, Trash2, AlertTriangle } from "lucide-react"

const api = axios.create({
  baseURL: "http://localhost:4000/api",
  headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` },
})

/* ---------- tiny helpers ---------- */
const todayISO = () => new Date().toISOString()
const slugify = (s) =>
    s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")

/* ===================================================================== */
/*                               COMPONENT                               */
/* ===================================================================== */
export default function ActivityGenerator({
                                            mode, // "group" | "individual"
                                            appointmentId,
                                            patients, // [{ _id, name, avatarUrl }]
                                            allGoals, // string[]
                                            initialActivities,
                                            onActivitiesChange,
                                          }) {
  /* ─────────── state ─────────── */
  const [activities, setActs] = useState(initialActivities)

  const [members, setMembers] = useState(mode === "individual" ? [patients?.[0]?._id].filter(Boolean) : [])
  const [goals, setGoals] = useState([])
  const [duration, setDur] = useState("30 Minutes")
  const [idea, setIdea] = useState("")

  /* draft stage */
  const [draft, setDraft] = useState(null) // { name, description, materials }
  const [draftMats, setMats] = useState([])

  /* preview stage */
  const [planMD, setPlan] = useState("")
  const [htmlDoc, setHtml] = useState("") // editable HTML
  const [pending, setPend] = useState(null) // payload for confirm

  /* misc */
  const [busy, setBusy] = useState(false)
  const editorRef = useRef(null)

  /* toast state */
  const [toast, setToast] = useState({ show: false, message: "", type: "success" })

  /* whenever caller passes new initialActivities (route reload) */
  useEffect(() => setActs(initialActivities), [initialActivities])

  /* notify parent on every change */
  const updateActs = (next) => {
    setActs(next)
    onActivitiesChange?.(next)
  }

  /* seed editable <div> when planMarkdown appears */
  useEffect(() => {
    if (planMD && editorRef.current) {
      const html = marked.parse(planMD)
      editorRef.current.innerHTML = html
      setHtml(html)
    }
  }, [planMD])

  /* toast helpers */
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type })
  }

  const hideToast = () => {
    setToast({ show: false, message: "", type: "success" })
  }

  /* ============================================================
     0️⃣  DRAFT   (/activity-draft)                              */
  /* ============================================================ */
  async function generateDraft() {
    if (busy) return
    if (!members.length || !goals.length) {
      showToast("Pick at least one member and one goal first.", "error")
      return
    }

    try {
      setBusy(true)
      const { data } = await api.post(`/appointments/${appointmentId}/activity-draft`, {
        memberIds: members,
        goals,
        duration,
        idea,
      }) // { name, description, materials[] }
      setDraft(data)
      setMats(data.materials)
    } catch (err) {
      showToast(err.response?.data?.message || "Draft generation failed.", "error")
    } finally {
      setBusy(false)
    }
  }

  /* ============================================================
     1️⃣  PREVIEW   (/generate-activity preview:true)            */
  /* ============================================================ */
  async function previewPlan() {
    if (busy || !draft) return
    if (!draftMats.length) {
      showToast("Select at least one material.", "error")
      return
    }

    const payload = {
      memberIds: members,
      goals,
      duration,
      idea,
      materials: draftMats,
      activityName: draft.name,
      preview: true,
    }

    try {
      setBusy(true)
      const { data } = await api.post(`/appointments/${appointmentId}/generate-activity`, payload) // { plan }
      setPlan((data.plan || "").trim())

      /* store an identical payload (minus preview flag) */
      delete payload.preview
      setPend(payload)

      /* reset draft UI */
      setDraft(null)
      setMats([])
      setIdea("")
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.message || "Failed to get preview.", "error")
    } finally {
      setBusy(false)
    }
  }

  /* ============================================================
     2️⃣  CONFIRM & SAVE   (/generate-activity preview:false)    */
  /* ============================================================ */
  async function confirmAndSave() {
    if (busy || !pending) return

    setBusy(true)
    try {
      /* A. real create -> { plan, activity } */
      const { data } = await api.post(`/appointments/${appointmentId}/generate-activity`, pending)
      const act = data.activity
      if (!act?._id) throw new Error("Server did not return activity id")

      updateActs((a) => [...a, act]) // keep accordion up to date

      /* B. turn edited HTML -> PDF blob */
      const blob = await htmlToPdfBlob(editorRef.current)
      const date = todayISO().slice(0, 10)
      const slug = slugify(act.name)
      const fname = `material_${date}_${slug}.pdf`
      downloadBlob(blob, fname)

      /* C. upload (dedupe per patient) */
      await Promise.all(members.map((pid) => uploadMaterial(pid, blob, fname, date, slug)))

      /* D. visitHistory & goal-progress */
      const visit = {
        date: todayISO(),
        appointment: appointmentId,
        type: mode,
        note: "See generated plan.",
        aiInsights: [],
        activities: [act._id],
      }
      await Promise.all(members.map((pid) => api.post(`/clients/${pid}/visit`, { visit })))
      await Promise.all(
          members.map((pid) =>
              api.patch(`/clients/${pid}/goal-progress/history`, {
                goals,
                activityName: act.name,
              }),
          ),
      )

      /* clear preview state (ready for next activity) */
      setPlan("")
      setPend(null)
      showToast("Activity saved successfully!")
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.message || "Save failed – see console.", "error")
    } finally {
      setBusy(false)
    }
  }

  /* ============================================================ */
  /*                       helper utilities                       */
  /* ============================================================ */
  async function htmlToPdfBlob(node) {
    const canvas = await html2canvas(node, { scale: 2 })
    const pdf = new jsPDF({ unit: "pt", format: "a4" })
    const w = pdf.internal.pageSize.getWidth()
    const h = (canvas.height * w) / canvas.width
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, w, h)
    return pdf.output("blob")
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function uploadMaterial(pid, blob, fname, date, slug) {
    const q = qs.stringify({ appointment: appointmentId, activity: slug })
    const dup = await api
        .get(`/clients/${pid}/materials?${q}`)
        .then((r) => r.data)
        .catch(() => [])
    await Promise.all(dup.map((d) => api.delete(`/clients/${pid}/materials/${d._id}`)))

    const fd = new FormData()
    fd.append("visitDate", date)
    fd.append("appointment", appointmentId)
    fd.append("activity", slug)
    fd.append("file", new File([blob], fname, { type: "application/pdf" }))

    await api.post(`/clients/${pid}/materials`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  }

  /* ============================================================ */
  /*                           RENDER                             */
  /* ============================================================ */
  return (
      <div className="space-y-6">
        {/* Toast Notifications */}
        <SavingToast show={toast.show} message={toast.message} type={toast.type} onClose={hideToast} />

        {/* ─── Existing activities ─── */}
        {activities.length > 0 && (
            <>
              <h4 className="text-xl font-semibold text-gray-800">Generated Activities</h4>
              {activities.map((a) => (
                  <ActivityAccordion
                      key={a._id}
                      act={a}
                      appointmentId={appointmentId}
                      memberOptions={patients.map((p) => ({ id: p._id, label: p.name }))}
                      onUpdated={(u) => {
                        updateActs((acts) => acts.map((x) => (x._id === u._id ? u : x)))
                        showToast("Activity updated successfully!")
                      }}
                      onDeleted={(id) => {
                        updateActs((acts) => acts.filter((x) => x._id !== id))
                        showToast("Activity deleted successfully!")
                      }}
                      showToast={showToast}
                  />
              ))}
              <hr className="border-gray-200" />
            </>
        )}

        {/* ─── Generator form ─── */}
        <h4 className="text-xl font-semibold text-gray-800">Activity Generator</h4>

        {mode === "group" && (
            <MultiSelectDropdown
                label="Members"
                placeholder="Select Patients"
                options={patients.map((p) => ({ id: p._id, label: p.name }))}
                selectedIds={members}
                onSelectionChange={setMembers}
                showTags={true}
                emptyTagsMessage="No patients selected"
                size="md"
                icon={<Users className="h-5 w-5 text-gray-400" />}
            />
        )}

        <MultiSelectDropdown
            label="Goals"
            placeholder="Select Goals"
            options={allGoals.map((g) => ({ id: g, label: g }))}
            selectedIds={goals}
            onSelectionChange={setGoals}
            showTags={true}
            emptyTagsMessage="No goals selected"
            size="md"
            icon={<Target className="h-5 w-5 text-gray-400" />}
        />

        <SingleSelectDropdown
            label="Duration"
            placeholder="Select duration"
            options={[
              { id: "15 Minutes", label: "15 Minutes" },
              { id: "30 Minutes", label: "30 Minutes" },
              { id: "45 Minutes", label: "45 Minutes" },
              { id: "60 Minutes", label: "60 Minutes" },
            ]}
            selectedId={duration}
            onSelectionChange={setDur}
            size="md"
            icon={<Clock className="h-5 w-5 text-gray-400" />}
        />

        {!planMD && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Therapist Idea (Optional)</label>
              <textarea
                  rows={3}
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="Add any specific ideas or requirements for the activity..."
                  className="w-full bg-gray-50 rounded-xl border border-gray-200 px-4 py-3 text-base focus:ring-2 focus:ring-[#3D298D]/20 focus:border-[#3D298D] transition-colors resize-none"
              />
            </div>
        )}

        {/* ─── Buttons ─── */}
        {!draft && (
            <button
                onClick={generateDraft}
                disabled={busy}
                className="bg-[#3D298D] text-white rounded-xl px-6 py-3 font-medium hover:bg-[#3D298D]/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {busy ? "Generating…" : "Generate Activity"}
            </button>
        )}

        {/* --- Draft card & preview button --- */}
        {draft && !planMD && (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <div>
                  <h5 className="text-lg font-semibold text-gray-800 mb-2">Activity Draft</h5>
                  <p className="text-sm text-gray-600">
                    <strong>Name:</strong> {draft.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    <strong>Description:</strong> {draft.description}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Select Materials</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {draft.materials.map((m) => (
                        <label key={m} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                              type="checkbox"
                              checked={draftMats.includes(m)}
                              onChange={() =>
                                  setMats((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
                              }
                              className="h-4 w-4 text-[#3D298D] border-gray-300 rounded focus:ring-[#3D298D]/20"
                          />
                          <span className="text-sm text-gray-700">{m}</span>
                        </label>
                    ))}
                  </div>
                </div>
              </div>

              <button
                  onClick={previewPlan}
                  disabled={!draftMats.length || busy}
                  className="bg-[#3D298D] text-white rounded-xl px-6 py-3 font-medium hover:bg-[#3D298D]/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {busy ? "Creating…" : "Generate With Selected Materials"}
              </button>
            </>
        )}

        {/* --- Preview & confirm --- */}
        {planMD && (
            <div className="space-y-4">
              <h5 className="text-lg font-semibold text-gray-800">Generated Plan</h5>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="prose max-w-none min-h-[200px] focus:outline-none text-sm"
                    dangerouslySetInnerHTML={{ __html: htmlDoc }}
                    onInput={(e) => setHtml(e.currentTarget.innerHTML)}
                />
              </div>
              <button
                  onClick={confirmAndSave}
                  disabled={busy}
                  className="bg-[#3D298D] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#3D298D]/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {busy ? "Saving…" : "Confirm & Save"}
              </button>
            </div>
        )}
      </div>
  )
}

/* ===================================================================== */
/*                    Accordion + editable modal                          */
/* ===================================================================== */
function ActivityAccordion({ act, appointmentId, memberOptions, onUpdated, onDeleted, showToast }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  /* form state held only inside modal */
  const [form, setForm] = useState({
    name: act.name,
    description: act.description,
    members: act.members?.map(String) || [],
  })
  const patch = (f) => setForm((prev) => ({ ...prev, ...f }))

  /* ------------ save ------------- */
  const save = async () => {
    try {
      setBusy(true)
      const { data } = await api.patch(`/appointments/${appointmentId}/activities/${act._id}`, {
        name: form.name,
        description: form.description,
        members: form.members,
      })
      onUpdated(data)
      setEditing(false)
    } catch (err) {
      showToast("Edit failed", "error")
    } finally {
      setBusy(false)
    }
  }

  /* ------------ delete ----------- */
  const del = async () => {
    try {
      setBusy(true)
      await api.delete(`/appointments/${appointmentId}/activities/${act._id}`)
      onDeleted(act._id)
      setShowDeleteConfirm(false)
    } catch (err) {
      showToast("Delete failed", "error")
    } finally {
      setBusy(false)
    }
  }

  return (
      <>
        <AccordionRow
            open={open}
            onToggle={() => setOpen((o) => !o)}
            header={
              <div className="flex items-center justify-between w-full">
                <span className="font-medium text-gray-800">{act.name}</span>
                <div className="flex items-center gap-2">
                  <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditing(true)
                      }}
                      className="p-2 text-gray-500 hover:text-[#3D298D] hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit activity"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowDeleteConfirm(true)
                      }}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete activity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            }
        >
          <div
              className="prose prose-sm max-w-none text-gray-600"
              dangerouslySetInnerHTML={{ __html: marked.parse(act.description || "") }}
          />
        </AccordionRow>

        {/* ---------- EDIT MODAL ---------- */}
        {editing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
              <div className="bg-white rounded-xl p-6 w-full max-w-2xl space-y-5">
                <h3 className="text-lg font-semibold text-gray-800">Edit Activity</h3>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Activity Name</label>
                  <input
                      value={form.name}
                      onChange={(e) => patch({ name: e.target.value })}
                      className="w-full bg-gray-50 rounded-xl border border-gray-200 px-4 py-3 text-base focus:ring-2 focus:ring-[#3D298D]/20 focus:border-[#3D298D] transition-colors"
                      placeholder="Activity name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                      rows={6}
                      value={form.description}
                      onChange={(e) => patch({ description: e.target.value })}
                      className="w-full bg-gray-50 rounded-xl border border-gray-200 px-4 py-3 text-base focus:ring-2 focus:ring-[#3D298D]/20 focus:border-[#3D298D] transition-colors resize-none"
                      placeholder="Activity description"
                  />
                </div>

                {memberOptions.length > 1 && (
                    <MultiSelectDropdown
                        label="Members"
                        placeholder="Select patients"
                        options={memberOptions}
                        selectedIds={form.members}
                        onSelectionChange={(m) => patch({ members: m })}
                        showTags={true}
                        emptyTagsMessage="No patients selected"
                        size="sm"
                        icon={<Users className="h-4 w-4 text-gray-400" />}
                    />
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                      onClick={() => setEditing(false)}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                      onClick={save}
                      disabled={busy}
                      className="bg-[#3D298D] text-white px-4 py-2 rounded-xl disabled:opacity-60 hover:bg-[#3D298D]/90 transition-colors"
                  >
                    {busy ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* ---------- DELETE CONFIRMATION MODAL ---------- */}
        {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
              <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">Delete Activity</h3>
                </div>

                <p className="text-gray-600">Are you sure you want to delete "{act.name}"? This action cannot be undone.</p>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                      onClick={del}
                      disabled={busy}
                      className="bg-red-600 text-white px-4 py-2 rounded-xl disabled:opacity-60 hover:bg-red-700 transition-colors"
                  >
                    {busy ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
        )}
      </>
  )
}

ActivityAccordion.propTypes = {
  act: PropTypes.object.isRequired,
  appointmentId: PropTypes.string.isRequired,
  memberOptions: PropTypes.array.isRequired,
  onUpdated: PropTypes.func.isRequired,
  onDeleted: PropTypes.func.isRequired,
  showToast: PropTypes.func.isRequired,
}

ActivityGenerator.propTypes = {
  mode: PropTypes.oneOf(["group", "individual"]).isRequired,
  appointmentId: PropTypes.string.isRequired,
  patients: PropTypes.array.isRequired,
  allGoals: PropTypes.array.isRequired,
  initialActivities: PropTypes.array.isRequired,
  onActivitiesChange: PropTypes.func,
}
