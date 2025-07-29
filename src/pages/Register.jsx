import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// v2 outline icons
import {
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

import api from '../services/api';

export default function Register() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
    agree: false
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [phase, setPhase] = useState('form'); // 'form' | 'otp'
  const [otp, setOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');


  const onChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

const submit = async e => {
  e.preventDefault();
  let errs = {};
  if (!form.agree) errs.agree = 'You must accept terms';
  if (form.password !== form.confirm)
    errs.confirm = 'Passwords must match';
  if (Object.keys(errs).length) return setErrors(errs);

  try {
    await api.post('/auth/register-init', {
      name: form.name,
      email: form.email,
      password: form.password
    });
    setPendingEmail(form.email);
    setPhase('otp');
  } catch (ex) {
    setErrors({ email: ex.response?.data?.message || 'Server error' });
  }
};

const submitOtp = async e => {
  e.preventDefault();
  try {
    const { data } = await api.post('/auth/register-verify', {
      email: pendingEmail,
      otp
    });
    localStorage.setItem('jwt', data.token);
    nav('/');
  } catch (ex) {
    setErrors({ otp: ex.response?.data?.message || 'Invalid OTP' });
  }
};


  return (
    <div className="min-h-screen flex">
      {/* Left Hero */}
      <div
        className="hidden lg:flex w-1/2 bg-cover"
        style={{ backgroundImage: "url('/assets/hero.png')" }}
      />

      {/* Right Form */}
      <div className="flex flex-col justify-center w-full lg:w-1/2 p-24"> 
        <h2 className="text-3xl font-bold">Get Started Now</h2>
        <p className="text-gray-500 mb-6">Let’s create your account</p>
        {errors.general && (
          <p className="text-red-500 mb-4">{errors.general}</p>
        )}

       {phase === 'form' ? (
  <form onSubmit={submit} className="space-y-4">
    {/* Name */}
    <div>
      <label className="block text-sm font-medium text-gray-700">Full Name</label>
      <div className="relative mt-1">
        <UserIcon className="absolute left-3 top-1/2 h-5 w-5 text-gray-400 -translate-y-1/2" />
        <input
          name="name"
          type="text"
          value={form.name}
          onChange={onChange}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="Full Name"
          required
        />
      </div>
      {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
    </div>

    {/* Email */}
    <div>
      <label className="block text-sm font-medium text-gray-700">Email</label>
      <div className="relative mt-1">
        <EnvelopeIcon className="absolute left-3 top-1/2 h-5 w-5 text-gray-400 -translate-y-1/2" />
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={onChange}
          className={`w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-2 ${
            errors.email ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-300'
          }`}
          placeholder="Email"
          required
        />
      </div>
      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
    </div>

    {/* Password */}
    <div>
      <label className="block text-sm font-medium text-gray-700">Password</label>
      <div className="relative mt-1">
        <LockClosedIcon className="absolute left-3 top-1/2 h-5 w-5 text-gray-400 -translate-y-1/2" />
        <input
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={form.password}
          onChange={onChange}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="Password"
          required
        />
        <div
          className="absolute right-3 top-1/2 h-5 w-5 text-gray-400 -translate-y-1/2 cursor-pointer"
          onClick={() => setShowPassword(s => !s)}
        >
          {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
        </div>
      </div>
    </div>

    {/* Confirm Password */}
    <div>
      <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
      <div className="relative mt-1">
        <LockClosedIcon className="absolute left-3 top-1/2 h-5 w-5 text-gray-400 -translate-y-1/2" />
        <input
          name="confirm"
          type={showConfirm ? 'text' : 'password'}
          value={form.confirm}
          onChange={onChange}
          className={`w-full pl-10 pr-10 py-2 border rounded-xl focus:outline-none focus:ring-2 ${
            errors.confirm ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-300'
          }`}
          placeholder="Confirm Password"
          required
        />
        <div
          className="absolute right-3 top-1/2 h-5 w-5 text-gray-400 -translate-y-1/2 cursor-pointer"
          onClick={() => setShowConfirm(s => !s)}
        >
          {showConfirm ? <EyeSlashIcon /> : <EyeIcon />}
        </div>
      </div>
      {errors.confirm && <p className="text-red-500 text-xs mt-1">{errors.confirm}</p>}
    </div>

    {/* Terms */}
    <div className="flex items-center">
      <input
        id="agree"
        name="agree"
        type="checkbox"
        checked={form.agree}
        onChange={onChange}
        className="h-4 w-4 text-[#3D298D] border-gray-300 rounded"
      />
      <label htmlFor="agree" className="ml-2 text-sm text-gray-700">
        I agree to{' '}
        <a href="#" className="text-[#3D298D] underline">
          Terms &amp; Conditions
        </a>
      </label>
    </div>
    {errors.agree && <p className="text-red-500 text-xs mb-2">{errors.agree}</p>}

    {/* Submit */}
    <button
      type="submit"
      className="w-full py-2 rounded-xl bg-[#3D298D] text-white hover:bg-[#2A1F6C] transition"
    >
      Sign up
    </button>

    <p className="text-center text-sm text-gray-600">
      Already have an account?{' '}
      <Link to="/login" className="text-[#3D298D] underline">
        Sign in
      </Link>
    </p>
  </form>
) : (
  <form onSubmit={submitOtp} className="space-y-4">
    <label className="block text-sm font-medium text-gray-700">
      Enter OTP sent to <span className="font-semibold">{pendingEmail}</span>
    </label>
    <input
      type="text"
      value={otp}
      onChange={e => setOtp(e.target.value)}
      className="w-full py-2 px-4 border border-gray-300 rounded-xl"
      placeholder="Enter 6-digit OTP"
    />
    {errors.otp && <p className="text-red-500 text-xs">{errors.otp}</p>}
    <button
      type="submit"
      className="w-full py-2 rounded-xl bg-[#3D298D] text-white hover:bg-[#2A1F6C]"
    >
      Verify and Register
    </button>
    <button
  type="button"
  onClick={async () => {
    await api.post('/auth/register-init', {
      name: form.name,
      email: form.email,
      password: form.password
    });
  }}
  className="text-sm text-[#3D298D] underline"
>
  Resend OTP
</button>

  </form>
)}

      </div>
    </div>
  );
}
