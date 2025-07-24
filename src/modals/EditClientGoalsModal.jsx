"use client";
import { useEffect, useState } from "react";
import Modal                     from "../components/Modal";
import SavingToast               from "../components/savingToast";
import { ChevronRightIcon, XMarkIcon } from "@heroicons/react/24/solid";

import { getCategories } from "../services/api";
import api                from "../services/api";

/**
 * Props
 * ───────────────────────────────────────────────
 * open      : boolean
 * onClose   : () => void
 * clientId  : string     – _patient/ client_ id
 * current   : string[]   – existing goal names (optional, defaults [])
 * onSaved   : (newGoals: string[]) => void
 */
export default function EditClientGoalsModal({
  open,
  onClose,
  clientId,
  current = [],
  onSaved,
}) {
  /* ───── state ───── */
  const [cats, setCats] = useState([]);         // [{_id,name,goals:[{name}]}]
  const [sel , setSel ] = useState(current);    // names only
  const [busy, setBusy] = useState(false);

  /* expand accordion state */
  const [exp, setExp]   = useState(new Set());

  /* toast */
  const [toast, setToast] = useState({ show:false, msg:"", type:"success" });

  /* ───── load categories once on open ───── */
  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        const { data } = await getCategories();
        setCats(data);

        // auto-expand all categories that have any selected goal
        const openSet = new Set(
          data
            .filter(c => c.goals.some(g => current.includes(g.name)))
            .map(c => c._id)
        );
        setExp(openSet);
      } catch {
        setCats([]);
      }
    })();

    // reset toast whenever we reopen
    setToast({ show:false, msg:"", type:"success" });
  }, [open, current]);

  /* ───── helpers ───── */
  const toggleGoal   = (name) => setSel(s => s.includes(name) ? s.filter(g => g!==name) : [...s, name]);
  const clearAll     = ()    => setSel([]);
  const toggleCatExp = (id)  => setExp(s => { const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });

  /* ───── persist ───── */
  const save = async () => {
    setBusy(true);
    try {
      await api.patch(`/clients/${clientId}/goals`, { goals: sel });
      onSaved(sel);               // let parent update its state
      onClose();

      // success toast after close
      setTimeout(() => setToast({ show:true, msg:"Goals updated!", type:"success" }), 250);
    } catch (e) {
      setToast({
        show:true,
        msg: e.response?.data?.message || "Failed to update goals",
        type:"error",
      });
    } finally {
      setBusy(false);
    }
  };

  /* ───── early return when closed (still show toast) ───── */
  if (!open)
    return (
      <SavingToast
        show={toast.show}
        type={toast.type}
        message={toast.msg}
        onClose={()=>setToast(t=>({...t,show:false}))}
      />
    );

  /* ───── UI ───── */
  return (
    <>
      <Modal wide open={open} onClose={onClose} title="Edit Client Goals">
        <div className="space-y-6">
          {/* ---------------- Category list ---------------- */}
          <div className="max-h-[400px] overflow-y-auto border rounded-xl">
            {cats.length === 0 && (
              <div className="px-4 py-10 text-center text-gray-400 text-sm">
                No goals library found.
              </div>
            )}

            {cats.map(cat => (
              <div key={cat._id} className="border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleCatExp(cat._id)}
                  className="w-full px-4 py-3 flex justify-between items-center text-sm font-medium bg-gray-25 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <ChevronRightIcon
                      className={`w-4 h-4 text-gray-400 transition-transform ${exp.has(cat._id) ? "rotate-90" : ""}`}
                    />
                    {cat.name}
                  </div>
                  <span className="text-xs text-gray-400">
                    {cat.goals.length} goals
                  </span>
                </button>

                {exp.has(cat._id) && (
                  <div className="bg-gray-25">
                    {cat.goals.map(g => {
                      const picked = sel.includes(g.name);
                      return (
                        <button
                          key={g._id ?? g.name}
                          type="button"
                          onClick={() => toggleGoal(g.name)}
                          className={`w-full flex justify-between items-center pl-12 pr-4 py-2.5 text-left text-sm font-medium transition-colors ${picked?"bg-primary/5":"hover:bg-gray-50"}`}
                        >
                          <span className={picked?"text-primary":"text-gray-700"}>{g.name}</span>
                          {picked && (
                            <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center ml-2">
                              <svg viewBox="0 0 8 8" className="w-2 h-2 text-white fill-current">
                                <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z"/>
                              </svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ---------------- Selected pills ---------------- */}
          {sel.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Selected Goals ({sel.length})</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear all
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {sel.map(goal => (
                  <span key={goal} className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full px-3 py-1.5 text-sm">
                    {goal}
                    <button
                      type="button"
                      onClick={() => toggleGoal(goal)}
                      className="hover:bg-primary/20 rounded-full p-0.5"
                    >
                      <XMarkIcon className="h-3 w-3"/>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ---------------- Footer ---------------- */}
        <div className="flex justify-end gap-3 pt-6 border-t mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border border-primary text-primary hover:bg-primary/5"
          >
            Cancel
          </button>
          <button
            disabled={busy}
            onClick={save}
            className="px-6 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "Saving…" : `Save${sel.length ? ` (${sel.length})` : ""}`}
          </button>
        </div>
      </Modal>

      {/* error toast while modal open */}
      {toast.show && toast.type === "error" && (
        <SavingToast
          show      ={toast.show}
          type      ={toast.type}
          message   ={toast.msg}
          onClose   ={() => setToast(t=>({...t,show:false}))}
        />
      )}
    </>
  );
}
