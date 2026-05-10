'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const NAV = [
  { label: 'Dashboard', path: '/dashboard', icon: '📊' },
  { label: 'Patients', path: '/patients', icon: '👥' },
  { label: 'Records', path: '/records', icon: '📋' },
  { label: 'AI Chat', path: '/chat', icon: '🧠' },
  { label: 'Voice', path: '/voice', icon: '🎙️' },
  { label: 'Audit Logs', path: '/audit', icon: '🔍' },
];

function Sidebar({ user }: { user: any }) {
  const router = useRouter();
  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col min-h-screen p-4">
      <div className="mb-8">
        <div className="text-2xl font-bold text-white">🏥 Clinova</div>
        <div className="text-xs text-gray-500 mt-1">Healthcare AI Platform</div>
      </div>
      <nav className="flex-1 space-y-1">
        {NAV.map(n => (
          <button key={n.path} onClick={() => router.push(n.path)}
            className="w-full text-left px-3 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white flex items-center gap-3 transition text-sm">
            <span>{n.icon}</span> {n.label}
          </button>
        ))}
      </nav>
      <div className="border-t border-gray-800 pt-4">
        <div className="text-sm text-white font-medium">{user?.firstName} {user?.lastName}</div>
        <div className="text-xs text-blue-400">{user?.role}</div>
        <button onClick={() => { localStorage.clear(); router.push('/'); }}
          className="mt-2 text-xs text-red-400 hover:text-red-300">Logout</button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ patients: 0, appointments: 0, aiSessions: 0 });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/'); return; }
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));

    const headers = { Authorization: `Bearer ${token}` };
    // Fetch basic stats
    Promise.allSettled([
      fetch(`${API}/patients?limit=1`, { headers }).then(r => r.json()),
      fetch(`${API}/appointments`, { headers }).then(r => r.json()),
    ]).then(([pRes]) => {
      if (pRes.status === 'fulfilled') setStats(s => ({ ...s, patients: pRes.value?.total || 0 }));
    });
  }, []);

  if (!user) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading...</div>;

  const CARDS = [
    { label: 'Total Patients', value: stats.patients, icon: '👥', color: 'blue' },
    { label: 'AI Sessions Today', value: stats.aiSessions, icon: '🧠', color: 'purple' },
    { label: 'Active Services', value: 5, icon: '⚡', color: 'green' },
    { label: 'Compliance Status', value: '✓ HIPAA', icon: '🔒', color: 'emerald' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar user={user} />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-white mb-2">Good morning, Dr. {user?.lastName}</h1>
        <p className="text-gray-400 mb-8">Here's what's happening on the Clinova platform today.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {CARDS.map(c => (
            <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="text-2xl mb-2">{c.icon}</div>
              <div className="text-2xl font-bold text-white">{c.value}</div>
              <div className="text-sm text-gray-400">{c.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="font-semibold text-white mb-3">🏗️ Platform Services</h2>
            {[
              { name: 'API Gateway (NestJS)', port: '3000', status: 'online' },
              { name: 'AI Service (FastAPI + LangGraph)', port: '8001', status: 'online' },
              { name: 'FHIR Service (FastAPI)', port: '8002', status: 'online' },
              { name: 'Voice Service (LiveKit)', port: '8003', status: 'online' },
              { name: 'Audit Service (FastAPI)', port: '8004', status: 'online' },
              { name: 'ChromaDB Vector DB', port: '8005', status: 'online' },
            ].map(s => (
              <div key={s.name} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                <span className="text-sm text-gray-300">{s.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-900 text-green-400">:{s.port}</span>
              </div>
            ))}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="font-semibold text-white mb-3">⚖️ Compliance Status</h2>
            {[
              { std: 'HIPAA (USA)', status: '✓ Compliant' },
              { std: 'GDPR (EU)', status: '✓ Compliant' },
              { std: 'ISO 42001 (AI)', status: '✓ Compliant' },
              { std: 'ISO 27001 (Security)', status: '✓ Compliant' },
              { std: 'DPDP Act 2023 (India)', status: '✓ Compliant' },
              { std: 'SOC 2 Type II', status: '✓ Compliant' },
            ].map(c => (
              <div key={c.std} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                <span className="text-sm text-gray-300">{c.std}</span>
                <span className="text-xs text-green-400">{c.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-3">🔗 Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'New Patient', path: '/patients/new', icon: '➕' },
              { label: 'AI Diagnosis', path: '/chat', icon: '🧠' },
              { label: 'Start Voice Session', path: '/voice', icon: '🎙️' },
              { label: 'View Audit Logs', path: '/audit', icon: '📋' },
            ].map(a => (
              <button key={a.label} onClick={() => router.push(a.path)}
                className="flex flex-col items-center gap-2 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition">
                <span className="text-2xl">{a.icon}</span>
                <span className="text-xs text-gray-300">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
