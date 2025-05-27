import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

export default function ResetPassword() {
  const { state } = useLocation();            // email passed from previous page
  const nav = useNavigate();

  const [form, setForm] = useState({ otp:'', password:'', confirm:'' });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');

  const onChange = e => setForm(f=>({...f, [e.target.name]:e.target.value}));

  const submit = async e => {
    e.preventDefault();
    if (form.password !== form.confirm) { setErr('Passwords mismatch'); return; }

    try{
      await api.post('/auth/reset-password', {
        email: state?.email,
        otp:   form.otp,
        password: form.password
      });
      nav('/reset-success');
    }catch(ex){
      setErr(ex.response?.data?.message || 'Error');
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-1/2 bg-cover"
           style={{backgroundImage:"url('/assets/forgot.png')"}} />
      <div className="flex flex-col justify-center w-full lg:w-1/2 p-8">
        <div className="text-center mb-8">
          <LockClosedIcon className="h-12 w-12 text-[#3D298D] mx-auto"/>
          <h2 className="text-2xl font-semibold mt-4">Set New Password</h2>
          <p className="text-gray-500">Enter the OTP plus your new password</p>
        </div>
        {err && <p className="text-red-500 mb-2">{err}</p>}
        <form onSubmit={submit} className="space-y-4">
          <input
            name="otp"
            placeholder="6-digit OTP"
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-300"
            value={form.otp}
            onChange={onChange}
            required
          />
          <div className="relative">
            <LockClosedIcon className="absolute left-3 top-1/2 h-5 w-5 text-gray-400 -translate-y-1/2"/>
            <input
              name="password"
              type={show?'text':'password'}
              placeholder="New password"
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-300"
              value={form.password}
              onChange={onChange}
              required
            />
            <div className="absolute right-3 top-1/2 h-5 w-5 text-gray-400 -translate-y-1/2 cursor-pointer"
                 onClick={()=>setShow(s=>!s)}>
              {show? <EyeSlashIcon/>: <EyeIcon/>}
            </div>
          </div>

          <input
            name="confirm"
            type={show?'text':'password'}
            placeholder="Confirm new password"
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-300"
            value={form.confirm}
            onChange={onChange}
            required
          />

          <button className="w-full py-2 bg-[#3D298D] text-white rounded-xl hover:bg-indigo-700">
            Save New Password
          </button>
        </form>
      </div>
    </div>
  );
}
