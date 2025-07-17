/*  client/src/components/ActivityGenerator.jsx
   ──────────────────────────────────────────────────────────
   Sleeker UI – same core logic
   ────────────────────────────────────────────────────────── */

import { useState, useEffect, useRef } from "react";
import PropTypes                       from "prop-types";
import { marked }                      from "marked";
import jsPDF                           from "jspdf";
import html2canvas                     from "html2canvas";
import qs                              from "qs";
import AccordionRow   from "./AccordionRow";
import DropdownChips  from "./DropdownChips";
import axios          from "axios";

const api = axios.create({
  baseURL : "http://localhost:4000/api",
  headers : { Authorization: `Bearer ${localStorage.getItem("jwt")}` }
});

/* ────────── tiny helpers ────────── */
const todayISO = () => new Date().toISOString();
const slugify  = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

/* =================================================================== */
/*                            COMPONENT                                */
/* =================================================================== */
export default function ActivityGenerator({
  mode,                 // "group" | "individual"
  appointmentId,
  patients,
  allGoals,
  initialActivities,
  onActivitiesChange
}) {
  /* ───────────── state ───────────── */
  const [activities, setActs] = useState(initialActivities);

  const [members,  setMembers] = useState(
    mode === "individual" ? [patients?.[0]?._id].filter(Boolean) : []
  );
  const [goals,    setGoals]  = useState([]);
  const [duration, setDur]    = useState("30 Minutes");
  const [idea,     setIdea]   = useState("");

  const [draft,      setDraft]      = useState(null);
  const [draftMats,  setMats]       = useState([]);
  const [draftBackup,     setDraftBackup]     = useState(null);
  const [draftMatsBackup, setDraftMatsBackup] = useState([]);

  const [planMD,  setPlan]  = useState("");
  const [htmlDoc, setHtml]  = useState("");
  const [pending, setPend]  = useState(null);

  const [busy, setBusy] = useState(false);
  const editorRef       = useRef(null);

  /* keep activities in sync with parent */
  useEffect(() => setActs(initialActivities), [initialActivities]);

  const updateActs = (next) => {
    setActs(next);
    onActivitiesChange?.(next);
  };

  /* mirror Markdown → editable HTML */
  useEffect(() => {
    if (planMD && editorRef.current) {
      const html = marked.parse(planMD);
      editorRef.current.innerHTML = html;
      setHtml(html);
    }
  }, [planMD]);

  /* ──────────────────────────────────
     0️⃣  DRAFT
     ────────────────────────────────── */
  async function generateDraft() {
    if (busy) return;

    const missing = patients
      .filter((p) => members.includes(String(p._id)))
      .filter(
        (p) =>
          !p.stgs?.some((s) => String(s.appointment) === appointmentId)
      );

    if (missing.length) {
      alert(
        `Generate a Short-Term Goal for:\n• ` +
          missing.map((m) => m.name).join("\n• ") +
          `\n\nThen retry the Activity Generator.`
      );
      return;
    }

    if (!members.length || !goals.length) {
      alert("Pick at least one member **and** one goal first.");
      return;
    }

    try {
      setBusy(true);
      const { data } = await api.post(
        `/appointments/${appointmentId}/activity-draft`,
        { memberIds: members, goals, duration, idea, useStg: true }
      );                                           // { name, description, materials[] }
      setDraft(data);
      setDraftBackup(data);
      setMats(data.materials);
      setDraftMatsBackup(data.materials);
    } catch (err) {
      alert(err.response?.data?.message || "Draft generation failed.");
    } finally {
      setBusy(false);
    }
  }

  /* simple button component (keeps code tidy) */
  const Btn = ({ label, onClick, disabled, variant = "primary" }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        variant === "primary"
          ? "bg-primary text-white rounded-full px-5 py-2 hover:bg-primary/90 disabled:opacity-60"
          : "border rounded-full px-5 py-2 disabled:opacity-60"
      }
    >
      {label}
    </button>
  );
  
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
      );                                           // { plan }
      setPlan((data.plan || "").trim());
      delete payload.preview;          // keep a clean copy for confirm
      setPend(payload);

      /* clear draft UI */
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

  const backToForm  = () => { setDraft(null); setMats([]); };
  const backToDraft = () => {
    setPlan("");  setPend(null);
    setDraft(draftBackup); setMats(draftMatsBackup);
  };

  async function regeneratePlan() {
    if (busy || !pending) return;
    try {
      setBusy(true);
      const { data } = await api.post(
        `/appointments/${appointmentId}/generate-activity`,
        { ...pending, preview: true }
      );
      setPlan((data.plan || "").trim());
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to regenerate.");
    } finally {
      setBusy(false);
    }
  }

  /* ──────────────────────────────────
     2️⃣  CONFIRM & SAVE   (logic untouched)
     ────────────────────────────────── */
  async function confirmAndSave() {
    if (busy || !pending) return;
    setBusy(true);
    try {
      /* 1. create Activity */
      const { data } = await api.post(
        `/appointments/${appointmentId}/generate-activity`,
        pending
      );
      const act = data.activity;
      if (!act?._id) throw new Error("Server did not return activity id");
      updateActs((a) => [...a, act]);

      /* 2. link Activity IDs into each visit row */
      await Promise.all(
        members.map(async (pid) => {
          const { data: pat } = await api.get(`/clients/${pid}`);
          const existing =
            pat.visitHistory?.find(
              (v) => String(v.appointment) === appointmentId
            ) || {};
          const visit = {
            ...existing,
            activities: Array.from(
              new Set([...(existing.activities || []), act._id])
            ),
          };
          await api.post(`/clients/${pid}/visit`, { visit });
        })
      );

      /* 3. PDF export + upload */
      const blob = await htmlToPdfBlob(editorRef.current);
      const date = todayISO().slice(0, 10);
      const slug = slugify(act.name);
      const fname = `material_${date}_${slug}.pdf`;
      downloadBlob(blob, fname);
      await Promise.all(
        members.map((pid) =>
          uploadMaterial(pid, blob, fname, date, slug, appointmentId)
        )
      );

      /* 4. goal-progress history */
      await Promise.all(
        members.map((pid) =>
          api.patch(`/clients/${pid}/goal-progress/history`, {
            goals,
            activityName: act.name,
          })
        )
      );

      /* 5. tidy-up */
      setPlan(""); setPend(null);
      alert("Saved!");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Save failed – see console.");
    } finally {
      setBusy(false);
    }
  }

  /* ────────────────────────────────── */
  const StageBadge = ({ n, label }) => (
    <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide rounded-full bg-primary/10 text-primary px-2 py-0.5">
      <span className="inline-block w-4 h-4 text-[10px] leading-4 bg-primary text-white rounded-full text-center">
        {n}
      </span>
      {label}
    </span>
  );

  /* ──────────────────────────────────
     RENDER
     ────────────────────────────────── */
  return (
    <div className="bg-[#F5F4FB] rounded-2xl p-8 shadow-sm space-y-8">
      {/* ─── Saved activities ─── */}
      {activities.length > 0 && (
        <section className="space-y-4">
          <h4 className="text-xl font-semibold flex items-center gap-2">
            <StageBadge n="A" label="Saved" />
            Generated Activities
          </h4>

          <div className="space-y-3">
            {activities.map((a) => (
              <ActivityAccordion
                key={a._id}
                act={a}
                appointmentId={appointmentId}
                memberOptions={patients.map((p) => ({
                  id: p._id,
                  label: p.name,
                }))}
                onUpdated={(u) =>
                  updateActs((acts) =>
                    acts.map((x) => (x._id === u._id ? u : x))
                  )
                }
                onDeleted={(id) =>
                  updateActs((acts) => acts.filter((x) => x._id !== id))
                }
              />
            ))}
          </div>

          <hr className="border-gray-200" />
        </section>
      )}

      {/* ─── Generator ─── */}
      <section className="space-y-6">
        <h4 className="text-xl font-semibold flex items-center gap-2">
          <StageBadge n="1" label="Create" />
          Activity Generator
        </h4>

        {mode === "group" && (
          <DropdownChips
            label="Members"
            placeholder="Select Patients"
            options={patients.map((p) => ({ id: p._id, label: p.name }))}
            selected={members}
            setSelected={setMembers}
          />
        )}

        <DropdownChips
          label="Goals"
          placeholder="Select Goals"
          options={allGoals.map((g) => ({ id: g, label: g }))}
          selected={goals}
          setSelected={setGoals}
        />

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Duration</label>
          <select
            value={duration}
            onChange={(e) => setDur(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:ring-primary"
          >
            {["15", "30", "45", "60"].map((m) => (
              <option key={m}>{m} Minutes</option>
            ))}
          </select>
        </div>

        {!planMD && (
          <textarea
            rows={3}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Therapist idea (optional)…"
            className="w-full border rounded-md px-3 py-2 shadow-sm text-sm focus:ring-primary"
          />
        )}

        {/* -- step-0 buttons -- */}
        {!draft && !planMD && (
          <Btn
            label={busy ? "Generating…" : "Generate Activity"}
            onClick={generateDraft}
            disabled={busy}
          />
        )}

        {/* -- draft card -- */}
        {draft && !planMD && (
          <>
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <h5 className="text-lg font-semibold flex items-center gap-2">
                <StageBadge n="2" label="Draft" />
                Review &amp; select materials
              </h5>

              <p className="text-sm">
                <strong>Name:</strong> {draft.name}
              </p>

              <div className="prose text-sm">
                <strong>Description:</strong>
                <div
                  dangerouslySetInnerHTML={{
                    __html: marked.parse(draft.description || ""),
                  }}
                />
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Materials</p>
                <ul className="space-y-2 max-h-48 overflow-auto">
                  {draft.materials.map((m) => (
                    <li
                      key={m}
                      className="flex items-center gap-2 whitespace-nowrap"
                    >
                      <input
                        type="checkbox"
                        checked={draftMats.includes(m)}
                        onChange={() =>
                          setMats((prev) =>
                            prev.includes(m)
                              ? prev.filter((x) => x !== m)
                              : [...prev, m]
                          )
                        }
                        className="h-4 w-4 accent-primary border rounded focus:ring-primary"
                      />
                      <span className="text-sm">{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <Btn
                label={busy ? "Creating…" : "Generate With Materials"}
                onClick={previewPlan}
                disabled={!draftMats.length || busy}
              />
              <Btn label="Back" onClick={backToForm} disabled={busy} variant="ghost" />
            </div>
          </>
        )}

        {/* -- preview card -- */}
        {planMD && (
          <>
            <h5 className="text-lg font-semibold flex items-center gap-2">
              <StageBadge n="3" label="Preview" />
              Final edits
            </h5>

            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="prose max-w-none min-h-[200px] border rounded-md p-4 bg-white text-sm overflow-auto"
              dangerouslySetInnerHTML={{ __html: htmlDoc }}
              onInput={(e) => setHtml(e.currentTarget.innerHTML)}
            />

            <div className="flex flex-wrap gap-3">
              <Btn
                label={busy ? "Saving…" : "Confirm & Save"}
                onClick={confirmAndSave}
                disabled={busy}
              />
              <Btn
                label="Back"
                onClick={backToDraft}
                disabled={busy}
                variant="ghost"
              />
              <Btn
                label="Regenerate"
                onClick={regeneratePlan}
                disabled={busy}
                variant="primary"
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}

/* =================================================================== */
/* Accordion – same logic, light style tweaks                           */
/* =================================================================== */
function ActivityAccordion({
  act,
  appointmentId,
  memberOptions,
  onUpdated,
  onDeleted,
}) {
  const [open,    setOpen]    = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy,    setBusy]    = useState(false);

  const [form, setForm] = useState({
    name       : act.name,
    description: act.description,
    members    : act.members?.map(String) || [],
  });
  const patch = (f) => setForm((prev) => ({ ...prev, ...f }));

  const save = async () => {
    try {
      setBusy(true);
      const { data } = await api.patch(
        `/appointments/${appointmentId}/activities/${act._id}`,
        {
          name       : form.name,
          description: form.description,
          members    : form.members,
        }
      );
      onUpdated(data);
      setEditing(false);
    } catch {
      alert("Edit failed");
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!window.confirm("Delete this activity?")) return;
    try {
      setBusy(true);
      await api.delete(
        `/appointments/${appointmentId}/activities/${act._id}`
      );
      onDeleted(act._id);
    } catch {
      alert("Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AccordionRow
        open={open}
        onToggle={() => setOpen((o) => !o)}
        header={
          <div className="flex items-center gap-2">
            <span className="font-medium">{act.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
              className="text-xs underline text-primary"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                del();
              }}
              className="text-xs underline text-red-600"
            >
              Delete
            </button>
          </div>
        }
      >
        <div
          className="prose text-sm"
          dangerouslySetInnerHTML={{
            __html: marked.parse(act.description || ""),
          }}
        />
      </AccordionRow>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl p-6 w-[38rem] max-w-full space-y-5">
            <h3 className="text-lg font-semibold">Edit Activity</h3>

            <input
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />

            <textarea
              rows={6}
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />

            {memberOptions.length > 1 && (
              <DropdownChips
                label="Members"
                placeholder="Add patient"
                options={memberOptions}
                selected={form.members}
                setSelected={(m) => patch({ members: m })}
              />
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 rounded border"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={busy}
                className="bg-primary text-white px-4 py-2 rounded disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save"}
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
  onDeleted     : PropTypes.func.isRequired,
};

ActivityGenerator.propTypes = {
  mode              : PropTypes.oneOf(["group", "individual"]).isRequired,
  appointmentId     : PropTypes.string.isRequired,
  patients          : PropTypes.array.isRequired,
  allGoals          : PropTypes.array.isRequired,
  initialActivities : PropTypes.array.isRequired,
  onActivitiesChange: PropTypes.func,
};

/* =================================================================== */
/* helper utils (unchanged)                                            */
/* =================================================================== */
async function htmlToPdfBlob(node) {
  const canvas = await html2canvas(node, { scale: 2 });
  const pdf    = new jsPDF({ unit: "pt", format: "a4" });
  const w      = pdf.internal.pageSize.getWidth();
  const h      = (canvas.height * w) / canvas.width;
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, w, h);
  return pdf.output("blob");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function uploadMaterial(pid, blob, fname, date, slug, appointmentId) {
  const q   = qs.stringify({ appointment: appointmentId, activity: slug });
  const dup = await api
    .get(`/clients/${pid}/materials?${q}`)
    .then((r) => r.data)
    .catch(() => []);

  await Promise.all(
    dup.map((d) => api.delete(`/clients/${pid}/materials/${d._id}`))
  );

  const fd = new FormData();
  fd.append("visitDate",   date);
  fd.append("appointment", appointmentId);
  fd.append("activity",    slug);
  fd.append("file", new File([blob], fname, { type: "application/pdf" }));

  await api.post(`/clients/${pid}/materials`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}
