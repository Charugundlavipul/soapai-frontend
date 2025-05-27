// src/components/ProfileMenu.jsx
import { useState, useEffect, useRef } from 'react';
import { logout as apiLogout, getProfile } from '../services/api';
import {
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

export default function ProfileMenu({ onProfile }) {
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState({ name: '', email: '', avatarUrl: '' });
  const ref = useRef();

  /* fetch once */
  useEffect(() => {
    getProfile().then(r => setMe(r.data));
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const logout = async () => {
    await apiLogout();
    localStorage.removeItem('jwt');
    window.location.href = '/login';
  };

  return (
    <div className="relative" ref={ref}>
      {/* avatar + name + email act as the button */}
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-3">
        <img
          src={me.avatarUrl || '/assets/avatar.png'}
          className="h-9 w-9 rounded-full object-cover"
        />
        <div className="hidden sm:block text-left">
          <p className="font-medium leading-none max-w-[25ch] truncate">{me.name}</p>
          <p className="text-xs text-gray-500 max-w-[30ch] truncate">{me.email}</p>
        </div>
      </button>

      {/* dropdown */}
      {open && (
        <div className="absolute right-0 mt-3 w-72 bg-white rounded-xl shadow-xl z-50 p-4 space-y-4">
          {/* header */}
          <div className="flex items-center gap-3">
            <img
              src={me.avatarUrl || '/assets/avatar.png'}
              className="h-12 w-12 rounded-full object-cover"
            />
            <div className="min-w-0">
                <p className="font-semibold leading-5 break-words">{me.name}</p>
                <p className="text-xs text-gray-500 break-words">{me.email}</p>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* actions */}
          <button
            onClick={() => { setOpen(false); onProfile(); }}
            className="w-full flex items-center gap-3 text-sm py-2 rounded hover:bg-gray-100 transition"
          >
            <UserCircleIcon className="h-5 w-5 text-primary" />
            My Profile
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 text-sm py-2 rounded hover:bg-gray-100 transition"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 text-primary" />
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}
