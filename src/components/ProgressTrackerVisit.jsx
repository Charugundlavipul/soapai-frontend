"use client";
import { useState, useEffect } from "react";


export default function ProgressTrackerVisit({
  rows,                // [{ name, latest, visitProgress }]
  onChange            // (idx, newVal) => void
              // boolean
}) {
  return (
    <div className="bg-[#F5F4FB] rounded-2xl p-6 shadow-sm space-y-6">
      <h4 className="text-xl font-semibold text-gray-800">Progress Tracker</h4>

      {rows.length === 0 && (
        <div className="text-center py-12 text-gray-400 border-2 border-dashed
                        border-gray-200 rounded-xl bg-white">
          No goals selected for this session
        </div>
      )}

      {rows.map((g, i) => (
        <div key={g.name} className="bg-white rounded-xl border shadow-sm">
          <div className="px-6 py-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h5 className="font-semibold text-gray-900">{g.name}</h5>
              <span className="text-xs text-gray-500">
                Overall Goal Progress&nbsp;{g.latest}%   {/* from profile */}
              </span>
            </div>

            {/* slider row */}
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                value={g.visitProgress}
                /* 1️⃣ live feedback while dragging */
                onChange={e => onChange(i, e.target.value)}

                /* 2️⃣ “commit” the value – cover every pointer flavour                         */
                onMouseUp   ={e => onChange(i, +e.target.value, true)}  /* desktop            */
                onTouchEnd  ={e => onChange(i, +e.target.value, true)}  /* mobile Safari etc. */
                onPointerUp ={e => onChange(i, +e.target.value, true)}  /* pen / hybrid       */

                className="flex-1 accent-primary"
                />
              <span className="w-12 text-right text-sm font-medium">
                {g.visitProgress}%
              </span>
            </div>

            
          </div>
        </div>
      ))}

     
    </div>
  );
}
