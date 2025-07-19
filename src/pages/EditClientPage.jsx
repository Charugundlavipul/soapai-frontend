/* ────────────────────────────────────────────────────── */
/* src/pages/EditClientPage.jsx                          */
/* drop-in replacement – tested with React 18 + Vite     */
/* ────────────────────────────────────────────────────── */

"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import api from "../services/api";

import Avatar from "../components/Avatar";
import Navbar from "../components/Navbar";
import EditClientProfileModal from "../modals/EditClientProfileModal";
import GoalPickerModal from "../modals/GoalPickerModal"; // Changed from EditGoalsModal
import SavingToast from "../components/savingToast";
import CustomDatePicker from "../components/CustomDatePicker"; // Added CustomDatePicker import

import { ChevronLeft, Pencil, CalendarDays, BookOpen, LineChartIcon as ChartLine, ChevronRight, Download } from 'lucide-react';

import {
    ResponsiveContainer,
    LineChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Line,
} from "recharts";

/* ────────────────── Helpers ────────────────── */
const VisitRow = ({ v }) => (
    <details className="bg-white rounded-lg shadow-sm cursor-pointer">
        <summary className="px-5 py-4 flex justify-between items-center list-none">
            <span className="font-medium text-primary">{v.dateString}</span>
            <span className="text-primary">▾</span>
        </summary>
        <div className="px-5 py-4 border-t text-sm text-gray-700 whitespace-pre-wrap">
            {v.note || "No notes."}
        </div>
    </details>
);

/* ────────────────── Main page ────────────────── */
export default function EditClientPage() {
    const { id } = useParams();
    const nav = useNavigate();

    /* basic state */
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [client, setClient] = useState(null);
    const [groups, setGroups] = useState([]);

    /* ui state */
    const [activeTab, setActiveTab] = useState("visitHistory");
    const [showEdit, setShowEdit] = useState(false);
    const [showGoals, setShowGoals] = useState(false);

    /* toast */
    const [toast, setToast] = useState({
        show: false,
        msg: "",
        type: "success",
    });

    /* ───── fetch profile (+ groups) ───── */
    useEffect(() => {
        (async () => {
            try {
                const { data } = await axios.get(
                    `http://localhost:4000/api/clients/${id}/profile`,
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem("jwt")}`,
                        },
                    }
                );
                const { data: g } = await axios.get("http://localhost:4000/api/groups", {
                    headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` },
                });

                setClient(data);
                setGroups(g);
            } catch (e) {
                setError(e.response?.data?.message || "Unable to load client.");
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    /* ───── helpers ───── */
    const renderVisitRows = () =>
        client.visitHistory?.map((v, i) => (
            <VisitRow
                key={v._id ?? i}
                v={{
                    dateString:
                        v.dateString ??
                        new Date(v.date).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                        }),
                    note: v.note ?? "No notes.",
                }}
            />
        ));

    /* ───── save handlers ───── */
    async function saveProfile(payload) {
        try {
            const { avatarFile, ...rest } = payload;
            const hasFile = avatarFile instanceof File;

            const headers = {
                Authorization: `Bearer ${localStorage.getItem("jwt")}`,
                ...(hasFile ? {} : { "Content-Type": "application/json" }),
            };

            const body = hasFile
                ? (() => {
                    const f = new FormData();
                    Object.entries(rest).forEach(([k, v]) =>
                        f.append(k, Array.isArray(v) ? JSON.stringify(v) : v ?? "")
                    );
                    f.append("avatar", avatarFile);
                    return f;
                })()
                : rest;

            const { data } = await axios.put(
                `http://localhost:4000/api/clients/${id}`,
                body,
                { headers }
            );
            setClient((c) => ({ ...c, ...data }));
            setShowEdit(false);
            setToast({ show: true, msg: "Profile updated!", type: "success" });
        } catch (e) {
            alert(e.response?.data?.message || "Update failed");
        }
    }

    // Removed saveGoals function as GoalPickerModal handles saving internally

    /* ───── guards ───── */
    if (loading)
        return (
            <div className="min-h-screen flex flex-col bg-white">
                <Navbar />
                <div className="flex-1 flex items-center justify-center text-gray-500">
                    Loading…
                </div>
            </div>
        );

    if (error || !client)
        return (
            <div className="min-h-screen flex flex-col bg-white">
                <Navbar />
                <div className="flex-1 flex items-center justify-center text-red-600">
                    {error || "Client not found."}
                </div>
            </div>
        );

    /* ───── UI ───── */
    return (
        <div className="min-h-screen flex flex-col bg-white">
            <Navbar />

            {/* toast */}
            <SavingToast
                show={toast.show}
                message={toast.msg}
                type={toast.type}
                onClose={() => setToast((t) => ({ ...t, show: false }))}
            />

            {/* modals */}
            <EditClientProfileModal
                open={showEdit}
                onClose={() => setShowEdit(false)}
                client={client}
                onSave={saveProfile}
                groups={groups}
            />
            <GoalPickerModal // Changed from EditGoalsModal
                open={showGoals}
                onClose={() => setShowGoals(false)}
                video={{ // GoalPickerModal expects a 'video' prop, adapting it for client goals
                    _id: client._id,
                    appointment: client.lastAppointmentId || "individual-session", // Provide a dummy appointment type if none exists
                    goals: client.goals || [],
                }}
                onSaved={(updatedData) => { // GoalPickerModal's onSaved callback
                    setClient((c) => ({ ...c, goals: updatedData.goals }));
                    setShowGoals(false);
                    setToast({ show: true, msg: "Goals updated!", type: "success" });
                }}
            />

            <main className="flex-1 p-6 max-w-7xl mx-auto space-y-6">
                {/* header */}
                <div className="flex items-center gap-3 justify-center mb-6">
                    <button onClick={() => nav(-1)}>
                        <ChevronLeft className="w-6 h-6 text-gray-600 hover:text-gray-800" />
                    </button>
                    <h2 className="text-2xl font-semibold text-gray-800">
                        Client Profile
                    </h2>
                </div>

                <div className="grid grid-cols-12 gap-6">
                    {/* left */}
                    <LeftSummary
                        client={client}
                        groups={groups}
                        onEditProfile={() => setShowEdit(true)}
                        onEditGoals={() => setShowGoals(true)}
                    />

                    {/* right */}
                    <RightTabs
                        client={client}
                        setClient={setClient}
                        attendance={client.attendance || []}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        renderVisitRows={renderVisitRows}
                        setToast={setToast}
                    />
                </div>
            </main>
        </div>
    );
}

