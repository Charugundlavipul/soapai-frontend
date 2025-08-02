// src/pages/SessionReview.jsx
import { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import NewGoalModal from "../modals/NewGoalModal";
import GoalPickerModal from "../modals/GoalPickerModal";
import { getVideo, getProfile, chatLLM } from "../services/api";
import VideoPlayer from "../components/VideoPlayer";

import axios from "axios";
import {
  ChevronDown,
  Bot,
  User,
  CheckCircle2,
  FileText,
  Send,
  Volume2,
  RefreshCcw,
  Paperclip,
  Mic2,
  X as XIcon,
} from "lucide-react";

import Navbar from "../components/Navbar";
import EmojiBtn from "../components/EmojiBtn";

const api = axios.create({
  baseURL: "http://localhost:4000/api",
  headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` },
});

export default function SessionReview() {
  const fileInputRef = useRef(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [user, setUser] = useState(null);

  // left-column tabs
  const [activeTab, setActiveTab] = useState("goals"); // 'goals' | 'transcript'
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // chat state
  const [msgs, setMsgs] = useState([{ role: "assistant", content: "Hello! 👋 I'm your AI assistant, SOAP. How can I help you analyze this session?" }]);
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  // fetch video + profile
  useEffect(() => { getVideo(id).then(r => setVideo(r.data)); }, [id]);
  useEffect(() => { getProfile().then(r => setUser(r.data)); }, []);

  // speech-to-text setup
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const toggleMic = () => {
    if (!("webkitSpeechRecognition" in window)) return alert("Speech-to-text not supported.");
    if (!recRef.current) {
      const R = new window.webkitSpeechRecognition();
      R.lang = "en-US"; R.continuous = true; R.interimResults = false;
      R.onresult = e => {
        let t = "";
        for (let i = e.resultIndex; i < e.results.length; ++i)
          if (e.results[i].isFinal) t += e.results[i][0].transcript;
        setDraft(d => `${d}${d ? " " : ""}${t.trim()}`);
      };
      recRef.current = R;
    }
    listening ? recRef.current.stop() : recRef.current.start();
    setListening(!listening);
  };

  // chat helpers
  const speakLastAssistant = () => {
    const last = [...msgs].reverse().find(m => m.role === "assistant");
    if (!last) return;
    const u = new SpeechSynthesisUtterance(last.content);
    u.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };
  const regenerateLastAnswer = async () => {
    const lastUserIdx = msgs.map(m => m.role).lastIndexOf("user");
    if (lastUserIdx === -1) return;
    const history = msgs.slice(0, lastUserIdx + 1);
    setMsgs(history);
    try {
      const { data } = await chatLLM({ messages: history });
      setMsgs(m => [...m, { role: "assistant", content: data.reply, time: new Date() }]);
    } catch {
      alert("Failed to regenerate response");
    }
  };

  // attachments
  const handleFiles = e => {
    const picked = Array.from(e.target.files);
    setFiles(p => [...p, ...picked]);
    e.target.value = "";
  };
  const removeFile = i => setFiles(p => p.filter((_, idx) => idx !== i));

  // send chat
  const doSend = async e => {
    e?.preventDefault();
    if (!draft.trim() && !files.length) return;
    const meta = files.map(f => ({ name: f.name, type: f.type, size: f.size }));
    const userMsg = { role: "user", content: draft, time: new Date(), files: meta };
    setMsgs(m => [...m, userMsg]);
    setDraft(""); setFiles([]);
    const body = files.length
      ? (() => { const fd = new FormData(); fd.append("messages", JSON.stringify([...msgs, userMsg])); files.forEach(f => fd.append("attachment", f)); return fd; })()
      : { messages: [...msgs, userMsg] };
    const { data } = await chatLLM(body);
    setMsgs(m => [...m, { role: "assistant", content: data.reply, time: new Date() }]);
  };

  // guard
  if (!video || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-gray-500">Loading Session…</div>
      </div>
    );
  }

  // render
  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <Navbar />

      <main className="px-6 max-w-[1400px] w-full mx-auto flex-1 min-h-0 flex gap-6 overflow-hidden">
        {/* ─── LEFT ─── */}
        <div className="flex flex-col gap-6 w-[520px] shrink-0">
          <div className="w-full aspect-video rounded-lg overflow-hidden bg-black shadow-md">
            <VideoPlayer src={video.fileUrl} />
          </div>

          <div className="bg-white rounded-xl shadow-md flex-1 flex flex-col">
            <div className="flex border-b border-gray-200">
              <TabButton icon={CheckCircle2} label="Goals" isActive={activeTab === 'goals'} onClick={() => setActiveTab('goals')} />
              <TabButton icon={FileText} label="Transcript" isActive={activeTab === 'transcript'} onClick={() => setActiveTab('transcript')} />
            </div>

            <div className="p-6 flex-1 flex flex-col">
              {activeTab === 'goals' ? (
                <GoalsTab video={video} setVideo={setVideo} openPicker={() => setShowPicker(true)} />
              ) : (
                <TranscriptTab videoId={id} transcript={video.transcript} />
              )}
            </div>
          </div>
        </div>

        {/* ─── RIGHT CHAT ─── */}
        <div className="bg-white rounded-xl shadow-md flex flex-col flex-1 overflow-hidden">
          <h3 className="px-6 py-4 border-b border-gray-200 text-lg font-semibold text-primary flex items-center gap-2 shrink-0">
            <Bot size={20} /> Chat with SOAP
          </h3>
          
          {/* This is the scrollable message container. `min-h-0` is key for flexbox to allow it to scroll. */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-6 space-y-6">
            {msgs.map((m, i) => (
              <Bubble
                key={i}
                msg={m}
                avatar={m.role === 'assistant' ? Bot : (user.avatarUrl || User)}
                isLastAssistant={m.role === 'assistant' && i === msgs.length - 1}
                onSpeak={speakLastAssistant}
                onRegenerate={regenerateLastAnswer}
              />
            ))}
            <div ref={chatEndRef} />
          </div>

          {files.length > 0 && (
            <div className="px-6 pb-2 border-t border-gray-200 pt-3 shrink-0">
              <p className="text-xs text-gray-500 mb-2 font-medium">Attachments:</p>
              <ul className="flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center gap-1.5 bg-gray-100 border rounded-md px-2 py-1 text-xs max-w-[150px]">
                    <Paperclip className="w-3 h-3 text-gray-500" />
                    <span className="truncate text-gray-700">{f.name}</span>
                    <XIcon className="w-3.5 h-3.5 cursor-pointer text-gray-400 hover:text-gray-700" onClick={() => removeFile(i)} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={doSend} className="border-t border-gray-200 p-4 flex items-center gap-3 shrink-0">
            <div className="relative flex-1">
              <Paperclip
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 cursor-pointer hover:text-primary"
                onClick={() => fileInputRef.current?.click()}
                title="Attach files"
              />
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Message SOAP…"
                className="w-full border border-gray-300 rounded-full pl-10 pr-20 py-2.5 bg-white outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <EmojiBtn onSelect={e => setDraft(d => d + e)} />
                <Mic2
                  className={`w-5 h-5 cursor-pointer ${listening ? "text-primary" : "text-gray-400 hover:text-primary"}`}
                  onClick={toggleMic}
                />
              </div>
            </div>
            <input type="file" multiple hidden ref={fileInputRef} onChange={handleFiles} />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-full flex items-center gap-2 bg-primary text-white font-semibold hover:bg-primary/90 disabled:bg-primary/50"
              disabled={!draft.trim() && files.length === 0}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* ─── MODALS ─── */}
        <NewGoalModal
          open={showNewGoal}
          onClose={() => setShowNewGoal(false)}
          onSaved={g => setVideo(v => ({ ...v, goals: [...(v.goals || []), g] }))}
        />
        <GoalPickerModal
          open={showPicker}
          onClose={() => setShowPicker(false)}
          video={video}
          onSaved={setVideo}
        />
      </main>
    </div>
  );
}

// ─── Goals Tab ───
function GoalsTab({ video, setVideo, openPicker }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Selected Goals</h3>
        <button
          onClick={openPicker}
          className="px-4 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 text-sm font-medium"
        >
          Change
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {video.goals?.length > 0 ? video.goals.map((g, i) => {
          const label = typeof g === "string"
            ? g
            : g.category ? `${g.category}: ${g.name}` : g.name;
          return (
            <span key={i} className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-md text-sm text-gray-700">
              {label}
            </span>
          );
        }) : (
          <p className="text-sm text-gray-500">No goals selected for this session.</p>
        )}
      </div>
      <div className="mt-auto pt-4">
        <button
          className="w-full py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
          onClick={async () => {
            const apptId = video.appointment;
            if (!apptId) return alert("No appointment linked to this video.");
            try { await api.post(`/appointments/${apptId}/recommendations`); } catch { }
            navigate(`/appointments/${apptId}/recommendations`, {
              state: {
                video,
                selectedGoals: video.goals.map(g => typeof g === "string" ? g : g.name),
              },
            });
          }}
        >
          Get AI Recommendations
        </button>
      </div>
    </div>
  );
}

// ─── Transcript Tab ───
function TranscriptTab({ videoId, transcript }) {
  const [rows, setRows] = useState(transcript ?? []);
  const [waiting, setWaiting] = useState(!transcript?.length);

  useEffect(() => {
    if (!waiting) return;
    let cancelled = false;

    (async function poll() {
      try {
        const { data } = await getVideo(videoId);
        if (data.transcript?.length) {
          if (!cancelled) {
            setRows(data.transcript);
            setWaiting(false);
          }
        } else {
          await new Promise(r => setTimeout(r, 5000));
          if (!cancelled) poll();
        }
      } catch {
        // swallow, retry
        if (!cancelled) {
          await new Promise(r => setTimeout(r, 5000));
          if (!cancelled) poll();
        }
      }
    })();

    return () => { cancelled = true; };
  }, [videoId, waiting]);

  const table = useMemo(() => (
    <div className="overflow-y-auto h-[240px] -mx-6">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-gray-50 z-10">
          <tr>
            <th className="px-6 py-2 w-24 text-left font-medium text-gray-500">Start</th>
            <th className="px-6 py-2 w-24 text-left font-medium text-gray-500">End</th>
            <th className="px-6 py-2 text-left font-medium text-gray-500">Text</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rows.map((u, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-6 py-2 text-gray-600 font-mono">{fmt(u.start)}</td>
              <td className="px-6 py-2 text-gray-600 font-mono">{fmt(u.end)}</td>
              <td className="px-6 py-3 text-gray-800">{u.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ), [rows]);

  if (waiting) {
    return (
      <div className="flex flex-col items-center justify-center flex-1">
        <svg className="animate-spin h-10 w-10 text-primary" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <p className="text-primary font-medium mt-4">Transcribing…</p>
      </div>
    );
  }
  return table;
}

// ─── UI Helpers ───
const TabButton = ({ icon: Icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors
      ${isActive ? "text-primary border-primary" : "text-gray-500 border-transparent hover:bg-gray-100"}`}
  >
    <Icon size={16} /> {label}
  </button>
);

const Bubble = ({ msg, avatar: AvatarOrUrl, isLastAssistant, onSpeak, onRegenerate }) => {
  const isAssistant = msg.role === "assistant";
  const time = msg.time?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`flex gap-3 ${isAssistant ? "" : "justify-end"}`}>
      {isAssistant && <Avatar avatar={AvatarOrUrl} />}
      <div className={`flex flex-col gap-1.5 ${isAssistant ? "items-start" : "items-end"} max-w-md`}>
        <div className={`border rounded-xl p-3 w-fit
          ${isAssistant ? "bg-gray-100 text-gray-800 rounded-bl-none" : "bg-primary text-white rounded-br-none"}`}>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
        </div>
        {isLastAssistant ? (
          <div className="flex items-center gap-3 text-gray-400">
            <Volume2 className="w-4 h-4 hover:text-primary cursor-pointer" onClick={onSpeak} />
            <RefreshCcw className="w-4 h-4 hover:text-primary cursor-pointer" onClick={onRegenerate} />
            {time && <span className="text-xs">{time}</span>}
          </div>
        ) : (
          time && <span className="text-xs text-gray-400">{time}</span>
        )}
      </div>
      {!isAssistant && <Avatar avatar={AvatarOrUrl} />}
    </div>
  );
};

const Avatar = ({ avatar }) => {
  if (typeof avatar === "string" && avatar.startsWith("http")) {
    return <img src={avatar} alt="avatar" className="h-8 w-8 rounded-full object-cover" />;
  }
  // otherwise assume a Lucide icon
  const Icon = avatar;
  return (
    <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-xs">
      {typeof Icon === "function" ? <Icon size={16} /> : "U"}
    </div>
  );
};

// ─── formatter ───
function fmt(s) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}