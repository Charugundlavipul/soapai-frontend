/* eslint-disable react/prop-types */
"use client";

import { useEffect, useState, useRef } from "react";
import CustomDatePicker from "../components/CustomDatePicker";
import CustomTimePicker from "../components/CustomTimePicker";
import SavingToast      from "../components/savingToast";
import MultiSelectDropdown from "../components/multi-select-dropdown"
import api              from "../services/api";

import { addWeeks, addMonths, isBefore, isEqual } from "date-fns";
import { User, X,Calendar}  from "lucide-react";

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
  // const membersRef                 = useRef(null);
  const modalRef                 = useRef(null);


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


  /* close modal on outside click ------------------------------------- */
  useEffect(() => {
    const handleModalClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose()
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleModalClickOutside)
      document.addEventListener("touchstart", handleModalClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleModalClickOutside)
      document.removeEventListener("touchstart", handleModalClickOutside)
    }
  }, [open, onClose])

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


  if (!open) return null

  return (
    <>
      {/* Modal Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div ref={modalRef} className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Create Group Session</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <form onSubmit={submit}>
              <div className="grid grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Session Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Session Name</label>
                    <input
                        disabled
                        value={f.name || "Untitled Group Session"}
                        className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 text-gray-900"
                    />
                  </div>

                  {/* Members */}
                  <MultiSelectDropdown
                      label="Members"
                      required={true}
                      options={clients.map((client) => ({
                        id: client._id,
                        label: client.name,
                      }))}
                      selectedIds={f.members}
                      onSelectionChange={(newSelection) => setF((o) => ({ ...o, members: newSelection }))}
                      placeholder="Select members…"
                      icon={<User className="h-5 w-5 text-gray-400" />}
                      size="md"
                      className="space-y-2"
                      emptyMessage="No clients available"
                  />

                  {/* Goals */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Goals (auto-collected)</label>
                    <div className="min-h-[2rem]">
                      {f.goals.length ? (
                          <div className="flex flex-wrap gap-2">
                            {f.goals.map((g) => (
                                <span key={g} className="px-3 py-1 text-xs rounded-full bg-primary/10 text-primary">
                            {g}
                          </span>
                            ))}
                          </div>
                      ) : (
                          <span className="italic text-gray-400 text-sm">Pick members to see goals</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* First Date */}
                  <CustomDatePicker
                      label="First Date *"
                      value={f.date}
                      onChange={(v) => setF((o) => ({ ...o, date: v }))}
                      isOpen={openPopup === "date"}
                      onToggle={(isOpen) => setOpenPopup(isOpen ? "date" : null)}
                  />

                  {/* Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <CustomTimePicker
                          value={f.startTime}
                          onChange={(v) => setF((o) => ({ ...o, startTime: v }))}
                          placeholder="Start"
                          isOpen={openPopup === "start"}
                          onToggle={(isOpen) => setOpenPopup(isOpen ? "start" : null)}
                      />
                      <CustomTimePicker
                          value={f.endTime}
                          onChange={(v) => setF((o) => ({ ...o, endTime: v }))}
                          placeholder="End"
                          isOpen={openPopup === "end"}
                          onToggle={(isOpen) => setOpenPopup(isOpen ? "end" : null)}
                      />
                    </div>
                  </div>

                  {/* Recurrence */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Recurrence (optional)</label>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <MultiSelectDropdown
                            options={[
                              { id: "", label: "— Every weekday —" },
                              { id: "Sunday", label: "Sunday" },
                              { id: "Monday", label: "Monday" },
                              { id: "Tuesday", label: "Tuesday" },
                              { id: "Wednesday", label: "Wednesday" },
                              { id: "Thursday", label: "Thursday" },
                              { id: "Friday", label: "Friday" },
                              { id: "Saturday", label: "Saturday" }
                            ]}
                            selectedIds={f.recurDay ? [f.recurDay] : []}
                            onSelectionChange={(newSelection) => setF((o) => ({ ...o, recurDay: newSelection[0] || "" }))}
                            placeholder="— Every weekday —"
                            size="md"
                            className="flex-1"
                            maxHeight="max-h-48"
                            icon={<Calendar className="h-5 w-5 text-gray-400" />}
                        />

                        <input
                            type="number"
                            min={1}
                            value={f.recurFreq}
                            onChange={(e) => setF((o) => ({ ...o, recurFreq: Number(e.target.value || 1) }))}
                            className="w-16 px-3 py-3 bg-gray-50 rounded-lg border border-gray-200 text-gray-900 text-center focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm text-gray-600">weeks</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                            type="number"
                            min={0}
                            value={f.recurSpan}
                            onChange={(e) => setF((o) => ({ ...o, recurSpan: Number(e.target.value || 0) }))}
                            className="w-16 px-3 py-3 bg-gray-50 rounded-lg border border-gray-200 text-gray-900 text-center focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm text-gray-600">months total</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
            <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
                onClick={submit}
                disabled={busy}
                className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create Group Session"}
            </button>
          </div>
        </div>
      </div>

      {/* error popup ---------------------------------------------------- */}
      {errPopup.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Validation Error</h3>
              <p className="text-gray-700 mb-4">{errPopup.msg}</p>
              <div className="flex justify-end">
                <button
                    onClick={() => setErr({ show: false, msg: "" })}
                    className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
      )}

      {/* toast --------------------------------------------------------- */}
      <SavingToast show={toast.show} message={toast.msg} type={toast.type} onClose={closeToast} />
    </>
  );
}
