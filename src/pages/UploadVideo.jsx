"use client";
import { format } from "date-fns";
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Upload as UploadIcon,
  ArrowLeft,
  Cloud,
  X,
} from "lucide-react";

import Navbar from "../components/Navbar";
import { uploadVideo, getCategories } from "../services/api";
import api from "../services/api";

const primaryBtn =
  "bg-primary hover:bg-primary/90 text-white transition-colors";

export default function UploadVideo() {
  const { id: apptId } = useParams();       // appointment id
  const nav            = useNavigate();

  /* ───────── appointment meta ───────── */
  const [appt, setAppt] = useState(null);
  useEffect(() => {
    api.get("/appointments").then(r => {
      const a = r.data.find(x => x._id === apptId);
      if (!a) return nav("/");
      setAppt(a);

      // ───── auto-populate title ─────
      const dt = new Date(a.dateTimeStart);
      const dateStr = format(dt, "MMM d, yyyy h:mm aa");
      // pick name based on type; group and patient are populated objects
      const who =
        a.type === "group"
          ? a.group?.name || ""
          : a.patient?.name || "";
      setTitle(`${who} - ${dateStr}`);
    });
  }, [apptId, nav]);

  /* ───────── form state ───────── */
  const [title, setTitle] = useState("");
  const [file , setFile ] = useState(null);
  const [notes, setNotes] = useState("");

  /* ───────── goal selector ───────── */
  const [goalBank, setGoalBank] = useState([]);    // [{ name, category }]
  const [selGoals, setSelGoals] = useState([]);    // [ "goal-name", … ]
  const [ddOpen  , setDdOpen  ] = useState(false);
  const ddRef = useRef(null);

  /* click-outside → close dropdown */
  useEffect(() => {
    const h = e => ddRef.current && !ddRef.current.contains(e.target) && setDdOpen(false);
    if (ddOpen) document.addEventListener("mousedown", h);
    return ()   => document.removeEventListener("mousedown", h);
  }, [ddOpen]);

  /* pull every goal belonging to every participant */
  useEffect(() => {
    if (!appt) return;

    const fetchGoals = async () => {
      /* load all categories once, flatten to unique names */
      const { data: cats } = await getCategories();
      const allGoals = cats.flatMap(c => c.goals.map(g => ({ ...g, category: c.name })));

      /* helper → returns Set of goal names for a patient */
      const patientGoals = async pid => {
        const { data } = await api.get(`/clients/${pid}`);
        return new Set(data.goals ?? []);
      };

      let allowed = new Set();

      if (appt.type === "individual") {
        const pid =
          typeof appt.patient === "string" ? appt.patient : appt.patient?._id;
        allowed = await patientGoals(pid);
      } else {
        // group: OR-union of every member’s goals
        const gid =
          typeof appt.group === "string" ? appt.group : appt.group?._id;
        const { data: grp } = await api.get(`/groups/${gid}`);
        for (const p of grp.patients) {
          const gs = await patientGoals(p._id);
          gs.forEach(g => allowed.add(g));
        }
      }

      setGoalBank(allGoals.filter(g => allowed.has(g.name)));
    };
    fetchGoals();
  }, [appt]);

  /* add / remove chip */
  const addGoal    = g  => { if (!selGoals.includes(g.name)) setSelGoals(p => [...p, g.name]); setDdOpen(false); };
  const removeGoal = gN => setSelGoals(p => p.filter(x => x !== gN));

  /* ───────── submit ───────── */
  const save = async e => {
    e.preventDefault();
    if (!file) return alert("Please choose a video first");

    const fd = new FormData();
    fd.append("title",  title || "Session video");
    fd.append("notes",  notes);
    selGoals.forEach(g => fd.append("goals", g));
    fd.append("video",  file);

    const { data } = await uploadVideo(apptId, fd);
    nav(`/videos/${data._id}/review`);
  };

  /* loading guard */
  if (!appt)
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Loading appointment…
        </div>
      </div>
    );

  /* ───────── UI ───────── */
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <button
          onClick={() => nav(-1)}
          className="flex items-center text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </button>

        <h1 className="text-2xl font-semibold text-gray-900 text-center">
          Upload Your Video
        </h1>

        <form
          onSubmit={save}
          className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8"
        >
          {/* ─── left column ─── */}
          <div className="space-y-6 min-w-0">
            {/* title */}
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Your title goes here"
                className="w-full px-3 py-2 border rounded-md focus:ring-primary focus:border-primary outline-none"
              />
            </div>

            {/* static info */}
            <div className="grid grid-cols-2 gap-3">
              <ROField label="Visit Type" value={appt.type} />
              <ROField
                label={appt.type === "group" ? "Group" : "Patient"}
                value={
                  appt.type === "group" ? appt.group?.name : appt.patient?.name
                }
              />
            </div>

            {/* goal selector */}
            <div ref={ddRef} className="relative max-w-xs">
              <label className="block text-sm font-medium mb-2">Goals</label>
              <button
                type="button"
                onClick={() => setDdOpen(o => !o)}
                className="w-full flex justify-between items-center px-3 py-2 border rounded-md bg-white"
              >
                <span className="text-gray-500">
                  + Click to Select Goal ({goalBank.length})
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {ddOpen && (
                <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-white border rounded-md shadow-lg text-sm">
                  {goalBank.map(g => (
                    <li
                      key={g.name}
                      onClick={() => addGoal(g)}
                      className="px-4 py-2 hover:bg-primary/10 cursor-pointer flex justify-between"
                    >
                      {g.name}
                      <span className="text-gray-400 ml-2">({g.category})</span>
                    </li>
                  ))}
                </ul>
              )}

              {selGoals.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selGoals.map(g => (
                    <span
                      key={g}
                      className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-md text-sm"
                    >
                      {g}
                      <X
                        onClick={() => removeGoal(g)}
                        className="w-4 h-4 cursor-pointer text-gray-500"
                      />
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* notes */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Additional Notes
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
                placeholder="Additional Notes Goes Here"
                className="w-full px-3 py-2 border rounded-md focus:ring-primary focus:border-primary outline-none resize-none"
              />
            </div>
          </div>

          {/* ─── right column ─── */}
          <div className="flex flex-col w-full lg:w-[380px] flex-none">
            <label className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
              <input
                type="file"
                accept="video/*"
                hidden
                onChange={e => setFile(e.target.files[0])}
              />

              <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
                {file ? (
                  <p className="text-gray-600 break-all">{file.name}</p>
                ) : (
                  <>
                    <Cloud className="w-16 h-16 text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-2">
                      <span className="font-medium">Drag & drop files</span> or{" "}
                      <span className="text-primary font-medium">Browse</span>
                    </p>
                    <p className="text-sm text-gray-500">
                      Supported formats: MP4, MOV, AVI, WMV, MKV, WebM, FLV
                    </p>
                  </>
                )}
              </div>
            </label>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                className={`${primaryBtn} px-8 py-3 rounded-full flex items-center gap-2`}
              >
                <UploadIcon className="w-4 h-4" />
                Upload
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* read-only label/value */
const ROField = ({ label, value }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <p className="border px-3 py-2 rounded-md bg-gray-100 text-sm break-words">
      {value}
    </p>
  </div>
);
