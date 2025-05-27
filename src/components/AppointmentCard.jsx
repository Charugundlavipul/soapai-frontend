import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/solid';

/**
 * AppointmentCard
 *  a        : appointment object (populated with group/patient)
 *  onUpload : fn(a)      ← will open upload dialog later
 *  onEdit   : fn(a)      ← opens Edit / Delete modal
 */
export default function AppointmentCard({ a, onUpload, onEdit }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  /* close on outside click */
  useEffect(() => {
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  /* status chip colours (same as Dashboard) */
  const cls = {
    upcoming:  'bg-primary/10 text-primary',
    ongoing:   'bg-orange-400 text-white',
    completed: 'bg-gray-300 text-gray-700',
    cancelled: 'bg-red-400 text-white'
  }[a.status] || 'bg-gray-300 text-gray-700';

  return (
    <div ref={ref} className="border rounded-xl p-3 text-sm space-y-1">
      {/* top row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <span className="font-medium">
            {a.type === 'group' ? a.group?.name : a.patient?.name}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${cls}`}>
            {a.status}
          </span>
        </div>

        {/* arrow */}
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

      {/* dropdown buttons */}
      {open && (
        <div className="flex gap-2 pt-3">
          <button
            onClick={() => onUpload(a)}
            className="flex-1 py-1.5 rounded-xl bg-primary text-white text-xs hover:bg-primary/90">
            Upload Video
          </button>
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
