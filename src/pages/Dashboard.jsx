// src/pages/Dashboard.jsx
import { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

import SearchBar from '../components/SearchBar';
import EditAppointmentModal from '../modals/EditAppointmentModal';
import AppointmentCard from '../components/AppointmentCard';
import AddButton from '../components/AddButton';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ClientCard from '../components/ClientCard';
import GroupCard from '../components/GroupCard';
import CalendarPanel from '../components/CalendarPanel';
import DeleteClientModal from '../modals/DeleteClientModal';
import DeleteGroupModal from '../modals/DeleteGroupModal';
import EditProfileModal from '../modals/EditProfileModal';

import NewClientModal from '../modals/NewClientModal';
import NewGroupModal from '../modals/NewGroupModal';
import NewAppointmentModal from '../modals/NewAppointmentModal';
import UploadVideoModal from '../modals/UploadVideoModal';

/* ────────────────────────────────────────────── */
export default function Dashboard() {
  const [clients, setClients] = useState([]);
  const [groups, setGroups] = useState([]);
  const [appts, setAppts] = useState([]);
  const [delClient, setDelClient] = useState(null);
  const [delGroup, setDelGroup] = useState(null);
  const [editAppt, setEditAppt] = useState(null);
  const [uploadAppt, setUploadAppt] = useState(null);
  const [showClient, setShowClient] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const [showAppt, setShowAppt] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const [selectedDay, setSelectedDay] = useState(new Date());

  // Search/filter state
  const [qClient, setQClient] = useState('');
  const [qGroup, setQGroup] = useState('');

  const nav = useNavigate();

  /* ─── Data fetch on mount ───────────────────────── */
  useEffect(() => {
    api.get('/clients').then(r => setClients(r.data));
    api.get('/groups').then(r => setGroups(r.data));
    api.get('/appointments').then(r => setAppts(r.data));
  }, []);

  useEffect(() => {
    const open = () => setShowProfile(true);
    window.addEventListener('open-profile', open);
    return () => window.removeEventListener('open-profile', open);
  }, []);

  /* ─── Filtered lists ────────────────────────────── */
  const filClients = useMemo(() => {
    // quick map: groupId -> group object
    const gMap = Object.fromEntries(groups.map(g => [g._id, g]));

    return clients
      .filter(c =>
        c.name.toLowerCase().includes(qClient.toLowerCase())
      )
      .map(c => ({
        ...c,
        // if c.group is an id and we have its record, replace with object
        group:
          typeof c.group === 'string' && gMap[c.group]
            ? gMap[c.group]
            : c.group,
      }));
  }, [clients, qClient, groups]);
  const filGroups = useMemo(
    () =>
      groups.filter(g =>
        g.name.toLowerCase().includes(qGroup.toLowerCase())
      ),
    [groups, qGroup]
  );

  /* ─── Appointments for the selected day ──────────── */
  const dayAppts = useMemo(() => {
    const key = format(selectedDay, 'yyyy-MM-dd');
    return appts.filter(
      a => format(new Date(a.dateTimeStart), 'yyyy-MM-dd') === key
    );
  }, [appts, selectedDay]);

  /* ─── Status Chip component ──────────────────────── */
  const Chip = ({ status }) => {
    const cls = {
      upcoming: 'bg-primary/10 text-primary',
      ongoing: 'bg-orange-400 text-white',
      completed: 'bg-gray-300 text-gray-700',
      cancelled: 'bg-red-400 text-white',
    }[status] || 'bg-gray-300 text-gray-700';
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${cls}`}>
        {status}
      </span>
    );
  };

  /* ────────────────────────── JSX ────────────────────────── */
  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-4 lg:p-6 grid lg:grid-cols-[280px_1fr_1fr] gap-6">
          {/* ── Calendar & Appointments Column ── */}
          <section className="space-y-4">
            <CalendarPanel value={selectedDay} onChange={setSelectedDay} />

            <button
              onClick={() => setShowAppt(true)}
              className="w-full py-2 rounded-xl bg-primary text-white"
            >
              New Appointment
            </button>

            <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
              {dayAppts.length ? (
                dayAppts.map(a => (
                  <AppointmentCard
                    key={a._id}
                    a={a}
                    onEdit={setEditAppt}
                    // You could also pass onUpload or onView if AppointmentCard supports it:
                    // onUpload={() => nav(`/appointments/${a._id}/upload`)}
                    // onView={(videoId) => nav(`/videos/${videoId}/review`)}
                  />
                ))
              ) : (
                <p className="text-sm text-gray-400 text-center mt-4">No appointments</p>
              )}
            </div>
          </section>

          {/* ── Clients Column ── */}
          <section className="space-y-4 p-6 bg-[#FAF8FF] rounded-xl">
            <h3 className="text-2xl font-semibold text-primary">Clients</h3>

            <SearchBar
              placeholder="Search For Clients"
              onSearch={q => setQClient(q)}
            />

            <AddButton text="New Client" onClick={() => setShowClient(true)} />

            <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
              {filClients.map(c => (
                <ClientCard
                  key={c._id}
                  c={c}
                  onDelete={c => setDelClient(c)}
                  onEdit={c => nav(`/clients/${c._id}/edit`)}
                />
              ))}
            </div>
          </section>

          {/* ── Groups Column ── */}
          <section className="space-y-4 p-6 bg-[#FAF8FF] rounded-xl">
            <h3 className="text-2xl font-semibold text-primary">Group Sessions</h3>

            <SearchBar
              placeholder="Search For Group Sessions"
              onSearch={q => setQGroup(q)}
            />

            <AddButton text="New Group Session" onClick={() => setShowGroup(true)} />

            <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
              {filGroups.map(g => (
                <GroupCard
                  key={g._id}
                  g={g}
                  onDelete={g => setDelGroup(g)}
                />
              ))}
            </div>
          </section>
        </main>
      </div>

      {/* ── Modals ── */}
      <NewClientModal
        open={showClient}
        onClose={() => setShowClient(false)}
        onCreated={c => setClients(prev => [c, ...prev])}
      />
      <NewGroupModal
        open={showGroup}
        onClose={() => setShowGroup(false)}
        onCreated={g => setGroups(prev => [g, ...prev])}
      />
      <NewAppointmentModal
        open={showAppt}
        onClose={() => setShowAppt(false)}
        onCreated={a => {
          setAppts(prev => [a, ...prev]);
          setSelectedDay(new Date(a.dateTimeStart));
        }}
      />
      <DeleteClientModal
        open={!!delClient}
        client={delClient}
        onClose={() => setDelClient(null)}
        onDeleted={c => setClients(list => list.filter(x => x._id !== c._id))}
      />

      <DeleteGroupModal
        open={!!delGroup}
        group={delGroup}
        onClose={() => setDelGroup(null)}
        onDeleted={g => setGroups(list => list.filter(x => x._id !== g._id))}
      />

      <EditProfileModal open={showProfile} onClose={() => setShowProfile(false)} />

      <EditAppointmentModal
        open={!!editAppt}
        appt={editAppt}
        onClose={() => setEditAppt(null)}
        onUpdated={u => setAppts(p => p.map(x => (x._id === u._id ? u : x)))}
        onDeleted={d => setAppts(p => p.filter(x => x._id !== d._id))}
      />

      <UploadVideoModal
        open={!!uploadAppt}
        appointment={uploadAppt}
        onClose={() => setUploadAppt(null)}
      />
    </div>
  );
}
