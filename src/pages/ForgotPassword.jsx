import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

export default function ForgotPassword() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  const submit = async e => {
    e.preventDefault();
    await api.post('/auth/forgot-password', { email });
    setMsg('OTP sent! Check your e-mail.');
    setTimeout(() => nav('/reset', { state: { email } }), 1000);
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-1/2 bg-cover"
           style={{backgroundImage:"url('/assets/forgot.png')"}} />
      <div className="flex flex-col justify-center w-full lg:w-1/2 p-24">
        <button onClick={() => nav(-1)} className="mb-6 text-gray-500">
          <ArrowLeftIcon className="h-5 w-5"/>
        </button>
        <div className="text-center mb-8">
          <LockClosedIcon className="h-12 w-12 text-[#3D298D] mx-auto"/>
          <h2 className="text-2xl font-semibold mt-4">Forgot Password?</h2>
          <p className="text-gray-500">Enter your email to reset your password</p>
        </div>
        {msg && <p className="text-green-600 mb-2">{msg}</p>}
        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <EnvelopeIcon className="absolute left-3 top-1/2 h-5 w-5 text-gray-400 -translate-y-1/2"/>
            <input className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-300"
                   placeholder="Email"
                   required
                   type="email"
                   value={email}
                   onChange={e=>setEmail(e.target.value)}/>
          </div>
          <button className="w-full py-2 bg-[#3D298D] text-white rounded-xl hover:bg-indigo-700">Submit</button>
        </form>
      </div>
    </div>
  );
}
