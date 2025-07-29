// src/components/PatientJourneyChart.jsx
import { useState, useRef, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
} from "recharts";

/**
 * @param {{
 *   history: { date:string, progress:number, appointment?:string }[],
 *   onPointChange?: (idx:number, newVal:number) => void
 * }} props
 */
export default function PatientJourneyChart({ history = [], onPointChange }) {
  /* ---------- local copy we can mutate while dragging ---------- */
  const normalise = (arr) =>
    arr
      .slice()
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((h) => ({
        ...h,
        label: new Date(h.date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        }),
      }));

  const [points, _setPoints] = useState(() => normalise(history));

  /* keep latest points in a ref so listeners see fresh data */
  const pointsRef = useRef(points);
  const updatePoints = (fn) =>
    _setPoints((prev) => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      pointsRef.current = next;
      return next;
    });

  /* rebuild when parent gives a brand-new history */
  useEffect(() => {
    updatePoints(normalise(history));
  }, [history]);

  /* ---------- dragging logic ---------- */
  const chartRef = useRef(null);

  const startDrag = (idx) => (e) => {
    e.preventDefault();
    if (!chartRef.current) return;
    const box = chartRef.current.getBoundingClientRect();

    const move = (ev) => {
      const pct = Math.round(
        Math.max(
          0,
          Math.min(
            100,
            100 - ((ev.clientY - box.top) / box.height) * 100 // invert Y
          )
        )
      );
      updatePoints((pts) =>
        pts.map((pt, i) => (i === idx ? { ...pt, progress: pct } : pt))
      );
    };

    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      onPointChange?.(idx, pointsRef.current[idx].progress);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  /* ---------- bigger, easier-to-grab dot ---------- */
  const Dot = ({ cx, cy, index }) => (
    <g onMouseDown={startDrag(index)} cursor="ns-resize">
      {/* invisible hit-area */}
      <circle cx={cx} cy={cy} r={20} fill="transparent" />
      {/* visible dot */}
      <circle cx={cx} cy={cy} r={7} fill="#6366f1" stroke="#fff" strokeWidth={2} />
    </g>
  );

  /* ---------- render ---------- */
  return (
    <ResponsiveContainer width="100%" height={150}>
      <LineChart
        data={points}
        ref={chartRef}
        margin={{ top: 10, right: 20, left: 18, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          padding={{ left: 18, right: 4 }}
        />
        <YAxis domain={[0, 100]} hide />
        <Tooltip />
        <Line
          isAnimationActive={false}
          type="monotone"
          dataKey="progress"
          stroke="#6366f1"
          strokeWidth={2}
          dot={<Dot />}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
