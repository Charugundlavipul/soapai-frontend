/* eslint-disable react/prop-types */
"use client";

import { useEffect, useState, useRef } from "react";
import Modal            from "../components/Modal";
import CustomDatePicker from "../components/CustomDatePicker";
import CustomTimePicker from "../components/CustomTimePicker";
import SavingToast      from "../components/savingToast";
import api              from "../services/api";

import { addWeeks, addMonths, isBefore, isEqual } from "date-fns";
import { ChevronDown, User }  from "lucide-react";
import { XMarkIcon }          from "@heroicons/react/24/solid";

/* ------------------------------------------------------- */
/*                NEW-GROUP-MODAL (full file)              */
/* ------------------------------------------------------- */
export default function NewGroupModal({ open, onClose, onCreated }) {
  /* ------------------------------------------------------------------ */
  /* fetched clients (they contain .goals)                              */
  /* ------------------------------------------------------------------ */
  const [clients, setClients]   = useState([]);

  /* ------------------------------------------------------------------ */
  /* form state                                                         */
  /* ------------------------------------------------------------------ */
  const empty = {
    name      : "",
    members   : [],
    goals     : [],
    date      : "",
    startTime : "",
    endTime   : "",
    recurDay  : "",   // Monday, Tuesday…
    recurFreq : 1,    // every N weeks
    recurSpan : 0,    // number of months (0 = none)
  };
  const [f, setF] = useState(empty);

  /* misc ui state ----------------------------------------------------- */
  const [file      , setFile]      = useState(null);
  const [busy      , setBusy]      = useState(false);
  const [toast     , setToast]     = useState({ show:false, msg:"", type:"success"});
  const [errPopup  , setErr]       = useState({ show:false, msg:""});
  const [openPopup , setOpenPopup] = useState(null);              // 'members' | 'date' | 'start' | 'end'
  const membersRef                 = useRef(null);

  /* ------------------------------------------------------------------ */
  /* side-effects                                                       */
  /* ------------------------------------------------------------------ */
  /* fetch patients each time modal opens ----------------------------- */
  useEffect(()=>{ if(!open) return;
    api.get("/clients").then(r=>setClients(r.data));
    setF(empty); setFile(null); setBusy(false);
    setOpenPopup(null); setErr({show:false,msg:""});
  },[open]);

  /* recompute union-goals & auto name -------------------------------- */
  useEffect(()=>{
    if(!clients.length) return;
    const goals = new Set();
    f.members.forEach(id=>{
      const c = clients.find(x=>x._id===id);
      (c?.goals??[]).forEach(g=>goals.add(g));
    });
    const name = f.members
      .map(id=>clients.find(c=>c._id===id)?.name)
      .filter(Boolean).join(", ");

    setF(o=>({ ...o, goals:Array.from(goals), name }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[f.members]);

  /* close members dropdown on outside click -------------------------- */
  useEffect(()=>{
    const cb = e=>{
      if(openPopup==="members" &&
         membersRef.current &&
         !membersRef.current.contains(e.target))
        setOpenPopup(null);
    };
    document.addEventListener("mousedown",cb);
    return ()=>document.removeEventListener("mousedown",cb);
  },[openPopup]);

  /* ------------------------------------------------------------------ */
  /* helpers                                                            */
  /* ------------------------------------------------------------------ */
  const showToast = (msg,type="success") =>
    setToast({ show:true,msg,type });

  const closeToast = ()=>setToast(s=>({...s,show:false}));

  const showError = msg => { setErr({show:true,msg}); };

  const validate = () => {
    if(!f.members.length){ showError("Pick at least one member"); return false;}
    if(!f.date||!f.startTime||!f.endTime){ showError("Date / time missing"); return false;}
    const start = new Date(`${f.date} ${f.startTime}`);
    const end   = new Date(`${f.date} ${f.endTime}`);
    if(isBefore(start,new Date())){ showError("Start time is in the past"); return false;}
    if(!isBefore(start,end)){ showError("End must be after start"); return false;}
    return true;
  };

  /* build list of ISO strings for recurrence ------------------------- */
  const buildSchedule = () => {
    const first = new Date(`${f.date} ${f.startTime}`);
    const last  = addMonths(first, f.recurSpan);
    const dates = [first];

    if(f.recurSpan===0) return dates;

    const targetWday = first.getDay();      // 0-6  (first === recurDay)
    let ptr = addWeeks(first, f.recurFreq);

    while(isBefore(ptr,last) || isEqual(ptr,last)){
      if(ptr.getDay()===targetWday) dates.push(ptr);
      ptr = addWeeks(ptr, f.recurFreq);
    }
    return dates;
  };

  /* ------------------------------------------------------------------ */
  /* submit                                                             */
  /* ------------------------------------------------------------------ */
  const submit = async e => {
    e.preventDefault();
    if(!validate()) return;

    setBusy(true);
    try{
      /* 1️⃣  create Group ------------------------------------------ */
      const fd = new FormData();
      fd.append("name",f.name||"Untitled Group");
      f.members.forEach(id=>fd.append("patients",id));
      f.goals.forEach(g=>fd.append("goals",g));
      if(file) fd.append("avatar",file);

      const { data: group } = await api.post("/groups",fd,
        { headers:{ "Content-Type":"multipart/form-data"} });

      /* 2️⃣  create appointments --------------------------------- */
      const schedule = buildSchedule();
      await Promise.all(schedule.map(d=>{
        const start = d.toISOString();
        const end   = new Date(`${d.toISOString().slice(0,10)} ${f.endTime}`).toISOString();
        return api.post("/appointments",{
          type:"group", group:group._id, dateTimeStart:start, dateTimeEnd:end
        });
      }));

      showToast("Group & appointments created!");
      setTimeout(()=>{ onCreated(group); onClose(); },500);
    }catch(err){
      console.error(err);
      showToast(err.response?.data?.message||"Failed","error");
    }finally{ setBusy(false); }
  };

  /* ------------------------------------------------------------------ */
  /* ui bits                                                            */
  /* ------------------------------------------------------------------ */
  const membersTxt = () => {
    if(!f.members.length) return "Select members…";
    if(f.members.length===1){
      const c = clients.find(x=>x._id===f.members[0]);
      return c?.name||"1 selected";
    }
    return `${f.members.length} members`;
  };

  const toggleMember=id=>{
    setF(o=>({
      ...o,
      members:o.members.includes(id)
        ? o.members.filter(x=>x!==id)
        : [...o.members,id]
    }));
  };

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title="Create Group Session"
      className="w-full max-w-4xl overflow-visible"
    >
      {/* ----------------------------------------------------------- */}
      {/*           GRID:  LEFT (members)   |  RIGHT (schedule)       */}
      {/* ----------------------------------------------------------- */}
      <form onSubmit={submit} className="grid md:grid-cols-2 gap-10">
        {/* LEFT ---------------------------------------------------- */}
        <section>
          {/* auto name (readonly) */}
          <label className="block text-sm font-medium mb-1">Session Name</label>
          <input
            disabled
            value={f.name||"Untitled Group Session"}
            className="w-full px-4 py-3 mb-6 bg-gray-50 rounded-xl border border-gray-200 text-gray-900"
          />

          {/* members dropdown */}
          <div className="space-y-2" ref={membersRef}>
            <label className="block text-sm font-medium">
              Members <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={()=>setOpenPopup(p=>p==="members"?null:"members")}
              className={`w-full px-4 py-4 bg-gray-50 rounded-xl border flex justify-between items-center
                ${!f.members.length&&errPopup.show?"border-red-300 bg-red-50":""}`}
            >
              <span className={f.members.length?"text-gray-900":"text-gray-400"}>
                {membersTxt()}
              </span>
              <div className="flex items-center gap-1">
                <User className="h-5 w-5 text-gray-400"/>
                <ChevronDown className="h-4 w-4 text-gray-400"/>
              </div>
            </button>

            {openPopup==="members" && (
              <div className="mt-2 border border-gray-200 rounded-xl shadow max-h-56 overflow-y-auto">
                {clients.map(c=>(
                  <button
                    key={c._id}
                    type="button"
                    onClick={()=>toggleMember(c._id)}
                    className={`w-full px-3 py-2 text-left flex justify-between
                      hover:bg-gray-100 transition-colors
                      ${f.members.includes(c._id)?"bg-primary/10 text-primary":""}`}
                  >
                    {c.name}
                    {f.members.includes(c._id)&&(
                      <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <svg className="w-2 h-2 text-white" viewBox="0 0 8 8" fill="currentColor">
                          <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z"/>
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
                {!clients.length && (
                  <div className="px-3 py-2 text-gray-500 text-sm">No clients</div>
                )}
              </div>
            )}
          </div>

          {/* goals (readonly) */}
          <div className="mt-6">
            <label className="block text-sm font-medium mb-1">Goals (auto-collected)</label>
            <div className="flex flex-wrap gap-2">
              {f.goals.length
                ? f.goals.map(g=>(
                    <span key={g} className="px-3 py-1 text-xs rounded-full bg-primary text-white flex items-center gap-1">
                      {g}
                      <XMarkIcon className="h-3 w-3 opacity-30"/>
                    </span>
                  ))
                : <span className="italic text-gray-400 text-sm">Pick members to see goals</span>}
            </div>
          </div>
        </section>

        {/* RIGHT --------------------------------------------------- */}
        <section className="space-y-6">
          {/* first date */}
          <CustomDatePicker
            label="First Date *"
            value={f.date}
            onChange={v=>setF(o=>({...o,date:v}))}
            isOpen={openPopup==="date"}
            onToggle={isOpen=>setOpenPopup(isOpen?"date":null)}
          />

          {/* time pickers */}
          <div>
            <label className="block text-sm font-medium mb-1">Time *</label>
            <div className="flex gap-4">
              <CustomTimePicker
                value={f.startTime}
                onChange={v=>setF(o=>({...o,startTime:v}))}
                placeholder="Start"
                isOpen={openPopup==="start"}
                onToggle={isOpen=>setOpenPopup(isOpen?"start":null)}
              />
              <CustomTimePicker
                value={f.endTime}
                onChange={v=>setF(o=>({...o,endTime:v}))}
                placeholder="End"
                isOpen={openPopup==="end"}
                onToggle={isOpen=>setOpenPopup(isOpen?"end":null)}
              />
            </div>
          </div>

          {/* recurrence ------------------------------------------- */}
          <div className="space-y-3">
            <label className="block text-sm font-medium">Recurrence (optional)</label>

            <div className="flex items-center gap-3">
              <select
                value={f.recurDay}
                onChange={e=>setF(o=>({...o,recurDay:e.target.value}))}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-300 bg-white"
              >
                <option value="">— Every weekday —</option>
                {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
                  .map(d=><option key={d}>{d}</option>)}
              </select>

              <input
                type="number"
                min={1}
                value={f.recurFreq}
                onChange={e=>setF(o=>({...o,recurFreq:Number(e.target.value||1)}))}
                className="w-20 px-3 py-2 rounded-xl border border-gray-300"
              />
              <span className="text-sm">weeks</span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                value={f.recurSpan}
                onChange={e=>setF(o=>({...o,recurSpan:Number(e.target.value||0)}))}
                className="w-20 px-3 py-2 rounded-xl border border-gray-300"
              />
              <span className="text-sm">months total</span>
            </div>
          </div>
        </section>
      </form>

      {/* footer buttons */}
      <div className="mt-8 flex justify-end gap-4">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="px-4 py-2 rounded-xl border border-primary text-primary"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={busy}
          className="px-6 py-2 rounded-xl bg-primary text-white"
        >
          {busy?"Creating…":"Create Group Session"}
        </button>
      </div>
    </Modal>

    {/* error popup ---------------------------------------------------- */}
    <Modal open={errPopup.show} onClose={()=>setErr({show:false,msg:""})} title="Validation Error">
      <div className="space-y-4">
        <p className="text-gray-700 whitespace-pre-wrap">{errPopup.msg}</p>
        <div className="flex justify-end">
          <button
            onClick={()=>setErr({show:false,msg:""})}
            className="px-4 py-2 rounded-xl bg-primary text-white"
          >
            OK
          </button>
        </div>
      </div>
    </Modal>

    {/* toast --------------------------------------------------------- */}
    <SavingToast
      show={toast.show}
      message={toast.msg}
      type={toast.type}
      onClose={closeToast}
    />
    </>
  );
}
