"use client"
import LiveMarkdownEditor from "../components/LiveMarkdownEditor";
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import PropTypes from "prop-types"
import { marked } from "marked"
import jsPDF from "jspdf"
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

// Configure marked for better HTML output
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false,
})

// Helper function to safely parse markdown to HTML with live updates
const parseMarkdownToHTML = (markdown) => {
  if (!markdown || typeof markdown !== "string") return ""
  try {
    return marked.parse(markdown)
  } catch (error) {
    console.error("Error parsing markdown:", error)
    return markdown
  }
}

// Helper functions
const todayISO = () => new Date().toISOString()
const slugify = (s) =>
    s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")

// Request deduplication utility
class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map()
  }

  async dedupe(key, requestFn) {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)
    }

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key)
    })

    this.pendingRequests.set(key, promise)
    return promise
  }
}

const requestDeduplicator = new RequestDeduplicator()


export default function ActivityGenerator({
                                            mode,
                                            appointmentId,
                                            patients,
                                            allGoals,
                                            initialActivities,
                                            onActivitiesChange,
                                          }) {
  // State management with deduplication
  const [activities, setActivities] = useState([])
  const [members, setMembers] = useState(mode === "individual" ? [patients?.[0]?._id].filter(Boolean) : [])
  const [goals, setGoals] = useState([])
  const [duration, setDuration] = useState("30 Minutes")
  const [idea, setIdea] = useState("")

  // Draft stage
  const [draft, setDraft] = useState(null)
  const [draftMaterials, setDraftMaterials] = useState([])

  // Preview stage - using separate states for better reactivity
  const [planMarkdown, setPlanMarkdown] = useState("")
  const planHtmlRef = useRef("");
  const [pendingPayload, setPendingPayload] = useState(null)
                                            const pdfRef = useRef(null)   // 👈 holds the HTML we’ll print

  // Loading states to prevent duplicate requests
  const [loadingStates, setLoadingStates] = useState({
    generateDraft: false,
    previewPlan: false,
    confirmSave: false,
  })

  const [toast, setToast] = useState({ show: false, message: "", type: "success" })

  // Deduplication function for activities
  const deduplicateActivities = useCallback((activitiesList) => {
    if (!Array.isArray(activitiesList)) return []

    const seen = new Set()
    return activitiesList.filter((activity) => {
      if (!activity?._id) return false
      if (seen.has(activity._id)) return false
      seen.add(activity._id)
      return true
    })
  }, [])

  // Initialize activities with deduplication
  useEffect(() => {
    const uniqueActivities = deduplicateActivities(initialActivities || [])
    setActivities(uniqueActivities)
  }, [initialActivities, deduplicateActivities])

  // Update activities with deduplication
  const updateActivities = useCallback(
      (updater) => {
        setActivities((prevActivities) => {
          const newActivities = typeof updater === "function" ? updater(prevActivities) : updater
          const uniqueActivities = deduplicateActivities(newActivities)
          onActivitiesChange?.(uniqueActivities)
          return uniqueActivities
        })
      },
      [deduplicateActivities, onActivitiesChange],
  )

  useEffect(() => {
    planHtmlRef.current = planMarkdown
      ? parseMarkdownToHTML(planMarkdown)
      : "";
  }, [planMarkdown]);

  // Handle live markdown editing - store HTML directly during editing
  const handleMarkdownChange = useCallback((newHtml) => {
    planHtmlRef.current = newHtml
    // Don't convert back to markdown during editing to preserve formatting
  }, []);

  // Toast helpers
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type })
  }

  const hideToast = () => {
    setToast({ show: false, message: "", type: "success" })
  }

  // Set loading state helper
  const setLoadingState = (key, value) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }))
  }

  // Generate draft with deduplication
  async function generateDraft() {
    if (loadingStates.generateDraft) return

    if (!members.length || !goals.length) {
      showToast("Pick at least one member and one goal first.", "error")
      return
    }

    const requestKey = `draft-${appointmentId}-${members.join(",")}-${goals.join(",")}-${duration}`

    try {
      setLoadingState("generateDraft", true)

      const { data } = await requestDeduplicator.dedupe(requestKey, () =>
          api.post(`/appointments/${appointmentId}/activity-draft`, {
            memberIds: members,
            goals,
            duration,
            idea,
          }),
      )

      setDraft(data)
      setDraftMaterials(data.materials || [])
    } catch (err) {
      console.error("Draft generation error:", err)
      showToast(err.response?.data?.message || "Draft generation failed.", "error")
    } finally {
      setLoadingState("generateDraft", false)
    }
  }

  // Preview plan with deduplication
  async function previewPlan() {
    if (loadingStates.previewPlan || !draft) return

    if (!draftMaterials.length) {
      showToast("Select at least one material.", "error")
      return
    }

    const payload = {
      memberIds: members,
      goals,
      duration,
      idea,
      materials: draftMaterials,
      activityName: draft.name,
      preview: true,
    }

    const requestKey = `preview-${appointmentId}-${JSON.stringify(payload)}`

    try {
      setLoadingState("previewPlan", true)

      const { data } = await requestDeduplicator.dedupe(requestKey, () =>
          api.post(`/appointments/${appointmentId}/generate-activity`, payload),
      )

      // Set markdown content - this will trigger the live HTML conversion
      const markdownContent = (data.plan || "").trim()
      setPlanMarkdown(markdownContent)

      // Store payload for confirmation (remove preview flag)
      const { preview, ...confirmPayload } = payload
      setPendingPayload(confirmPayload)

      // Reset draft UI
      setDraft(null)
      setDraftMaterials([])
      setIdea("")
    } catch (err) {
      console.error("Preview generation error:", err)
      showToast(err.response?.data?.message || "Failed to get preview.", "error")
    } finally {
      setLoadingState("previewPlan", false)
    }
  }

