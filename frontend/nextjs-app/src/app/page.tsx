'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = 'http://localhost:3000';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('dr.smith@clinova.com');
  const [password, setPassword] = useState('Clinova@123');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('DOCTOR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const body = isLogin
        ? { email, password }
        : { email, password, firstName, lastName, role };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        if (isLogin) {
          localStorage.setItem('accessToken', data.accessToken);
          if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
          router.push('/dashboard');
        } else {
          setSuccess('Account created! You can now sign in.');
          setIsLogin(true);
          setEmail(email);
          setPassword('');
        }
      } else {
        const msg = Array.isArray(data?.message) ? data.message.join(', ') : (data?.message || 'Authentication failed');
        setError(msg);
      }
    } catch (err) {
      setError('Cannot connect to gateway. Make sure the backend is running on port 3000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0F1419] text-white overflow-hidden font-sans">
      {/* Left Side: Cinematic Hero */}
      <div className="hidden lg:flex w-1/2 relative bg-black items-center justify-center p-12">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/60 via-transparent to-purple-900/40 z-10" />
          <img
            src="https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&q=80&w=2000"
            alt="Hero"
            className="w-full h-full object-cover opacity-30"
          />
        </div>

        <div className="relative z-20 max-w-lg">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl shadow-cyan-500/40" style={{background:'linear-gradient(135deg,#00D4FF,#7C3AED)'}}>
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 4v16m8-8H4"/></svg>
            </div>
            <span className="text-3xl font-black tracking-tighter uppercase italic">Clinova</span>
          </div>
          <h1 className="text-6xl font-black leading-tight mb-6 display-font tracking-tight">
            The Future of <span className="accent-gradient-text">Clinical</span> Intelligence.
          </h1>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-10">
            Next-generation healthcare AI platform powered by LangGraph, Mistral, and Real-time Voice Agents.
          </p>
          <div className="grid grid-cols-3 gap-6">
            {[['500+', 'Clinicians'], ['99.9%', 'Uptime'], ['HIPAA', 'Compliant']].map(([v, l]) => (
              <div key={l} className="glass-card rounded-2xl p-4 text-center border border-white/5">
                <p className="text-xl font-black text-cyan-400">{v}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side: Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 relative overflow-y-auto">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-purple-500/5 to-transparent pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:'linear-gradient(135deg,#00D4FF,#7C3AED)'}}>
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 4v16m8-8H4"/></svg>
            </div>
            <span className="text-2xl font-black tracking-tighter uppercase italic">Clinova</span>
          </div>

          <div className="mb-8">
            <h2 className="text-4xl font-black mb-3 italic tracking-tight">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-slate-500 font-medium">
              {isLogin ? 'Sign in to access your clinical dashboard' : 'Join the next generation of healthcare technology'}
            </p>
          </div>

          {/* Toggle tabs */}
          <div className="flex bg-white/5 rounded-2xl p-1 mb-8 border border-white/10">
            <button onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }} className={`flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${isLogin ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'text-slate-500 hover:text-white'}`}>Sign In</button>
            <button onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }} className={`flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${!isLogin ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'text-slate-500 hover:text-white'}`}>Register</button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-bold flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-sm font-bold flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 13l4 4L19 7"/></svg>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">First Name</label>
                  <input
                    type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                    required={!isLogin} placeholder="Sarah"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 focus:outline-none focus:border-cyan-500/60 transition-all font-medium text-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Last Name</label>
                  <input
                    type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                    required={!isLogin} placeholder="Smith"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 focus:outline-none focus:border-cyan-500/60 transition-all font-medium text-slate-200"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email Address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="doctor@clinova.com"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-cyan-500/60 transition-all font-medium text-slate-200"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-cyan-500/60 transition-all font-medium text-slate-200"
              />
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Role</label>
                <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-cyan-500/60 transition-all font-medium text-slate-200">
                  <option value="DOCTOR">Doctor</option>
                  <option value="NURSE">Nurse</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full accent-gradient py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-cyan-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Processing...
                </span>
              ) : (isLogin ? 'Authenticate Now' : 'Create Identity')}
            </button>
          </form>

          <div className="mt-8 p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Demo Credentials</p>
            <p className="text-xs text-slate-400">Email: <span className="text-cyan-400 font-bold">dr.smith@clinova.com</span></p>
            <p className="text-xs text-slate-400">Password: <span className="text-cyan-400 font-bold">Clinova@123</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
