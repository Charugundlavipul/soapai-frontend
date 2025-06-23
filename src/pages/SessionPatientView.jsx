// src/pages/SessionPatientView.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import EditGoalsModal from "../modals/EditGoalsModal";
import axios from "axios";
import {
  ChevronLeft,
  Zap,
  ClipboardList,
  FileText,
  Sparkle,
} from "lucide-react";
import { marked } from "marked";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Avatar from "../components/Avatar";

const api = axios.create({
  baseURL: "http://localhost:4000/api",
  headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` },
});

// Placeholders
const PLACEHOLDER_INSIGHT = {
  text: "No AI insights recorded for this session.",
  tag: "No Insights",
  tagColor: "bg-gray-200 text-gray-600",
};
const PLACEHOLDER_VISIT_NOTE = `• No visit notes yet for this session.`;
const PLACEHOLDER_ACTIVITY = {
  name: "No activities recorded.",
  description: "",
  evidence: "",
};

export default function SessionPatientView() {
  const { appointmentId, patientId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [visit, setVisit] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [error, setError] = useState(false);

  const [activeTab, setActiveTab] = useState("visitNotes");
  const [showGoals, setShowGoals] = useState(false);

  // Activity generator
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [duration, setDuration] = useState("30 Minutes");
  const [planMD, setPlanMD] = useState("");
  const [editorHtml, setEditorHtml] = useState("");
  const [busy, setBusy] = useState(false);
  const editorRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        // fetch client + visitHistory
        const { data: c } = await api.get(`/clients/${patientId}/profile`);
        setClient(c);

        // find this appointment’s visit
        const v =
          c.visitHistory?.find((vh) => {
            const appt = vh.appointment;
            return (
              (typeof appt === "string" ? appt : appt?._id) ===
              appointmentId
            );
          }) || null;
        setVisit(v);

        // optional recommendation
        if (v?.appointment) {
          const rec = await api
            .get(`/appointments/${appointmentId}/recommendations`)
            .then((r) => r.data)
            .catch(() => null);
          setRecommendation(rec);
        }
      } catch (e) {
        console.error(e);
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [appointmentId, patientId]);

  if (loading)
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Loading…
        </div>
      </div>
    );
  if (error || !client)
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-red-600">
          Error loading session.
        </div>
      </div>
    );
  if (!visit)
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No session found for this appointment.
        </div>
      </div>
    );

  // extract arrays with placeholders
  const insights =
    visit.aiInsights?.length ? visit.aiInsights : [PLACEHOLDER_INSIGHT];
  const activities = visit.activities?.length
    ? visit.activities
    : [PLACEHOLDER_ACTIVITY];

  /* Replace activities in UI (does not persist) */
  const replaceActivities = (newActs) => {
    setVisit((v) => ({ ...v, activities: newActs }));
  };

  /* Generate a new plan via API */
  const generateActivity = async () => {
    if (!selectedGoals.length) {
      alert("Select at least one goal.");
      return;
    }
    const notes = insights
      .map((i) => `• ${i.time || ""} ${i.text}`)
      .join("\n");
    try {
      setBusy(true);
      const { data } = await api.post(
        `/appointments/${appointmentId}/generate-activity`,
        {
          memberIds: [client._id],
          goals: selectedGoals,
          duration,
          notes,
        }
      );
      const md = data.plan.trim();
      setPlanMD(md);
      const html = marked.parse(md);
      setEditorHtml(html);
      if (editorRef.current) editorRef.current.innerHTML = html;

      // derive name
      const name =
        md.split("\n").find((l) => l.trim())?.replace(/^#+\s*/, "") ||
        "Activity";

      // build activities array
        const newActs = [
          {
            name,
            description: md,
            evidence:    "AI plan covering multiple goals.",
            associatedGoals: selectedGoals,
          },
        ];
      replaceActivities(newActs);
    } catch (e) {
      console.error(e);
      alert("Failed to generate activity");
    } finally {
      setBusy(false);
    }
  };

  /* Export PDF */
  const downloadPdf = async () => {
    if (!editorRef.current) return;
    try {
      const canvas = await html2canvas(editorRef.current, { scale: 2 });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, "PNG", 0, 0, w, h);
      pdf.save("plan.pdf");
    } catch (e) {
      console.error(e);
      alert("PDF export failed");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <EditGoalsModal
        open={showGoals}
        onClose={() => setShowGoals(false)}
        currentGoals={client.goals}
        onSave={async (goals) => {
          const { data } = await api.patch(
            `/clients/${client._id}/goals`,
            { goals }
          );
          setClient((c) => ({ ...c, goals: data.goals }));
          setShowGoals(false);
        }}
      />

      <main className="flex-1 p-6 max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ChevronLeft className="w-6 h-6 text-gray-600 hover:text-gray-800" />
          </button>
          <h2 className="text-2xl font-semibold text-gray-800">
            Session — {client.name}
          </h2>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* LEFT PANEL (wider) */}
          



        {/* ─── LEFT PANEL ─── */}
        <div className="col-span-5 bg-[#F9F9FD] rounded-2xl p-6 flex flex-col">
          {/* Avatar + Basic Info */}
          <div className="flex items-center gap-4">
            <Avatar
              url={client.avatarUrl}
              name={client.name}
              className="w-20 h-20 rounded-full border-2 border-primary"
            />
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">{client.name}</h3>
              <p className="text-sm text-gray-500">Age: {client.age ?? "—"}</p>
              <p className="text-sm text-gray-500">
                Session:{" "}
                {new Date(visit.date).toLocaleString([], {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <button
              onClick={() => setShowGoals(true)}
              className="p-2 rounded-full hover:bg-primary/10"
              title="Edit Goals"
            >
              <Zap className="w-5 h-5 text-primary" />
            </button>
          </div>

          {/* Past History */}
          <div className="bg-white rounded-xl p-4 mt-6 shadow-sm">
            <h4 className="text-lg font-medium text-gray-800">Diagnosis</h4>
            <p className="text-sm text-gray-700 mt-1">
              {(client.pastHistory || []).join(", ") || "—"}
            </p>
          </div>

          {/* Current Goals */}
          <div className="bg-white rounded-xl p-4 mt-6 flex-1 shadow-sm">
            <h4 className="text-lg font-medium text-gray-800">Goals</h4>
            <div className="flex flex-wrap gap-2 mt-2">
              {(client.goals || []).length > 0 ? (
                client.goals.map((g) => (
                  <span
                    key={g}
                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs"
                  >
                    {g}
                  </span>
                ))
              ) : (
                <span className="italic text-gray-400 text-xs">None yet</span>
              )}
            </div>
          </div>

          {/* Previous Visit Notes */}
          <div className="bg-white rounded-xl p-4 mt-6 shadow-sm">
            <h4 className="text-lg font-medium text-gray-800">Previous Visit Notes</h4>
            <div className="text-sm mt-1 text-gray-700 space-y-1">
              {(
                visit.note || PLACEHOLDER_VISIT_NOTE
              )
                .split("\n")
                .map((line, i) => (
                  <p key={i}>{line.replace(/^•\s*/, "• ")}</p>
                ))}
            </div>
          </div>
        </div>


          {/* RIGHT PANEL */}
          <div className="col-span-7 flex flex-col space-y-6">
            {/* Tabs */}
            <div className="flex gap-4 bg-[#F5F4FB] rounded-2xl px-6 py-4 shadow-sm">
              <TabBtn
                id="visitNotes"
                active={activeTab}
                setActive={setActiveTab}
                Icon={ClipboardList}
                label="Visit Notes"
              />
              <TabBtn
                id="insights"
                active={activeTab}
                setActive={setActiveTab}
                Icon={Zap}
                label="Insights"
              />
              <TabBtn
                id="activityGenerator"
                active={activeTab}
                setActive={setActiveTab}
                Icon={Sparkle}
                label="Activity Generator"
              />
            </div>

            {/* Content */}
            {activeTab === "visitNotes" && (
              <div className="bg-[#F5F4FB] rounded-2xl p-6 shadow-sm">
                <h4 className="text-xl font-semibold text-gray-800 mb-5">Visit Notes</h4>
                <div className="bg-white rounded-md p-3 border text-gray-800 text-sm space-y-1">
  {(visit.note || PLACEHOLDER_VISIT_NOTE)
    .split("\n")
    .map((line, i) => (
      <p key={i}>{line.replace(/^•\s*/, "• ")}</p>
    ))}
</div>
              </div>
            )}

            {activeTab === "insights" && (
              <div className="bg-[#F5F4FB] rounded-2xl p-6 shadow-sm space-y-4">
                <h4 className="text-xl font-semibold text-gray-800 mb-5">AI Insights</h4>
                {insights.map((ins, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-white rounded-lg p-3"
                  >
                    <span className="text-sm text-gray-800">{ins.text}</span>
                    <span
                      className={`${ins.tagColor} text-xs font-medium px-2 py-1 rounded-full`}
                    >
                      {ins.tag}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "activityGenerator" && (
              <div className="bg-[#F5F4FB] rounded-2xl p-6 shadow-sm space-y-6">
                {/* Goals Select */}
                <div className="flex flex-col">
                  <h4 className="text-xl font-semibold text-gray-800 mb-5">Activity Generator</h4>
                  <label className="text-sm font-medium text-gray-700 mb-1">
                    Select Activity Goals
                  </label>
                  <select
                    value=""
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v && !selectedGoals.includes(v)) {
                        setSelectedGoals([...selectedGoals, v]);
                      }
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">Select a Goal</option>
                    {(client.goals || []).map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedGoals.map((g) => (
                      <span
                        key={g}
                        className="flex items-center gap-1 bg-primary text-white rounded-full px-3 py-1 text-sm"
                      >
                        {g}
                        <button
                          onClick={() =>
                            setSelectedGoals(
                              selectedGoals.filter((x) => x !== g)
                            )
                          }
                          className="ml-1 font-bold text-white/80 hover:text-white/60"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">
                    Duration
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

                <button
                  onClick={generateActivity}
                  disabled={busy}
                  className="bg-primary text-white rounded-full px-6 py-2 w-fit hover:bg-primary/90 disabled:opacity-60"
                >
                  {busy ? "Generating…" : "Generate Activity"}
                </button>

                {planMD && (
                  <div className="space-y-4 w-full">
                    <div
                      ref={editorRef}
                      contentEditable
                      suppressContentEditableWarning
                      dangerouslySetInnerHTML={{ __html: editorHtml }}
                      onInput={(e) =>
                        setEditorHtml(e.currentTarget.innerHTML)
                      }
                      className="min-h-[200px] border rounded-md p-3 bg-white text-sm overflow-auto"
                    />
                    <button
                      onClick={downloadPdf}
                      className="bg-primary text-white px-4 py-2 rounded-full hover:bg-primary/90"
                    >
                      Download as PDF
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Tab button helper
function TabBtn({ id, active, setActive, Icon, label }) {
  const isActive = active === id;
  return (
    <button
      onClick={() => setActive(id)}
      className={`flex items-center gap-2 px-9 py-3 text-base font-medium rounded-xl transition border ${
        isActive
          ? "bg-primary text-white border-primary"
          : "bg-white text-primary border-gray-200 hover:bg-[#F5F4FB]"
      }`}
    >
      <Icon className={`w-6 h-6 ${isActive ? "text-white" : "text-primary"}`} />
      {label}
    </button>
  );
}