/* ────────── Left column ────────── */
function LeftSummary({ client, groups, onEditProfile, onEditGoals }) {
    return (
        <div className="col-span-4 flex flex-col gap-6">
            {/* avatar header */}
            <div className="flex items-start gap-4">
                <Avatar
                    url={client.avatarUrl}
                    name={client.name}
                    className="w-20 h-20 rounded-full border-2 border-primary"
                />

                <div className="flex-1">
                    <h3 className="text-[1.35rem] font-semibold text-gray-900">
                        {client.name}
                    </h3>

                    <div className="mt-1 text-sm space-y-0.5 text-gray-600">
                        <Row label="Age" value={client.age ?? "—"} />
                        <Row
                            label="Joined"
                            value={
                                client.createdAt
                                    ? new Date(client.createdAt).toLocaleDateString("en-GB", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                    })
                                    : "—"
                            }
                        />
                        <Row
                            label="Last Visit"
                            value={
                                client.visitHistory?.length
                                    ? new Date(
                                        client.visitHistory.at(-1).date
                                    ).toLocaleDateString("en-GB", {
                                        day: "2-digit",
                                        month: "long",
                                        year: "numeric",
                                    })
                                    : "—"
                            }
                        />
                    </div>
                </div>

                {/* edit */}
                <button
                    onClick={onEditProfile}
                    className="p-1.5 rounded-full hover:bg-primary/10"
                    title="Edit profile"
                >
                    <Pencil className="w-[15px] h-[15px] text-primary" />
                </button>
            </div>

            {/* about card */}
            <div className="bg-[#F5F4FB] rounded-2xl p-6 shadow-sm space-y-5">
                <h4 className="text-xl font-semibold text-primary mb-1">
                    About&nbsp;{client.name.split(" ")[0]}
                </h4>

                <dl className="space-y-2 text-sm">
                    <Row label="Name" value={client.name} />
                    <Row label="Age" value={client.age ?? "—"} />
                    <Row
                        label="Diagnosis"
                        value={(client.pastHistory ?? []).join(", ") || "—"}
                    />
                    <Row label="Grade" value={client.grade || "—"} />
                </dl>

                {/* goals */}
                <div className="space-y-3">
                    <p className="font-semibold text-gray-700">Current Goals:</p>

                    <div className="bg-primary/5 rounded-xl p-4 flex flex-wrap gap-3">
                        {client.goals?.length ? (
                            client.goals.map((g) => (
                                <span
                                    key={g}
                                    className="px-3 py-1 bg-white text-primary rounded-full text-xs font-medium shadow-sm"
                                >
                  {g}
                </span>
                            ))
                        ) : (
                            <span className="text-xs italic text-gray-400">None yet</span>
                        )}
                    </div>

                    <button
                        onClick={onEditGoals}
                        className="w-full mt-1 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90"
                    >
                        Edit Goals
                    </button>
                </div>
            </div>
        </div>
    );
}
const Row = ({ label, value }) => (
    <div className="flex">
        <dt className="w-28 font-semibold text-gray-700">{label}:</dt>
        <dd className="text-gray-900 break-words">{value}</dd>
    </div>
);

