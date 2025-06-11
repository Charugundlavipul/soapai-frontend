// src/pages/EditClientPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Avatar from "../components/Avatar";
import api from "../services/api";
import Navbar                from "../components/Navbar";
import EditClientProfileModal from "../modals/EditClientProfileModal";
import EditGoalsModal         from "../modals/EditGoalsModal";

import {
  ChevronLeft,
  Pencil,
  CalendarDays,
  BookOpen,
  BarChart3,
} from "lucide-react";

/* ────────────────── Helpers ────────────────── */
const VisitRow = ({ v }) => (
  <details className="bg-white rounded-lg shadow-sm cursor-pointer">
    <summary className="px-5 py-4 flex justify-between items-center list-none">
      <span className="font-medium text-primary">{v.dateString}</span>
      <span className="text-primary">▾</span>
    </summary>
    <div className="px-5 py-4 border-t text-sm text-gray-700 whitespace-pre-wrap">
      {v.note || "No notes."}
    </div>
  </details>
);

/* ────────────────── Main component ────────────────── */
export default function EditClientPage() {
  const { id } = useParams();
  const nav    = useNavigate();

  /* basic state */
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState("");
  const [client,  setClient]    = useState(null);
  const [groups,  setGroups]    = useState([]);

  /* ui state */
  const [activeTab, setActiveTab] = useState("visitHistory");
  const [showEdit , setShowEdit ] = useState(false);
  const [showGoals, setShowGoals] = useState(false);

  /* ───── fetch profile (includes visitHistory) ───── */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(
          `http://localhost:4000/api/clients/${id}/profile`,
          { headers:{ Authorization:`Bearer ${localStorage.getItem("jwt")}` } }
        );
        setClient(data);

        const { data: g } = await axios.get(
          "http://localhost:4000/api/groups",
          { headers:{ Authorization:`Bearer ${localStorage.getItem("jwt")}` } }
        );
        setGroups(g);

        setLoading(false);
      } catch (e) {
        setError(e.response?.data?.message || "Unable to load client.");
        setLoading(false);
      }
    })();
  }, [id]);

  /* ───── save-profile handler (avatar / basics) ───── */
  async function saveProfile(payload) {
    try {
      const { avatarFile, ...rest } = payload;
      const hasFile = avatarFile instanceof File;

      const headers = {
        Authorization:`Bearer ${localStorage.getItem("jwt")}`,
        ...(hasFile ? {} : { "Content-Type":"application/json" })
      };

      const body = hasFile
        ? (() => {
            const f = new FormData();
            Object.entries(rest).forEach(([k,v]) =>
              f.append(k, Array.isArray(v) ? JSON.stringify(v) : v ?? "")
            );
            f.append("avatar", avatarFile);
            return f;
          })()
        : rest;

      const { data } = await axios.put(
        `http://localhost:4000/api/clients/${id}`,
        body,
        { headers }
      );
      setClient(c => ({ ...c, ...data }));
      setShowEdit(false);
    } catch (e) {
      alert(e.response?.data?.message || "Update failed");
    }
  }

  /* ───── save-goals handler ───── */
  async function saveGoals(newGoals) {
    try {
      const { data } = await axios.patch(
        `http://localhost:4000/api/clients/${id}/goals`,
        { goals:newGoals },
        { headers:{ Authorization:`Bearer ${localStorage.getItem("jwt")}` } }
      );
      setClient(c => ({ ...c, goals:data.goals }));
      setShowGoals(false);
    } catch (e) {
      alert(e.response?.data?.message || "Failed to update goals");
    }
  }

  /* ───── guards ───── */
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
          {error || "Client not found."}
        </div>
      </div>
    );

  /* ───── helpers ───── */
