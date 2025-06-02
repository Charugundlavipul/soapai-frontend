// src/pages/IndividualRecommendations.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  ChevronLeft,
  User,
  CalendarCheck,
  ClipboardList
} from "lucide-react";
import axios from "axios";

export default function IndividualRecommendations() {
  const navigate = useNavigate();
  const { id: appointmentId } = useParams(); 

  //
  // ─── Hooks at top level ──────────────────────────────────────────────
  //
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recData, setRecData] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);

  const [selectedGoals, setSelectedGoals] = useState([]);
  const [duration, setDuration] = useState("30 Minutes");

  //
  // ─── Fetch appointment → patient → recommendation ─────────────────────
  //
  useEffect(() => {
    async function fetchData() {
      try {
        // 1) Get the appointment, which has a .patient field
        const apptRes = await axios.get(
          `http://localhost:4000/api/appointments/${appointmentId}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` } }
        );
        const appt = apptRes.data;

        // 2) Get the recommendation object
        const recRes = await axios.get(
          `http://localhost:4000/api/appointments/${appointmentId}/recommendations`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` } }
        );
        const rec = recRes.data;

        // 3) Fetch the full Patient record so we can render “About” and “Past History” etc.
        const patRes = await axios.get(
          `http://localhost:4000/api/clients/${appt.patient._id}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` } }
        );
        const pat = patRes.data;

        setRecData(rec);
        setPatientInfo(pat);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(err);
        setLoading(false);
      }
    }
    fetchData();
  }, [appointmentId]);

  // ─── Loading / Error states ─────────────────────────────────────
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
  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-red-600">
          Error loading recommendations.
        </div>
      </div>
    );
  }

  // ─── Render with real data ─────────────────────────────────────────
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
            Recommendations for Individual
          </h2>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* ── Left Panel (col-span-4) ── */}
          <div className="col-span-4 bg-[#F9F9FD] rounded-2xl p-6 flex flex-col space-y-6">
            {/* ◾ Client Header */}
            <div className="flex items-center gap-4">
              <img
                src={patientInfo.avatarUrl}
                alt={patientInfo.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-primary"
              />
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {patientInfo.name}
                </h3>
                <p className="text-sm text-gray-500">
                  Age: {patientInfo.age}  
                </p>
                <p className="text-sm text-gray-500">
                  Joined:{" "}
                  {new Date(patientInfo.createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-500">
                  Last Visit:{" "}
                  {new Date(recData.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* ◾ About Section */}
            <div className="bg-white rounded-xl p-4 flex flex-col space-y-4 shadow-sm">
              <h4 className="text-lg font-medium text-gray-800">
                About {patientInfo.name.split(" ")[0]}
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Name:</span>
                  <span className="text-sm text-gray-900">{patientInfo.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Age:</span>
                  <span className="text-sm text-gray-900">{patientInfo.age}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Past History:</span>
                  <span className="text-sm text-gray-900">
                    {patientInfo.pastHistory.join(", ")}
                  </span>
                </div>
              </div>
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-1">
                  Current Goals:
                </h5>
                <div className="flex flex-wrap gap-2">
                  {patientInfo.goals.map((g) => (
                    <span
                      key={g}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs"
                    >
                      {g}
                    </span>
                  ))}
                </div>
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

            {/* ◾ Previous Visit Notes */}
            <div className="bg-white rounded-xl p-4 space-y-2 shadow-sm flex-1">
              <h4 className="text-lg font-medium text-gray-800">
                Previous Visit Notes
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                {patientInfo.prevHistory || "No notes yet."}
              </p>
            </div>
          </div>

          {/* ── Right Panel (col-span-8) ── */}
          <div className="col-span-8 flex flex-col space-y-6">
            {/* ◾ Top Buttons */}
            <div className="flex justify-end gap-4">
              <button className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <ClipboardList className="w-5 h-5 text-gray-500" />
                Add Visit Notes
              </button>
              <button className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <User className="w-5 h-5 text-gray-500" />
                Update Goals
              </button>
              <button className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <CalendarCheck className="w-5 h-5 text-gray-500" />
                Save Visit
              </button>
            </div>

            {/* ◾ “AI Insights” Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col space-y-4">
              <h4 className="text-xl font-semibold text-gray-800">
                AI Insights
              </h4>
              <div className="space-y-3">
                {recData.individualInsights[0].insights.map((ins, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                  >
                    <div className="text-sm text-gray-800">
                      {ins.time} – {ins.text}
                    </div>
                    <span
                      className={`${ins.tagColor} text-xs font-medium px-2 py-1 rounded-full`}
                    >
                      {ins.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ◾ “Activity Generator” Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col space-y-6">
              <h4 className="text-xl font-semibold text-gray-800">
                Activity Generator
              </h4>

              {/* ─ Goals Selector ─ */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Select Activity Goals
                </label>
                <select
                  multiple
                  value={selectedGoals}
                  onChange={(e) => {
                    const opts = Array.from(e.target.selectedOptions).map(
                      (o) => o.value
                    );
                    setSelectedGoals(opts);
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  {patientInfo.goals.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedGoals.map((g) => (
                    <span
                      key={g}
                      className="flex items-center gap-1 bg-primary/10 text-primary rounded-full px-3 py-1 text-xs"
                    >
                      {g}
                      <button
                        onClick={() =>
                          setSelectedGoals((prev) => prev.filter((x) => x !== g))
                        }
                        className="text-primary hover:text-primary/70"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* ─ Duration Selector ─ */}
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

              {/* ─ Generate Activity Button ─ */}
              <button
                className="mt-auto bg-primary text-white rounded-full px-6 py-2 w-fit hover:bg-primary/90"
                onClick={() => {
                  // call API to generate or display an activity
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
