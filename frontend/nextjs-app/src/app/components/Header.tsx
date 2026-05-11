'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '../../lib/api';

const NAV_LINKS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'AI Chat', path: '/chat' },
  { label: 'Voice', path: '/voice' },
  { label: 'Patients', path: '/patients' },
  { label: 'Records', path: '/records' },
  { label: 'Audit', path: '/audit' },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        if (res && res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (err) {
        console.error('Header fetch failed:', err);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` : 'SJ';
  const fullName = user ? `Dr. ${user.firstName} ${user.lastName}` : 'Dr. Sarah Johnson';

  return (
    <header className="sticky top-0 z-50 bg-[#0F1419]/95 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 sm:gap-3 no-underline flex-shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00D4FF 0%, #7C3AED 100%)' }}>
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 4v16m8-8H4"/></svg>
          </div>
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-white display-font">CLINOVA</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden xl:flex items-center gap-6 h-20">
          {NAV_LINKS.map((link) => (
            <Link key={link.path} href={link.path}
              className={`text-[11px] font-bold tracking-[0.15em] uppercase h-full flex items-center transition-colors relative ${
                pathname === link.path ? 'text-white nav-underline-active' : 'text-slate-400 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="pl-2 sm:pl-4 border-l border-white/10 flex items-center gap-2 sm:gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-white uppercase tracking-wide truncate max-w-[120px]">{fullName}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{user?.role || 'DOCTOR'}</p>
            </div>
            <Link href="/profile" className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl p-[1px] flex-shrink-0" style={{ background: 'linear-gradient(135deg, #00D4FF 0%, #7C3AED 100%)' }} title="View Profile">
              <div className="w-full h-full rounded-[11px] bg-[#0F1419] overflow-hidden flex items-center justify-center">
                <span className="text-sm font-bold text-cyan-400">{initials}</span>
              </div>
            </Link>
            <button onClick={handleLogout} className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-all text-xs font-bold uppercase tracking-widest">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              Out
            </button>
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="xl:hidden w-9 h-9 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-slate-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>{mobileOpen ? <path d="M6 18L18 6M6 6l12 12"/> : <path d="M4 6h16M4 12h16M4 18h16"/>}</svg>
          </button>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileOpen && (
        <div className="xl:hidden bg-[#0F1419] border-t border-white/5 px-4 py-4 space-y-1">
          {NAV_LINKS.map(link => (
            <Link key={link.path} href={link.path} onClick={() => setMobileOpen(false)}
              className={`block px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
                pathname === link.path ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >{link.label}</Link>
          ))}
          <button onClick={handleLogout} className="w-full text-left px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-widest text-red-400 hover:bg-red-500/5 transition-all">Sign Out</button>
        </div>
      )}
    </header>
  );
}
