// src/components/ChipInput.jsx
import { useState } from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/solid';

/**
 * ChipInput
 *  ─ label       : heading text (string, optional)
 *  ─ value       : array of chips  (string[])
 *  ─ onChange    : fn(newArray)
 *  ─ placeholder : input placeholder
 *
 *  • “Add” button **or** Enter key inserts a chip
 *  • Chips render in a row below the input
 */
export default function ChipInput({ label, value, onChange, placeholder }) {
  const [draft, setDraft] = useState('');

  /* helpers */
  const addChip = () => {
    const txt = draft.trim();
    if (txt && !value.includes(txt)) onChange([...value, txt]);
    setDraft('');
  };
  const removeChip = chip => onChange(value.filter(c => c !== chip));

  return (
    <div className="space-y-2">
      {/* heading */}
      {label && <span className="block text-sm font-medium">{label}</span>}

      {/* input + Add button row */}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addChip();
            }
          }}
          placeholder={placeholder}
          className="flex-1 border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
        />
        <button
          type="button"
          onClick={addChip}
          className="px-4 rounded-xl bg-primary text-white flex items-center gap-1"
        >
          <PlusIcon className="h-4 w-4" /> Add
        </button>
      </div>

      {/* chips below */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {value.map(chip => (
            <span
              key={chip}
              className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs"
            >
              {chip}
              <XMarkIcon
                className="h-4 w-4 cursor-pointer"
                onClick={() => removeChip(chip)}
              />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
