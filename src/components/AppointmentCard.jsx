import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon }           from '@heroicons/react/24/solid';
import { useNavigate }               from 'react-router-dom';

/**
 * AppointmentCard
 *  a        : appointment object (populated with group/patient **and video**)
 *  onEdit   : fn(a)   ← your existing Edit / Delete handler
 */
export default function AppointmentCard({ a, onEdit }) {
  const [open, setOpen] = useState(false);
  const ref   = useRef();
  const nav   = useNavigate();

  /* ─ close on outside click ─ */
  useEffect(() => {
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  /* status-chip colour */
  const cls = {
    upcoming : 'bg-primary/10 text-primary',
    ongoing  : 'bg-orange-400 text-white',
    completed: 'bg-gray-300 text-gray-700',
    cancelled: 'bg-red-400 text-white'
  }[a.status] || 'bg-gray-300 text-gray-700';

  /* ─ button helpers ─ */
  const toUpload = () => nav(`/appointments/${a._id}/upload`);
   const toReview = () => {
   const vid =
     typeof a.video === 'string'      // not populated → raw ObjectId
       ? a.video
       : a.video?._id;                // populated → {_id:…}
   if (!vid) return;                  // shouldn't happen
   nav(`/videos/${vid}/review?appt=${a._id}`);
 };


  return (
    <div ref={ref} className="border rounded-xl p-3 text-sm space-y-1">
      {/* header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <span className="font-medium">
            {a.type === 'group' ? a.group?.name : a.patient?.name}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${cls}`}>
            {a.status}
          </span>
        </div>
        <ChevronDownIcon
          className={`h-4 w-4 text-gray-500 cursor-pointer transition-transform ${open ? 'rotate-180' : ''}`}
          onClick={() => setOpen(o => !o)}
        />
      </div>

      {/* time row */}
      <p className="text-xs text-gray-500">
        {new Date(a.dateTimeStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        {' – '}
        {new Date(a.dateTimeEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>

      {/* dropdown */}
      {open && (
        <div className="flex gap-2 pt-3">
          {/* Upload **or** View, depending on whether a video exists */}
          {a.video
            ? (
              <button
                onClick={toReview}
                className="flex-1 py-1.5 rounded-xl bg-primary text-white text-xs hover:bg-primary/90">
                View Video
              </button>
            ) : (
              <button
                onClick={toUpload}
                className="flex-1 py-1.5 rounded-xl bg-primary text-white text-xs hover:bg-primary/90">
                Upload Video
              </button>
            )}

          {/* Edit / Delete */}
          <button
            onClick={() => onEdit(a)}
            className="flex-1 py-1.5 rounded-xl border border-primary text-primary text-xs hover:bg-primary/10">
            Edit / Delete
          </button>
        </div>
      )}
    </div>
  );
}
