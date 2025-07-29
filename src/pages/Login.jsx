import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// v2 outline icons
import {
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

import api from '../services/api';

export default function Login() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    remember: false
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const onChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const submit = async e => {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/login', {
        email: form.email,
        password: form.password
      });
      localStorage.setItem('jwt', data.token);
      nav('/');
    } catch (ex) {
      setError(ex.response?.data?.message || 'Login failed');
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
        <h2 className="text-3xl font-bold">Welcome Back</h2>
        <p className="text-gray-500 mb-6">Sign in to your account</p>

        <form onSubmit={submit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <div className="relative mt-1">
              <EnvelopeIcon className="absolute left-3 top-1/2 h-5 w-5 text-gray-400 -translate-y-1/2" />
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={onChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="E-mail"
                required
              />
            </div>
          </div>

          {/* Password Field */}
{/* Password Field */}
    <div>
      <label className="block text-sm font-medium text-gray-700">
        Password
      </label>
      <div className="relative mt-1">
        <LockClosedIcon className="absolute left-3 top-1/2 h-5 w-5 text-gray-400 -translate-y-1/2" />
        <input
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={form.password}
          onChange={onChange}
          className={
            `w-full pl-10 pr-10 py-2 border rounded-xl focus:outline-none focus:ring-2 ` +
            (error
              ? 'border-red-500 focus:ring-red-300'
              : 'border-gray-300 focus:ring-indigo-300')
          }
          placeholder="Password"
          required
        />
        {/* 👇 Only one icon will show here — no duplicates */}
        <button
          type="button"
          onClick={() => setShowPassword(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 focus:outline-none"
        >
          {showPassword ? (
            <EyeSlashIcon className="h-5 w-5" />
          ) : (
            <EyeIcon className="h-5 w-5" />
          )}
        </button>
      </div>
      {error && (
        <p className="text-red-500 text-xs mt-1">
          {error}
        </p>
      )}
    </div>


          {/* Remember + Forgot */}
          <div className="flex justify-between items-center text-sm">
            <label className="flex items-center">
              <input
                name="remember"
                type="checkbox"
                checked={form.remember}
                onChange={onChange}
                className="h-4 w-4 text-[#3D298D] border-gray-300 rounded"
              />
              <span className="ml-2 text-gray-700">Remember me</span>
            </label>
            <Link to="/forgot" className="text-[#3D298D]">
              Forgot Password
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-2 rounded-xl bg-[#3D298D] text-white hover:bg-[#2A1F6C] transition"
          >
            Sign in
          </button>

          <p className="text-center text-sm text-gray-600">
            Don’t have an account?{' '}
            <Link to="/register" className="text-[#3D298D] underline">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
