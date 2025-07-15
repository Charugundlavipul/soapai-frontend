// src/pages/IndividualRecommendations.jsx
import { useState, useEffect, useRef }        from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios               from "axios";
import Navbar              from "../components/Navbar";
import GoalPickerModal     from "../modals/GoalPickerModal";
import { ChevronLeft, ClipboardList, Zap, Sparkle,Sparkles } from "lucide-react";
import Avatar              from "../components/Avatar";
import ActivityGenerator   from "../components/ActivityGenerator";
import VisitNoteEditor     from "../components/VisitNoteEditor";

/* ───── axios helper ───── */
const api = axios.create({
  baseURL : "http://localhost:4000/api",
  headers : { Authorization: `Bearer ${localStorage.getItem("jwt")}` }
});

function stgForAppt(patient, appointmentId) {
  return (
    patient.stgs?.find(s => String(s.appointment) === String(appointmentId))
      ?.text ?? ""
  );
}

/* ───── placeholders ───── */
const PLACEHOLDER_VISIT_NOTE = `Patient struggled with Pronouncing words ending with /s and /es`.trim();

const PLACEHOLDER_AI_INSIGHTS = [
  { time:"11:00 - 11:10", text:"Patient identified rhymes 9/10 times.", tag:"Phonological Awareness", color:"bg-green-100 text-green-800" },
  { time:"11:11 - 11:15", text:"Average utterance length increased to 7 words.", tag:"Fluency Improvement",  color:"bg-blue-100 text-blue-800" }
];

/* ────────────────────────────────────────── */
export default function IndividualRecommendations() {
  /* routing setup */
  const navigate          = useNavigate();
  const { id }            = useParams();          // appointment id
  const location          = useLocation();
  const fromAppointment   = location.pathname.startsWith("/appointments/");
  const appointmentId     = fromAppointment ? id : null;

  /* state */
  const [client   , setClient]   = useState(null);
  const [loading  , setLoading]  = useState(true);
  const [error    , setError]    = useState(false);
  const [visitNote, setVisitNote]= useState(PLACEHOLDER_VISIT_NOTE);

  /* activity / ui */
  const [activities , setActivities]  = useState([]);
  const [activeTab  , setActiveTab]   = useState("visitNotes");
  const [showPicker , setShowPicker]  = useState(false);
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [planMD, setPlanMD] = useState("");
  const editorRef  = useRef(null);
  const [busy, setBusy] = useState(false);

  /* appointment meta */
  const [apptStart, setApptStart] = useState(null);
  const stgText = client ? stgForAppt(client, appointmentId) : "";
  

  /* ──────────────────────────────────────────
     1️⃣  Load patient + ensure placeholder visit
  ────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        /* 1. pull the appointment */
        const { data: appt } = await api.get(`/appointments/${appointmentId}`);
        if (!appt?.patient) throw new Error("No patient linked");
        setApptStart(appt.dateTimeStart);
        setActivities(appt.activities || []);

        /* 2. upsert placeholder visit once */
        await api.post(`/clients/${appt.patient._id}/visit`, {
          visit: {
            date       : appt.dateTimeStart,
            appointment: appointmentId,
            type       : "individual",
            note       : PLACEHOLDER_VISIT_NOTE,
            aiInsights : PLACEHOLDER_AI_INSIGHTS,
            activities : []
          }
        }).catch(() => {});                    // ignore 409-ish duplicates

        /* 3. fetch updated patient */
        const { data: pat } = await api.get(`/clients/${appt.patient._id}`);
        setClient(pat);

        /* show existing note if present */
        const row = pat.visitHistory.find(v => String(v.appointment) === appointmentId);
        if (row?.note) setVisitNote(row.note);

        /* init goals from video (if routed that way) */
        const gInitial =
          location.state?.video?.goals?.map(g => typeof g === "string" ? g : g.name) || [];
        setSelectedGoals(gInitial);

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(true);
        setLoading(false);
      }
    })();
  }, [appointmentId, location.state]);

  /* ─── STG generator ─── */
  async function generateStg() {
    if (!client?._id) return;
    try {
      await api.post(`/clients/${client._id}/gen-stg`, {
        appointmentId
      });
      const { data: fresh } = await api.get(`/clients/${client._id}`);
      setClient(fresh);
      alert("Short-term goal generated!");
    } catch (e) {
      alert(e.response?.data?.message || "Failed to generate ST Goal");
    }
  }

  /* ╭────────────────────────────────────────╮
     │   render guards                        │
     ╰────────────────────────────────────────╯ */
  if (loading)
    return <Shell><p className="text-gray-500">Loading…</p></Shell>;

  if (error || !client)
    return <Shell><p className="text-red-600">Failed to load patient.</p></Shell>;

  const aiInsights = PLACEHOLDER_AI_INSIGHTS;   // simple placeholder only

  /* ╭────────────────────────────────────────╮
     │   UI                                  │
     ╰────────────────────────────────────────╯ */
  return (
    <Shell>
      {/* Goal-picker */}
      <GoalPickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        video={location.state?.video}
        onSaved={v => {
          const names = v.goals.map(g => typeof g === "string" ? g : g.name);
          setSelectedGoals(names);
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)}>
          <ChevronLeft className="w-6 h-6 text-gray-600 hover:text-gray-800" />
        </button>
        <h2 className="text-2xl font-semibold text-gray-800">
          Recommendations — {client.name}
        </h2>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* LEFT */}
        <LeftPanel
          client={client}
          selectedGoals={selectedGoals}
          onEditGoals={() => setShowPicker(true)}
          onGenerateStg={generateStg}
          stgText={stgText}  
        />

        {/* RIGHT */}
        <RightPanel
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          aiInsights={aiInsights}
          visitNote={visitNote}
          setVisitNote={setVisitNote}
          appointmentId={appointmentId}
          client={client}
          activities={activities}
          setActivities={setActivities}
          editorRef={editorRef}
          planMD={planMD}
          setPlanMD={setPlanMD}
          busy={busy}
          setBusy={setBusy}
          selectedGoals={selectedGoals}
          apptStart={apptStart}
        />
      </div>
    </Shell>
  );
}

