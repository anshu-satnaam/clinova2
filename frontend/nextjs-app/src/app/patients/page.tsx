'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Patient {
  id: string;
  dateOfBirth?: string;
  gender?: string;
  user: { firstName: string; lastName: string; email: string; phone?: string };
}

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
  const headers = { Authorization: `Bearer ${token}` };

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (search) params.set('search', search);
      const res = await fetch(`${API}/patients?${params}`, { headers });
      const data = await res.json();
      setPatients(data.data || []);
      setTotal(data.total || 0);
    } catch {
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPatients(); }, [page, search]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-white text-sm">← Dashboard</button>
        <h1 className="font-semibold flex-1">👥 Patients</h1>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search patients..." id="patient-search"
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white w-56" />
      </header>

      <div className="max-w-5xl mx-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-400">{total} patients total</p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading patients...</div>
        ) : patients.length === 0 ? (
          <div className="text-center py-20 bg-gray-900 border border-gray-800 rounded-xl">
            <p className="text-gray-400 mb-2">No patients found</p>
            <p className="text-xs text-gray-600">Use POST /patients to register patients via the API</p>
          </div>
        ) : (
          <div className="space-y-2">
            {patients.map(p => (
              <div key={p.id}
                className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between hover:border-blue-700 transition cursor-pointer"
                onClick={() => router.push(`/patients/${p.id}`)}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center text-sm font-bold">
                    {p.user.firstName[0]}{p.user.lastName[0]}
                  </div>
                  <div>
                    <p className="font-medium">{p.user.firstName} {p.user.lastName}</p>
                    <p className="text-xs text-gray-400">{p.user.email} · {p.gender || 'Gender not set'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">ID: {p.id.slice(0, 8)}...</span>
                  <button className="text-xs text-blue-400 hover:text-blue-300 px-3 py-1 rounded-lg border border-blue-800 hover:border-blue-600 transition">
                    View Records
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {total > 10 && (
          <div className="flex justify-center gap-3 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 bg-gray-800 rounded-lg text-sm disabled:opacity-40">← Prev</button>
            <span className="px-4 py-2 text-sm text-gray-400">Page {page} of {Math.ceil(total / 10)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 10)}
              className="px-4 py-2 bg-gray-800 rounded-lg text-sm disabled:opacity-40">Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
