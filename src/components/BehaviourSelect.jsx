import { useEffect, useState } from 'react';
import { getBehaviours } from '../services/api';
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/solid';

export default function BehaviourSelect({ value, onChange ,showChips=false}) {
  const [behaviours, setBehaviours] = useState([]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => { getBehaviours().then(r => setBehaviours(r.data)); }, []);

  const filtered = behaviours.filter(b =>
    !value.includes(b._id) && b.name.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="relative space-y-2">
      <label className="block text-sm font-medium">Behaviour Bank</label>

      {/* search box */}
      <div
        className="flex items-center border rounded-xl px-3 py-2 cursor-pointer"
        onClick={() => setOpen(o => !o)}
      >
        <input
          placeholder="+ Click to Select"
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          className="flex-1 outline-none"
        />
        <ChevronDownIcon className="h-4 w-4 text-gray-400" />
      </div>

      {/* dropdown */}
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 bg-white border rounded-xl w-full max-h-44 overflow-y-auto mt-1">
          {filtered.map(b => (
            <li key={b._id}
              onClick={() => { onChange([...value, b]); setQ(''); }}
              className="px-4 py-2 text-sm hover:bg-primary/10 cursor-pointer">
              {b.name}
            </li>
          ))}
        </ul>
      )}

      {/* chips (optionally hidden) */}
      {showChips && value.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {value.map(b => (
            <span key={b._id}
              className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
              {b.name}
              <XMarkIcon className="h-4 w-4 cursor-pointer"
                onClick={() => onChange(value.filter(x => x._id !== b._id))} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
