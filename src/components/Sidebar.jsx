import { CalendarIcon, UsersIcon, BookOpenIcon } from '@heroicons/react/24/solid';
import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  /* shared Tailwind presets */
  const link   = 'flex items-center gap-3 px-4 py-3 rounded-lg text-sm hover:bg-gray-100';
  const active = 'bg-gray-100 text-primary font-medium';

  return (
    <aside className="w-16 lg:w-56 border-r p-4 space-y-4">
      <NavLink to="/" end   className={({ isActive }) => `${link} ${isActive ? active : ''}`}>
        <CalendarIcon className="h-6 w-6" />
        <span className="hidden lg:inline">Dashboard</span>
      </NavLink>

      <NavLink to="/clients" className={({ isActive }) => `${link} ${isActive ? active : ''}`}>
        <UsersIcon className="h-6 w-6" />
        <span className="hidden lg:inline">Clients</span>
      </NavLink>

      {/* Behaviours — uses the SAME presets */}
      <NavLink to="/behaviours" className={({ isActive }) => `${link} ${isActive ? active : ''}`}>
        <BookOpenIcon className="h-6 w-6" />
        <span className="hidden lg:inline">Behaviours</span>
      </NavLink>
    </aside>
  );
}
