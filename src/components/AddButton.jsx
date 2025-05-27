import { PlusIcon } from '@heroicons/react/24/outline';

/**
 * pill-style “New …” button
 * @param {string}   text
 * @param {function} onClick
 */
export default function AddButton({ text, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-white/90 backdrop-blur rounded-xl px-4 py-3 border border-primary text-primary font-medium hover:bg-primary/10 transition"
    >
      <span className="flex items-center justify-center h-6 w-6 rounded-lg border-2 border-primary">
        <PlusIcon className="h-4 w-4 stroke-primary" />
      </span>
      {text}
    </button>
  );
}
