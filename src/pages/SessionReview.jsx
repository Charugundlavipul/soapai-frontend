// src/pages/SessionReview.jsx
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate }      from "react-router-dom";
import NewBehaviourModal               from "../modals/NewBehaviourModal";
import BehaviourPickerModal            from "../modals/BehaviourPickerModal";
import { getTranscript }               from "../services/api";
import {
  ChevronDown,
  Plus,
  Send,
  Volume2,
  RefreshCcw,
  ThumbsDown,
  Paperclip,
  Mic2,
} from "lucide-react";
import ReactPlayer   from "react-player";
import Navbar        from "../components/Navbar";
import EmojiBtn      from "../components/EmojiBtn";
import { chatLLM, getVideo, getProfile } from "../services/api";

const primaryBtn = "bg-primary hover:bg-primary/90 text-white";

export default function SessionReview() {
  /* ───── data fetch ───── */
  const { id } = useParams();       // this is the video ID
  const nav     = useNavigate();
  const [video, setVideo] = useState(null);
  const [user , setUser ]   = useState(null);
  const [showTx, setShowTx] = useState(false);
  const [showNewBeh, setShowNewBeh] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  /* 1) Fetch the video document by its ID */
  useEffect(() => {
    getVideo(id).then((r) => {
      setVideo(r.data);
    });
  }, [id]);

  /* 2) Fetch the current SLP’s profile */
  useEffect(() => {
    getProfile().then((r) => setUser(r.data));
  }, []);

  /* Whenever showTx flips to true, fetch the transcript from the back-end */
  useEffect(() => {
    if (!showTx) return;
    getTranscript(id)
      .then((r) => {
        // The API returns an array of { start, end, text }.
        setVideo((v) => ({ ...v, transcript: r.data }));
      })
      .catch(() => {
        alert("Failed to fetch transcript");
      });
  }, [showTx, id]);

  /* Poll for transcript until the back-end has written it into the Video document */
  useEffect(() => {
    if (!video) return;
    // If we already have transcript data, stop polling
    if (Array.isArray(video.transcript) && video.transcript.length > 0) return;

    const interval = setInterval(() => {
      getVideo(id).then((r) => {
        if (r.data.transcript?.length > 0) {
          setVideo(r.data);
          clearInterval(interval);
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [video, id]);

  /* Format seconds → “M:SS” */
  const fmt = (s) => {
    const m   = Math.floor(s / 60);
    const sec = `${Math.floor(s % 60)}`.padStart(2, "0");
    return `${m}:${sec}`;
  };

  /* ───── chat state ───── */
  const [msgs, setMsgs] = useState([
    { role: "assistant", content: "Hello! 👋 I'm your AI assistant…" },
  ]);
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState([]);
  const chatEndRef = useRef(null);
  const replaceVideo = (v) => setVideo(v);

  /* Auto‐scroll to bottom when new message arrives */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  /* ───── voice dictation ───── */
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const toggleMic = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Speech‐to‐text not supported.");
      return;
    }
    if (!recRef.current) {
      const R = new window.webkitSpeechRecognition();
      R.lang = "en-US";
      R.continuous = true;
      R.interimResults = false;
      R.onresult = (e) => {
        const txt = e.results[0][0].transcript;
        setDraft((d) => (d ? d + " " : "") + txt);
      };
      recRef.current = R;
    }
    if (listening) {
      recRef.current.stop();
      setListening(false);
    } else {
      recRef.current.start();
      setListening(true);
    }
  };

  /* ───── send handler ───── */
  const doSend = async (e) => {
    e?.preventDefault();
    if (!draft.trim() && !files.length) return;

    const hasFiles = files.length > 0;
    const userMsg = {
      role: "user",
      content: draft,
      time: new Date(),
      files: hasFiles ? files : [],
    };

    setMsgs((m) => [...m, userMsg]);
    setDraft("");
    setFiles([]);

    if (hasFiles) {
      const fd = new FormData();
      fd.append("messages", JSON.stringify([...msgs, userMsg]));
      files.forEach((f) => fd.append("attachment", f));
      const { data } = await chatLLM(fd);
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: data.reply, time: new Date() },
      ]);
    } else {
      const { data } = await chatLLM({ messages: [...msgs, userMsg] });
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: data.reply, time: new Date() },
      ]);
    }
  };

  /* ───── loading state ───── */
  if (!video || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Loading…
        </div>
      </div>
    );
  }

  /* ───── UI ───── */
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="p-6 max-w-[1300px] mx-auto flex gap-6">
        {/* ───── LEFT column ───── */}
        <div className="space-y-6 flex-shrink-0">
          {/* video player */}
          <div className="w-[463px] h-[261px] rounded-lg overflow-hidden">
            <ReactPlayer url={video.fileUrl} controls width="463" height="261" />
          </div>

          {/* behaviours + transcript / selector panel */}
          <div
            className="bg-[#FAF8FF] rounded-xl p-6 space-y-4 shadow overflow-hidden"
            style={{ width: 463, height: 330 }}
          >
            {showTx ? (
              // ─── Transcript‐only mode (hide everything above) ───
              <>
                <QuickRow
                  icon={ChevronDown}
                  label="Video Transcript (Hide)"
                  onClick={() => setShowTx(false)}
                />
                <div
                  className="overflow-y-auto border border-gray-200 rounded-md"
                  style={{ maxHeight: "240px" }}
                >
                  <table className="w-full text-sm text-left">
                    <thead className="bg-primary/10 text-primary">
                      <tr>
                        <th className="px-4 py-2 w-24">Time</th>
                        <th className="px-4 py-2 w-24">End</th>
                        <th className="px-4 py-2">Transcript</th>
                      </tr>
                    </thead>
                    <tbody>
                      {video.transcript?.map((u, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-4 py-2">{fmt(u.start)}</td>
                          <td className="px-4 py-2">{fmt(u.end)}</td>
                          <td className="px-4 py-2">{u.text}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              // ─── Normal “Selected Behaviours” + controls ───
              <>
                {/* “Selected Behaviours” header + Change button */}
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Selected Behaviours</h3>
                  <button
                    onClick={() => setShowPicker(true)}
                    className="px-4 py-1 rounded-full bg-primary text-white text-sm"
                  >
                    Change
                  </button>
                </div>

                {/* behaviour pills */}
                <div className="flex flex-wrap gap-2">
                  {video.behaviours.map((b) => (
                    <span
                      key={b._id}
                      className="px-3 py-1 bg-white border border-gray-200 rounded-md text-sm"
                    >
                      {b.name}
                    </span>
                  ))}
                </div>

                {/* Create New Behaviour */}
                <QuickRow
                  icon={Plus}
                  label="Create New Behaviour"
                  onClick={() => setShowNewBeh(true)}
                />

                {/* Video Transcript toggle */}
                <QuickRow
                  icon={ChevronDown}
                  label="Video Transcript (Show)"
                  onClick={() => setShowTx(true)}
                />

                {/* Visualized Progress */}
                <QuickRow
                  icon={ChevronDown}
                  label="Visualized Progress"
                  onClick={() => alert("Coming soon")}
                />

                {/* ─── “Get AI Recommendations” button ─── */}
                <button
                  className="block mx-auto w-80 py-2 rounded-md bg-primary text-white"
                  onClick={() => {
                    // Navigate to /appointments/:appointmentId/recommendations
                    // The video document has a field `appointment` which is the appointment ID.
                    const apptId = video.appointment;
                    if (apptId) {
                      nav(`/appointments/${apptId}/recommendations`);
                    } else {
                      alert("No appointment linked to this video.");
                    }
                  }}
                >
                  Get AI Recommendations
                </button>
              </>
            )}
          </div>
        </div>

        {/* ───── CHAT column ───── */}
        <div
          className="bg-[#FAF8FF] rounded-xl flex flex-col shadow-sm"
          style={{ width: 591, height: 600 }}
        >
          <h3 className="px-6 py-4 border-b text-lg font-semibold text-primary">
            Chat with SOAP
          </h3>

          {/* Messages scroll */}
          <div className="flex-1 overflow-y-auto px-6 pt-4 space-y-4">
            {msgs.map((m, i) =>
              m.role === "assistant" ? (
                <Bubble key={i} side="left" avatar="S" msg={m} />
              ) : (
                <Bubble key={i} side="right" avatar={user.avatarUrl} msg={m} />
              )
            )}
            <div ref={chatEndRef} />
            <div className="flex gap-4 text-gray-500 pt-2 pb-2">
              <Volume2 className="w-5 h-5 hover:text-primary cursor-pointer" />
              <RefreshCcw className="w-5 h-5 hover:text-primary cursor-pointer" />
              <ThumbsDown className="w-5 h-5 hover:text-primary cursor-pointer" />
            </div>
          </div>

          {/* Composer */}
          <form
            onSubmit={doSend}
            className="border-t p-4 flex items-center gap-3 bg-[#FAF8FF] relative"
          >
            <Paperclip
              className="w-5 h-5 text-gray-400 cursor-pointer"
              onClick={() => document.getElementById("fileInput").click()}
            />
            <input
              id="fileInput"
              type="file"
              multiple
              hidden
              onChange={(e) => setFiles([...files, ...Array.from(e.target.files)])}
            />

            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Message to SOAP…"
              className="flex-1 border rounded-full px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-primary"
            />

            <EmojiBtn onSelect={(e) => setDraft((d) => d + e)} />
            <Mic2
              className={`w-5 h-5 cursor-pointer ${
                listening ? "text-primary" : "text-gray-400"
              }`}
              onClick={toggleMic}
            />

            <button
              type="submit"
              className={`px-4 py-2 rounded-full flex items-center gap-1 ${primaryBtn}`}
            >
              <Send className="w-4 h-4" /> Send
            </button>
          </form>
        </div>

        {/* Modals */}
        <NewBehaviourModal
          open={showNewBeh}
          onClose={() => setShowNewBeh(false)}
          video={video}
          onSaved={(v) => setVideo(v)}
        />
        <BehaviourPickerModal
          open={showPicker}
          onClose={() => setShowPicker(false)}
          video={video}
          onSaved={replaceVideo}
        />
      </main>
    </div>
  );
}

/* ─── QuickRow Component ────────────────────────────────────── */
const QuickRow = ({ icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="bg-white w-full flex justify-between items-center px-4 py-2 text-primary font-medium rounded-md hover:bg-primary/5"
  >
    {label}
    <Icon className="w-5 h-5" />
  </button>
);

/* ─── Chat bubble ──────────────────────────────────────────── */
const Bubble = ({ side, avatar, msg }) => {
  const time = msg.time?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const left = side === "left";

  return (
    <div className={`flex gap-3 ${left ? "" : "justify-end"}`}>
      {left && <Avatar avatar={avatar} />}

      <div className="flex flex-col items-start max-w-[320px]">
        <div
          className={`${
            left ? "bg-white text-gray-800" : "bg-primary text-white"
          } border border-gray-200 rounded-xl p-3 w-fit`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        </div>
        {time && (
          <span className={`mt-1 text-xs ${left ? "text-gray-400" : "text-white/80 self-end"}`}>
            {time}
          </span>
        )}
      </div>

      {!left && <Avatar avatar={avatar} />}
    </div>
  );
};

const Avatar = ({ avatar }) =>
  avatar?.startsWith("http") ? (
    <img src={avatar} className="h-8 w-8 rounded-full object-cover" alt="pfp" />
  ) : (
    <div
      className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs"
      aria-label="avatar"
    >
      {avatar}
    </div>
  );