async function elementToPdfBlob(element, filename) {
  await new Promise(r => requestAnimationFrame(r));

  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });

  await doc.html(element, {
    x: 28,
    y: 28,
    html2canvas: {
      scale: 0.7,      // 🚀 shrink everything ~30 %
      useCORS: true
    }
  });

  doc.save(filename, { returnPromise: true });
  return doc.output("blob");
}


  // Confirm and save with comprehensive deduplication
  async function confirmAndSave() {
    if (loadingStates.confirmSave || !pendingPayload) return

    const requestKey = `save-${appointmentId}-${JSON.stringify(pendingPayload)}`

    try {
      setLoadingState("confirmSave", true)

      // Step 1: Create activity with deduplication
      const { data } = await requestDeduplicator.dedupe(requestKey, () =>
          api.post(`/appointments/${appointmentId}/generate-activity`, pendingPayload),
      )

      const newActivity = data.activity
      if (!newActivity?._id) {
        throw new Error("Server did not return activity ID")
      }

      // Step 2: Update activities list with deduplication
      updateActivities((prevActivities) => {
        // Check if activity already exists
        const exists = prevActivities.some((act) => act._id === newActivity._id)
        if (exists) {
          console.warn("Activity already exists, skipping duplicate")
          return prevActivities
        }
        return [...prevActivities, newActivity]
      })

      // Step 3: Generate and download PDF using current HTML
      // -----------------------------------------------------------------
      // 3️⃣  generate & download the PDF ---------------------------------
      await new Promise(r => requestAnimationFrame(r));  // wait one paint

      const filename = `activity_${todayISO().slice(0,10)}_${slugify(newActivity.name)}.pdf`;
      const pdfBlob  = await elementToPdfBlob(pdfRef.current, filename);

      // upload for patients (if you still need this step)
      await Promise.allSettled(
        members.map(id => uploadMaterial(id, pdfBlob, filename, todayISO().slice(0,10), slugify(newActivity.name)))
      );


      await Promise.allSettled([
        // Visit history
        ...members.map((patientId) =>
            api.patch(
                `/clients/${patientId}/visit/${appointmentId}/activities`,
                { activities: [newActivity._id] }
            ).catch((err) => {
                console.error(`Failed to create visit for patient ${patientId}:`, err)
                return null
            }),
        ),
        // Goal progress
        ...members.map((patientId) =>
            api
                .patch(`/clients/${patientId}/goal-progress/history`, {
                  goals,
                  activityName: newActivity.name,
                })
                .catch((err) => {
                  console.error(`Failed to update goal progress for patient ${patientId}:`, err)
                  return null
                }),
        ),
      ])

      // Step 6: Clear preview state
      setPlanMarkdown("")
      
      setPendingPayload(null)

      showToast("Activity saved successfully!")
    } catch (err) {
      console.error("Save operation failed:", err)
      showToast(err.response?.data?.message || "Save failed – please try again.", "error")

      // Rollback: Remove the activity if it was added but save failed
      if (err.response?.status !== 409) {
        // Don't rollback on conflict errors
        updateActivities((prevActivities) => prevActivities.filter((act) => act._id !== err.activityId))
      }
    } finally {
      setLoadingState("confirmSave", false)
    }
  }

  async function uploadMaterial(patientId, blob, filename, date, slug) {
    const query = qs.stringify({ appointment: appointmentId, activity: slug })

    // Remove existing duplicates
    try {
      const existingMaterials = await api
          .get(`/clients/${patientId}/materials?${query}`)
          .then((r) => r.data)
          .catch(() => [])

      await Promise.allSettled(
          existingMaterials.map((material) => api.delete(`/clients/${patientId}/materials/${material._id}`)),
      )
    } catch (err) {
      console.warn("Failed to clean up existing materials:", err)
    }

    // Upload new material
    const formData = new FormData()
    formData.append("visitDate", date)
    formData.append("appointment", appointmentId)
    formData.append("activity", slug)
    formData.append("file", new File([blob], filename, { type: "application/pdf" }))

    return api.post(`/clients/${patientId}/materials`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  }

  const isAnyLoading = Object.values(loadingStates).some(Boolean)

  return (
      <div className="bg-[#F5F4FB] rounded-2xl p-6 shadow-sm space-y-4">
        {/* Toast Notifications */}
        <SavingToast show={toast.show} message={toast.message} type={toast.type} onClose={hideToast} />

        {/* Existing activities */}
        {activities.length > 0 && (
            <>
              <h4 className="text-xl font-semibold text-gray-800">Generated Activities</h4>
              {activities.map((activity) => (
                  <ActivityAccordion
                      key={activity._id}
                      act={activity}
                      appointmentId={appointmentId}
                      memberOptions={patients.map((p) => ({ id: p._id, label: p.name }))}
                      onUpdated={(updatedActivity) => {
                        updateActivities((prevActivities) =>
                            prevActivities.map((act) => (act._id === updatedActivity._id ? updatedActivity : act)),
                        )
                        showToast("Activity updated successfully!")
                      }}
                      onDeleted={(deletedId) => {
                        updateActivities((prevActivities) => prevActivities.filter((act) => act._id !== deletedId))
                        showToast("Activity deleted successfully!")
                      }}
                      showToast={showToast}
                  />
              ))}
              <hr className="border-gray-200" />
            </>
        )}

        {/* Generator form */}
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
            onSelectionChange={setDuration}
            size="md"
            icon={<Clock className="h-5 w-5 text-gray-400" />}
        />

        {!planMarkdown && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Therapist Idea (Optional)</label>
              <textarea
                  rows={3}
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="Add any specific ideas or requirements for the activity..."
                  className="w-full bg-gray-50 rounded-xl border border-gray-200 px-4 py-3 text-base focus:ring-2 focus:ring-[#3D298D]/20 focus:border-[#3D298D] transition-colors resize-none"
                  disabled={isAnyLoading}
              />
            </div>
        )}

        {/* Generate Draft Button */}
        {!draft && !planMarkdown && (
            <button
                onClick={generateDraft}
                disabled={loadingStates.generateDraft || isAnyLoading}
                className="bg-[#3D298D] text-white rounded-xl px-6 py-3 font-medium hover:bg-[#3D298D]/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loadingStates.generateDraft ? "Generating…" : "Generate Activity"}
            </button>
        )}

        {/* Draft card & preview button */}
        {draft && !planMarkdown && (
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
                  <p className="text-sm text-gray-600 whitespace-pre-wrap"><strong>Select Materials</strong></p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {draft.materials?.map((material) => (
                        <label
                            key={material}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                              type="checkbox"
                              checked={draftMaterials.includes(material)}
                              onChange={() =>
                                  setDraftMaterials((prev) =>
                                      prev.includes(material) ? prev.filter((m) => m !== material) : [...prev, material],
                                  )
                              }
                              className="h-4 w-4 text-[#3D298D] border-gray-300 rounded focus:ring-[#3D298D]/20 accent-[#3D298D]"
                              disabled={isAnyLoading}
                          />
                          <span className="text-sm text-gray-700">{material}</span>
                        </label>
                    ))}
                  </div>
                </div>
              </div>

              <button
                  onClick={previewPlan}
                  disabled={!draftMaterials.length || loadingStates.previewPlan || isAnyLoading}
                  className="bg-[#3D298D] text-white rounded-xl px-6 py-3 font-medium hover:bg-[#3D298D]/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {loadingStates.previewPlan ? "Creating…" : "Generate With Selected Materials"}
              </button>
            </>
        )}

        {/* Preview & confirm - This section should now render properly */}
        {planMarkdown && (
            <div className="space-y-4">
              <h5 className="text-lg font-semibold text-gray-800">Generated Plan</h5>
              <div ref={pdfRef} className="bg-white p-3 min-h-[300px] border border-gray-200 rounded-lg">
                <LiveMarkdownEditor
                  markdown={planMarkdown}
                  onChange={handleMarkdownChange}
                  className="w-full h-full"
                />
              </div>
              <div className="flex gap-3">
                <button
                    onClick={confirmAndSave}
                    disabled={loadingStates.confirmSave || isAnyLoading}
                    className="bg-[#3D298D] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#3D298D]/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingStates.confirmSave ? "Saving…" : "Confirm & Save"}
                </button>
                <button
                    onClick={() => {
                      setPlanMarkdown("")
                      
                      setPendingPayload(null)
                    }}
                    disabled={isAnyLoading}
                    className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
        )}
      </div>
  )
}