// 🔄 replace the whole helper with this
const renderVisitRows = () =>
  client.visitHistory?.map((v, i) => (
    <VisitRow
      key={v._id ?? i}
      v={{
        dateString:
          v.dateString ??
          new Date(v.date).toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        note: v.note ?? "No notes.",
      }}
    />
  ));


  /* ───── UI ───── */
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      {/* profile-edit modal */}
      <EditClientProfileModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        client={client}
        onSave={saveProfile}
        groups={groups}
      />

      {/* new goals modal */}
      <EditGoalsModal
        open={showGoals}
        onClose={() => setShowGoals(false)}
        currentGoals={client.goals}
        onSave={saveGoals}
      />

      <main className="flex-1 p-6 max-w-7xl mx-auto space-y-6">
        {/* page header */}
        <div className="flex items-center gap-3 justify-center mb-6">
          <button onClick={() => nav(-1)}>
            <ChevronLeft className="w-6 h-6 text-gray-600 hover:text-gray-800" />
          </button>
          <h2 className="text-2xl font-semibold text-gray-800">
            Client Profile
          </h2>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* ───── LEFT summary column ───── */}
          <LeftSummary
            client={client}
            groups={groups}
            onEditProfile={() => setShowEdit(true)}
            onEditGoals   ={() => setShowGoals(true)}
          />

          {/* ───── RIGHT tabbed panel ───── */}
          <RightTabs
            client={client}            // ← NEW
            setClient={setClient}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            renderVisitRows={renderVisitRows}
          />
        </div>
      </main>
    </div>
  );
}

/* ────────── Left summary block ────────── */
function LeftSummary({ client, groups, onEditProfile, onEditGoals }) {
  return (
    <div className="col-span-4 flex flex-col gap-6">
      {/* avatar header */}
      <div className="flex items-start gap-4">
      <Avatar
        url={client.avatarUrl}
        name={client.name}
        className="w-20 h-20 rounded-full border-2 border-primary"
      />

        <div className="flex-1">
          <h3 className="text-[1.35rem] font-semibold text-gray-900">
            {client.name}
          </h3>

          <div className="mt-1 text-sm space-y-0.5 text-gray-600">
            <div>
              <span className="font-medium">Age :</span>&nbsp;
              {client.age ?? "—"}
            </div>
            <div>
              <span className="font-medium">Joined :</span>&nbsp;
              {client.createdAt
                ? new Date(client.createdAt).toLocaleDateString("en-GB", {
                    day:"2-digit", month:"short", year:"numeric"
                  })
                : "—"}
            </div>
            <div>
              <span className="font-medium">Last Visit :</span>&nbsp;
              {client.visitHistory?.length
                ? new Date(client.visitHistory.at(-1).date).toLocaleDateString(
                    "en-GB",
                    { day:"2-digit", month:"long", year:"numeric" }
                  )
                : "—"}
            </div>
          </div>
        </div>

        {/* edit pencil */}
        <button
          onClick={onEditProfile}
          className="p-1.5 rounded-full hover:bg-primary/10"
          title="Edit profile"
        >
          <Pencil className="w-[15px] h-[15px] text-primary" />
        </button>
      </div>

      {/* about card */}
      <div className="bg-[#F5F4FB] rounded-2xl p-6 shadow-sm space-y-5">
        <h4 className="text-xl font-semibold text-primary mb-1">
          About&nbsp;{client.name.split(" ")[0]}
        </h4>

        <dl className="space-y-2 text-sm">
          <Row label="Name"   value={client.name} />
          <Row label="Age"    value={client.age ?? "—"} />
          <Row
            label="Past History"
            value={(client.pastHistory ?? []).join(", ") || "—"}
          />
          <Row
            label="Group"
            value={(() => {
              if (!client.group) return "—";
              if (typeof client.group === "object") return client.group.name;
              const g = groups.find(gr => gr._id === client.group);
              return g ? g.name : client.group;
            })()}
          />
          <Row label="Address" value={client.address || "—"} />
        </dl>

        {/* goals */}
        <div className="space-y-3">
          <p className="font-semibold text-gray-700">Current Goals:</p>

          <div className="bg-primary/5 rounded-xl p-4 flex flex-wrap gap-3">
            {client.goals?.length ? (
              client.goals.map(g => (
                <span
                  key={g}
                  className="px-3 py-1 bg-white text-primary rounded-full text-xs font-medium shadow-sm"
                >
                  {g}
                </span>
              ))
            ) : (
              <span className="text-xs italic text-gray-400">None yet</span>
            )}
          </div>

          <button
            onClick={onEditGoals}
            className="w-full mt-1 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90"
          >
            Edit Goals
          </button>
        </div>
      </div>
    </div>
  );
}

