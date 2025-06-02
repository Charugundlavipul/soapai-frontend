// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Register               from './pages/Register';
import Login                  from './pages/Login';
import Dashboard              from './pages/Dashboard';
import ForgotPassword         from './pages/ForgotPassword';
import ResetPassword          from './pages/ResetPassword';
import ResetSuccess           from './pages/ResetSuccess';
import BehaviourBank          from './pages/BehaviourBank';
import UploadVideoPage        from './pages/UploadVideo';
import SessionReview          from './pages/SessionReview';

// ↓ Add this import:
import RecommendationRouter   from './pages/RecommendationRouter';

export default function App() {
  return (
    <div className="font-sans">
      <BrowserRouter>
        <Routes>
          <Route path="/"                         element={<Dashboard />} />
          <Route path="/register"                 element={<Register />} />
          <Route path="/login"                    element={<Login />} />
          <Route path="/forgot"                   element={<ForgotPassword />} />
          <Route path="/reset"                    element={<ResetPassword />} />
          <Route path="/reset-success"            element={<ResetSuccess />} />
          <Route path="/behaviours"               element={<BehaviourBank />} />
          <Route path="/appointments/:id/upload"  element={<UploadVideoPage />} />
          <Route path="/videos/:id/review"        element={<SessionReview />} />

          {/* ── New route to render either Group or Individual Recommendations ── */}
          <Route 
            path="/appointments/:id/recommendations" 
            element={<RecommendationRouter />} 
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
