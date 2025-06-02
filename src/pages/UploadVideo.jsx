"use client"

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Upload as UploadIcon,
  ArrowLeft,
  Cloud,
  X,
} from "lucide-react";

import Navbar  from "../components/Navbar";
import { getBehaviours, uploadVideo } from "../services/api";
import api from "../services/api";

const primaryBtn = "bg-primary hover:bg-primary/90 text-white";

export default function UploadVideo() {
  const { id: apptId } = useParams();      // appointment id
  const nav   = useNavigate();

  /* appointment meta */
  const [appt, setAppt] = useState(null);
  useEffect(() => {
    api.get("/appointments").then(r => {
      const a = r.data.find(x => x._id === apptId);
      if (!a) return nav("/");
      setAppt(a);
    });
  }, [apptId, nav]);

  /* form state */
  const [title,   setTitle]   = useState("");
  const [file,    setFile]    = useState(null);
  const [notes,   setNotes]   = useState("");
  const [behBank, setBehBank] = useState([]);
  const [selBeh,  setSelBeh]  = useState([]);
  const [ddOpen,  setDdOpen]  = useState(false);

  useEffect(() => {
    getBehaviours().then(r => setBehBank(r.data));
  }, []);

  const addBeh = b => {
    if (selBeh.find(x => x._id === b._id)) return;
    setSelBeh(prev => [...prev, b]);
    setDdOpen(false);
  };
  const removeBeh = id => setSelBeh(selBeh.filter(b => b._id !== id));

  /* upload handler */
  const save = async e => {
    e.preventDefault();
    if (!file) return alert("Please choose a video");

    const fd = new FormData();
    fd.append("title",  title || "Session video");
    fd.append("notes",  notes);
    selBeh.forEach(b => fd.append("behaviours", b._id));
    fd.append("video", file);

    const { data } = await uploadVideo(apptId, fd);
    nav(`/videos/${data._id}/review`);
  };

  if (!appt) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Loading appointment…
        </div>
      </div>
    );
  }

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
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8"
        >
          {/* left column */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Your title goes here"
                className="w-full px-3 py-2 border rounded-md focus:ring-primary focus:border-primary outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ROField label="Visit Type" value={appt.type} />
              <ROField
                label={appt.type === "group" ? "Group" : "Patient"}
                value={appt.type === "group" ? appt.group?.name : appt.patient?.name}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Behaviour Bank</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDdOpen(o => !o)}
                  className="w-full flex justify-between items-center px-3 py-2 border rounded-md bg-white"
                >
                  <span className="text-gray-500">+ Click to Select</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {ddOpen && (
                  <ul className="absolute z-50 bg-white border rounded-md w-full max-h-48 overflow-y-auto mt-1 shadow-lg">
                    {behBank.map(b => (
                      <li
                        key={b._id}
                        onClick={() => addBeh(b)}
                        className="px-4 py-2 hover:bg-primary/10 cursor-pointer text-sm"
                      >
                        {b.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {selBeh.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">Selected Behaviours</label>
                <div className="flex flex-wrap gap-2">
                  {selBeh.map(b => (
                    <span
                      key={b._id}
                      className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-md text-sm"
                    >
                      {b.name}
                      <X onClick={() => removeBeh(b._id)} className="w-4 h-4 cursor-pointer text-gray-500" />
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Additional Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
                placeholder="Additional Notes Goes Here"
                className="w-full px-3 py-2 border rounded-md focus:ring-primary focus:border-primary outline-none resize-none"
              />
            </div>
          </div>

          {/* right column */}
          <div className="flex flex-col">
            <label className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
              <input
                type="file"
                accept="video/*"
                hidden
                onChange={e => setFile(e.target.files[0])}
              />
              <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
                {file ? (
                  <p className="text-gray-600">{file.name}</p>
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

/* read-only field component */
const ROField = ({ label, value }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <p className="border px-3 py-2 rounded-md bg-gray-100 text-sm">{value}</p>
  </div>
);