const Row = ({ label, value }) => (
  <div className="flex">
    <dt className="w-28 font-semibold text-gray-700">{label}:</dt>
    <dd className="text-gray-900 break-words">{value}</dd>
  </div>
);

/* ────────── Right tabbed panel ────────── */
function RightTabs({
  activeTab,
  setActiveTab,
  renderVisitRows,
  client,
  setClient,
}) {
  /* ---------- helper to group materials by visitDate (yyyy-mm-dd) ---------- */
  const groupedMaterials = (() => {
    const out = {};
    (client.materials || []).forEach((m) => {
      const key = new Date(m.visitDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      (out[key] ||= []).push(m);
    });
    return out; // { "10 Jun 2025":[…], … }
  })();

  const tabs = [
    { id: "visitHistory", label: "View Visit History", icon: CalendarDays },
    { id: "materials", label: "View Materials", icon: BookOpen },
    { id: "progress", label: "Progress Tracker", icon: BarChart3 },
  ];

  return (
    <div className="col-span-8 flex flex-col space-y-6">
      {/* tab buttons */}
      <div className="flex gap-4 bg-[#F5F4FB] rounded-2xl px-6 py-4 shadow-sm">
        {tabs.map(({ id, label, icon: Icon }) => (
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

    
    {activeTab === "visitHistory" && (
      <div className="bg-[#F5F4FB] rounded-2xl p-8 shadow-sm space-y-4">
        <h4 className="text-xl font-semibold text-gray-800">
          Visit History
        </h4>

        {client.visitHistory?.length ? (
          renderVisitRows()
        ) : (
          <p className="text-sm text-gray-500">No visit history recorded.</p>
        )}
      </div>
    )}


      {/* ------- materials ------- */}
      {activeTab === "materials" && (
        <div className="bg-[#F5F4FB] rounded-2xl p-8 shadow-sm space-y-4">
          <h4 className="text-xl font-semibold text-gray-800">
            Materials
          </h4>

          {Object.keys(groupedMaterials).length === 0 && (
            <p className="text-sm text-gray-500">No materials uploaded.</p>
          )}

          {Object.entries(groupedMaterials)
            .sort(
              (a, b) =>
                new Date(b[0]) - new Date(a[0]) // newest first
            )
            .map(([dateLabel, files]) => (
              <details
                key={dateLabel}
                className="bg-white rounded-lg shadow-sm"
              >
                <summary className="px-5 py-4 cursor-pointer font-medium text-primary list-none flex justify-between items-center">
                  <span>{dateLabel}</span>
                  <span className="text-primary">▾</span>
                </summary>

                <ul className="px-5 py-3 space-y-2 text-sm">
                  {files.map((f, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between"
                    >
                      <span className="break-all">{f.filename}</span>
                      <a
                        href={f.fileUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-primary text-white px-3 py-1 rounded-full text-xs hover:bg-primary/90"
                      >
                        Download
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
        </div>
      )}

      {/* ------- progress tracker ------- */}
      {activeTab === "progress" && (
        <ProgressTracker
          goals={client.goals}
          rows={client.goalProgress || []}
              onSave={async (updated) => {
      /* 🚩 ensure targetDate (if any) is an ISO string */
      const norm = updated.map((r) => ({
        ...r,
        targetDate: r.targetDate
          ? new Date(r.targetDate).toISOString()
          : null,
      }));

     await api.patch(
       `/clients/${client._id}/goal-progress`,
       { items: norm }
     );
      setClient((c) => ({ ...c, goalProgress: norm }));
          }}
        />
      )}
    </div>
  );
}

/* ---------- Progress-tracker (accordion style) ---------- */
function ProgressTracker({ goals = [], rows = [], onSave }) {
  /* merge stored rows with any newly-added goals */
  const makeRow = (g) => ({
    name: g,
    progress: 0,
    comment: "",
    startDate: new Date().toISOString(),
    targetDate: null,
    associated: [],
  });
  const [data, setData] = useState(
    goals.map((g) => rows.find((r) => r.name === g) || makeRow(g))
  );

  /* helpers */
  const setRow = (i, patch) =>
    setData((arr) => arr.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const addOffset = (d, m) => {
    const dt = new Date(d);
    dt.setMonth(dt.getMonth() + m);
    return dt.toISOString().slice(0, 10);
  };
  const quick = [
    { lbl: "1 mo", m: 1 },
    { lbl: "3 mo", m: 3 },
    { lbl: "6 mo", m: 6 },
    { lbl: "1 yr", m: 12 },
  ];

  return (
    <div className="bg-[#F5F4FB] rounded-2xl p-6 shadow-sm space-y-4">
      <h4 className="text-xl font-semibold text-gray-800 mb-2">
        Goal Progress
      </h4>

      {/* accordion list */}
      {data.map((row, i) => (
        <details key={row.name} className="bg-white rounded-lg shadow-sm">
          <summary className="px-5 py-3 flex justify-between items-center list-none cursor-pointer">
            <span className="font-medium text-primary">{row.name}</span>
            <span className="text-xs text-gray-600">
              {row.progress}% ▼
            </span>
          </summary>

          <div className="px-5 py-4 space-y-4 text-sm border-t">
            {/* dates */}
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="font-medium">Start:</span>{" "}
                {new Date(row.startDate).toLocaleDateString()}
              </div>

              <div className="flex items-center gap-2">
                <span className="font-medium">Target:</span>
                <input
                  type="date"
                  value={row.targetDate?.slice(0, 10) || ""}
                  onChange={(e) =>
                    setRow(i, { targetDate: e.target.value || null })
                  }
                  className="border rounded px-2 py-1"
                />
                {quick.map((q) => (
                  <button
                    key={q.lbl}
                    type="button"
                    onClick={() =>
                      setRow(i, { targetDate: addOffset(row.startDate, q.m) })
                    }
                    className="text-[10px] px-1.5 py-0.5 bg-primary/10 rounded"
                  >
                    {q.lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* progress slider */}
            <div className="flex items-center gap-3">
              <span className="font-medium">Progress:</span>
              <input
                type="range"
                min={0}
                max={100}
                value={row.progress}
                onChange={(e) =>
                  setRow(i, { progress: Number(e.target.value) })
                }
              />
              <span>{row.progress}%</span>
            </div>

            {/* comment box */}
            <div>
              <label className="font-medium">Comment:</label>
              <textarea
                className="border rounded-md w-full mt-1 px-2 py-1"
                rows={2}
                value={row.comment}
                onChange={(e) => setRow(i, { comment: e.target.value })}
              />
            </div>

            {/* associated activities */}
            <div>
              <label className="font-medium">Activities&nbsp;({row.associated.length})</label>
              {row.associated.length ? (
                <ul className="list-disc ml-5 mt-1 space-y-1 text-xs">
                  {row.associated
                    .slice()
                    .sort(
                      (a, b) => new Date(b.onDate) - new Date(a.onDate)
                    )
                    .map((a, k) => (
                      <li key={k}>
                        {new Date(a.onDate).toLocaleDateString()} –{" "}
                        {a.activityName}
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-400 mt-1">No activities yet.</p>
              )}
            </div>
          </div>
        </details>
      ))}

      <div className="text-right pt-2">
        <button
          onClick={() => onSave(data)}
          className="bg-primary text-white px-6 py-2 rounded-full"
        >
          Save Progress
        </button>
      </div>
    </div>
  );
}


