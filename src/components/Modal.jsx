// src/components/Modal.jsx
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/solid';

export default function Modal({ open, onClose, title, children , wide = false}) {
  if (!open) return null;                    // keep DOM clean when closed

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* overlay */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />

      {/* card */}
      <div
        onClick={e => e.stopPropagation()}    // ← blocks bubbling
         className={`relative w-full
                    ${wide ? "max-w-[92vw] md:max-w-[800px]"
                           : "max-w-md"}
                    bg-white rounded-2xl p-6 space-y-4 shadow-xl`}
       >
      
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-primary">{title}</h2>
          <button onClick={onClose}>
            <XMarkIcon className="h-5 w-5 text-primary" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
