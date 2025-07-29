// src/pages/PatientAnalysis.jsx
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { ChevronLeft,  ClipboardList,
  Zap,
  Sparkle, } from "lucide-react";
import axios from "axios";
import { getPatient } from "../services/api"; // your existing wrapper

/* ─────────────────────────────  Inline <EditGoalsModal/>  ───────────────────────────── */
function EditGoalsModal({ open, onClose, currentGoals = [], onSave }) {
  const [goals, setGoals] = useState(currentGoals);
  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setGoals(currentGoals);
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, currentGoals]);

  const addGoal = () => {
    const trimmed = input.trim();
    if (trimmed && !goals.includes(trimmed)) {
      setGoals([...goals, trimmed]);
      setInput("");
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl p-6 min-w-[340px] shadow-lg z-50 relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
          onClick={onClose}
        >
          ×
        </button>

        <h3 className="text-lg font-semibold mb-4">Edit Goals</h3>

        {/* input + existing pills */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addGoal()}
              placeholder="Add new goal"
              className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <button
              type="button"
              onClick={addGoal}
              disabled={!input.trim() || goals.includes(input.trim())}
              className="bg-primary text-white px-3 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {goals.map((g) => (
              <span
                key={g}
                className="flex items-center gap-1 bg-primary text-white rounded-full px-3 py-1 text-sm"
              >
                {g}
                <button
                  onClick={() => setGoals(goals.filter((x) => x !== g))}
                  className="ml-1 font-bold text-white/80 hover:text-white/60"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={() => goals.length && onSave(goals)}
            disabled={goals.length === 0}
            className="px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
/* ─────────────────────────────  End modal  ───────────────────────────── */

export default function PatientAnalysis() {
  const { id } = useParams(); // patient ID
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [patient, setPatient] = useState(null);

  // which tab is active: "visitHistory" | "aiInsights" | "activityGenerator"
  const [activeTab, setActiveTab] = useState("visitHistory");

  // For Activities tab
  const [genGoals, setGenGoals] = useState([]);
  const [duration, setDuration] = useState("30 Minutes");

  // show/hide the Edit Goals modal
  const [showModal, setShowModal] = useState(false);

  // which visit in history is selected (by index)
  const [selectedVisitIndex, setSelectedVisitIndex] = useState(null);

  /* ───── Fetch patient (profile + visitHistory) ───── */
  useEffect(() => {
    getPatient(id)
      .then((r) => {
        // Attach a default prevVisitNote if none exists
        const fetched = r.data;
        setPatient({
          ...fetched,
          prevVisitNote: fetched.prevVisitNote || "No previous notes available.",
        });
        setLoading(false);
      })
      .catch((e) => {
        setError(e.response?.data?.message || "Fetch failed");
        setLoading(false);
      });
  }, [id]);

  /* ───── PATCH goals handler ───── */
  async function saveGoals(gs) {
    try {
      const r = await axios.patch(
        `http://localhost:4000/api/clients/${id}/goals`,
        { goals: gs },
        { headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` } }
      );
      setPatient((p) => ({ ...p, goals: r.data.goals }));
      setShowModal(false);
    } catch (e) {
      alert(e.response?.data?.message || "Failed to update goals");
    }
  }

  /* ───── Placeholder AI Insights for entire patient (tab “AI Insights”) ───── */
  const placeholderPatientInsights = [
    {
      time: "8:30 AM - 11:30 AM",
      text: "Talked about coping strategies for anxiety.",
      tag: "AI Insight: Coping Strategies",
      color: "bg-green-100 text-green-800",
    },
  ];

  /* ───── Placeholder Visit‐Specific Insights (if a visit has none) ───── */
  const placeholderVisitInsights = [
    {
      time: "8:30 AM - 11:30 AM",
      text: "Talked about coping strategies for anxiety.",
      tag: "AI Insight: Coping Strategies",
      color: "bg-green-100 text-green-800",
    },
  ];

  /* ───── Placeholder Visit‐Specific Activities (if a visit has none) ───── */
  const placeholderVisitActivities = [
    {
      description: "Brainstorm coping strategies",
    },
    {
      description: "Deep breathing exercise",
    },
  ];

  /* ─────────── Render guards ─────────── */
  if (loading)
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Loading…
        </div>
      </div>
    );

  if (error || !patient)
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-red-600">
          {error || "No data"}
        </div>
      </div>
    );

  /* ─────────── UI ─────────── */
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      {/* Edit Goals Modal */}
      <EditGoalsModal
        open={showModal}
        onClose={() => setShowModal(false)}
        currentGoals={patient.goals}
        onSave={saveGoals}
      />

      <main className="flex-1 p-6 max-w-7xl mx-auto space-y-6">
        {/* Header Row */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ChevronLeft className="w-6 h-6 text-gray-600 hover:text-gray-800" />
          </button>
          <h2 className="text-2xl font-semibold text-gray-800">
            {patient.name} — Analysis
          </h2>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* ───── Left Column ───── */}
          <div className="col-span-4 bg-[#F9F9FD] rounded-2xl p-6 flex flex-col">
            {/* Patient Header */}
            <div className="flex items-center gap-4">
              <img
                src={patient.avatarUrl || "/avatars/default.png"}
                alt={patient.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-primary"
              />
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {patient.name}
                </h3>
                <p className="text-sm text-gray-500">
                  Age: {patient.age ?? "—"}
                </p>
              </div>
            </div>

            {/* About Box */}
            <div className="bg-white rounded-xl p-4 mt-6 space-y-4 shadow-sm flex flex-col">
              <h4 className="text-lg font-medium text-gray-800">
                About {patient.name.split(" ")[0]}
              </h4>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Diagnosis:</span>
                  <span className="text-gray-900">
                    {(patient.pastHistory ?? []).join(", ") || "—"}
                  </span>
                </div>
              </div>

              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-1">
                  Current Goals:
                </h5>
                <div className="flex flex-wrap gap-2">
                  {(patient.goals ?? []).length > 0 ? (
                    patient.goals.map((g) => (
                      <span
                        key={g}
                        className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs"
                      >
                        {g}
                      </span>
                    ))
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                      No goals set yet.
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setShowModal(true)}
                className="mt-auto bg-primary text-white rounded-full px-4 py-2 text-sm hover:bg-primary/90 w-fit"
              >
                Edit Goals
              </button>
            </div>

            {/* Previous Visit Notes */}
            <div className="bg-white rounded-xl p-4 mt-6 shadow-sm flex-1">
              <h4 className="text-lg font-medium text-gray-800">
                Previous Visit Notes
              </h4>
              <p className="text-sm text-gray-700 mt-1">
                {patient.prevVisitNote}
              </p>
            </div>
          </div>

          {/* ───── Right Column ───── */}
          <div className="col-span-8 flex flex-col space-y-6">
            {/* Tab Bar */}
            {/* Tab Bar */}
<div className="mx-auto flex justify-center gap-4 bg-[#F5F4FB] rounded-2xl px-10 py-4 shadow-sm">
  {[
    { id: "visitHistory",  label: "Visit History",      icon: ClipboardList },
    { id: "aiInsights",    label: "AI Insights",        icon: Zap },
    { id: "activityGenerator", label: "Activity Generator", icon: Sparkle },
  ].map(({ id, label, icon: Icon }) => (
    <button
      key={id}
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-9 py-3 text-base font-medium rounded-xl transition border ${
        activeTab === id
          ? "bg-primary text-white border-primary"
          : "bg-white text-primary border-gray-200 hover:bg-[#F5F4FB]"
      }`}
    >
      <Icon
        className={`w-5 h-5 ${
          activeTab === id ? "text-white" : "text-primary"
        }`}
      />
      {label}
    </button>
  ))}
</div>


            {/* ───── Tab Contents ───── */}

            {/* Visit History Tab */}
            {activeTab === "visitHistory" && (
              <div className="bg-[#F5F4FB] rounded-2xl p-6 shadow-sm space-y-4">
                {patient.visitHistory && patient.visitHistory.length > 0 ? (
                  patient.visitHistory
                    .slice()
                    .reverse()
                    .map((v, idx) => {
                      // If this particular visit has no real insights, use placeholders
                      const insights =
                        v.aiInsights && v.aiInsights.length > 0
                          ? v.aiInsights
                          : placeholderVisitInsights;

                      // If this visit has no real activities, use placeholders
                      const activities =
                        v.activities && v.activities.length > 0
                          ? v.activities
                          : placeholderVisitActivities;

                      // Check if this row is currently selected
                      const isSelected = selectedVisitIndex === idx;

                      return (
                        <div
                          key={v._id || `${v.date}-${v.appointment}`}
                          className={`rounded-lg shadow-sm overflow-hidden ${
                            isSelected
                              ? "bg-primary/10 cursor-pointer"
                              : "bg-white cursor-pointer hover:bg-primary/5"
                          }`}
                          onClick={() => setSelectedVisitIndex(idx)}
                        >
                          {/* Visit Header */}
                          <div className="p-4">
                            <div className="text-sm font-medium">
                              {new Date(v.date).toLocaleDateString()} — {v.type}
                            </div>
                          </div>

                          {/* AI Insights Section */}
                          <div className="border-t px-4 py-3 space-y-2">
                            {insights.map((ins, i2) => (
                              <div
                                key={i2}
                                className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                              >
                                <div className="text-sm text-gray-800">
                                  {ins.time && `${ins.time} – `} {ins.text}
                                </div>
                                {ins.tag && (
                                  <span
                                    className={`${ins.color} text-xs font-medium px-2 py-1 rounded-full`}
                                  >
                                    {ins.tag}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Activities Section */}
                          <div className="border-t px-4 py-3">
                            <div className="font-medium text-sm mb-2">
                              Activities
                            </div>
                            <ul className="list-disc ml-5 space-y-1">
                              {activities.map((a, i3) => (
                                <li key={i3} className="text-sm">
                                  {a.description}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  // (If there is no visitHistory at all, show a single placeholder visit.)
                  <div className="space-y-4">
                    {[
                      {
                        date: new Date(),
                        type: "Group",
                        aiInsights: placeholderVisitInsights,
                        activities: placeholderVisitActivities,
                      },
                    ].map((v, idx2) => (
                      <div
                        key={idx2}
                        className={`rounded-lg shadow-sm overflow-hidden bg-white cursor-pointer`}
                        onClick={() => setSelectedVisitIndex(idx2)}
                      >
                        {/* Placeholder Visit Header */}
                        <div className="p-4">
                          <div className="text-sm font-medium">
                            {v.date.toLocaleDateString()} — {v.type}
                          </div>
                        </div>

                        {/* AI Insights Placeholder */}
                        <div className="border-t px-4 py-3 space-y-2">
                          {v.aiInsights.map((ins, i4) => (
                            <div
                              key={i4}
                              className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                            >
                              <div className="text-sm text-gray-800">
                                {ins.time && `${ins.time} – `} {ins.text}
                              </div>
                              {ins.tag && (
                                <span
                                  className={`${ins.color} text-xs font-medium px-2 py-1 rounded-full`}
                                >
                                  {ins.tag}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Activities Placeholder */}
                        <div className="border-t px-4 py-3">
                          <div className="font-medium text-sm mb-2">
                            Activities
                          </div>
                          <ul className="list-disc ml-5 space-y-1">
                            {v.activities.map((a, i5) => (
                              <li key={i5} className="text-sm">
                                {a.description}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AI Insights Tab */}
            {activeTab === "aiInsights" && (
              <div className="bg-[#F5F4FB] rounded-2xl p-6 shadow-sm space-y-4">
                <h4 className="text-xl font-semibold text-gray-800">
                  AI Insights
                </h4>
                {(patient.insights && patient.insights.length > 0
                  ? patient.insights
                  : placeholderPatientInsights
                ).map((ins, i6) => (
                  <div
                    key={i6}
                    className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                  >
                    <div className="text-sm text-gray-800">
                      {ins.time && `${ins.time} – `} {ins.text}
                    </div>
                    {ins.tag && (
                      <span
                        className={`${ins.color} text-xs font-medium px-2 py-1 rounded-full`}
                      >
                        {ins.tag}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Activity Generator Tab */}
            {activeTab === "activityGenerator" && (
              <div className="bg-[#F5F4FB] rounded-2xl p-6 shadow-sm flex flex-col space-y-6">
                <h4 className="text-xl font-semibold text-gray-800">
                  Activity Generator
                </h4>

                {/* Goals Picker */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">
                    Select Activity Goals
                  </label>
                  <select
                    value=""
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v && !genGoals.includes(v))
                        setGenGoals([...genGoals, v]);
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">Select Goals</option>
                    {(patient.goals ?? [])
                      .filter((g) => !genGoals.includes(g))
                      .map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                  </select>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {genGoals.map((goal) => (
                      <span
                        key={goal}
                        className="flex items-center gap-1 bg-primary text-white rounded-full px-3 py-1 text-sm"
                      >
                        {goal}
                        <button
                          onClick={() =>
                            setGenGoals(genGoals.filter((x) => x !== goal))
                          }
                          className="ml-1 font-bold text-white/80 hover:text-white/60"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Duration Selector */}
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">
                    Select Duration
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option>15 Minutes</option>
                    <option>30 Minutes</option>
                    <option>45 Minutes</option>
                    <option>60 Minutes</option>
                  </select>
                </div>

                <button className="bg-primary text-white rounded-full px-6 py-2 w-fit hover:bg-primary/90">
                  Generate Activity
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
