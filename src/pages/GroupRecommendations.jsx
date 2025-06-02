// src/pages/GroupRecommendations.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  ChevronLeft,
  ClipboardList,
  Users,
  User,
  Sparkle
} from "lucide-react";
import axios from "axios";

export default function GroupRecommendations() {
  const navigate = useNavigate();
  const { id: appointmentId } = useParams(); // appointment ID

  // ─── Loading / Error / Group State ────────────────────────────────────────
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(false);
  const [groupInfo, setGroupInfo] = useState(null);

  // ─── Activity Generator State ────────────────────────────────────────────
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedGoals,   setSelectedGoals]   = useState([]);
  const [duration,        setDuration]        = useState("30 Minutes");

  useEffect(() => {
    async function fetchGroup() {
      try {
        // 1) Fetch appointment to get the group ID
        const apptRes = await axios.get(
          `http://localhost:4000/api/appointments/${appointmentId}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` } }
        );
        const appointment = apptRes.data;

        if (!appointment.group) {
          setError(true);
          setLoading(false);
          return;
        }

        // 2) Fetch the full Group document (populates patients, goals, etc.)
        const groupRes = await axios.get(
          `http://localhost:4000/api/groups/${appointment.group._id}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` } }
        );
        setGroupInfo(groupRes.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching group:", err);
        setError(true);
        setLoading(false);
      }
    }

    fetchGroup();
  }, [appointmentId]);

  // ─── Placeholder Insights ─────────────────────────────────────────────────
  const placeholderGroupInsights = [
    {
      text: "One or more members tended to speak over each other frequently.",
      tag:  "AI Insight: Overlapping Speech",
      color: "bg-red-100 text-red-600",
    },
    {
      text: "Group as a whole maintained good turn-taking.",
      tag:  "AI Insight: Good Turn-Taking",
      color: "bg-green-100 text-green-600",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Loading…
        </div>
      </div>
    );
  }

  if (error || !groupInfo) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-red-600">
          Failed to load group details.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="flex-1 p-6 max-w-7xl mx-auto space-y-6">
        {/* ── Top “Back + Page Title” Row ── */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ChevronLeft className="w-6 h-6 text-gray-600 hover:text-gray-800" />
          </button>
          <h2 className="text-2xl font-semibold text-gray-800">
            Recommendations for Group
          </h2>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* ── Left Panel (col-span-4) ── */}
          <div className="col-span-4 bg-[#F9F9FD] rounded-2xl p-6 flex flex-col">
            {/* ◾ Group Header */}
            <div className="flex items-center gap-4">
              <img
                src={groupInfo.avatarUrl || "/images/university_buffalo.jpg"}
                alt={groupInfo.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-primary"
              />
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {groupInfo.name}
                </h3>
                <p className="text-sm text-gray-500">
                  No. of Clients: {groupInfo.patients.length}
                </p>
                <p className="text-sm text-gray-500">
                  Created: {new Date(groupInfo.createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-500">
                  Last Visit: —
                </p>
              </div>
            </div>

            {/* ◾ “Client List” Box */}
            <div className="mt-6 bg-white rounded-xl p-4 flex flex-col space-y-4 shadow-sm">
              <h4 className="text-lg font-medium text-gray-800">Client List:</h4>
              <ul className="space-y-3">
                {groupInfo.patients.map((client) => (
                  <li
                    key={client._id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={client.avatarUrl}
                        alt={client.name}
                        className="w-10 h-10 rounded-full object-cover border"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {client.name}
                        </span>
                        <span className="text-xs text-gray-500">Member</span>
                      </div>
                    </div>
                    <button
                      className="text-sm bg-primary text-white px-3 py-1 rounded-full hover:bg-primary/90"
                      onClick={() => {
                        // e.g. navigate(`/clients/${client._id}/analysis`);
                      }}
                    >
                      View Analysis
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* ◾ “Group Goals” Box */}
            <div className="mt-6 bg-white rounded-xl p-4 flex flex-col space-y-4 shadow-sm flex-1">
              <h4 className="text-lg font-medium text-gray-800">Group Goals:</h4>
              <div className="flex flex-wrap gap-2">
                {groupInfo.goals.map((g) => (
                  <span
                    key={g}
                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs"
                  >
                    {g}
                  </span>
                ))}
              </div>
              <button
                className="mt-auto bg-primary text-white text-sm font-medium rounded-full px-4 py-2 hover:bg-primary/90"
                onClick={() => {
                  // open “Edit Goals” modal
                }}
              >
                Edit Goals
              </button>
            </div>
          </div>

          {/* ── Right Panel (col-span-8) ── */}
          <div className="col-span-8 flex flex-col space-y-6">
            {/* ◾ Top Buttons */}
    <div className="flex justify-between gap-4 bg-[#F5F4FB] rounded-2xl px-6 py-4 shadow-sm">
      <button className="flex items-center gap-2 bg-white border border-gray-200 px-9 py-3 text-base font-medium text-gray-700 hover:bg-white/90 rounded-xl transition">
        <ClipboardList className="w-6 h-6 text-gray-500" />
        Add Visit Notes
      </button>
      <button className="flex items-center gap-2 bg-white border border-gray-200 px-9 py-3 text-base font-medium text-gray-700 hover:bg-white/90 rounded-xl transition">
        <Users className="w-6 h-6 text-gray-500" />
        Update Group
      </button>
      <button className="flex items-center gap-2 bg-white border border-gray-200 px-9 py-3 text-base font-medium text-gray-700 hover:bg-white/90 rounded-xl transition">
        <Sparkle className="w-6 h-6 text-gray-500" />
        Activity Generator
      </button>
    </div>

            {/* ◾ “Group Insights” Card (Placeholders) */}
            <div className="bg-[#F5F4FB] rounded-2xl p-6 shadow-sm flex flex-col space-y-4">
              <h4 className="text-xl font-semibold text-gray-800">
                Group Insights
              </h4>
              <div className="space-y-2">
                {placeholderGroupInsights.map((ins, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                  >
                    <div className="text-sm text-gray-800">{ins.text}</div>
                    <span
                      className={`${ins.color} text-xs font-medium px-2 py-1 rounded-full`}
                    >
                      {ins.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>

{/* ◾ “Activity Generator” Card */}
<div className="bg-[#F5F4FB] rounded-2xl p-6 shadow-sm flex flex-col space-y-6">
  <h4 className="text-xl font-semibold text-gray-800">
    Activity Generator
  </h4>

  {/* Member Dropdown */}
  <div className="flex flex-col mb-2">
    <label className="text-sm font-medium text-gray-700 mb-1">
      Select Members
    </label>
    <select
      value=""
      onChange={(e) => {
        const value = e.target.value;
        if (value && !selectedMembers.includes(value)) {
          setSelectedMembers([...selectedMembers, value]);
        }
      }}
      className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
    >
      <option value="">-- Select --</option>
      {groupInfo.patients
        .filter((m) => !selectedMembers.includes(m.name))
        .map((m) => (
          <option key={m._id} value={m.name}>
            {m.name}
          </option>
        ))}
    </select>
    <div className="mt-2 flex flex-wrap gap-2">
      {selectedMembers.map((name) => (
        <span
          key={name}
          className="flex items-center gap-1 bg-primary text-white rounded-full px-3 py-1 text-sm"
        >
          {name}
          <button
            onClick={() =>
              setSelectedMembers(selectedMembers.filter((x) => x !== name))
            }
            className="ml-1 text-white/80 hover:text-white/60 font-bold"
            type="button"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  </div>

  {/* Goals Dropdown */}
  <div className="flex flex-col mb-2">
    <label className="text-sm font-medium text-gray-700 mb-1">
      Select Activity Goals
    </label>
    <select
      value=""
      onChange={(e) => {
        const value = e.target.value;
        if (value && !selectedGoals.includes(value)) {
          setSelectedGoals([...selectedGoals, value]);
        }
      }}
      className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
    >
      <option value="">-- Select --</option>
      {groupInfo.goals
        .filter((g) => !selectedGoals.includes(g))
        .map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
    </select>
    <div className="mt-2 flex flex-wrap gap-2">
      {selectedGoals.map((goal) => (
        <span
          key={goal}
          className="flex items-center gap-1 bg-primary text-white rounded-full px-3 py-1 text-sm"
        >
          {goal}
          <button
            onClick={() =>
              setSelectedGoals(selectedGoals.filter((x) => x !== goal))
            }
            className="ml-1 text-white/80 hover:text-white/60 font-bold"
            type="button"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  </div>

  {/* Duration Dropdown */}
  <div className="flex items-center gap-3">
    <label className="text-sm font-medium text-gray-700">
      Select Duration
    </label>
    <select
      value={duration}
      onChange={(e) => setDuration(e.target.value)}
      className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
    >
      <option>15 Minutes</option>
      <option>30 Minutes</option>
      <option>45 Minutes</option>
      <option>60 Minutes</option>
    </select>
  </div>
  <button
    className="mt-auto bg-primary text-white rounded-full px-6 py-2 w-fit hover:bg-primary/90"
    onClick={() => {
      // Placeholder: no API call yet
    }}
  >
    Generate Activity
  </button>
</div>

          </div>
        </div>
      </main>
    </div>
  );
}
