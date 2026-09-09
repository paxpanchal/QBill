import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('Paras');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const teamMembers = [
    { name: 'Paras', role: 'Administrator' },
    { name: 'Raj', role: 'Administrator' },
    { name: 'Jayesh', role: 'Administrator' },
    { name: 'Akila', role: 'Administrator' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const result = await login(username.trim(), password);
      if (!result.success) {
        setError(result.message || 'Invalid username or password.');
      }
    } catch (err: any) {
      setError('An error occurred during login. Please check your credentials and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectUser = (name: string) => {
    setUsername(name);
    setPassword('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 selection:bg-indigo-500 selection:text-white">
      {/* Brand card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Header Banner */}
        <div className="bg-slate-950 p-6 sm:p-8 text-white text-center border-b border-slate-800 relative">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white font-black text-xl shadow-lg mb-3 tracking-wider">
            QP
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase font-sans">
            QUICKBILL PRP
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 font-semibold tracking-wider uppercase">
            GST Invoicing, Quotations & MIS System
          </p>
        </div>

        {/* Quick User Selector */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
            Select User Account:
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {teamMembers.map((member) => {
              const isSelected = username.toLowerCase() === member.name.toLowerCase();
              return (
                <button
                  key={member.name}
                  type="button"
                  onClick={() => handleSelectUser(member.name)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {member.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form area */}
        <div className="p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-base font-extrabold text-slate-900">Sign in to your account</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your credentials to access the business portal
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2.5 animate-fadeIn">
              <span className="shrink-0 w-4 h-4 rounded-full bg-red-200 text-red-800 flex items-center justify-center font-bold text-[10px] mt-0.5">!</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Paras, Raj, Jayesh, Akila"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm text-slate-900 placeholder:text-slate-400 font-medium transition-all"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <span className="text-[11px] text-slate-400 font-medium">Supports special characters (@, #)</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm text-slate-900 placeholder:text-slate-400 font-medium transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick info notes */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-500 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Encrypted local session & complete admin authority</span>
          </div>
        </div>
      </div>

      {/* Developer Footer */}
      <div className="mt-6 text-center text-xs text-slate-400">
        Made by{' '}
        <a
          href="https://in.linkedin.com/in/paras-panchal12"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-200 hover:text-white font-semibold underline underline-offset-2"
        >
          Paras Panchal
        </a>{' '}
        | QUICKBILL PRP
      </div>
    </div>
  );
};
