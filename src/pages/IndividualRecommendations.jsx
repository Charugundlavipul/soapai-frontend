// src/pages/IndividualRecommendations.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import GoalPickerModal from "../modals/GoalPickerModal";
import { ChevronLeft, ClipboardList, Zap, Sparkle } from "lucide-react";
import { marked } from "marked";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Avatar from "../components/Avatar";

const api = axios.create({
  baseURL: "http://localhost:4000/api",
  headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` },
});

/* ───── Placeholders ───── */
const PLACEHOLDER_VISIT_NOTE = `
10:00-10:15 am: Expressive language drills; patient produced 8/10 target words without cues.
10:15-10:30 am: Story retell activity; showed improved sentence structure.
`.trim();

const PLACEHOLDER_AI_INSIGHTS = [
  {
    time: "11:00–11:10",
    text: "Patient identified rhymes 9/10 times.",
    tag: "Phonological Awareness",
    color: "bg-green-100 text-green-800",
  },
  {
    time: "11:11–11:15",
    text: "Average utterance length increased to 7 words.",
    tag: "Fluency Improvement",
    color: "bg-blue-100 text-blue-800",
  },
];

export default function IndividualRecommendations() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const location = useLocation();

  /* ─── Route context ─── */
  const fromAppointment = location.pathname.startsWith("/appointments/");
  const appointmentId   = fromAppointment ? id : null;
  const patientId       = !fromAppointment ? id : null;

  /* ─── Video & goal state passed from SessionReview ─── */
  const videoFromState  = location.state?.video || null;
  const [video, setVideo] = useState(videoFromState);

  const initialGoals =
    video?.goals?.map((g) => (typeof g === "string" ? g : g.name)) || [];
  const [selectedGoals, setSelectedGoals] = useState(initialGoals);

  /* ─── Basic remote data ─── */
  const [loading, setLoading]        = useState(true);
  const [error,   setError]          = useState(false);
  const [client,  setClient]         = useState(null);
  const [recommendation, setRecommendation] = useState(null);

  /* ─── UI state ─── */
  const [activeTab, setActiveTab]     = useState("visitNotes");
  const [showPicker, setShowPicker]   = useState(false);
  const [duration,   setDuration]     = useState("30 Minutes");
  const [planMD,     setPlanMD]       = useState("");
  const [editorHtml, setEditorHtml]   = useState("");
  const [busy,       setBusy]         = useState(false);
  const editorRef = useRef(null);
  const [apptStart, setApptStart]     = useState(null);

  /* ─── Fetch patient (and optional recommendation) ─── */
  useEffect(() => {
    (async () => {
      try {
        let targetId = patientId;
        if (fromAppointment) {
          const { data: appt } = await api.get(`/appointments/${appointmentId}`);
          if (!appt.patient) throw new Error("No patient linked");
          targetId   = appt.patient._id;
          setApptStart(appt.dateTimeStart);
        }
        const [pRes, recRes] = await Promise.all([
          api.get(`/clients/${targetId}`),
          fromAppointment
            ? api
                .get(`/appointments/${appointmentId}/recommendations`)
                .catch(() => null)
            : null,
        ]);

        setClient({
          ...pRes.data,
          prevVisitNote: pRes.data.prevVisitNote || PLACEHOLDER_VISIT_NOTE,
        });
        setRecommendation(recRes?.data || null);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setError(true);
        setLoading(false);
      }
    })();
  }, [appointmentId, patientId, fromAppointment]);

  /* ─── Generate activity, push visitHistory, save PDF & materials ─── */
const generateActivity = async () => {
  if (!fromAppointment) {
    alert("Must be in appointment context.");
    return;
  }
  if (!selectedGoals.length) {
    alert("Select at least one goal.");
    return;
  }

  const notes = client.prevVisitNote;
  let rawMd = "";
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
    rawMd = data.plan.trim();
    setPlanMD(rawMd);
  } catch (e) {
    alert(e.response?.data?.message || "Generation failed");
    return;
  } finally {
    setBusy(false);
  }

  /* convert MD → HTML for editor */
  const html = marked.parse(rawMd);
  setEditorHtml(html);
  if (editorRef.current) editorRef.current.innerHTML = html;

  /* derive activity name from first non-blank line */
  const actName =
    rawMd.split("\n").find((l) => l.trim())?.replace(/^#+\s*/, "") ||
    "Therapy Activity";

  /* wait a tick so the editor renders, then export & save */
  setTimeout(async () => {
    try {
      
      const canvas = await html2canvas(editorRef.current, { scale: 2 });
      const img    = canvas.toDataURL("image/png");
      const pdf    = new jsPDF({ unit: "pt", format: "a4" });
      const w      = pdf.internal.pageSize.getWidth();
      const h      = (canvas.height * w) / canvas.width;
      pdf.addImage(img, "PNG", 0, 0, w, h);
      const pdfBlob = pdf.output("blob");
      pdf.save("activity_plan.pdf");

      /* 2️⃣  push visitHistory */
      const visit = {
        date:        apptStart || new Date().toISOString(),
        appointment: appointmentId,
        type:        "individual",
        note:        notes,
        aiInsights:
          recommendation?.individualInsights?.[0]?.insights?.length
            ? recommendation.individualInsights[0].insights
            : PLACEHOLDER_AI_INSIGHTS,
        activities: [
          {
            name:            actName,
            description:     rawMd,
            evidence:        "AI plan covering multiple goals.",
            associatedGoals: selectedGoals,
            recommended:     true,
          },
        ],
      };
      await api.post(`/clients/${client._id}/visit`, { visit });

      /* 3️⃣  update goal-progress */
      await api.patch(`/clients/${client._id}/goal-progress/history`, {
        goals: selectedGoals,
        activityName: actName,
      });

      /* 4️⃣  upload the PDF as material */
      const fd = new FormData();
      fd.append("visitDate",   apptStart || new Date().toISOString());
      fd.append("appointment", appointmentId);
      fd.append(
        "file",
        new File([pdfBlob], `plan_${appointmentId}.pdf`, {
          type: "application/pdf",
        })
      );
      await api.post(`/clients/${client._id}/materials`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } catch (err) {
      console.error(err);
      alert("Failed to save visit or materials");
    }
  }, 100);
};

/* ─── Quick standalone “export PDF” for manually-edited plan ─── */
const downloadPdf = async () => {
  if (!editorRef.current) return;
  try {
    const canvas  = await html2canvas(editorRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf     = new jsPDF({ unit: "pt", format: "a4" });
    const w       = pdf.internal.pageSize.getWidth();
    const h       = (canvas.height * w) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, w, h);
    pdf.save("activity_plan.pdf");
  } catch (err) {
    console.error("PDF export error:", err);
    alert("Failed to export PDF.");
  }
};


  /* ─── Guards ─── */
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
          Failed to load patient.
        </div>
      </div>
    );

  /* ─── AI insights fallback ─── */
  const aiInsights =
    recommendation?.individualInsights?.[0]?.insights?.length
      ? recommendation.individualInsights[0].insights
      : PLACEHOLDER_AI_INSIGHTS;

  /* ─── Render ─── */
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      {/* GoalPickerModal (video-level goals) */}
      <GoalPickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        video={video}
        onSaved={(updated) => {
          setVideo(updated);
          const names = updated.goals.map((g) =>
            typeof g === "string" ? g : g.name
          );
          setSelectedGoals(names);
        }}
      />

      <main className="flex-1 p-6 max-w-7xl mx-auto space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ChevronLeft className="w-6 h-6 text-gray-600 hover:text-gray-800" />
          </button>
          <h2 className="text-2xl font-semibold text-gray-800">
            Recommendations — {client.name}
          </h2>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* ─── LEFT COLUMN ─── */}
          {/* ─── LEFT COLUMN ─── */}
<div className="col-span-4 bg-[#F9F9FD] rounded-2xl p-6 flex flex-col space-y-6">
  {/* Header */}
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
        Diagnosis:&nbsp;
        {(client.pastHistory || []).join(", ") || "—"}
      
    </p>
  </div>
  </div>

 <div className="bg-white rounded-xl p-4 mt-6 space-y-4 shadow-sm flex-1">
  <h4 className="text-lg font-medium text-gray-800">Client Goals</h4>
  <div className="flex flex-wrap gap-2">
    {(client.goals || []).length ? (
      client.goals.map((g) => (
        <span
          key={g}
          className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs"
        >
          {g}
        </span>
      ))
    ) : (
      <span className="text-xs italic text-gray-400">None yet</span>
    )}
  </div>
</div>

  {/* Goals FOR THIS VIDEO */}
  <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col flex-1 space-y-4">
    <h4 className="text-lg font-medium text-gray-800">Short Term Session Goals</h4>
    <div className="flex flex-wrap gap-2">
      {selectedGoals.length ? (
        selectedGoals.map((g) => (
          <span
            key={g}
            className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs"
          >
            {g}
          </span>
        ))
      ) : (
        <span className="text-xs italic text-gray-400">None yet</span>
      )}
    </div>
    <button
      onClick={() => setShowPicker(true)}
      className="mt-auto w-full py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90"
    >
      Edit Goals
    </button>
  </div>

  {/* Previous Visit Notes */}
  <div className="bg-white rounded-xl p-4 shadow-sm">
    <h4 className="text-lg font-medium text-gray-800">Previous Visit Notes</h4>
    <div className="text-sm text-gray-700 mt-1 space-y-1 bg-white rounded-md p-3 border">
      {client.prevVisitNote.split("\n").map((line, i) => (
        <p key={i}>{line.replace(/^•\s*/, "• ")}</p>
      ))}
    </div>
  </div>
</div>


          {/* ─── RIGHT COLUMN ─── */}
          <div className="col-span-8 flex flex-col space-y-6">
            {/* Tab bar */}
            <div className="flex gap-4 bg-[#F5F4FB] rounded-2xl px-6 py-4 shadow-sm">
              <TabBtn
                id="visitNotes"
                active={activeTab}
                setActive={setActiveTab}
                Icon={ClipboardList}
                label="Visit Notes"
              />
              <TabBtn
                id="aiInsights"
                active={activeTab}
                setActive={setActiveTab}
                Icon={Zap}
                label="AI Insights"
              />
              <TabBtn
                id="activityGenerator"
                active={activeTab}
                setActive={setActiveTab}
                Icon={Sparkle}
                label="Activity Generator"
              />
            </div>

            {/* ---- VISIT NOTES ---- */}
            {activeTab === "visitNotes" && (
              <div className="bg-[#F5F4FB] rounded-2xl p-6 shadow-sm">
                <h4 className="text-xl font-semibold text-gray-800 mb-5">
                  Visit Notes
                </h4>
                <div className="bg-white rounded-md p-4 border text-gray-800 text-sm space-y-1">
                  {client.prevVisitNote.split("\n").map((line, i) => (
                    <p key={i}>{line.replace(/^•\s*/, "• ")}</p>
                  ))}
                </div>
              </div>
            )}

            {/* ---- AI INSIGHTS ---- */}
            {activeTab === "aiInsights" && (
              <div className="bg-[#F5F4FB] rounded-2xl p-6 shadow-sm space-y-4">
                <h4 className="text-xl font-semibold text-gray-800 mb-5">
                  AI Insights
                </h4>
                {aiInsights.map((ins, i) => (
                  <InsightRow key={i} ins={ins} />
                ))}
              </div>
            )}

            {/* ---- ACTIVITY GENERATOR ---- */}
            {activeTab === "activityGenerator" && (
              <div className="bg-[#F5F4FB] rounded-2xl p-6 shadow-sm space-y-6">
                <h4 className="text-xl font-semibold text-gray-800 mb-5">
                  Activity Generator
                </h4>

                {/* Goal chips */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">
                    Select Activity Goals
                  </label>
                  <select
                    value=""
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v && !selectedGoals.includes(v))
                        setSelectedGoals([...selectedGoals, v]);
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">Select Goal</option>
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

/* ─── Tab button ─── */
function TabBtn({ id, active, setActive, Icon, label }) {
  const isActive = id === active;
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

/* ─── Insight row ─── */
function InsightRow({ ins }) {
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
      <div className="text-sm text-gray-800">{ins.text}</div>
      <span className={`${ins.color} text-xs font-medium px-2 py-1 rounded-full`}>
        {ins.tag}
      </span>
    </div>
  );
}
