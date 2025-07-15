// src/pages/SessionReview.jsx
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import NewGoalModal   from "../modals/NewGoalModal";
import GoalPickerModal from "../modals/GoalPickerModal";
import { getTranscript, chatLLM, getVideo, getProfile } from "../services/api";

import axios from "axios";
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

import ReactPlayer from "react-player";
import Navbar      from "../components/Navbar";
import EmojiBtn    from "../components/EmojiBtn";

const primaryBtn = "bg-primary hover:bg-primary/90 text-white";


/* axios instance for one-off POST below */
const api = axios.create({
  baseURL : "http://localhost:4000/api",
  headers : { Authorization: `Bearer ${localStorage.getItem("jwt")}` },
});


export default function SessionReview() {
  /* ─── basic data ─── */
  const { id }    = useParams();           // video id
  const navigate  = useNavigate();
  const [video, setVideo] = useState(null);
  const [user , setUser ] = useState(null);
  const [transcribing, setTranscribing] = useState(false);

  /* UI toggles */
  const [showTx     , setShowTx     ] = useState(false);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [showPicker , setShowPicker ] = useState(false);

  /* ─── fetch video + profile ─── */
  useEffect(() => { getVideo(id).then(r => setVideo(r.data)); }, [id]);
  useEffect(() => { getProfile().then(r => setUser(r.data));  }, []);

  /* fetch transcript lazily */
  /* fetch transcript lazily */
  useEffect(() => {
    if (!showTx) return;

    setTranscribing(true);
    getTranscript(id)
        .then(r => {
          setVideo(v => ({ ...v, transcript: r.data }));
          setTranscribing(false);
        })
        .catch(() => {
          alert("Failed to fetch transcript");
          setTranscribing(false);
        });
  }, [showTx, id]);

  /* poll until transcript ready */
  /* poll until transcript ready */
  useEffect(() => {
    if (!video || (video.transcript?.length ?? 0) > 0) return;

    setTranscribing(true);
    const h = setInterval(() => {
      getVideo(id).then(r => {
        if (r.data.transcript?.length) {
          setVideo(r.data);
          setTranscribing(false);
          clearInterval(h);
        }
      });
    }, 3000);
    return () => {
      clearInterval(h);
      setTranscribing(false);
    };
  }, [video, id]);

  /* ─── helpers ─── */
  const fmt = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;

  /* ─── chat state ─── */
  const [msgs , setMsgs ] = useState([{ role:"assistant", content:"Hello! 👋 I'm your AI assistant…" }]);
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({behavior:"smooth"}); }, [msgs]);

  /* speech-to-text */
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const toggleMic = () => {
    if (!("webkitSpeechRecognition" in window)) return alert("Speech-to-text not supported");
    if (!recRef.current) {
      const R = new window.webkitSpeechRecognition();
      R.lang="en-US"; R.continuous=true; R.interimResults=false;
      R.onresult = e => setDraft(d => `${d}${d?" ":""}${e.results[0][0].transcript}`);
      recRef.current = R;
    }
    listening ? recRef.current.stop() : recRef.current.start();
    setListening(!listening);
  };

  /* send chat */
  const doSend = async e => {
    e?.preventDefault();
    if (!draft.trim() && !files.length) return;

    const userMsg = { role:"user", content:draft, time:new Date(), files };
    setMsgs(m => [...m, userMsg]);
    setDraft(""); setFiles([]);

    const body = files.length
      ? (() => { const fd=new FormData(); fd.append("messages",JSON.stringify([...msgs,userMsg])); files.forEach(f=>fd.append("attachment",f)); return fd; })()
      : { messages:[...msgs,userMsg] };

    const { data } = await chatLLM(body);
    setMsgs(m => [...m, { role:"assistant", content:data.reply, time:new Date() }]);
  };

  /* loading guard */
  if (!video || !user) return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar/>
      <div className="flex-1 flex items-center justify-center text-gray-500">Loading…</div>
    </div>
  );

  /* ─── render ─── */
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar/>

      <main className="p-6 max-w-[1300px] mx-auto flex gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6 shrink-0">
          <div className="w-[463px] h-[261px] rounded-lg overflow-hidden">
            <ReactPlayer url={video.fileUrl} controls width="463" height="261"/>
          </div>

          <div className="bg-[#FAF8FF] rounded-xl p-6 space-y-4 shadow" style={{width:463,height:330}}>
            {showTx ? (
                <>
                  <QuickRow icon={ChevronDown} label="Video Transcript (Hide)" onClick={()=>{setShowTx(false); setTranscribing(false);}}/>
                  {transcribing ? (
                      <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <div className="relative">
                          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        </div>
                        <div className="text-center">
                          <p className="text-primary font-medium">Transcribing audio...</p>
                          <p className="text-sm text-gray-500 mt-1">This may take a few moments</p>
                        </div>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                        </div>
                      </div>
                  ) : (
                      <div className="overflow-y-auto border rounded-md" style={{maxHeight:240}}>
                        <table className="w-full text-sm">
                          <thead className="bg-primary/10 text-primary">
                          <tr><th className="px-4 py-2 w-24">Start</th><th className="px-4 py-2 w-24">End</th><th className="px-4 py-2">Text</th></tr>
                          </thead>
                          <tbody>
                          {video.transcript?.map((u,i)=>(
                              <tr key={i} className="border-t">
                                <td className="px-4 py-2">{fmt(u.start)}</td>
                                <td className="px-4 py-2">{fmt(u.end)}</td>
                                <td className="px-4 py-2">{u.text}</td>
                              </tr>
                          ))}
                          </tbody>
                        </table>
                      </div>
                  )}
                </>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Selected Goals</h3>
                  <button onClick={()=>setShowPicker(true)} className="px-4 py-1 rounded-full bg-primary text-white text-sm">Change</button>
                </div>

                {/* pills */}
                <div className="flex flex-wrap gap-2">
                  {(video.goals ?? []).map((g, i) => {
                    /* support strings *and* { name, category } objects */
                    const label =
                      typeof g === "string"
                        ? g
                        : g.category
                        ? `${g.category}: ${g.name}`
                        : g.name;

                    return (
                      <span
                        key={i}
                        className="px-3 py-1 bg-white border border-gray-200 rounded-md text-sm"
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>


                {/* <QuickRow icon={Plus} label="Create New Goal" onClick={()=>setShowNewGoal(true)}/> */}
                <QuickRow icon={ChevronDown} label="Video Transcript (Show)" onClick={()=>setShowTx(true)}/>
                <QuickRow icon={ChevronDown} label="Visualized Progress" onClick={()=>alert("Coming soon")}/>

               <button
                 className="block mx-auto w-80 py-2 rounded-md bg-primary text-white"
                 onClick={async () => {
                   const apptId = video.appointment;
                   if (!apptId) return alert("No appointment linked to this video.");

                  /* 1️⃣ tell the server to create placeholder visit rows */
                  try {
                    await api.post(`/appointments/${apptId}/recommendations`);
                  } catch (_) {
                    /* ignore 409/duplicate errors – placeholders may already exist */
                  }

                  /* 2️⃣ then navigate, passing the usual state */
                  navigate(`/appointments/${apptId}/recommendations`, {
                    state: {
                      video,
                      selectedGoals: (video.goals ?? []).map(g =>
                        typeof g === "string" ? g : g.name
                      ),
                    },
                  });
                }}>
                Get AI Recommendations
              </button>
              </>
            )}
          </div>
        </div>

        {/* CHAT COLUMN */}
        <div className="bg-[#FAF8FF] rounded-xl flex flex-col shadow-sm" style={{width:591,height:600}}>
          <h3 className="px-6 py-4 border-b text-lg font-semibold text-primary">Chat with SOAP</h3>

          <div className="flex-1 overflow-y-auto px-6 pt-4 space-y-4">
            {msgs.map((m,i)=> m.role==="assistant"
              ? <Bubble key={i} side="left"  avatar="S"             msg={m}/>
              : <Bubble key={i} side="right" avatar={user.avatarUrl} msg={m}/>
            )}
            <div ref={chatEndRef}/>
            <div className="flex gap-4 text-gray-500 pt-2 pb-2">
              <Volume2  className="w-5 h-5 hover:text-primary cursor-pointer"/>
              <RefreshCcw className="w-5 h-5 hover:text-primary cursor-pointer"/>
              <ThumbsDown className="w-5 h-5 hover:text-primary cursor-pointer"/>
            </div>
          </div>

          <form onSubmit={doSend} className="border-t p-4 flex items-center gap-3 bg-[#FAF8FF]">
            <Paperclip className="w-5 h-5 text-gray-400 cursor-pointer" onClick={()=>document.getElementById("fileInput").click()}/>
            <input id="fileInput" type="file" multiple hidden onChange={e=>setFiles([...files, ...Array.from(e.target.files)])}/>

            <input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Message to SOAP…"
                   className="flex-1 border rounded-full px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-primary"/>

            <EmojiBtn onSelect={e=>setDraft(d=>d+e)}/>
            <Mic2 className={`w-5 h-5 cursor-pointer ${listening?"text-primary":"text-gray-400"}`} onClick={toggleMic}/>

            <button type="submit" className={`px-4 py-2 rounded-full flex items-center gap-1 ${primaryBtn}`}>
              <Send className="w-4 h-4"/> Send
            </button>
          </form>
        </div>

        {/* ─── Modals ─── */}
        <NewGoalModal
          open={showNewGoal}
          onClose={()=>setShowNewGoal(false)}
          onSaved={g=> setVideo(v=>({...v, goals:[...(v.goals||[]), g]}))}
        />

        <GoalPickerModal
          open={showPicker}
          onClose={()=>setShowPicker(false)}
          video={video}
          onSaved={setVideo}
        />
      </main>
    </div>
  );
}

/* Quick utility rows */
const QuickRow = ({ icon:Icon, label, onClick }) => (
  <button onClick={onClick} className="bg-white w-full flex justify-between items-center px-4 py-2 text-primary font-medium rounded-md hover:bg-primary/5">
    {label}<Icon className="w-5 h-5"/>
  </button>
);

/* Chat bubble */
const Bubble = ({ side, avatar, msg }) => {
  const left = side==="left";
  const time = msg.time?.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
  return (
    <div className={`flex gap-3 ${left?"":"justify-end"}`}>
      {left && <Avatar avatar={avatar}/>}
      <div className="flex flex-col items-start max-w-[320px]">
        <div className={`${left?"bg-white text-gray-800":"bg-primary text-white"} border rounded-xl p-3`}>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
        </div>
        {time && <span className={`mt-1 text-xs ${left?"text-gray-400":"text-white/80 self-end"}`}>{time}</span>}
      </div>
      {!left && <Avatar avatar={avatar}/>}
    </div>
  );
};

const Avatar = ({ avatar }) =>
  avatar?.startsWith("http")
    ? <img src={avatar} alt="pfp" className="h-8 w-8 rounded-full object-cover"/>
    : <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">{avatar}</div>;
