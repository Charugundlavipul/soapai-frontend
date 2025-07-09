"use client"

// src/pages/Dashboard.jsx
import { useEffect, useState, useMemo } from "react"
import { format } from "date-fns"
import { useNavigate } from "react-router-dom"
import api from "../services/api"
import { differenceInCalendarDays, isAfter, addDays } from "date-fns"
import SearchBar from "../components/SearchBar"
import EditAppointmentModal from "../modals/EditAppointmentModal"
import AppointmentCard from "../components/AppointmentCard"
import AddButton from "../components/AddButton"
import EditGroupAppointmentModal from "../modals/EditGroupAppointmentModal"
import Navbar from "../components/Navbar"
import Sidebar from "../components/Sidebar"
import ClientCard from "../components/ClientCard"
import GroupCard from "../components/GroupCard"
import CalendarPanel from "../components/CalendarPanel"
import DeleteClientModal from "../modals/DeleteClientModal"
import DeleteGroupModal from "../modals/DeleteGroupModal"
import EditProfileModal from "../modals/EditProfileModal"
import SavingToast from "../components/savingToast"

import NewClientModal from "../modals/NewClientModal"
import NewGroupModal from "../modals/NewGroupModal"
import NewAppointmentModal from "../modals/UpdatedAppointmentModal"
import UploadVideoModal from "../modals/UploadVideoModal"

