// src/pages/RecordVideo.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PreviewPlayer from "../components/PreviewPlayer";
import {
  Play,
  Pause,
  Square,
  Check,
  RotateCcw,
  ArrowLeft,
  MonitorUp,
} from "lucide-react";
import Navbar from "../components/Navbar";

const primaryBtn =
  "bg-primary hover:bg-primary/90 text-white transition-all duration-200 shadow-lg hover:shadow-xl";

export default function RecordVideo() {
  const { id: apptId } = useParams();
  const nav = useNavigate();

  /* ───────── stage: ready | recording | paused | preview ───────── */
  const [stage, setStage] = useState("ready");

  /* devices */
  const [cams, setCams] = useState([]);
  const [mics, setMics] = useState([]);
  const [camId, setCamId] = useState("");
  const [micId, setMicId] = useState("");

  /* media refs */
  const streamRef   = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef   = useRef([]);
  const liveElRef   = useRef(null);
  const previewElRef = useRef(null);

  /* preview URL / filename */
  const [videoURL, setVideoURL] = useState("");
    /* ───────── recording helpers ───────── */
const chosenMime = "video/webm";   // simpler & always preview-safe
const ext = "webm";
  const [fileName, setFileName] = useState(`session-${Date.now()}.${ext}`);

  /* timer */
  const [secs, setSecs] = useState(0);
  const timerRef = useRef(null);
  const mmss = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(
      2,
      "0"
    )}`;

  const startTimer = (reset = false) => {
    clearInterval(timerRef.current);
    if (reset) setSecs(0);
    timerRef.current = setInterval(() => setSecs((s) => s + 1), 1000);
  };
  const stopTimer = () => clearInterval(timerRef.current);
  useEffect(() => () => stopTimer(), []);

  /* ───────── enumerate devices once ───────── */
  useEffect(() => {
  getDevices().then(({ cams, mics, camId, micId }) => {
    setCams(cams);
    setMics(mics);
    setCamId(camId);
    setMicId(micId);
  });
}, []); 

  /* ───────── build / refresh stream ───────── */
  const buildStream = useCallback(async () => {
    if (!camId || !micId) return;
    if (streamRef.current)
      streamRef.current.getTracks().forEach((t) => t.stop());

    const s = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: camId } },
      audio: { deviceId: { exact: micId } },
    });
    streamRef.current = s;
    if (liveElRef.current) liveElRef.current.srcObject = s;
  }, [camId, micId]);

  /* ask once for permission, then enumerate -– returns cams, mics, defaults */
async function getDevices() {
  try {
    /* 1. poke the permission prompt */
    const tmp = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    tmp.getTracks().forEach(t => t.stop());            // we only wanted permission

    /* 2. now the labels & ids are populated */
    const devs = await navigator.mediaDevices.enumerateDevices();
    const vcams = devs.filter(d => d.kind === "videoinput");
    const amics = devs.filter(d => d.kind === "audioinput");

    return {
      cams:  vcams,
      mics:  amics,
      camId: vcams[0]?.deviceId || "",
      micId: amics[0]?.deviceId || "",
    };
  } catch (err) {
    console.error("Media permission denied:", err);
    return { cams: [], mics: [], camId: "", micId: "" };
  }
}


  useEffect(() => {
    buildStream();
    return () => {
      if (streamRef.current)
        streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [buildStream]);



  const startRec = () => {
    chunksRef.current = [];
    const rec = new MediaRecorder(streamRef.current, { mimeType: chosenMime });
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: chosenMime });
      setVideoURL(URL.createObjectURL(blob));

      /* stop camera so it doesn't flicker in preview */
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      setStage("preview");
      stopTimer();
    };
    rec.start();
    recorderRef.current = rec;
    setStage("recording");
    startTimer(true);
  };

  const pauseRec  = () => { recorderRef.current.pause(); setStage("paused"); stopTimer(); };
  const resumeRec = () => { recorderRef.current.resume(); setStage("recording"); startTimer(false); };
  const stopRec   = () => recorderRef.current.stop();

  /* ───────── confirm: download + return ───────── */
  const confirm = async () => {
    const blob = await fetch(videoURL).then((r) => r.blob());
    const safe = (fileName || `session.${ext}`).replace(/\s/g, "-");
    const name = safe.toLowerCase().endsWith(`.${ext}`) ? safe : `${safe}.${ext}`;
    const file = new File([blob], name, { type: blob.type });

    const a = document.createElement("a");
    a.href = videoURL;
    a.download = file.name;
    a.click();

    nav(`/appointments/${apptId}/upload`, { state: { recordedFile: file } });
  };

  /* ───────── live preview element keeps its srcObject ───────── */
 useEffect(() => {
   if (stage !== "preview" && liveElRef.current) {
     liveElRef.current.srcObject = streamRef.current;
   }
 }, [stage]);

useEffect(() => {
  if (stage !== "preview" && videoURL) URL.revokeObjectURL(videoURL);
}, [stage, videoURL]);

  /* ───────── components ───────── */
  const liveVideo = (
    <video
      ref={liveElRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-cover"
    />
  );

const previewVideo = (
  <PreviewPlayer url={videoURL} mime={chosenMime} />
);

  /* ─────────── UI ─────────── */
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => nav(-1)}
            className="flex items-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 mr-2" /> Back
          </button>
          <h1 className="text-xl font-bold text-gray-900">Record Session Video</h1>
          <div className="w-24" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid lg:grid-cols-12 gap-8 px-8 py-8">
        {/* video pane */}
        <div className="lg:col-span-8">
          <div className="bg-black rounded-xl border border-gray-200 overflow-hidden aspect-video flex items-center justify-center">
            {stage === "preview" ? previewVideo : liveVideo}
          </div>
          {(stage === "recording" || stage === "paused") && (
            <p className="mt-2 text-center text-gray-700 font-medium tracking-widest">
              {mmss(secs)}
            </p>
          )}
        </div>

        {/* right column */}
        <div className="lg:col-span-4 space-y-6">
          <DeviceCard
            cams={cams}
            mics={mics}
            camId={camId}
            micId={micId}
            setCamId={setCamId}
            setMicId={setMicId}
          />

          <ControlCard
            stage={stage}
            startRec={startRec}
            pauseRec={pauseRec}
            resumeRec={resumeRec}
            stopRec={stopRec}
            confirm={confirm}
            fileName={fileName}
            setFileName={setFileName}
            ext={ext}
            setStage={setStage}
            setVideoURL={setVideoURL}
            buildStream={buildStream}
          />
        </div>
      </div>
    </div>
  );
}

/* ───────── sub-components ───────── */

function DeviceCard({ cams, mics, camId, micId, setCamId, setMicId }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <MonitorUp className="w-5 h-5 text-primary" /> Devices
      </h2>

      <div>
        <label className="block text-sm font-medium mb-1">Camera</label>
        {cams.length ? (
          <select
            value={camId}
            onChange={(e) => setCamId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            {cams.map((d) => (
       <option key={d.deviceId} value={d.deviceId}>
         {d.label || "Camera"}
       </option>
            ))}
        </select>
        ) : (
        <div className="text-sm text-gray-500">
            No camera detected (or permission denied)
        </div>
        )}
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium mb-1">Microphone</label>
        {mics.length ? (
          <select
            value={micId}
            onChange={(e) => setMicId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
           >
        {mics.map((d) => (
        <option key={d.deviceId} value={d.deviceId}>
            {d.label || "Microphone"}
        </option>
        ))}
        </select>
        ) : (
        <div className="text-sm text-gray-500">
            No microphone detected (or permission denied)
        </div>
        )}
      </div>
    </div>
  );
}

function ControlCard({
  stage,
  startRec,
  pauseRec,
  resumeRec,
  stopRec,
  confirm,
  fileName,
  setFileName,
  ext,
  setStage,
  setVideoURL,
  buildStream,
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center gap-4">
      {stage === "ready" && (
        <button
          onClick={startRec}
          className={`${primaryBtn} flex items-center gap-2 px-6 py-3 rounded-full`}
        >
          <Play className="w-5 h-5" /> Start Recording
        </button>
      )}

      {stage === "recording" && (
        <>
          <button
            onClick={pauseRec}
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-5 py-2 rounded-full"
          >
            <Pause className="w-5 h-5" /> Pause
          </button>
          <button
            onClick={stopRec}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-full"
          >
            <Square className="w-5 h-5" /> Stop
          </button>
        </>
      )}

      {stage === "paused" && (
        <>
          <button
            onClick={resumeRec}
            className={`${primaryBtn} flex items-center gap-2 px-5 py-2 rounded-full`}
          >
            <Play className="w-5 h-5" /> Resume
          </button>
          <button
            onClick={stopRec}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-full"
          >
            <Square className="w-5 h-5" /> Stop
          </button>
        </>
      )}

      {stage === "preview" && (
        <>
          <input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="File name…"
          />
          <button
            onClick={confirm}
            className={`${primaryBtn} w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full`}
          >
            <Check className="w-5 h-5" /> Confirm &amp; Download
          </button>
          <button
            onClick={() => {
              setStage("ready");
              setVideoURL("");
              setFileName(`session-${Date.now()}.${ext}`);
              buildStream(); // re-open camera
            }}
            className="flex items-center gap-1 text-gray-600 hover:underline mt-2"
          >
            <RotateCcw className="w-4 h-4" /> Record again
          </button>
        </>
      )}
    </div>
  );
}
