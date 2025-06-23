// Input.jsx
import { ChevronDown } from "lucide-react";
export function Input({ label, value, onChange, ...rest }) {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm">{label}</label>}
      <input
        value={value ?? ''}
        onChange={onChange}
        {...rest}
        className="w-full px-4 py-2 rounded-xl bg-gray-100
                   focus:bg-white focus:ring-2 focus:ring-primary outline-none"
      />
    </div>
  );
}

export function Select({ label, value, onChange, children, ...rest }) {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm">{label}</label>}

      <div className="relative">
        {/* 
          1) appearance-none  → remove native arrow 
          2) pr-10           → give room for our custom icon 
          3) bg-gray-100     → background when unfocused 
          4) focus:bg-white  → background when focused 
          5) focus:ring-2…   → focus ring 
        */}
        <select
          value={value}
          onChange={onChange}
          {...rest}
          className="
            w-full
            px-4
            py-2
            pr-10
            rounded-xl
            bg-gray-100
            appearance-none
            focus:bg-white
            focus:ring-2
            focus:ring-primary
            outline-none
          "
        >
          {children}
        </select>

        {/* 
          Custom arrow icon. 
          - `pointer-events-none` so clicks go through to <select>.
          - `right-3` for a little inset from the edge.
          - `top-1/2 -translate-y-1/2` to vertically center.
        */}
        <ChevronDown
          className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500"
          size={16}
        />
      </div>
    </div>
  );
}