/* ────────────────────────────────────────────── */
export default function Dashboard() {
  const [clients, setClients] = useState([])
  const [groups, setGroups] = useState([])
  const [appts, setAppts] = useState([])
  const [delClient, setDelClient] = useState(null)
  const [delGroup, setDelGroup] = useState(null)
  const [editAppt, setEditAppt] = useState(null)
  const [uploadAppt, setUploadAppt] = useState(null)
  const [showClient, setShowClient] = useState(false)
  const [showGroup, setShowGroup] = useState(false)
  const [showAppt, setShowAppt] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [editGrpAppt, setEditGrpAppt] = useState(null)
  const DAYS_AHEAD = 100
  // Toast state
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [toastType, setToastType] = useState("success")

  const [selectedDay, setSelectedDay] = useState(new Date())
  // Track expanded states for cards
  const [expandedClients, setExpandedClients] = useState(new Set())
  const [expandedGroups, setExpandedGroups] = useState(new Set())

  // Search/filter state
  const [qClient, setQClient] = useState("")
  const [qGroup, setQGroup] = useState("")

  const nav = useNavigate()

  /* ─── Data fetch on mount ───────────────────────── */
  useEffect(() => {
    api.get("/clients").then((r) => setClients(r.data))
    api.get("/groups").then((r) => setGroups(r.data))
    api.get("/appointments").then((r) => setAppts(r.data))
  }, [])

  useEffect(() => {
    const open = () => setShowProfile(true)
    window.addEventListener("open-profile", open)
    return () => window.removeEventListener("open-profile", open)
  }, [])

  /* ─── Filtered lists ────────────────────────────── */
  const filClients = useMemo(() => {
    // quick map: groupId -> group object
    const gMap = Object.fromEntries(groups.map((g) => [g._id, g]))

    return clients
        .filter((c) => c.name.toLowerCase().includes(qClient.toLowerCase()))
        .map((c) => ({
          ...c,
          // if c.group is an id and we have its record, replace with object
          group: typeof c.group === "string" && gMap[c.group] ? gMap[c.group] : c.group,
        }))
  }, [clients, qClient, groups])

  /* ─── upcoming Group-appointments, merged with full Group objects ─── */
  const groupAppts = useMemo(() => {
    const now = new Date()
    const horizon = addDays(now, DAYS_AHEAD)

    // 1️⃣  bucket every future appointment by its group id
    const byGroup = {}
    appts
        .filter((a) => a.type === "group" && a.group && isAfter(new Date(a.dateTimeStart), now))
        .forEach((a) => {
          const gid = a.group._id
          byGroup[gid] = [...(byGroup[gid] || []), a]
        })

    // 2️⃣  keep only groups whose *next* session is within the window
    return Object.values(byGroup)
        .map((list) => list.sort((a, b) => new Date(a.dateTimeStart) - new Date(b.dateTimeStart)))
        .filter((sorted) => differenceInCalendarDays(new Date(sorted[0].dateTimeStart), now) <= DAYS_AHEAD)
        .reduce((map, list) => {
            const next   = list[0];             // soonest appointment
            const gid    = next.group._id;
            const fullG  = groups.find(g => g._id === gid) || next.group;

            // 3️⃣ Filter by search query - check if group name matches search
            if (qGroup && !fullG.name.toLowerCase().includes(qGroup.toLowerCase())) {
                return map; // Skip this group if it doesn't match search
            }

            map[gid] = {
                ...next,
                group      : fullG,               // full Group document
                futureCount: list.length,         // how many upcoming in total
            };
            return map;
        }, {})
  }, [appts, groups, qGroup])

  /* ─── Appointments for the selected day ──────────── */
  const dayAppts = useMemo(() => {
    const key = format(selectedDay, "yyyy-MM-dd")
    return appts.filter((a) => format(new Date(a.dateTimeStart), "yyyy-MM-dd") === key)
  }, [appts, selectedDay])

  const nextApptOf = useMemo(() => {
    const now = Date.now()
    const map = {}
    appts
        .filter((a) => a.type === "group" && a.group?._id)
        .forEach((a) => {
          const gid = a.group._id
          const ts = new Date(a.dateTimeStart).getTime()
          if (ts >= now && (!map[gid] || ts < new Date(map[gid].dateTimeStart).getTime())) map[gid] = a
        })
    return map // { groupId: appointmentObj }
  }, [appts])

  /* ─── Toast handlers ──────────────────────────── */
  const handleToastClose = () => {
    setShowToast(false)
  }

  const showSuccessToast = (message) => {
    setToastMessage(message)
    setToastType("success")
    setShowToast(true)
  }

  /* remove ONE appointment (may or may not leave the group intact) */
  const handleGroupApptDeleted = (appt) => {
    /* drop the appointment row */
    setAppts((list) => list.filter((a) => a._id !== appt._id))

    /* if that was the *last* appt for this group, also nuke the group row
       from the Dashboard list – the DB is already cleaned up by the backend */
    const stillHas = (list) =>
        list.some((a) => a.type === "group" && a.group?._id === appt.group._id && a._id !== appt._id)
    if (!stillHas(appts)) {
      setGroups((gs) => gs.filter((g) => g._id !== appt.group._id))
    }

    showSuccessToast("Appointment deleted.")
  }

  const showErrorToast = (message) => {
    setToastMessage(message)
    setToastType("error")
    setShowToast(true)
  }

  /* ─── Event handlers ──────────────────────────── */
  const handleClientCreated = (client) => {
    setClients((prev) => [client, ...prev])
    showSuccessToast(`Client "${client.name}" created successfully!`)
  }

  const handleGroupCreated = (group) => {
    setGroups((prev) => [group, ...prev])
    showSuccessToast(`Group session "${group.name}" created successfully!`)
  }

  const handleAppointmentCreated = (appointment) => {
    setAppts((prev) => [appointment, ...prev])
    setSelectedDay(new Date(appointment.dateTimeStart))
    showSuccessToast("Appointment created successfully!")
  }

  const handleClientDeleted = (client) => {
    setClients((list) => list.filter((x) => x._id !== client._id))
    showSuccessToast(`Client "${client.name}" deleted successfully.`)
  }

  const handleGroupDeleted = (group) => {
    setGroups((list) => list.filter((x) => x._id !== group._id))
    /* also drop every appointment that belonged to this group */
    setAppts((list) => list.filter((a) => !(a.type === "group" && a.group?._id === group._id)))
    showSuccessToast(`Group session "${group.name}" and its appointments were deleted.`)
  }

  /* ─── Status Chip component ──────────────────────── */
  const Chip = ({ status }) => {
    const cls =
        {
          upcoming: "bg-primary/10 text-primary",
          ongoing: "bg-orange-400 text-white",
          completed: "bg-gray-300 text-gray-700",
          cancelled: "bg-red-400 text-white",
        }[status] || "bg-gray-300 text-gray-700"
    return <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${cls}`}>{status}</span>
  }

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

              <button onClick={() => setShowAppt(true)} className="w-full py-2 rounded-xl bg-primary text-white">
                New Appointment
              </button>

              <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                {dayAppts.length ? (
                    dayAppts.map((a) => (
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

              <SearchBar placeholder="Search For Clients" value={qClient} onChange={setQClient} onSearch={setQClient} />

              <AddButton text="New Client" onClick={() => setShowClient(true)} />

              <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
                {filClients.map((c) => (
                    <ClientCard
                        key={c._id}
                        c={c}
                        onDelete={(c) => setDelClient(c)}
                        onEdit={(c) => nav(`/clients/${c._id}/edit`)}
                        isExpanded={expandedClients.has(c._id)}
                        onToggleExpanded={() => {
                          const newExpanded = new Set(expandedClients)
                          if (newExpanded.has(c._id)) {
                            newExpanded.delete(c._id)
                          } else {
                            newExpanded.add(c._id)
                          }
                          setExpandedClients(newExpanded)
                        }}
                    />
                ))}
              </div>
            </section>

            {/* ── Groups Column ── */}
            <section className="space-y-4 p-6 bg-[#FAF8FF] rounded-xl">
              <h3 className="text-2xl font-semibold text-primary">Group Sessions</h3>

              <SearchBar
                  placeholder="Search For Group Sessions"
                  value={qGroup}
                  onChange={setQGroup}
                  onSearch={setQGroup}
              />

              <AddButton text="New Group Session" onClick={() => setShowGroup(true)} />

              <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
                {Object.values(groupAppts).length ? (
                    Object.values(groupAppts).map((appt) => (
                        <GroupCard
                            key={appt.group._id}
                            g={appt.group} /* full Group object           */
                            appt={appt}
                            futureCount={appt.futureCount} /* ← pass full appointment     */
                            nextSession={appt.dateTimeStart}
                            onDelete={() => setDelGroup(appt)}
                            onEdit={setEditGrpAppt} /* ← opens EditGroupAppointmentModal */
                            isExpanded={expandedGroups.has(appt.group._id)}
                            onToggleExpanded={() => {
                              const s = new Set(expandedGroups)
                              s.has(appt.group._id) ? s.delete(appt.group._id) : s.add(appt.group._id)
                              setExpandedGroups(s)
                            }}
                        />
                    ))
                ) : (
                    <p className="text-sm text-gray-400 text-center mt-4">No group appointments</p>
                )}
              </div>
            </section>
          </main>
        </div>

        {/* ── Modals ── */}
        <NewClientModal open={showClient} onClose={() => setShowClient(false)} onCreated={handleClientCreated} />
        <NewGroupModal open={showGroup} onClose={() => setShowGroup(false)} onCreated={handleGroupCreated} />
        <NewAppointmentModal open={showAppt} onClose={() => setShowAppt(false)} onCreated={handleAppointmentCreated} />
        <DeleteClientModal
            open={!!delClient}
            client={delClient}
            onClose={() => setDelClient(null)}
            onDeleted={handleClientDeleted}
        />

        <DeleteGroupModal
            open={!!delGroup}
            appt={delGroup}
            onClose={() => setDelGroup(null)}
            onDeleted={handleGroupDeleted} // “Delete ALL Appointments”
            onApptDeleted={handleGroupApptDeleted} /* “Delete This Appointment” */
        />

        <EditProfileModal open={showProfile} onClose={() => setShowProfile(false)} />

        <EditAppointmentModal
            open={!!editAppt}
            appt={editAppt}
            onClose={() => setEditAppt(null)}
            onUpdated={(u) => setAppts((p) => p.map((x) => (x._id === u._id ? u : x)))}
            onDeleted={(d) => setAppts((p) => p.filter((x) => x._id !== d._id))}
        />

        <UploadVideoModal open={!!uploadAppt} appointment={uploadAppt} onClose={() => setUploadAppt(null)} />

        <EditGroupAppointmentModal
            open={!!editGrpAppt}
            appt={editGrpAppt}
            onClose={() => setEditGrpAppt(null)}
            onUpdated={(upd) => setAppts((p) => p.map((a) => (a._id === upd._id ? upd : a)))}
        />

        {/* Success/Error Toast */}
        <SavingToast show={showToast} message={toastMessage} type={toastType} onClose={handleToastClose} />
      </div>
  )
}
