// client/src/pages/GroupRecommendations.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import GoalPickerModal from "../modals/GoalPickerModal";
import { ChevronLeft, ClipboardList, Users, Sparkle } from "lucide-react";
import { marked } from "marked";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Avatar from "../components/Avatar";
import qs from "qs"; 

const api = axios.create({
  baseURL: "http://localhost:4000/api",
  headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` },
});

/* ─── Placeholders that look “realistic” ─── */

// Therapist‐style bullet notes for a session (placeholder)
const PLACEHOLDER_VISIT = `
09:00 - 09:10 am: Warm‐up articulation drills; patient produced /s/ and /z/ with 75% accuracy.
09:10 - 09:25 am: Engaged in conversational turn‐taking; used 3 new vocabulary words unprompted.
09:25 - 09:45 am: Completed storytelling task with minimal scaffolding, showing improved fluency.
`.trim();

// Group‐level AI insight placeholder
const PLACEHOLDER_GROUP_INSIGHT = {
  text: "Group demonstrated steady progress in social engagement: 80% more peer‐to‐peer interactions than the previous session.",
  tag: "Social Engagement",
  tagColor: "bg-green-100 text-green-800",
};

// Individual‐level AI insight placeholder
const PLACEHOLDER_INDIVIDUAL_INSIGHT = {
  text: "Patient showed enhanced articulation skills, especially with /s/ and /z/ sounds, reaching 85% accuracy in structured drills.",
  tag: "Articulation",
  tagColor: "bg-green-100 text-green-800",
};

export default function GroupRecommendations() {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  const fromAppointment = location.pathname.startsWith("/appointments/");
  const appointmentId = fromAppointment ? params.id : null;
  const groupIdDirect = !fromAppointment ? params.id : null;

  /* ─── State ─── */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const videoFromState = location.state?.video || null;
  const [video, setVideo] = useState(videoFromState);

  const [group, setGroup] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [activeTab, setActiveTab] = useState("visitNotes");
  const [showModal, setShowModal] = useState(false);
  const [apptStart, setApptStart] = useState(null); 
  const [activityName, setActivityName] = useState("");


  // Activity‐Generator controls
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [duration, setDuration] = useState("30 Minutes");
  const [showPicker, setShowPicker] = useState(false);
  // Receive “plan” from back‐end (in Markdown), then convert to HTML
  const [planMD, setPlanMD] = useState("");
  const [editorHtml, setEditorHtml] = useState("");
  const [busy, setBusy] = useState(false);
  const editorRef = useRef(null);
  const initialGoals = video?.goals?.map(g=>typeof g==="string"?g:g.name) || [];
  const [selectedGoals, setSelectedGoals] = useState(initialGoals);

  // Reference to the contentEditable DIV for html2canvas → PDF

  /* ─── fetch group & any existing recommendation ─── */
  useEffect(() => {
    (async () => {
      try {
        let grpId = groupIdDirect;
        if (fromAppointment) {
          const { data: appt } = await api.get(`/appointments/${appointmentId}`);
          if (!appt.group) throw new Error("Appointment lacks group");
          grpId = appt.group._id;
          setApptStart(appt.dateTimeStart);
        }

        const [grpRes, recRes] = await Promise.all([
          api.get(`/groups/${grpId}`),
          fromAppointment
            ? api
                .get(`/appointments/${appointmentId}/recommendations`)
                .catch(() => null)
            : null,
        ]);

        const goalsForUi =
          initialGoals.length > 0 ? initialGoals : grpRes.data.goals || [];
        setGroup(grpRes.data);
        setRecommendation(recRes?.data || null);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(true);
        setLoading(false);
      }
    })();
  }, [appointmentId, groupIdDirect, fromAppointment]);

  /* ─── Save “Group Goals” from the modal ─── */
  const handleSaveGoals = async (goals) => {
    try {
      const { data } = await api.patch(`/groups/${group._id}/goals`, { goals });
      setGroup((g) => ({ ...g, goals: data.goals }));
      setShowModal(false);
    } catch {
      alert("Failed to update goals");
    }
  };

  /* ─── Generate Activity & PUSH into each patient’s visitHistory ─── */
  const generateActivity = async () => {
    if (!fromAppointment) {
      return alert("Need an appointment context.");
    }
    if (!selectedMembers.length || !selectedGoals.length) {
      return alert("Pick members & goals first.");
    }

    // Build a “notes” chunk per selected patient
    const noteChunks = selectedMembers.map((pid) => {
      const txt = visitNoteOf(pid) || PLACEHOLDER_VISIT;
      const mem = group.patients.find((p) => String(p._id) === String(pid));
      return txt;
    });
    const notes = noteChunks.join("\n\n");

    try {
      setBusy(true);

      // 1) Ask backend to generate a Markdown “plan” for the activity
      const { data } = await api.post(
        `/appointments/${appointmentId}/generate-activity`,
        {
          memberIds: selectedMembers,
          goals: selectedGoals,
          duration,
          notes,
        }
      );
      const rawMd = (data.plan || "").trim();
      setPlanMD(rawMd);

      // Extract first non‐empty line of rawMd as activity name
       const firstLineRaw =
   rawMd.split("\n").find(l => l.trim())?.replace(/^#+\s*/, "") ||
   "Generated Activity";

 // strip any '**Activity Name:**' prefix and surrounding ** … **
 const cleanTitle = firstLineRaw
   .replace(/\*\*/g, "")                // remove markdown bold
   .replace(/^activity name\s*:\s*/i, "")
   .trim();

 const descText = rawMd || "No activity description generated.";
 setActivityName(cleanTitle); 
      // Build one activity per selected goal:
      // name = firstLine, description = entire plan, evidence = placeholder
const activitiesArray = [
  {
    name:            firstLineRaw,
    description:     descText,
    evidence:        "AI generated plan covering multiple goals.",
    associatedGoals: selectedGoals,   // e.g. ["s-blends", "turn-taking"]
    recommended:     true,
    score:           null,
  },
];

      // 2) Decide which aiInsights to push: real or placeholder
      const groupInsights = recommendation?.groupInsights?.length
        ? recommendation.groupInsights
        : [PLACEHOLDER_GROUP_INSIGHT];

      // Build a map of individualInsights if provided
      const individualInsightsMap = {};
      if (recommendation?.individualInsights?.length) {
        recommendation.individualInsights.forEach((ii) => {
          const pidStr = String(ii.patient._id || ii.patient);
          individualInsightsMap[pidStr] = ii.insights;
        });
      }

      await Promise.all(
  selectedMembers.map(async pid => {
    await api.patch(`/clients/${pid}/goal-progress/history`, {
      goals: selectedGoals,
      activityName: firstLineRaw          // ← title of generated plan
    });
  })
);

      // 3) PUSH one visit entry into each patient’s visitHistory
      await Promise.all(
        group.patients.map((p) => {
          const pidStr = String(p._id);
          const patientAi =
            individualInsightsMap[pidStr] || [PLACEHOLDER_INDIVIDUAL_INSIGHT];

          const visitObj = {
            date:        apptStart || new Date().toISOString(),
            appointment: appointmentId,
            type:        "group",
            aiInsights:  patientAi,
            note:        notes, 
            activities:  activitiesArray,
          };
          return api.post(`/clients/${pidStr}/visit`, { visit: visitObj });
        })
      );
    } catch (e) {
      console.error("Error generating activity or saving visitHistory:", e);
      alert(e.response?.data?.message || "Failed to generate or save visit data");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (planMD && editorRef.current) {
      // 1) Convert Markdown → HTML
      const html = marked.parse(planMD);
      // 2) Initialize the contentEditable once
      editorRef.current.innerHTML = html;
      // 3) Store it in state so we can persist further edits
      setEditorHtml(html);
    }
  }, [planMD]);

  /* ─── Extract a patient’s visit‐notes (real or placeholder) ─── */
  const visitNoteOf = (pid) => {
    const ii = recommendation?.individualInsights?.find(
      (x) => String(x.patient._id || x.patient) === String(pid)
    );
    if (ii?.insights?.length) {
      return ii.insights.map((x) => `• [${x.time}] ${x.text}`).join("\n");
    }
    return PLACEHOLDER_VISIT;
  };

const downloadPdf = async () => {
  if (!editorRef.current) return;
  try {
    const canvas  = await html2canvas(editorRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    /* ---- build PDF ---- */
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const w   = pdf.internal.pageSize.getWidth();
    const h   = (canvas.height * w) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, w, h);

    /* ---- filename parts ---- */
    const dateOnly   = (new Date(apptStart || Date.now())).toISOString().slice(0, 10);
    const peoplePart = group.patients.map(p => p.name.replace(/\s+/g, "")).join("_");
    const slug       = activityName
                         .toLowerCase()
                         .replace(/[^a-z0-9]+/g, "_")
                         .replace(/^_+|_+$/g, "");
    const filename   = `material_${dateOnly}_${peoplePart}_${slug}.pdf`;

   /* 👉 trigger browser download first */
   pdf.save(filename);

    /* ---- blob for upload ---- */
    const pdfBlob = pdf.output("blob");

    /* ---- dedupe & upload to each patient ---- */
    await Promise.all(group.patients.map(async (p) => {
      const pid = p._id;

      // 1. check if a material for (appointment, slug) already exists
      const q = qs.stringify({ appointment: appointmentId, activity: slug });
      const existing = await api.get(`/clients/${pid}/materials?${q}`)
                                .then(r => r.data)
                                .catch(() => []);

      // 2. delete old copy if found
      await Promise.all(existing.map(m =>
        api.delete(`/clients/${pid}/materials/${m._id}`)
      ));

      // 3. upload the new PDF
      const fd = new FormData();
      fd.append("visitDate",  dateOnly);
      fd.append("appointment", appointmentId);
      fd.append("activity",    slug);
      fd.append("file", new File([pdfBlob], filename, { type: "application/pdf" }));

      await api.post(`/clients/${pid}/materials`, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
    }));
  } catch (err) {
    console.error("PDF Generation / upload failed:", err);
    alert("Failed to save materials for patients.");
  }
};


  /* ─── Guards ─── */
  if (loading)
    return (
      <Shell>
        <p>Loading…</p>
      </Shell>
    );
  if (error || !group)
    return (
      <Shell>
        <p className="text-red-600">Failed to load group.</p>
      </Shell>
    );

  /* ─── Render ─── */
  return (
    <Shell>
      {/* Edit Goals modal */}
      <GoalPickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        video={video}
        onSaved={(updated) => {
    setVideo(updated);
    const names = updated.goals.map((g) => (typeof g === "string" ? g : g.name));
    setSelectedGoals(names);
  }}
/>

      {/* Header row */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)}>
          <ChevronLeft className="w-6 h-6 text-gray-600 hover:text-gray-800" />
        </button>
        <h2 className="text-2xl font-semibold text-gray-800">
          Recommendations for Group
        </h2>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* ─── LEFT PANEL ─── */}
          <LeftPanel
  group={group}
  selectedGoals={selectedGoals}
  setShowPicker={setShowPicker}
  visitNoteOf={visitNoteOf}
  onViewSession={(pid) =>
    navigate(`/appointments/${appointmentId}/patient/${pid}`)
  }
  />

        {/* ─── RIGHT PANEL ─── */}
        <div className="col-span-8 flex flex-col space-y-6">
          <TabBar active={activeTab} setActive={setActiveTab} />

          {activeTab === "visitNotes" && (
            <VisitNotesTab group={group} visitNoteOf={visitNoteOf} />
          )}

          {activeTab === "groupRecommendations" && (
            <GroupInsightsTab recommendation={recommendation} group={group} />
          )}

          {activeTab === "activityGenerator" && (
            <ActivityTab
              group={group}
              selectedMembers={selectedMembers}
              setSelectedMembers={setSelectedMembers}
              selectedGoals={selectedGoals}
              setSelectedGoals={setSelectedGoals}
              duration={duration}
              setDuration={setDuration}
              planMD={planMD}
              editorHtml={editorHtml}
              setEditorHtml={setEditorHtml}
              generate={generateActivity}
              busy={busy}
              editorRef={editorRef}
              downloadPdf={downloadPdf}
            />
          )}
        </div>
      </div>
    </Shell>
  );
}

/* ─── Reusable Shell ─── */
const Shell = ({ children }) => (
  <div className="min-h-screen flex flex-col bg-white">
    <Navbar />
    <main className="flex-1 p-6 max-w-7xl mx-auto">{children}</main>
  </div>
);

/* ─── Tab Bar ─── */
const TabBar = ({ active, setActive }) => {
  const btn = (id, label, Icon) => (
    <button
      onClick={() => setActive(id)}
      className={`flex items-center gap-2 px-9 py-3 text-base font-medium rounded-xl transition border ${
        active === id
          ? "bg-primary text-white border-primary"
          : "bg-white text-primary border-gray-200 hover:bg-[#F5F4FB]"
      }`}
    >
      <Icon className={`w-6 h-6 ${active === id ? "text-white" : "text-primary"}`} />
      {label}
    </button>
  );
  return (
    <div className="flex gap-4 bg-[#F5F4FB] rounded-2xl px-6 py-4 shadow-sm">
      {btn("visitNotes", "Visit Notes", ClipboardList)}
      {btn("groupRecommendations", "Group Insights", Users)}
      {btn("activityGenerator", "Activity Generator", Sparkle)}
    </div>
  );
};

/* ─── Left Panel ─── */
const LeftPanel = ({
  group,
  selectedGoals,
  setShowPicker,
  visitNoteOf,
  onViewSession
}) => {
  return (
    <div className="col-span-4 bg-[#F9F9FD] rounded-2xl p-6 flex flex-col space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <Avatar
          url={group.avatarUrl}
          name={group.name}
          className="w-20 h-20 rounded-full border-2 border-primary"
        />
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900">{group.name}</h3>
          <p className="text-sm text-gray-500">
            Members: {group.patients.length}
          </p>
          <p className="text-sm text-gray-500">
            Created:{" "}
            {new Date(group.createdAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* ── Members ── */}
      <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col space-y-4">
        <h4 className="text-lg font-medium text-gray-800">Members</h4>
        <ul className="space-y-3">
          {group.patients.map((p) => (
            <li key={p._id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar
                  url={p.avatarUrl}
                  name={p.name}
                  className="w-10 h-10 rounded-full border"
                />
                <span className="text-sm font-medium text-gray-900">
                  {p.name}
                </span>
              </div>
              <button
                onClick={() => onViewSession(p._id)}
                className="px-3 py-1 bg-primary text-white text-xs rounded-full hover:bg-primary/90"
              >
                View Session
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Goals ── */}
      <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col flex-1 space-y-4">
  <h4 className="text-lg font-medium text-gray-800">Goals for This Video</h4>
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
    </div>
  );
};


/* ─── Visit Notes Tab ─── */
const VisitNotesTab = ({ group, visitNoteOf }) => (
  <div className="bg-[#F5F4FB] rounded-2xl p-6 shadow-sm space-y-6">
    <h4 className="text-xl font-semibold text-gray-800">Visit Notes</h4>
    {group.patients.map((p) => (
      <div key={p._id} className="space-y-2">
        <h5 className="font-semibold text-primary">{p.name}</h5>
   <div className="bg-white rounded-md p-3 border text-gray-800 text-sm space-y-1">
     {visitNoteOf(p._id)
       .split("\n")
       .map((line, i) => (
         <p key={i}>{line.replace(/^•\s*/, "• ")}</p>
       ))}
   </div>
      </div>
    ))}
  </div>
);

/* ─── Group Insights Tab ─── */
const GroupInsightsTab = ({ recommendation, group }) => {
  const grpInsights =
    recommendation?.groupInsights?.length
      ? recommendation.groupInsights
      : [PLACEHOLDER_GROUP_INSIGHT];

  const indiv = recommendation?.individualInsights?.length
    ? recommendation.individualInsights
    : group.patients.map((p) => ({
        patient: { _id: p._id, name: p.name },
        insights: [PLACEHOLDER_INDIVIDUAL_INSIGHT],
      }));

  return (
    <div className="bg-[#F5F4FB] rounded-2xl p-6 shadow-sm space-y-6">
      {/* Group‐level */}
      <h4 className="text-xl font-semibold text-gray-800">Group Insights</h4>
      {grpInsights.map((ins, i) => (
        <InsightRow key={i} ins={ins} />
      ))}

      {/* Individual‐level */}
      <h4 className="text-xl font-semibold text-gray-800 mt-4">
        Individual Insights
      </h4>
      {indiv.map((ii) => (
        <div key={ii.patient._id} className="space-y-2">
          <h5 className="font-semibold text-primary">{ii.patient.name}</h5>
          {ii.insights.map((ins, idx) => (
            <InsightRow key={idx} ins={ins} />
          ))}
        </div>
      ))}
    </div>
  );
};

const InsightRow = ({ ins }) => (
  <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
    <div className="text-sm text-gray-800">{ins.text}</div>
    <span
      className={`${ins.tagColor} text-xs font-medium px-2 py-1 rounded-full`}
    >
      {ins.tag}
    </span>
  </div>
);

/* ─── Activity Generator Tab ─── */
const ActivityTab = ({
  group,
  selectedMembers,
  setSelectedMembers,
  selectedGoals,
  setSelectedGoals,
  duration,
  setDuration,
  planMD,
  editorHtml,
  setEditorHtml,
  generate,
  busy,
  editorRef,
  downloadPdf,
}) => (
  <div className="bg-[#F5F4FB] rounded-2xl p-6 shadow-sm space-y-6">
    <h4 className="text-xl font-semibold text-gray-800">Activity Generator</h4>

    <DropdownChips
      label="Members"
      placeholder="Select Patients"
      options={group.patients.map((p) => ({ id: p._id, label: p.name }))}
      selected={selectedMembers}
      setSelected={setSelectedMembers}
    />

    <DropdownChips
      label="Goals"
      placeholder="Select Goals"
      /* options come from the same merged list we just put on group.goals */
      options={(group.goals ?? []).map((g) => ({ id: g, label: g }))}
      selected={selectedGoals}
      setSelected={setSelectedGoals}
    />

    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-gray-700">Duration</label>
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
      onClick={generate}
      disabled={busy}
      className="bg-primary text-white rounded-full px-6 py-2 w-fit hover:bg-primary/90 disabled:opacity-60"
    >
      {busy ? "Generating…" : "Generate Activity"}
    </button>

    {planMD && (
      <div className="space-y-4 w-full">
        <h5 className="text-lg font-semibold text-gray-800">Generated Plan</h5>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning={true}
          onInput={(e) => setEditorHtml(e.currentTarget.innerHTML)}
          className="min-h-[200px] border rounded-md p-3 bg-white text-sm overflow-auto"
        />

        <button
          onClick={downloadPdf}
          className="bg-primary text-white px-4 py-2 rounded-full hover:bg-primary/90"
        >
          Download as PDF (and Save for All Patients)
        </button>
      </div>
    )}
  </div>
);

/* ─── Dropdown + Chips ─── */
const DropdownChips = ({
  label,
  placeholder,
  options,
  selected,
  setSelected,
}) => (
  <div className="flex flex-col">
    <label className="text-sm font-medium text-gray-700 mb-1">{label}</label>
    <select
      value=""
      onChange={(e) => {
        const val = e.target.value;
        if (val && !selected.includes(val)) setSelected([...selected, val]);
      }}
      className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
    >
      <option value="">{placeholder}</option>
      {options
        .filter((o) => !selected.includes(o.id))
        .map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
    </select>

    <div className="mt-2 flex flex-wrap gap-2">
      {selected.map((val) => {
        const lbl = options.find((o) => o.id === val)?.label || val;
        return (
          <span
            key={val}
            className="flex items-center gap-1 bg-primary text-white rounded-full px-3 py-1 text-sm"
          >
            {lbl}
            <button
              onClick={() => setSelected(selected.filter((x) => x !== val))}
              className="ml-1 font-bold text-white/80 hover:text-white/60"
            >
              ×
            </button>
          </span>
        );
      })}
    </div>
  </div>
);
