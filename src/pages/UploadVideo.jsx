"use client";
import { format } from "date-fns";
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate,useLocation  } from "react-router-dom";
import {
  ChevronDown,
  UploadIcon,
  ArrowLeft,
  Cloud,
  X,
  FileVideo,
  Calendar,
  Users,
  FileText,
  Video
} from "lucide-react";

import Navbar from "../components/Navbar";
import { uploadVideo, getCategories } from "../services/api";
import api from "../services/api";

const primaryBtn =
  "bg-primary hover:bg-primary/90 text-white transition-all duration-200 shadow-lg hover:shadow-xl";

export default function UploadVideo() {
  const { id: apptId } = useParams();
  const nav = useNavigate();
  const { state } = useLocation();

  /* ───────────────── appointment meta ───────────────── */
  const [appt, setAppt] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: all } = await api.get("/appointments");
      let a = all.find((x) => x._id === apptId);
      if (!a) return nav("/");

      /* if group.patients wasn’t populated, fetch the full group */
      if (a.type === "group" && !a.group?.patients) {
        const gid = typeof a.group === "string" ? a.group : a.group._id;
        const { data: gFull } = await api.get(`/groups/${gid}`);
        a = { ...a, group: gFull };
      }
      setAppt(a);

      /* default title */
      const ds = format(new Date(a.dateTimeStart), "MMM d, yyyy h:mm aa");
      const who = a.type === "group" ? a.group?.name || "" : a.patient?.name || "";
      setTitle(`${who} - ${ds}`);
    })();
  }, [apptId, nav]);

  /* ───────────────── form state ───────────────── */
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (state?.recordedFile) setFile(state.recordedFile);
  }, [state]);

  /* ───────────────── attendance ───────────────── */
  const [attendance, setAttendance] = useState({}); // { pid:"present"|"absent"|"" }
  const participants =
    appt
      ? appt.type === "group"
        ? (appt.group?.patients || []).filter(Boolean)
        : [appt.patient].filter(Boolean)
      : [];

  useEffect(() => {
    if (!participants.length) return;
    const init = {};
    participants.forEach((p) => (init[p._id || p] = ""));
    setAttendance(init);
  }, [participants.length]); // run once when list ready

  const mark = (pid, status) =>
    setAttendance((prev) => ({ ...prev, [pid]: status }));

  const allMarked = Object.values(attendance).every(
    (s) => s === "present" || s === "absent"
  );

  /* ───────────────── goals selector ───────────────── */
  const [goalBank, setGoalBank] = useState([]);
  const [selGoals, setSelGoals] = useState([]);
  const [ddOpen, setDdOpen] = useState(false);
  const ddRef = useRef(null);

  /* close dropdown on outside click */
  useEffect(() => {
    const h = (e) =>
      ddRef.current && !ddRef.current.contains(e.target) && setDdOpen(false);
    if (ddOpen) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ddOpen]);

  useEffect(() => {
    if (!appt) return;
    (async () => {
      const { data: cats } = await getCategories();
      const flat = cats.flatMap((c) =>
        c.goals.map((g) => ({ ...g, category: c.name }))
      );

      const goalsOf = async (pid) => {
        const { data } = await api.get(`/clients/${pid}`);
        return new Set(data.goals ?? []);
      };

      let allowed = new Set();
      if (appt.type === "individual") {
        allowed = await goalsOf(appt.patient._id || appt.patient);
      } else {
        for (const p of appt.group.patients) {
          (await goalsOf(p._id)).forEach((g) => allowed.add(g));
        }
      }
      setGoalBank(flat.filter((g) => allowed.has(g.name)));
    })();
  }, [appt]);

  const addGoal = (g) => !selGoals.includes(g.name) && setSelGoals((x) => [...x, g.name]);
  const removeGoal = (n) => setSelGoals((x) => x.filter((t) => t !== n));

  /* ───────────────── submit ───────────────── */
  const save = async (e) => {
    e.preventDefault();

    const ids = participants.map((p) => p._id || p);

    if (!allMarked) return alert("Please mark attendance for everyone first.");

    /* individual & absent → just mark & exit */
    if (appt.type === "individual" && attendance[ids[0]] === "absent") {
      await api.patch(`/clients/${ids[0]}/attendance/${apptId}`, {
        status: "absent",
      });
      return nav("/");
    }

    if (!file) return alert("Please choose a video before uploading.");

    /* upload video */
    const fd = new FormData();
    fd.append("title", title || "Session video");
    fd.append("notes", notes);
    selGoals.forEach((g) => fd.append("goals", g));
    fd.append("video", file);
    const { data } = await uploadVideo(apptId, fd);

    /* save attendance statuses */
    await Promise.all(
      ids.map((pid) =>
        api.patch(`/clients/${pid}/attendance/${apptId}`, {
          status: attendance[pid],
        })
      )
    );

    nav(`/videos/${data._id}/review`);
  };

  /* ───────────────── render ───────────────── */
  if (!appt)
    return (
      <LoadingShell />
    );

  const singlePid = participants[0]._id || participants[0];
  const singleAbs = appt.type === "individual" && attendance[singlePid] === "absent";
  const btnLabel = singleAbs ? "Close Session" : "Upload Session Video";

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* header – unchanged */}
      <Header nav={nav} singleAbs={singleAbs} />

      <div className="max-w-7xl mx-auto px-8 py-8">
        <form onSubmit={save} className="grid grid-cols-12 gap-8">
          {/* LEFT column ***************************************************/}
          <div className="col-span-7 space-y-8">
            {/* Session Information card */}
            <SessionInfoCard
              appt={appt}
              title={title}
              setTitle={setTitle}
              goalBank={goalBank}
              selGoals={selGoals}
              addGoal={addGoal}
              removeGoal={removeGoal}
              ddOpen={ddOpen}
              setDdOpen={setDdOpen}
              ddRef={ddRef}
            />

            {/* Attendance card */}
            <AttendanceCard
              participants={participants}
              attendance={attendance}
              mark={mark}
            />

            {/* Notes card */}
            {/* <NotesCard notes={notes} setNotes={setNotes} /> */}
          </div>

          {/* RIGHT column ***************************************************/}
          <div className="col-span-5 sticky top-8">

            {!singleAbs && <UploadPane file={file} setFile={setFile} />}

            {/* Main action button */}
            <div className="mt-8 flex flex-col justify-center items-center space-y-4 align-center">
              {!singleAbs && (
                    <button
                      type="button"
                      onClick={() => nav(`/appointments/${apptId}/record`)}
                      className={`${primaryBtn} px-8 py-4 rounded-xl flex items-center gap-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed min-w-[400px] justify-center`}
                    >
                      <Video className="w-5 h-5" />
                      Record Video
                    </button>
                  )}
              <button
                type="submit"
                disabled={
                  !allMarked ||
                  (singleAbs
                    ? false
                    : !file ||
                      (appt.type === "group" &&
                        !participants.some((p) => attendance[p._id || p] === "present")))
                }
                className={`${primaryBtn} px-8 py-4 rounded-xl flex items-center gap-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed min-w-[400px] justify-center`}
              >
                <UploadIcon className="w-5 h-5" />
                {btnLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ───────── small pieces kept outside for clarity ───────── */
const Header = ({ nav, singleAbs }) => (
  <div className="bg-white border-b border-gray-200 shadow-sm">
    <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
      <button
        onClick={() => nav(-1)}
        className="flex items-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-lg"
      >
        <ArrowLeft className="w-5 h-5 mr-2" /> Back to Dashboard
      </button>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {singleAbs ? "Mark Attendance" : "Upload Session Video"}
        </h1>
        <p className="text-gray-600">
          {singleAbs
            ? "Session cancelled – mark patient absent"
            : "Upload and organise your therapy session recordings"}
        </p>
      </div>
      <div className="w-32" />
    </div>
  </div>
);

const LoadingShell = () => (
  <div className="min-h-screen flex flex-col bg-gray-50">
    <Navbar />
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-gray-600 text-lg">Loading appointment…</p>
      </div>
    </div>
  </div>
);

const InfoCard = ({ icon, label, value }) => (
  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
    <div className="flex items-center mb-2">
      {icon}
      <label className="text-sm font-semibold text-gray-700 ml-2">{label}</label>
    </div>
    <p className="text-gray-900 font-medium text-lg capitalize">{value}</p>
  </div>
);

/* ─── cards ─────────────────────────────────────────────── */
const SessionInfoCard = ({
  appt,
  title,
  setTitle,
  goalBank,
  selGoals,
  addGoal,
  removeGoal,
  ddOpen,
  setDdOpen,
  ddRef,
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
    <div className="flex items-center mb-6">
      <FileVideo className="w-6 h-6 text-primary mr-3" />
      <h2 className="text-xl font-semibold text-gray-900">Session Information</h2>
    </div>

    <div className="space-y-6">
      {/* title */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Session Title
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-lg"
        />
      </div>

      {/* small detail cards */}
      <div className="grid grid-cols-2 gap-6">
        <InfoCard
          icon={<Calendar className="w-5 h-5 text-primary" />}
          label="Visit Type"
          value={appt.type}
        />
        <InfoCard
          icon={<Users className="w-5 h-5 text-primary" />}
          label={appt.type === "group" ? "Group" : "Patient"}
          value={appt.type === "group" ? appt.group?.name : appt.patient?.name}
        />
      </div>
    </div>

    {/* Goals dropdown */}
    <div ref={ddRef} className="relative mt-6">
      <label className="block text-sm font-semibold text-gray-700 mb-3">
        Session Goals ({goalBank.length} available)
      </label>
      <button
        type="button"
        onClick={() => setDdOpen((o) => !o)}
        className="w-full flex justify-between items-center px-4 py-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
      >
        <span className="text-gray-600">Click to select long-term goals…</span>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform ${ddOpen ? "rotate-180" : ""}`}
        />
      </button>

      {ddOpen && (
        <div className="absolute z-50 mt-2 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {goalBank.map((g) => {
            const selected = selGoals.includes(g.name);
            return (
              <div
                key={g.name}
                onClick={() => addGoal(g)}
                className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 flex justify-between ${
                  selected ? "bg-primary/10" : "hover:bg-primary/10"
                }`}
              >
                <span className={`font-medium ${selected ? "text-primary" : "text-gray-900"}`}>{g.name}</span>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {g.category}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {selGoals.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Selected Goals:</p>
          <div className="flex flex-wrap gap-2">
            {selGoals.map((g) => (
              <span
                key={g}
                className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm"
              >
                {g}
                <X
                  onClick={() => removeGoal(g)}
                  className="w-4 h-4 cursor-pointer hover:text-blue-600"
                />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
);

const AttendanceCard = ({ participants, attendance, mark }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
    <div className="flex items-center mb-6">
      <Users className="w-6 h-6 text-primary mr-3" />
      <h2 className="text-xl font-semibold text-gray-900">Attendance</h2>
    </div>

    {participants.map((p) => {
      const pid = p._id || p;
      const status = attendance[pid];

      return (
        <div
          key={pid}
          className="flex items-center justify-between py-3 border-b last:border-b-0"
        >
          <span className="font-medium text-gray-900">{p.name || "Patient"}</span>
          <div className="space-x-2">
            {["present", "absent"].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => mark(pid, val)}
                className={`px-4 py-2 rounded-lg border ${
  status === val
    ? "bg-primary text-white border-primary"
    : "bg-white text-gray-700 hover:bg-gray-50"
}`}
              >
                {val.charAt(0).toUpperCase() + val.slice(1)}
              </button>
            ))}
          </div>
        </div>
      );
    })}
  </div>
);

const NotesCard = ({ notes, setNotes }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
    <div className="flex items-center mb-6">
      <FileText className="w-6 h-6 text-primary mr-3" />
      <h2 className="text-xl font-semibold text-gray-900">Additional Notes</h2>
    </div>
    <label className="block text-sm font-semibold text-gray-700 mb-3">Optional notes</label>
    <textarea
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      rows={6}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
    />
  </div>
);

const UploadPane = ({ file, setFile }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
    <div className="flex items-center mb-6">
      <Cloud className="w-6 h-6 text-primary mr-3" />
      <h2 className="text-xl font-semibold text-gray-900">Video Upload</h2>
    </div>

    <label className="block border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50 hover:bg-gray-100 cursor-pointer min-h-[300px] flex flex-col justify-center">
      <input type="file" accept="video/*" hidden onChange={(e) => setFile(e.target.files[0])} />
      <div className="flex flex-col items-center justify-center">
        {file ? (
          <>
            <FileVideo className="w-16 h-16 text-green-600 mb-4" />
            <p className="font-semibold text-gray-900 mb-1">{file.name}</p>
            <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </>
        ) : (
          <>
            <Cloud className="w-20 h-20 text-gray-400 mb-3" />
            <p className="text-xl font-semibold text-gray-700 mb-2">Drop your video here</p>
            <p className="text-gray-600">
              or <span className="text-primary font-semibold">browse files</span>
            </p>
          </>
        )}
      </div>
    </label>
  </div>
);
