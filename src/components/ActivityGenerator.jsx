/* ──────────────────────────────────────────────────────────
   ActivityGenerator.jsx  (DROP-IN REPLACEMENT)
   - nice Markdown rendering (Tailwind ‟prose”)
   - 2-step flow (draft → preview → confirm)
   - Edit-modal lets you change members (group only)
   - Only patients in this appointment are selectable
   - Robust against empty lists / rapid double-clicks
   ────────────────────────────────────────────────────────── */

import { useState, useEffect, useRef } from "react";
import PropTypes                      from "prop-types";
import { marked }                     from "marked";
import jsPDF                          from "jspdf";
import html2canvas                    from "html2canvas";
import qs                             from "qs";
import AccordionRow                   from "./AccordionRow";
import DropdownChips                  from "./DropdownChips";
import EditActivityModal              from "../modals/EditActivityModal";
import axios                          from "axios";

const api = axios.create({
  baseURL : "http://localhost:4000/api",
  headers : { Authorization: `Bearer ${localStorage.getItem("jwt")}` }
});

/* ---------- tiny helpers ---------- */
const todayISO = () => new Date().toISOString();
const slugify  = s => s.toLowerCase()
                       .replace(/[^a-z0-9]+/g, "_")
                       .replace(/^_+|_+$/g, "");