/* ────────── Right tabs ────────── */
function RightTabs({
                       activeTab,
                       setActiveTab,
                       renderVisitRows,
                       client,
                       setClient,
                       attendance,
                       setToast,
                   }) {
    /* group materials by visitDate */
    const groupedMaterials = (() => {
        const out = {};
        (client.materials || []).forEach((m) => {
            const key = new Date(m.visitDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });
            (out[key] ||= []).push(m);
        });
        return out;
    })();

    const tabs = [
        { id: "visitHistory", label: "Session History", icon: CalendarDays },
        { id: "materials", label: "View Activities", icon: BookOpen },
        { id: "progress", label: "Progress Tracker", icon: ChartLine }, // Changed from BarChart3
    ];

    return (
        <div className="col-span-8 flex flex-col space-y-6">
            {/* tab buttons */}
            <div className="flex gap-4 bg-[#F5F4FB] rounded-2xl px-6 py-4 shadow-sm">
                {tabs.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-2 px-9 py-3 text-base font-medium rounded-xl transition border ${
                            activeTab === id
                                ? "bg-primary text-white border-primary"
                                : "bg-white text-primary border-gray-200 hover:bg-[#F5F4FB]"
                        }`}
                    >
                        <Icon
                            className={`w-5 h-5 ${
                                activeTab === id ? "text-white" : "text-primary"
                            }`}
                        />
                        {label}
                    </button>
                ))}
            </div>

            {/* session history */}
            {activeTab === "visitHistory" && (
                <div className="bg-[#F5F4FB] rounded-2xl p-8 shadow-sm space-y-4">
                    <h4 className="text-xl font-semibold text-gray-800">Session History</h4>

                    {client.visitHistory?.length ? (
                        renderVisitRows()
                    ) : (
                        <p className="text-sm text-gray-500">No visit history recorded.</p>
                    )}
                </div>
            )}

            {/* materials */}
            {activeTab === "materials" && (
                <div className="bg-[#F5F4FB] rounded-2xl p-8 shadow-sm space-y-4">
                    <h4 className="text-xl font-semibold text-gray-800">Activities</h4>

                    {Object.keys(groupedMaterials).length === 0 && (
                        <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm">No materials uploaded yet</p>
                            <p className="text-xs mt-1">Activities will appear here when added</p>
                        </div>
                    )}

                    {Object.entries(groupedMaterials)
                        .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                        .map(([dateLabel, files]) => (
                            <details key={dateLabel} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <summary className="px-6 py-4 cursor-pointer font-medium text-primary list-none flex justify-between items-center hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <CalendarDays className="w-4 h-4 text-primary" />
                                        <span>{dateLabel}</span>
                                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {files.length} file{files.length !== 1 ? 's' : ''}
                    </span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-primary transition-transform duration-200 [details[open]>&]:rotate-90" />
                                </summary>

                                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30">
                                    <ul className="space-y-3">
                                        {files.map((f, idx) => (
                                            <li key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-primary/20 transition-colors">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                                        <BookOpen className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <span className="text-sm text-gray-700 truncate" title={f.filename}>
                            {f.filename}
                          </span>
                                                </div>
                                                <a
                                                    href={f.fileUrl}
                                                    download
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors ml-3 flex-shrink-0"
                                                    title="Download file"
                                                >
                                                    <svg
                                                        className="w-4 h-4"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                        />
                                                    </svg>
                                                    <span className="hidden sm:inline">Download</span>
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </details>
                        ))}
                </div>
            )}

            {/* progress tracker */}
            {activeTab === "progress" && (
                <ProgressTracker
                    goals={client.goals}
                    rows={client.goalProgress || []}
                    attendance={attendance}
                    onSave={async (updated) => {
                        const norm = updated.map((r) => ({
                            ...r,
                            targetDate: r.targetDate
                                ? new Date(r.targetDate).toISOString()
                                : null,
                        }));

                        await api.patch(`/clients/${client._id}/goal-progress`, {
                            items: norm,
                        });
                        setClient((c) => ({ ...c, goalProgress: norm }));
                        setToast({
                            show: true,
                            msg: "Progress updated!",
                            type: "success",
                        });
                    }}
                />
            )}
        </div>
    );
}

function ProgressTracker({
                             goals = [],
                             rows = [],
                             attendance = [],
                             onSave,
                         }) {
    /* ---------- state merge ---------- */
    const makeRow = (g) => ({
        name: g,
        progress: 0,
        comment: "",
        startDate: new Date().toISOString(),
        targetDate: null,
        associated: [],
    });
    const [data, setData] = useState(
        goals.map((g) => rows.find((r) => r.name === g) || makeRow(g))
    );
    const [open, setOpen] = useState(new Set());

    const [datePickerStates, setDatePickerStates] = useState({}); // Added for CustomDatePicker

    const toggleDatePicker = (rowIndex, field) => { // Added for CustomDatePicker
        setDatePickerStates((prev) => ({
            ...prev,
            [`${rowIndex}-${field}`]: !prev[`${rowIndex}-${field}`],
        }));
    };

    const setRow = (i, patch) =>
        setData((arr) => arr.map((r, k) => (k === i ? { ...r, ...patch } : r)));

    const toggle = (i) =>
        setOpen((s) => {
            const n = new Set(s);
            n.has(i) ? n.delete(i) : n.add(i);
            return n;
        });

    /* ---------- build chart series ---------- */
    const buildSeries = () => {
        const real = attendance
            .filter((a) => a.date && typeof a.progress === "number")
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map((a) => ({
                date: new Date(a.date).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                }),
                value: a.progress,
            }));

        /* placeholder (irregular) when no points OR all zeros */
        if (!real.length || real.every((p) => p.value === 0)) {
            const vals = [0, 10, 37, 53, 60, 60, 75, 90];
            const today = new Date();
            return vals.map((v, idx) => {
                const d = new Date(today);
                d.setDate(today.getDate() - (vals.length - 1 - idx) * 2); // every 2 days
                return {
                    date: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
                    value: v,
                };
            });
        }
        return real;
    };

    /* ---------- helpers ---------- */
    const quick = [
        { lbl: "1 mo", m: 1 },
        { lbl: "3 mo", m: 3 },
        { lbl: "6 mo", m: 6 },
        { lbl: "1 yr", m: 12 },
    ];
    const bump = (v, d) => Math.max(0, Math.min(100, v + d));
    const bar = (p) =>
        p >= 80
            ? "bg-green-500"
            : p >= 60
                ? "bg-blue-500"
                : p >= 40
                    ? "bg-yellow-500"
                    : p >= 20
                        ? "bg-orange-500"
                        : "bg-red-500";
    const addMonths = (d, m) => {
        const t = new Date(d);
        t.setMonth(t.getMonth() + m);
        return t.toISOString().slice(0, 10);
    };

    /* ---------- UI ---------- */
    return (
        <div className="bg-[#F5F4FB] rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
                <h4 className="text-xl font-semibold text-gray-800">
                    Progress Tracker
                </h4>
                <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
          {data.length} goal{data.length !== 1 ? "s" : ""}
        </span>
            </div>

            {data.length === 0 && (
                <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                    No goals to track yet
                </div>
            )}

            {data.map((row, i) => {
                const series = buildSeries();          /* calculate per render */

                return (
                    <div
                        key={row.name}
                        className="bg-white rounded-xl shadow-sm border border-gray-100"
                    >
                        {/* card header */}
                        <button
                            type="button"
                            className="w-full px-6 py-4 text-left hover:bg-gray-50"
                            onClick={() => toggle(i)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <h5 className="font-semibold text-gray-900">{row.name}</h5>
                                    <div className="mt-2 flex items-center gap-3">
                                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${bar(row.progress)}`}
                                                style={{ width: `${row.progress}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 min-w-[3rem]">
                      {row.progress}%
                    </span>
                                    </div>
                                </div>
                                <svg
                                    className={`w-5 h-5 text-gray-400 transition-transform ${
                                        open.has(i) ? "rotate-180" : ""
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </div>
                        </button>

                        {open.has(i) && (
                            <div className="px-6 py-5 border-t border-gray-100 bg-gray-50/50 space-y-6">
                                {/* dates on top */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <CustomDatePicker
                                        label="Start Date"
                                        value={row.startDate.slice(0, 10)}
                                        onChange={(date) => setRow(i, { startDate: date })}
                                        isOpen={datePickerStates[`${i}-start`] || false}
                                        onToggle={(open) => toggleDatePicker(i, "start")}
                                    />

                                    <div className="space-y-1.5">
                                        <CustomDatePicker
                                            label="Target Date"
                                            value={row.targetDate?.slice(0, 10) || ""}
                                            onChange={(date) => setRow(i, { targetDate: date || null })}
                                            isOpen={datePickerStates[`${i}-target`] || false}
                                            onToggle={(open) => toggleDatePicker(i, "target")}
                                        />
                                        <div className="flex gap-1 mt-1">
                                            {quick.map((q) => (
                                                <button
                                                    key={q.lbl}
                                                    type="button"
                                                    onClick={() =>
                                                        setRow(i, { targetDate: addMonths(row.startDate, q.m) })
                                                    }
                                                    className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-md hover:bg-primary/20"
                                                >
                                                    {q.lbl}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* progress stepper */}
                                <div className="flex items-center gap-2">
                                    <label className="block text-sm font-semibold text-gray-700 mr-4">
                                        Progress
                                    </label>

                                    <button
                                        type="button"
                                        onClick={() => setRow(i, { progress: bump(row.progress, -5) })}
                                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                                    >
                                        –
                                    </button>

                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={row.progress}
                                        onChange={(e) =>
                                            setRow(i, { progress: Number(e.target.value) || 0 })
                                        }
                                        className="w-16 text-center border border-gray-300 rounded-md py-1 focus:border-primary focus:ring-primary"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setRow(i, { progress: bump(row.progress, 5) })}
                                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                                    >
                                        +
                                    </button>
                                </div>

                                {/* chart */}
                                <div className="space-y-2">
                                    <p className="text-sm font-semibold text-gray-700">
                                        Patient Journey
                                    </p>
                                    <div className="h-40">
                                        <ResponsiveContainer width="100%" height={150}>
                                            <LineChart data={series}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    tick={{ fontSize: 11 }}
                                                    padding={{ left: 4, right: 4 }}
                                                />
                                                <YAxis domain={[0, 100]} hide />
                                                <Tooltip />
                                                <Line
                                                    type="monotone"
                                                    dataKey="value"
                                                    stroke="#6366f1"
                                                    strokeWidth={2}
                                                    dot={{ r: 3 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* ---------- Associated Activities (restored) ---------- */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-sm font-semibold text-gray-700">
                                            Associated&nbsp;Activities
                                        </label>
                                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                      {row.associated.length} activit
                                            {row.associated.length !== 1 ? "ies" : "y"}
                    </span>
                                    </div>

                                    {row.associated.length ? (
                                        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                                            {row.associated
                                                .slice()
                                                .sort((a, b) => new Date(b.onDate) - new Date(a.onDate))
                                                .map((a, k) => (
                                                    <div
                                                        key={k}
                                                        className="px-4 py-3 flex items-center justify-between"
                                                    >
                                                        <div>
                                                            <div className="font-medium text-gray-900 text-sm">
                                                                {a.activityName}
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-0.5">
                                                                {new Date(a.onDate).toLocaleDateString("en-GB", {
                                                                    day: "2-digit",
                                                                    month: "short",
                                                                    year: "numeric",
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg bg-white">
                                            <div className="text-sm">No activities recorded yet</div>
                                            <div className="text-xs mt-1">
                                                Activities will appear here when added
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* notes */}
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        Notes&nbsp;&amp;&nbsp;Comments
                                    </label>
                                    <textarea
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-primary resize-none bg-white"
                                        rows={3}
                                        value={row.comment}
                                        onChange={(e) => setRow(i, { comment: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* save */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                    onClick={() => onSave(data)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg text-sm hover:bg-primary/90"
                >
                    Save Progress
                </button>
            </div>
        </div>
    );
}