// Activity Accordion Component with improved markdown rendering
function ActivityAccordion({ act, appointmentId, memberOptions, onUpdated, onDeleted, showToast }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  const [form, setForm] = useState({
    name: act.name,
    description: act.description,
    members: act.members?.map(String) || [],
  })

  // Memoize HTML conversion for better performance
  const activityHtml = useMemo(() => parseMarkdownToHTML(act.description || ""), [act.description])

  const patch = (updates) => setForm((prev) => ({ ...prev, ...updates }))

  const save = async () => {
    if (busy) return

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
      console.error("Edit failed:", err)
      showToast(err.response?.data?.message || "Edit failed", "error")
    } finally {
      setBusy(false)
    }
  }

  const deleteActivity = async () => {
    if (busy) return

    try {
      setBusy(true)
      await api.delete(`/appointments/${appointmentId}/activities/${act._id}`)
      onDeleted(act._id)
      setShowDeleteConfirm(false)
    } catch (err) {
      console.error("Delete failed:", err)
      showToast(err.response?.data?.message || "Delete failed", "error")
    } finally {
      setBusy(false)
    }
  }

  return (
      <>
        <AccordionRow
            open={open}
            onToggle={() => setOpen((prev) => !prev)}
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
                      disabled={busy}
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
                      disabled={busy}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            }
        >
          <div
              className="prose prose-sm max-w-none text-gray-600
  [&>h1]:text-xl [&>h1]:font-bold [&>h1]:text-gray-900 [&>h1]:mb-3 [&>h1]:mt-4
  [&>h2]:text-lg [&>h2]:font-bold [&>h2]:text-gray-900 [&>h2]:mb-2 [&>h2]:mt-3
  [&>h3]:text-base [&>h3]:font-semibold [&>h3]:text-gray-800 [&>h3]:mb-2 [&>h3]:mt-3
  [&>h4]:text-sm [&>h4]:font-semibold [&>h4]:text-gray-800 [&>h4]:mb-1 [&>h4]:mt-2
  [&>h5]:text-sm [&>h5]:font-medium [&>h5]:text-gray-800 [&>h5]:mb-1 [&>h5]:mt-2
  [&>h6]:text-xs [&>h6]:font-medium [&>h6]:text-gray-700 [&>h6]:mb-1 [&>h6]:mt-2
  [&>ul]:list-disc [&>ul]:ml-4 [&>ul]:mb-2
  [&>ol]:list-decimal [&>ol]:ml-4 [&>ol]:mb-2
  [&>li]:mb-1 [&>li]:leading-relaxed
  [&>p]:mb-2 [&>p]:leading-relaxed
  [&>strong]:font-semibold [&>strong]:text-gray-800
  [&>em]:italic [&>em]:text-gray-700"
              dangerouslySetInnerHTML={{ __html: activityHtml }}
          />
        </AccordionRow>

        {/* Edit Modal */}
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
                      disabled={busy}
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
                      disabled={busy}
                  />
                </div>

                {memberOptions.length > 1 && (
                    <MultiSelectDropdown
                        label="Members"
                        placeholder="Select patients"
                        options={memberOptions}
                        selectedIds={form.members}
                        onSelectionChange={(members) => patch({ members })}
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
                      disabled={busy}
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

        {/* Delete Confirmation Modal */}
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
                      disabled={busy}
                  >
                    Cancel
                  </button>
                  <button
                      onClick={deleteActivity}
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
