import { useState, useMemo, useRef, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

/**
 * MemberSelect
 *  clients  : [{_id,name}]
 *  value    : array of selected IDs
 *  onChange : fn(newIds[])
 */
export default function MemberSelect({ clients, value, onChange }) {
  const [query, setQuery] = useState('');
  const [open,  setOpen]  = useState(false);
  const boxRef = useRef();

  /* close dropdown on outside click */
  useEffect(()=>{
    const close = e => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return ()=>document.removeEventListener('mousedown', close);
  },[]);

  const filtered = useMemo(()=>{
    const q = query.toLowerCase();
    return clients
      .filter(c => !value.includes(c._id) && c.name.toLowerCase().includes(q))
      .slice(0, 8);
  },[clients, query, value]);

  const add = c => {
    onChange([...value, c._id]);
    setQuery('');
    setOpen(false);
  };
  const remove = id => onChange(value.filter(x=>x!==id));

  /* helper to get name from id */
  const id2name = id => clients.find(c=>c._id===id)?.name || id;

  return (
    <div ref={boxRef} className="space-y-2">
      <label className="block text-sm font-medium">Member Selection</label>

      {/* search box */}
      <input
        value={query}
        onChange={e=>{ setQuery(e.target.value); setOpen(true); }}
        onFocus={()=>setOpen(true)}
        placeholder="Search for patient..."
        className="w-full border rounded-xl px-4 py-2 text-sm focus:ring-primary outline-none"
      />

      {/* dropdown */}
      {open && filtered.length > 0 && (
        <ul className="absolute mt-1 w-full max-h-56 overflow-y-auto bg-white border rounded-xl shadow z-50">
          {filtered.map(c=>(
            <li key={c._id}
              onClick={()=>add(c)}
              className="px-4 py-2 text-sm hover:bg-primary/10 cursor-pointer"
            >
              {c.name}
            </li>
          ))}
        </ul>
      )}

      {/* chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {value.map(id=>(
            <span key={id}
              className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
              {id2name(id)}
              <XMarkIcon className="h-4 w-4 cursor-pointer" onClick={()=>remove(id)}/>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
