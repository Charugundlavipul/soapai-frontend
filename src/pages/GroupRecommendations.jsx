/*  client/src/pages/GroupRecommendations.jsx  */
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Navbar            from "../components/Navbar";
import Avatar            from "../components/Avatar";
import VisitNoteEditor   from "../components/VisitNoteEditor";
import GoalPickerModal   from "../modals/GoalPickerModal";
import ActivityGenerator from "../components/ActivityGenerator";
import VisitNotes        from "../components/VisitNotes";
import ProgressTrackerVisit from "../components/ProgressTrackerVisit";

import {
  ChevronLeft,
  ClipboardList,
  Users,
  Sparkle,   // for the tab bar
  ChartLine  
} from "lucide-react";

import { marked }    from "marked";

const api = axios.create({
  baseURL: "http://localhost:4000/api",
  headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` },
});

/* ──────────────────────────────────────────────────────────── */
/* Place-holders                                               */
/* ──────────────────────────────────────────────────────────── */
const PLACEHOLDER_VISIT = "Student reviewed flower parts and recalled 2 of 5 vocabulary terms. They created a bouquet with interest and watched a spring video, answering questions with growing comprehension. During a contraction-building activity, they identified apostrophes replacing “i” in “who’s” and “what’s,” showing grammar awareness.";

const PLACEHOLDER_GROUP_INSIGHT = {
  text    : "Group demonstrated steady progress in social engagement: 80% more peer-to-peer interactions than the previous session.",
  tag     : "Social Engagement",
  tagColor: "bg-green-100 text-green-800",
};

const PLACEHOLDER_INDIVIDUAL_INSIGHT = {
  time    : "00:00 – 00:01",
  text    : "Patient showed enhanced articulation skills, especially with /s/ and /z/ sounds, reaching 85% accuracy in structured drills.",
  tag     : "Articulation",
  tagColor: "bg-green-100 text-green-800",
};

function stgForAppt(patient, appointmentId) {
  return patient.stgs?.find(
    (s) => String(s.appointment) === String(appointmentId)
  ) || null;
}

export default function GroupRecommendations() {
  /* ---- routing ------------------------------------------- */
  const navigate        = useNavigate();
  const params          = useParams();
  const location        = useLocation();
  const fromAppointment = location.pathname.startsWith("/appointments/");
  const appointmentId   = fromAppointment ? params.id : null;
  const groupIdDirect   = !fromAppointment ? params.id : null;

  /* ---- state --------------------------------------------- */
  const [loading, setLoading]           = useState(true);
  const [error,   setError]             = useState(false);

  const [group, setGroup]               = useState(null);

  const [visitNotes, setVisitNotes]     = useState({});   // pid → text

  const [activeTab, setActiveTab]       = useState("visitNotes");
  const [showPicker, setShowPicker]     = useState(false);

  const [video, setVideo]               = useState(location.state?.video || null);
  const initialGoals =
    video?.goals?.map(g => (typeof g === "string" ? g : g.name)) || [];
  const [selectedGoals, setSelectedGoals] = useState(initialGoals);


  const [activities, setActivities]     = useState([]);
  const [busy, setBusy]                 = useState(false);
  const [planMD, setPlanMD]             = useState("");
  const editorRef                       = useRef(null);

  const [apptStart, setApptStart]       = useState(null);

  /* ------------------------------------------------------------------
     1️⃣  Fetch group + placeholder recommendation
  ------------------------------------------------------------------ */

useEffect(() => {
  (async () => {
    try {
      /* 0. derive group-id and appointment meta */
      let grpId = groupIdDirect;
      let appt  = null;

      if (fromAppointment) {
        const { data } = await api.get(`/appointments/${appointmentId}`);
        appt  = data;
        grpId = data.group._id;

        setApptStart(data.dateTimeStart);
        setActivities(data.activities || []);
      }

      /* 1. base group (patients are just ObjectIds here) */
      const { data: grp } = await api.get(`/groups/${grpId}`);

      /* 2. fetch every patient’s *full* doc in parallel */
      /* 2. fetch every patient’s *full* doc in parallel */
      const fullPatients = await Promise.all(
        grp.patients.map(async (p) => {
          /* p could be either an ObjectId or an object already */
          const pid = typeof p === "object" && p !== null ? p._id : p;

          /* pull the latest doc */
          const { data: pat } = await api.get(`/clients/${pid}`);
          if (fromAppointment && appt) {
            const has = (pat.visitHistory ?? []).some(
              (v) => String(v.appointment) === String(appointmentId)
            );

            if (!has) {
              const newRow = {
                date       : appt.dateTimeStart,
                appointment: appointmentId,
                type       : "group",
                note       : "",
                aiInsights : [],
                activities : [],
              };

              /* server insert */
              await api.post(`/clients/${pid}/visit`, { visit: newRow });

              /* ensure visitHistory is an array, then push locally */
              if (!Array.isArray(pat.visitHistory)) pat.visitHistory = [];
              pat.visitHistory.push(newRow);
            }
          }

          return pat;          // fully-hydrated patient object
        })
      );

      /* 3. replace group.patients with the hydrated versions */
      grp.patients = fullPatients;

      /* 4. seed visitNotes from the newly fetched rows */
      const seed = {};
      fullPatients.forEach((p) => {
        const row = p.visitHistory.find(
          (v) => String(v.appointment) === String(appointmentId)
        );
        if (row) seed[p._id] = row.note;
      });
      setVisitNotes(seed);

      /* 5. finally put everything in state */
      setGroup(grp);
      setLoading(false);
    } catch (err) {
      console.error("group-fetch error:", err);
      setError(true);
      setLoading(false);
    }
  })();
}, [appointmentId, groupIdDirect, fromAppointment]);




  /* ---------- generate single ST G ---------- */
  async function genStg(pid) {
    try {
    await api.post(`/clients/${pid}/gen-stg`, { appointmentId });
    const { data: fresh } = await api.get(`/clients/${pid}`);
    setGroup(g => ({
      ...g,
      patients: g.patients.map(p =>
        String(p._id) === pid ? fresh : p
      ),
    }));
    } catch {
      alert("Failed to generate a short-term goal.");
    }
  }

  async function saveStg(pid, text) {                    
    await api.patch(`/clients/${pid}/stg`,               
      { appointmentId, text });                          
    const { data: fresh } = await api.get(`/clients/${pid}`); 
    setGroup(g => ({                                     
      ...g,                                              
      patients: g.patients.map(p =>                      
        String(p._id) === pid ? fresh : p                
      ),                                                 
    }));                                                 
  } 

  /* ---------- utility ---------- */
    const visitNoteOf = pid => {
    /* 1. if we already have an edited / freshly-saved note in state, use it */
    if (visitNotes.hasOwnProperty(pid)) return visitNotes[pid];

    /* 2. otherwise fall back to whatever is already in the patient’s
          visitHistory that came down with the <group> payload           */
    const pat  = group.patients.find(p => String(p._id) === String(pid));
    const row  = pat?.visitHistory?.find(
                  v => String(v.appointment) === String(appointmentId)
                );

    return (row?.note ?? "");
  };
  /* ---------- markdown → html side-effect ---------- */
  useEffect(() => {
    if (planMD && editorRef.current) {
      editorRef.current.innerHTML = marked.parse(planMD);
    }
  }, [planMD]);

  /* ─── Guards ─── */
  if (loading) return <Shell><p>Loading…</p></Shell>;
  if (error || !group) return <Shell><p className="text-red-600">Failed to load group.</p></Shell>;

  /* ─── Render ─── */
  return (
    <Shell>
      <GoalPickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        video={video}
        onSaved={async (updated) => {
          setVideo(updated);
          const names = updated.goals.map(g => (typeof g === "string" ? g : g.name));
          setSelectedGoals(names);
          try {
            const { data: freshGrp } = await api.get(`/groups/${group._id}`);
            const fullPatients = await Promise.all(
              freshGrp.patients.map(p =>
                api.get(`/clients/${p._id}`).then(r => r.data)
              )
            );
            freshGrp.patients = fullPatients;
            setGroup(freshGrp);
          } catch {/* ignore */ }
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)}>
          <ChevronLeft className="w-6 h-6 text-gray-600 hover:text-gray-800" />
        </button>
        <h2 className="text-2xl font-semibold text-gray-800">Recommendations for Group</h2>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <LeftPanel
          group={group}
          selectedGoals={selectedGoals}
          setShowPicker={setShowPicker}
          visitNoteOf={visitNoteOf}
          onViewSession={pid => navigate(`/appointments/${appointmentId}/patient/${pid}`)}
        />

        <div className="col-span-8 flex flex-col space-y-6">
          <TabBar active={activeTab} setActive={setActiveTab} />

          {activeTab === "visitNotes" && (
            <VisitNotes
              patients={group.patients}
              appointmentId={appointmentId}
              noteOf={visitNoteOf}
              onSave={(pid, txt) =>
                setVisitNotes((v) => ({ ...v, [pid]: txt }))
              }
              onGenStg={genStg}
              onSaveStg={saveStg}
            />
          )}

          {activeTab === "progress" && (
            <GroupProgressTab
              group={group}
              appointmentId={appointmentId}
              sessionGoals={selectedGoals}
              apptStart={apptStart}
            />
          )}

          {activeTab === "activityGenerator" && (
            <ActivityGenerator
              mode="group"
              appointmentId={appointmentId}
              patients={group.patients}
              allGoals={selectedGoals || []}
              initialActivities={activities}
              onActivitiesChange={setActivities}
            />
          )}
        </div>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/* Shell wrapper                                                      */
/* ------------------------------------------------------------------ */
const Shell = ({ children }) => (
  <div className="min-h-screen flex flex-col bg-white">
    <Navbar />
    <main className="flex-1 p-6 max-w-7xl mx-auto">{children}</main>
  </div>
);

/* ------------------------------------------------------------------ */
/* Tab Bar                                                             */
/* ------------------------------------------------------------------ */
const TabBar = ({ active, setActive }) => {
  const Btn = (id, label, Icon) => (
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
    <div className="mx-auto flex justify-center gap-4 bg-[#F5F4FB] rounded-2xl px-10 py-4 shadow-sm">
      {Btn("visitNotes", "Visit Notes", ClipboardList)}
      {Btn("progress", "Patient Progress", ChartLine)}
      {Btn("activityGenerator", "Activity Generator", Sparkle)}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Left-hand panel                                                    */
/* ------------------------------------------------------------------ */
const LeftPanel = ({
  group,
  selectedGoals,
  setShowPicker,
  visitNoteOf,
  onViewSession,
}) => (
  <div className="col-span-4 bg-[#F9F9FD] rounded-2xl p-6 flex flex-col space-y-6">
    {/* header */}
    <div className="flex items-center gap-4">
      <Avatar
        url={group.avatarUrl}
        name={group.name}
        className="w-20 h-20 rounded-full border-2 border-primary"
      />
      <div className="flex-1">
        <h3 className="text-xl font-semibold text-gray-900">{group.name}</h3>
        <p className="text-sm text-gray-500">Members: {group.patients.length}</p>
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

    {/* members */}
    <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col space-y-4">
      <h4 className="text-lg font-medium text-gray-800">Members</h4>
      <ul className="space-y-3">
        {group.patients.map(p => (
          <li key={p._id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar
                url={p.avatarUrl}
                name={p.name}
                className="w-10 h-10 rounded-full border"
              />
              <span className="text-sm font-medium text-gray-900">{p.name}</span>
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

    {/* goals */}
    <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col flex-1 space-y-4">
      <h4 className="text-lg font-medium text-gray-800">Goals for This Video</h4>
      <div className="flex flex-wrap gap-2">
        {selectedGoals.length ? (
          selectedGoals.map(g => (
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

/* ------------------------------------------------------------------ */
/* Group-insights tab                                                 */
/* ------------------------------------------------------------------ */
const GroupInsightsTab = ({ recommendation, group }) => {
  const grpInsights =
    recommendation?.groupInsights?.length
      ? recommendation.groupInsights
      : [PLACEHOLDER_GROUP_INSIGHT];

  const indiv = recommendation?.individualInsights?.length
    ? recommendation.individualInsights
    : group.patients.map(p => ({
        patient: { _id: p._id, name: p.name },
        insights: [PLACEHOLDER_INDIVIDUAL_INSIGHT],
      }));

  return (
    <div className="bg-[#F5F4FB] rounded-2xl p-6 shadow-sm space-y-6">
      <h4 className="text-xl font-semibold text-gray-800">Group Insights</h4>
      {grpInsights.map((ins, i) => (
        <InsightRow key={i} ins={ins} />
      ))}

      <h4 className="text-xl font-semibold text-gray-800 mt-4">
        Individual Insights
      </h4>
      {indiv.map(ii => (
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

function GroupProgressTab({ group, appointmentId, sessionGoals, apptStart }) {
  const buildRows = (grp, goals) =>
    grp.patients.map(p => ({
      pid   : p._id,
      name  : p.name,
      goals : goals
        .filter(g => p.goals.includes(g))
        .map(g => {
          const gp   = p.goalProgress.find(r => r.name === g);
          const hist = gp?.history?.find(
                        h => String(h.appointment) === String(appointmentId)
                      );
          return {
            name         : g,
            latest       : gp?.progress ?? 0,
            visitProgress: hist?.progress ?? (gp?.progress ?? 0)
          };
        })
    }));

  const [rows, setRows] = useState(() => buildRows(group, sessionGoals));
  useEffect(() => setRows(buildRows(group, sessionGoals)),
            [group, sessionGoals]);

 const setGoal = async (pid, gName, val, commit=false) => {
   setRows(r =>
     r.map(p =>
       p.pid === pid
         ? {
             ...p,
             goals: p.goals.map(g =>
              g.name === gName
                ? {
                    ...g,
                    visitProgress: val,
                    latest: Math.max(g.latest, val), // ← recompute
                  }
                : g
            ),
          }
        : p
    )
  );

  if (commit) {
    try {
      await api.patch(
        `/clients/${pid}/goal-progress/${appointmentId}`,
        { goals:[{ name:gName, progress:val }], visitDate: apptStart }
      );
      /* bump overall */
        setRows(r =>
          r.map(p =>
            p.pid === pid
              ? {
                  ...p,
                  goals: p.goals.map(g =>
                    g.name === gName
                      ? {
                          ...g,
                          visitProgress: val,
                          latest: Math.max(g.latest, val),   // ← keep the max
                        }
                      : g
                  ),
                }
              : p
          )
        );
    } catch {/* ignore */ }
  }
};

  const save = async () => {
    try {
      await Promise.all(rows.map(p =>
        api.patch(
          `/clients/${p.pid}/goal-progress/${appointmentId}`,
          { goals: p.goals.map(g => ({ name:g.name, progress:g.visitProgress })), visitDate: apptStart }
        )
      ));
      setRows(r => r.map(p => ({
  ...p,
  goals: p.goals.map(g => ({
    ...g,
    latest: Math.max(g.latest, g.visitProgress)        // ← keep the max
  }))
})));
      alert("Progress saved!");
    } catch (e) {
      alert(e.response?.data?.message || "Save failed");
    }
  };

  /* ---------- render ---------- */
  return (
    <div className="space-y-6">
      {rows.map(p => (
        <div key={p.pid}>
          <h4 className="text-lg font-semibold mb-3">{p.name}</h4>
          <ProgressTrackerVisit
            rows={p.goals}
             onChange={(idx,val,commit)=>setGoal(
              p.pid,
              p.goals[idx].name,
              val,
              commit
  )}   /* one global save button below */
          />
        </div>
      ))}
      
    </div>
  );
}


const InsightRow = ({ ins }) => (
  <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
    <div className="text-sm text-gray-800 flex-1">
      <span className="mr-3 text-gray-400">{ins.time || "—"}</span>
      {ins.text}
    </div>
    <span className={`${ins.tagColor} text-xs font-medium px-2 py-1 rounded-full`}>
      {ins.tag}
    </span>
  </div>
);
