// client/src/pages/RecommendationRouter.jsx
import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import axios from "axios";
import GroupRecommendations       from "./GroupRecommendations";
import IndividualRecommendations  from "./IndividualRecommendations";
import { getAppointment } from "../services/api";

export default function RecommendationRouter() {
  const { id } = useParams();           // appointment ID
  const [apptType, setApptType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
   getAppointment(id)
     .then(res => {
       setApptType(res.data.type);   // “group” or “individual”
       setLoading(false);
     })
     .catch(() => {
       setError(true);
       setLoading(false);
     });
  }, [id]);

  if (loading) return <div className="p-6 text-center">Loading…</div>;
  if (error)   return <div className="p-6 text-center text-red-600">Error!</div>;

  return apptType === "group" ? (
    <GroupRecommendations />
  ) : apptType === "individual" ? (
    <IndividualRecommendations />
  ) : (
    // If something is really weird, redirect back to home
    <Navigate to="/" />
  );
}