/* ===================================================================== */
/*                               COMPONENT                               */
/* ===================================================================== */
export default function ActivityGenerator({
  mode,                // "group" | "individual"
  appointmentId,
  patients,            // [{ _id, name, avatarUrl }]
  allGoals,            // string[]
  initialActivities,
  onActivitiesChange
}) {
  /* ─────────── state ─────────── */
  const [activities, setActs] = useState(initialActivities);

  const [members, setMembers] = useState(
    mode === "individual" ? [patients?.[0]?._id].filter(Boolean) : []
  );
  const [goals,    setGoals]  = useState([]);
  const [duration, setDur]    = useState("30 Minutes");
  const [idea,     setIdea]   = useState("");

  /* draft stage */
  const [draft,     setDraft] = useState(null);   // { name, description, materials }
  const [draftMats, setMats ] = useState([]);

  /* preview stage */
  const [planMD,    setPlan]  = useState("");
  const [htmlDoc,   setHtml]  = useState("");     // editable HTML
  const [pending,   setPend]  = useState(null);   // payload for confirm

  /* misc */
  const [busy,      setBusy]  = useState(false);
  const editorRef             = useRef(null);

  /* whenever caller passes new initialActivities (route reload) */
  useEffect(()=>setActs(initialActivities), [initialActivities]);

  /* notify parent on every change */
  const updateActs = next => {
    setActs(next);
    onActivitiesChange?.(next);
  };

  /* seed editable <div> when planMarkdown appears */
  useEffect(() => {
    if (planMD && editorRef.current) {
      const html = marked.parse(planMD);
      editorRef.current.innerHTML = html;
      setHtml(html);
    }
  }, [planMD]);

  /* ============================================================
     0️⃣  DRAFT   (/activity-draft)                              */
  /* ============================================================ */
  async function generateDraft() {
    if (busy) return;
    if (!members.length || !goals.length) {
      alert("Pick at least one member and one goal first.");
      return;
    }

    try {
      setBusy(true);
      const { data } = await api.post(
        `/appointments/${appointmentId}/activity-draft`,
        { memberIds: members, goals, duration, idea }
      );                                              // { name, description, materials[] }
      setDraft(data);
      setMats(data.materials);
    } catch (err) {
      alert(err.response?.data?.message || "Draft generation failed.");
    } finally {
      setBusy(false);
    }
  }

  /* ============================================================
     1️⃣  PREVIEW   (/generate-activity preview:true)            */
  /* ============================================================ */
  async function previewPlan() {
    if (busy || !draft) return;
    if (!draftMats.length) {
      alert("Select at least one material.");
      return;
    }

    const payload = {
      memberIds    : members,
      goals,
      duration,
      idea,
      materials    : draftMats,
      activityName : draft.name,
      preview      : true
    };

    try {
      setBusy(true);
      const { data } = await api.post(
        `/appointments/${appointmentId}/generate-activity`,
        payload
      );                                              // { plan }
      setPlan((data.plan || "").trim());

      /* store an identical payload (minus preview flag) */
      delete payload.preview;
      setPend(payload);

      /* reset draft UI */
      setDraft(null);
      setMats([]);
      setIdea("");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to get preview.");
    } finally {
      setBusy(false);
    }
  }

  /* ============================================================
     2️⃣  CONFIRM & SAVE   (/generate-activity preview:false)    */
  /* ============================================================ */
  async function confirmAndSave() {
    if (busy || !pending) return;

    setBusy(true);
    try {
      /* A. real create -> { plan, activity } */
      const { data } = await api.post(
        `/appointments/${appointmentId}/generate-activity`,
        pending
      );
      const act = data.activity;
      if (!act?._id) throw new Error("Server did not return activity id");

      updateActs(a => [...a, act]);          // keep accordion up to date

      /* B. turn edited HTML -> PDF blob */
      const blob = await htmlToPdfBlob(editorRef.current);
      const date = todayISO().slice(0,10);
      const slug = slugify(act.name);
      const fname= `material_${date}_${slug}.pdf`;
      downloadBlob(blob, fname);

      /* C. upload (dedupe per patient) */
      await Promise.all(members.map(pid =>
        uploadMaterial(pid, blob, fname, date, slug)
      ));

      /* D. visitHistory & goal-progress */
      const visit = {
        date       : todayISO(),
        appointment: appointmentId,
        type       : mode,
        note       : "See generated plan.",
        aiInsights : [],
        activities : [act._id]
      };
      await Promise.all(members.map(pid =>
        api.post(`/clients/${pid}/visit`, { visit })
      ));
      await Promise.all(members.map(pid =>
        api.patch(`/clients/${pid}/goal-progress/history`, {
          goals, activityName: act.name
        })
      ));

      /* clear preview state (ready for next activity) */
      setPlan("");
      setPend(null);
      alert("Saved!");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Save failed – see console.");
    } finally {
      setBusy(false);
    }
  }

  /* ============================================================ */
  /*                       helper utilities                       */
  /* ============================================================ */
  async function htmlToPdfBlob(node){
    const canvas = await html2canvas(node, { scale:2 });
    const pdf    = new jsPDF({ unit:"pt", format:"a4" });
    const w      = pdf.internal.pageSize.getWidth();
    const h      = (canvas.height * w) / canvas.width;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, w, h);
    return pdf.output("blob");
  }

  function downloadBlob(blob, filename){
    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  async function uploadMaterial(pid, blob, fname, date, slug){
    const q   = qs.stringify({ appointment: appointmentId, activity: slug });
    const dup = await api.get(`/clients/${pid}/materials?${q}`)
                         .then(r=>r.data).catch(()=>[]);
    await Promise.all(dup.map(d => api.delete(`/clients/${pid}/materials/${d._id}`)));

    const fd = new FormData();
    fd.append("visitDate",   date);
    fd.append("appointment", appointmentId);
    fd.append("activity",    slug);
    fd.append("file", new File([blob], fname, { type:"application/pdf" }));

    await api.post(`/clients/${pid}/materials`, fd, {
      headers:{ "Content-Type":"multipart/form-data" }
    });
  }

  /* ============================================================ */
  /*                           RENDER                             */
  /* ============================================================ */
  return (
    <div className="space-y-6">
      {/* ─── Existing activities ─── */}
      {activities.length > 0 && (
        <>
          <h4 className="text-xl font-semibold">Generated Activities</h4>
          {activities.map(a=>(
            <ActivityAccordion
              key={a._id}
              act={a}
              appointmentId={appointmentId}
              memberOptions={patients.map(p=>({ id:p._id, label:p.name }))} /* NEW */
              onUpdated={u=>updateActs(acts=>acts.map(x=>x._id===u._id?u:x))}
              onDeleted={id=>updateActs(acts=>acts.filter(x=>x._id!==id))}
            />
          ))}
          <hr className="border-gray-200" />
        </>
      )}

      {/* ─── Generator form ─── */}
      <h4 className="text-xl font-semibold">Activity Generator</h4>

      {mode==="group" && (
        <DropdownChips
          label="Members"
          placeholder="Select Patients"
          options={patients.map(p=>({ id:p._id, label:p.name }))}
          selected={members}
          setSelected={setMembers}
        />
      )}

      <DropdownChips
        label="Goals"
        placeholder="Select Goals"
        options={allGoals.map(g=>({ id:g, label:g }))}
        selected={goals}
        setSelected={setGoals}
      />

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Duration</label>
        <select
          value={duration}
          onChange={e=>setDur(e.target.value)}
          className="border rounded-lg px-3 py-2 focus:ring-primary"
        >
          {["15","30","45","60"].map(m=><option key={m}>{m} Minutes</option>)}
        </select>
      </div>

      {!planMD && (
        <textarea
          rows={3}
          value={idea}
          onChange={e=>setIdea(e.target.value)}
          placeholder="Therapist idea (optional)…"
          className="w-full border rounded-md px-3 py-2 shadow-sm text-sm focus:ring-primary"
        />
      )}

      {/* ─── Buttons ─── */}
      {!draft && (
        <button
          onClick={generateDraft}
          disabled={busy}
          className="bg-primary text-white rounded-full px-6 py-2 hover:bg-primary/90 disabled:opacity-60"
        >
          {busy?"Generating…":"Generate Activity"}
        </button>
      )}

      {/* --- Draft card & preview button --- */}
      {draft && !planMD && (
        <>
          <div className="bg-white rounded-md p-4 space-y-4">
            <p className="text-sm"><strong>Name:</strong> {draft.name}</p>
            <p className="text-sm whitespace-pre-wrap"><strong>Description:</strong> {draft.description}</p>
            <div>
              <p className="text-sm font-medium mb-1">Materials</p>
              <ul className="space-y-2">
                {draft.materials.map(m=>(
                  <li key={m} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={draftMats.includes(m)}
                      onChange={()=>
                        setMats(prev =>
                          prev.includes(m) ? prev.filter(x=>x!==m) : [...prev, m]
                        )
                      }
                      className="h-4 w-4 text-primary border rounded"
                    />
                    <span className="text-sm">{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button
            onClick={previewPlan}
            disabled={!draftMats.length || busy}
            className="bg-primary text-white rounded-full px-6 py-2 hover:bg-primary/90 disabled:opacity-60"
          >
            {busy?"Creating…":"Generate With Selected Materials"}
          </button>
        </>
      )}

      {/* --- Preview & confirm --- */}
      {planMD && (
        <div className="space-y-4">
          <h5 className="text-lg font-semibold">Generated Plan</h5>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            /* `prose` makes headings / lists look nice */
            className="prose max-w-none min-h-[200px] border rounded-md p-3 bg-white text-sm overflow-auto"
            dangerouslySetInnerHTML={{ __html: htmlDoc }}
            onInput={e=>setHtml(e.currentTarget.innerHTML)}
          />
          <button
            onClick={confirmAndSave}
            disabled={busy}
            className="bg-primary text-white px-6 py-2 rounded-full hover:bg-primary/90 disabled:opacity-60"
          >
            {busy?"Saving…":"Confirm & Save"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ===================================================================== */
/*                    Accordion + editable modal                          */
/* ===================================================================== */
function ActivityAccordion({
  act,
  appointmentId,
  memberOptions,
  onUpdated,
  onDeleted
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  /* form state held only inside modal */
  const [form, setForm] = useState({
    name:        act.name,
    description: act.description,
    members:     act.members?.map(String) || []
  });
  const patch = f => setForm(prev=>({ ...prev, ...f }));

  /* ------------ save ------------- */
  const save = async () => {
    try {
      setBusy(true);
      const { data } = await api.patch(
        `/appointments/${appointmentId}/activities/${act._id}`,
        { name:form.name, description:form.description, members:form.members }
      );
      onUpdated(data);
      setEditing(false);
    } catch {
      alert("Edit failed");
    } finally {
      setBusy(false);
    }
  };

  /* ------------ delete ----------- */
  const del = async () => {
    if (!window.confirm("Delete this activity?")) return;
    try {
      setBusy(true);
      await api.delete(`/appointments/${appointmentId}/activities/${act._id}`);
      onDeleted(act._id);
    } catch { alert("Delete failed"); }
    finally { setBusy(false); }
  };

  return (
    <>
      <AccordionRow
        open={open}
        onToggle={()=>setOpen(o=>!o)}
        header={
          <div className="flex items-center gap-2">
            <span className="font-medium">{act.name}</span>
            <button
              onClick={e=>{e.stopPropagation();setEditing(true);}}
              className="text-xs underline"
            >
              Edit
            </button>
            <button
              onClick={e=>{e.stopPropagation();del();}}
              className="text-xs text-red-600 underline"
            >
              Delete
            </button>
          </div>
        }
      >
        <div
          className="prose text-sm"
          dangerouslySetInnerHTML={{ __html: marked.parse(act.description||"") }}
        />
      </AccordionRow>

      {/* ---------- EDIT MODAL ---------- */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl p-6 w-[38rem] max-w-full space-y-5">
            <h3 className="text-lg font-semibold">Edit Activity</h3>

            <input
              value={form.name}
              onChange={e=>patch({ name:e.target.value })}
              className="w-full border rounded px-3 py-2"
            />

            <textarea
              rows={6}
              value={form.description}
              onChange={e=>patch({ description:e.target.value })}
              className="w-full border rounded px-3 py-2"
            />

            {memberOptions.length>1 && (
              <DropdownChips
                label="Members"
                placeholder="Add patient"
                options={memberOptions}
                selected={form.members}
                setSelected={m=>patch({ members:m })}
              />
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={()=>setEditing(false)}
                className="px-4 py-2 rounded border"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={busy}
                className="bg-primary text-white px-4 py-2 rounded disabled:opacity-60"
              >
                {busy?"Saving…":"Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

ActivityAccordion.propTypes = {
  act           : PropTypes.object.isRequired,
  appointmentId : PropTypes.string.isRequired,
  memberOptions : PropTypes.array.isRequired,
  onUpdated     : PropTypes.func.isRequired,
  onDeleted     : PropTypes.func.isRequired
};

ActivityGenerator.propTypes = {
  mode               : PropTypes.oneOf(["group","individual"]).isRequired,
  appointmentId      : PropTypes.string.isRequired,
  patients           : PropTypes.array.isRequired,
  allGoals           : PropTypes.array.isRequired,
  initialActivities  : PropTypes.array.isRequired,
  onActivitiesChange : PropTypes.func
};
