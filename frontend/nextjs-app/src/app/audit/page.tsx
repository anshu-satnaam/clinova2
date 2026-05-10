'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface AuditLog {
  id: string; action: string; resource: string;
  resource_id?: string; user_id: string; created_at: string; metadata?: any;
}

const ACTION_COLOR: Record<string, string> = {
  LOGIN: 'text-blue-400', READ: 'text-gray-400', CREATE: 'text-green-400',
  UPDATE: 'text-yellow-400', DELETE: 'text-red-400',
  AI_QUERY: 'text-purple-400', VOICE_SESSION: 'text-pink-400', FHIR_ACCESS: 'text-cyan-400',
};

export default function AuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_AUDIT_URL || 'http://localhost:8004'}/api/audit/logs?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      } catch {
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filtered = filter ? logs.filter(l => l.action === filter || l.resource.includes(filter)) : logs;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-white text-sm">← Dashboard</button>
        <div className="flex-1">
          <h1 className="font-semibold">🔍 Audit Logs</h1>
          <p className="text-xs text-gray-500">HIPAA · ISO 42001 compliant audit trail</p>
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
          <option value="">All Actions</option>
          {['LOGIN','READ','CREATE','UPDATE','DELETE','AI_QUERY','VOICE_SESSION','FHIR_ACCESS'].map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading audit logs...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-gray-900 border border-gray-800 rounded-xl">
            <p className="text-gray-400">No audit logs yet</p>
            <p className="text-xs text-gray-600 mt-1">Logs appear as users interact with the platform</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(log => (
              <div key={log.id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 flex items-center gap-4">
                <span className={`text-xs font-bold w-28 ${ACTION_COLOR[log.action] || 'text-gray-400'}`}>{log.action}</span>
                <span className="text-sm text-gray-300 flex-1">{log.resource}{log.resource_id ? ` / ${log.resource_id.slice(0,8)}` : ''}</span>
                <span className="text-xs text-gray-500">{log.user_id.slice(0,8)}</span>
                <span className="text-xs text-gray-600">{new Date(log.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