/* ───────────────── left panel ───────────────── */
function LeftPanel({ client, selectedGoals, stgText, onEditGoals, onGenerateStg }) {
  return (
    <div className="col-span-4 bg-[#F9F9FD] rounded-2xl p-6 space-y-6">
      {/* profile */}
      <ProfileCard client={client} />

      {/* long-term goals */}
      {/* <GoalsCard title="All Long Term Goals" goals={client.goals} /> */}

      {/* session goals */}
      <GoalsCard
        title="Goals for this Session"
        goals={selectedGoals}
        onEdit={onEditGoals}
      />

      {/* STG card */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="text-lg font-medium text-gray-800">AI Short-Term Goal</h4>
          <button
            onClick={onGenerateStg}
            className="text-xs bg-primary text-white px-3 py-1 rounded-full hover:bg-primary/90"
          >
                        <Sparkles className="w-3 h-3" />
            {stgText ? "Regenerate" : "Generate"}
          </button>
        </div>
        {stgText
          ? <p className="text-sm whitespace-pre-wrap">{stgText}</p>
          : <p className="text-xs italic text-gray-400">Not generated yet</p>}
      </div>

      {/* previous visit note */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h4 className="text-lg font-medium mb-2">Previous Visit Notes</h4>
        {client.prevVisitNote?.split("\n").map((ln,i)=>(
          <p key={i} className="text-sm">{ln}</p>
        ))}
      </div>
    </div>
  );
}

/* helper components omitted for brevity … (ProfileCard, GoalsCard, RightPanel, etc.)
   ⇢ They are identical to your current versions except that:
     • RightPanel no longer references “recommendation”.
     • No code path calls /appointments/:id/recommendations.       
     
     /* ─── tiny helpers added because ESLint yelled ─── */

/** Avatar / name / age / diagnosis block (was inline before) */
function ProfileCard({ client }) {
  return (
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
          Diagnosis: {(client.pastHistory || []).join(", ") || "—"}
        </p>
      </div>
    </div>
  );
}

/** Generic “Goals” card. If onEdit is provided, shows an Edit button */
function GoalsCard({ title, goals = [], onEdit }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-medium text-gray-800">{title}</h4>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-xs bg-primary text-white px-3 py-1 rounded-full hover:bg-primary/90"
          >
            Edit Goals
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {goals.length ? (
          goals.map((g) => (
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
  );
}


function Shell({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 p-6 max-w-7xl mx-auto">{children}</main>
    </div>
  );
}


// /* ---------- smaller helpers ---------- */
// const Card = ({ title, children, action, actionLabel }) => (
//   <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
//     <div className="flex justify-between items-center">
//       <h4 className="text-lg font-medium text-gray-800">{title}</h4>
//       {action && (
//         <button
//           onClick={action}
//           className="text-xs bg-primary text-white px-3 py-1 rounded-full hover:bg-primary/90"
//         >
//           {actionLabel}
//         </button>
//       )}
//     </div>
//     <div className="flex flex-wrap gap-2">{children}</div>
//   </div>
// );

// const Pill = ({ children }) => (
//   <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs">
//     {children}
//   </span>
// );

// const Empty = ({ children }) => (
//   <span className="text-xs italic text-gray-400">{children}</span>
// );

/* ---- RIGHT column with tabs ---- */
function RightPanel({
  activeTab,
  setActiveTab,
  aiInsights,
  visitNote,
  setVisitNote,
  appointmentId,
  client,
  activities,
  setActivities,
}) {
  return (
    <div className="col-span-8 flex flex-col space-y-6">
      <TabBar active={activeTab} setActive={setActiveTab} />

      {/* VISIT NOTES */}
      {activeTab === "visitNotes" && (
        <div className="bg-[#F5F4FB] rounded-2xl p-6 shadow-sm">
          <h4 className="text-xl font-semibold text-gray-800 mb-5">
            Visit Notes
          </h4>
          <VisitNoteEditor
            patientId={client._id}
            appointmentId={appointmentId}
            initialNote={visitNote}
            onSaved={setVisitNote}
            className="mb-2"
          />
        </div>
      )}

      {/* AI INSIGHTS */}
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

      {/* ACTIVITY GENERATOR */}
      {activeTab === "activityGenerator" && (
        <ActivityGenerator
          mode="individual"
          appointmentId={appointmentId}
          patients={[client]}
          allGoals={client.goals || []}
          initialActivities={activities}
          onActivitiesChange={setActivities}
        />
      )}
    </div>
  );
}

/* tab bar */
function TabBar({ active, setActive }) {
  const btn = (id, label, Icon) => (
    <button
      onClick={() => setActive(id)}
      className={`flex items-center gap-2 px-9 py-3 text-base font-medium rounded-xl transition border ${
        active === id
          ? "bg-primary text-white border-primary"
          : "bg-white text-primary border-gray-200 hover:bg-[#F5F4FB]"
      }`}
    >
      <Icon
        className={`w-6 h-6 ${active === id ? "text-white" : "text-primary"}`}
      />
      {label}
    </button>
  );
  return (
    <div className="flex gap-4 bg-[#F5F4FB] rounded-2xl px-6 py-4 shadow-sm">
      {btn("visitNotes", "Visit Notes", ClipboardList)}
      {btn("aiInsights",  "AI Insights", Zap)}
      {btn("activityGenerator", "Activity Generator", Sparkle)}
    </div>
  );
}

/* small row */
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