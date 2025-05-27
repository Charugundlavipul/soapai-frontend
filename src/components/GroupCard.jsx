import { useState } from 'react';
import { ChevronDownIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/solid';

export default function GroupCard({ g, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      onClick={() => setOpen(o => !o)}
      className="border rounded-xl p-3 cursor-pointer hover:bg-gray-50 transition"
    >
      <div className="flex items-center gap-3">
        <img
          src={g.avatarUrl || '/assets/group.png'}
          className="h-10 w-10 rounded-full object-cover"
        />
        <div className="flex-1">
          <p className="font-medium">{g.name}</p>
          <p className="text-xs text-gray-500">Clients : {g.patients.length}</p>
        </div>
        <ChevronDownIcon
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {open && (
        <div className="mt-3 space-y-2 pl-13">
          <p className="text-xs text-gray-400">Last Visit : 17th July</p>

          <div className="flex gap-3 pt-2">
            <button
              onClick={e => { e.stopPropagation(); onEdit?.(g); }}
              className="flex-1 py-1 rounded bg-primary text-white text-sm flex items-center justify-center gap-1"
            >
              <PencilIcon className="h-4 w-4" /> Edit Group
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(g); }}
              className="flex-1 py-1 rounded border border-primary text-primary text-sm flex items-center justify-center gap-1"
            >
              <TrashIcon className="h-4 w-4" /> Delete Group
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
