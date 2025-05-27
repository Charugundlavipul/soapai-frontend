import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Register from './pages/Register';
import Login    from './pages/Login';
import Dashboard from './pages/Dashboard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ResetSuccess from './pages/ResetSuccess';
import BehaviourBank from './pages/BehaviourBank';

export default function App() {
  return (
    <div className="font-sans">
    <BrowserRouter>
      <Routes>
        <Route path="/"         element={<Dashboard />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/forgot"          element={<ForgotPassword />} />
        <Route path="/reset"           element={<ResetPassword />} />   {/* OTP & new pass */}
        <Route path="/reset-success"   element={<ResetSuccess />} />
        <Route path="/behaviours" element={<BehaviourBank/>}/>
      </Routes>
    </BrowserRouter>
    </div>
  );
}
