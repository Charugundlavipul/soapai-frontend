"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Video, Square } from "lucide-react";
import Navbar from "../components/Navbar";

export default function RecordSession() {
  const { id }       = useParams();            // appointment id
  const nav          = useNavigate();
  const videoRef     = useRef(null);
  const mediaRef     = useRef(null);           // MediaRecorder
  const [stream, setStream] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [recording, setRecording] = useState(false);

  /* get camera on mount */
  useEffect(() => {
    (async () => {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    })();
    return () => stream?.getTracks().forEach((t) => t.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRec = () => {
    const mr = new MediaRecorder(stream, { mimeType: "video/webm" });
    mr.ondataavailable = (e) => setChunks((c) => [...c, e.data]);
    mr.start();
    mediaRef.current = mr;
    setChunks([]);
    setRecording(true);
  };

  const stopRec = () =>
    new Promise((res) => {
      mediaRef.current.onstop = res;
      mediaRef.current.stop();
      setRecording(false);
    });

  const finish = async () => {
    await stopRec();
    const blob = new Blob(chunks, { type: "video/webm" });
    nav(`/appointments/${id}/upload`, { state: { recorded: blob } });
  };

  if (!stream)
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-gray-600">
          Initialising camera…
        </div>
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        <video ref={videoRef} autoPlay playsInline className="rounded-xl max-w-[720px] border" />

        <div className="flex gap-4">
          {!recording ? (
            <button
              onClick={startRec}
              className="bg-primary text-white px-6 py-3 rounded-xl flex items-center gap-2"
            >
              <Video className="w-5 h-5" /> Start Recording
            </button>
          ) : (
            <>
              <button
                onClick={stopRec}
                className="bg-red-600 text-white px-6 py-3 rounded-xl flex items-center gap-2"
              >
                <Square className="w-5 h-5" /> Stop
              </button>
              <button
                onClick={finish}
                className="bg-primary text-white px-6 py-3 rounded-xl flex items-center gap-2"
              >
                Use This Video
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
