import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

/**
 * SearchBar
 * @param {string}   placeholder
 * @param {function} onSearch   receives the term when 🔍 or Enter is pressed
 */
export default function SearchBar({ placeholder, value, onChange, onSearch }) {
    const [term, setTerm] = useState(value || '');

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setTerm(newValue);

        // Call onChange for real-time filtering
        if (onChange) {
            onChange(newValue);
        }
    };

    const submit = (e) => {
        e.preventDefault();
        if (onSearch) {
            onSearch(term.trim());
        }
    };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={term}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="flex-1 bg-white/90 backdrop-blur rounded-xl px-5 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
      />
      <button
        type="submit"
        className="h-10 w-12 rounded-xl bg-primary flex items-center justify-center"
      >
        <MagnifyingGlassIcon className="h-5 w-5 stroke-white" />
      </button>
    </form>
  );
}
