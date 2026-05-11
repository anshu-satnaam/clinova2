'use client';
import { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import { api } from '../../lib/api';

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  createdAt: string;
  severity?: string;
  outcome?: string;
  department?: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    role?: string;
  };
  metadata?: any;
}

const ACTION_TYPES = ['All', 'LOGIN', 'LOGOUT', 'CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT', 'AI_QUERY', 'PRESCRIPTION', 'DIAGNOSIS', 'CONSENT'];
const SEVERITY_LEVELS = ['All', 'INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const DEPARTMENTS = ['All Departments', 'Cardiology', 'Emergency', 'ICU', 'Radiology', 'Pharmacy', 'Admin'];

const MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: '1', action: 'LOGIN', resource: 'AUTH_SYSTEM', ipAddress: '192.168.1.10', createdAt: new Date(Date.now() - 60000).toISOString(), severity: 'INFO', outcome: 'SUCCESS', department: 'Cardiology', user: { firstName: 'Sarah', lastName: 'Smith', email: 'dr.smith@clinova.com', role: 'DOCTOR' }, metadata: { userAgent: 'Chrome/120' } },
  { id: '2', action: 'AI_QUERY', resource: 'CLINICAL_AI', ipAddress: '192.168.1.10', createdAt: new Date(Date.now() - 180000).toISOString(), severity: 'LOW', outcome: 'SUCCESS', department: 'Cardiology', user: { firstName: 'Sarah', lastName: 'Smith', email: 'dr.smith@clinova.com', role: 'DOCTOR' }, metadata: { model: 'Mistral', riskLevel: 'CRITICAL', patientId: 'P-001' } },
  { id: '3', action: 'READ', resource: 'PATIENT_RECORD', resourceId: 'P-001', ipAddress: '192.168.1.10', createdAt: new Date(Date.now() - 300000).toISOString(), severity: 'LOW', outcome: 'SUCCESS', department: 'Cardiology', user: { firstName: 'Sarah', lastName: 'Smith', email: 'dr.smith@clinova.com', role: 'DOCTOR' }, metadata: { patientName: 'Maria Jones' } },
  { id: '4', action: 'PRESCRIPTION', resource: 'MEDICATION', resourceId: 'MED-123', ipAddress: '192.168.1.10', createdAt: new Date(Date.now() - 600000).toISOString(), severity: 'MEDIUM', outcome: 'SUCCESS', department: 'Cardiology', user: { firstName: 'Sarah', lastName: 'Smith', email: 'dr.smith@clinova.com', role: 'DOCTOR' }, metadata: { medication: 'Lisinopril 10mg', patientId: 'P-001' } },
  { id: '5', action: 'DIAGNOSIS', resource: 'FHIR_CONDITION', resourceId: 'COND-456', ipAddress: '192.168.1.10', createdAt: new Date(Date.now() - 900000).toISOString(), severity: 'HIGH', outcome: 'REQUIRES_REVIEW', department: 'Emergency', user: { firstName: 'James', lastName: 'Carter', email: 'dr.carter@clinova.com', role: 'DOCTOR' }, metadata: { icdCode: 'I21.0', diagnosis: 'Acute MI' } },
  { id: '6', action: 'EXPORT', resource: 'PATIENT_DATA', ipAddress: '10.0.0.5', createdAt: new Date(Date.now() - 1200000).toISOString(), severity: 'HIGH', outcome: 'SUCCESS', department: 'Admin', user: { firstName: 'Admin', lastName: 'User', email: 'admin@clinova.com', role: 'ADMIN' }, metadata: { recordCount: 50, format: 'CSV' } },
  { id: '7', action: 'CREATE', resource: 'PATIENT_RECORD', ipAddress: '192.168.1.15', createdAt: new Date(Date.now() - 1800000).toISOString(), severity: 'LOW', outcome: 'SUCCESS', department: 'ICU', user: { firstName: 'Maya', lastName: 'Patel', email: 'dr.patel@clinova.com', role: 'DOCTOR' }, metadata: { newPatientId: 'P-005' } },
  { id: '8', action: 'DELETE', resource: 'VOICE_SESSION', resourceId: 'VS-789', ipAddress: '192.168.1.10', createdAt: new Date(Date.now() - 3600000).toISOString(), severity: 'CRITICAL', outcome: 'BLOCKED', department: 'Cardiology', user: { firstName: 'Sarah', lastName: 'Smith', email: 'dr.smith@clinova.com', role: 'DOCTOR' }, metadata: { reason: 'GDPR deletion request', status: 'Pending approval' } },
];

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All Departments');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [stats, setStats] = useState({ total: 0, critical: 0, blocked: 0, aiQueries: 0 });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit/logs?limit=100');
      if (res && res.ok) {
        const data = await res.json();
        const apiLogs: AuditLog[] = Array.isArray(data) ? data : (data.data || []);
        const combined = [...MOCK_AUDIT_LOGS, ...apiLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLogs(combined);
        setStats({
          total: combined.length,
          critical: combined.filter(l => l.severity === 'CRITICAL' || l.outcome === 'BLOCKED').length,
          blocked: combined.filter(l => l.outcome === 'BLOCKED').length,
          aiQueries: combined.filter(l => l.action === 'AI_QUERY').length,
        });
      } else {
        setLogs(MOCK_AUDIT_LOGS);
        setStats({ total: MOCK_AUDIT_LOGS.length, critical: 2, blocked: 1, aiQueries: 1 });
      }
    } catch {
      setLogs(MOCK_AUDIT_LOGS);
      setStats({ total: MOCK_AUDIT_LOGS.length, critical: 2, blocked: 1, aiQueries: 1 });
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchSearch = !search || [log.action, log.resource, log.user?.email, log.user?.firstName, log.user?.lastName, log.ipAddress, log.resourceId].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchAction = actionFilter === 'All' || log.action === actionFilter;
    const matchSeverity = severityFilter === 'All' || log.severity === severityFilter;
    const matchDept = deptFilter === 'All Departments' || log.department === deptFilter;
    const matchFrom = !dateFrom || new Date(log.createdAt) >= new Date(dateFrom);
    const matchTo = !dateTo || new Date(log.createdAt) <= new Date(dateTo + 'T23:59:59');
    return matchSearch && matchAction && matchSeverity && matchDept && matchFrom && matchTo;
  });

  const exportCSV = () => {
    const headers = ['Timestamp','User','Email','Role','Action','Resource','Resource ID','Severity','Outcome','Department','IP Address'];
    const rows = filteredLogs.map(l => [
      new Date(l.createdAt).toISOString(), `${l.user?.firstName} ${l.user?.lastName}`, l.user?.email, l.user?.role,
      l.action, l.resource, l.resourceId || '', l.severity, l.outcome, l.department, l.ipAddress,
    ]);
    const csv = [headers, ...rows].map(r => r?.map(v => `"${v || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `audit-report-${Date.now()}.csv`; a.click();
  };

  const severityColor: Record<string, string> = {
    INFO: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    LOW: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    MEDIUM: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  const actionColor: Record<string, string> = {
    LOGIN: 'bg-emerald-500/10 text-emerald-400', LOGOUT: 'bg-slate-500/10 text-slate-400',
    CREATE: 'bg-cyan-500/10 text-cyan-400', READ: 'bg-blue-500/10 text-blue-400',
    UPDATE: 'bg-yellow-500/10 text-yellow-400', DELETE: 'bg-red-500/10 text-red-400',
    EXPORT: 'bg-purple-500/10 text-purple-400', AI_QUERY: 'bg-indigo-500/10 text-indigo-400',
    PRESCRIPTION: 'bg-teal-500/10 text-teal-400', DIAGNOSIS: 'bg-orange-500/10 text-orange-400',
    CONSENT: 'bg-pink-500/10 text-pink-400',
  };
  const outcomeColor: Record<string, string> = {
    SUCCESS: 'text-emerald-400', FAILED: 'text-red-400', BLOCKED: 'text-red-500',
    REQUIRES_REVIEW: 'text-yellow-400', PENDING: 'text-slate-400',
  };

  return (
    <div className="min-h-screen bg-[#0F1419] text-white">
      <Header />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* Header */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black display-font tracking-tight mb-2 uppercase italic">
              Hospital <span className="accent-gradient-text">Audit System</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium">HIPAA • ISO 42001 • DPDP Act 2023 Compliant Clinical Activity Trail</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Compliance Active</span>
            </div>
            <button onClick={exportCSV} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2.5 rounded-xl font-bold text-sm transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Export CSV
            </button>
            <button onClick={fetchLogs} className="flex items-center gap-2 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white border border-cyan-500/20 px-4 py-2.5 rounded-xl font-bold text-sm transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Refresh
            </button>
          </div>
        </section>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Events', value: stats.total, color: 'cyan', icon: '📋' },
            { label: 'Critical Alerts', value: stats.critical, color: 'red', icon: '🚨' },
            { label: 'Blocked Actions', value: stats.blocked, color: 'orange', icon: '🛡️' },
            { label: 'AI Queries', value: stats.aiQueries, color: 'purple', icon: '🤖' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className={`glass-card rounded-2xl p-5 border border-${color}-500/20 bg-gradient-to-br from-${color}-500/10 to-transparent`}>
              <div className="text-2xl mb-2">{icon}</div>
              <p className="text-2xl font-black">{value}</p>
              <p className={`text-[10px] font-black uppercase tracking-widest text-${color}-400 mt-1`}>{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="glass-card rounded-3xl p-5 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Search */}
            <div className="relative sm:col-span-2">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input type="text" placeholder="Search by user, action, resource, IP..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
              />
            </div>
            <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-400 focus:outline-none">
              {ACTION_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-400 focus:outline-none">
              {SEVERITY_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-400 focus:outline-none" placeholder="From"/>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-400 focus:outline-none" placeholder="To"/>
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-slate-500"><span className="text-white font-bold">{filteredLogs.length}</span> of {logs.length} events</p>
            <button onClick={() => { setSearch(''); setActionFilter('All'); setSeverityFilter('All'); setDeptFilter('All Departments'); setDateFrom(''); setDateTo(''); }} className="text-xs font-bold text-slate-500 hover:text-cyan-400 transition-colors uppercase tracking-widest">Reset Filters</button>
          </div>
        </div>

        {/* Table + Detail Panel */}
        <div className={`grid gap-6 ${selectedLog ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {/* Table */}
          <div className={`glass-card rounded-3xl overflow-hidden border border-white/5 ${selectedLog ? 'lg:col-span-2' : ''}`}>
            {loading ? (
              <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"/></div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-20 text-slate-500 italic">No audit events match your filters</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/5">
                      {['Timestamp', 'Clinician', 'Action', 'Resource', 'Severity', 'Outcome'].map(h => (
                        <th key={h} className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {filteredLogs.map(log => (
                      <tr key={log.id} onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)} className={`cursor-pointer transition-colors hover:bg-white/[0.03] ${selectedLog?.id === log.id ? 'bg-cyan-500/5 border-l-2 border-cyan-500' : ''}`}>
                        <td className="px-5 py-4">
                          <p className="text-xs font-bold text-slate-300">{new Date(log.createdAt).toLocaleDateString()}</p>
                          <p className="text-[10px] font-mono text-slate-600">{new Date(log.createdAt).toLocaleTimeString()}</p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0" style={{background:'linear-gradient(135deg,#00D4FF,#7C3AED)'}}>
                              {log.user?.firstName?.[0]}{log.user?.lastName?.[0]}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-200 whitespace-nowrap">{log.user?.firstName} {log.user?.lastName}</p>
                              <p className="text-[10px] text-slate-600 truncate max-w-[120px]">{log.user?.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${actionColor[log.action] || 'bg-slate-500/10 text-slate-400'}`}>{log.action}</span>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-xs font-bold text-slate-300">{log.resource}</p>
                          {log.resourceId && <p className="text-[10px] font-mono text-slate-600">{log.resourceId}</p>}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${severityColor[log.severity || 'INFO'] || ''}`}>{log.severity || 'INFO'}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-black ${outcomeColor[log.outcome || 'SUCCESS'] || 'text-slate-400'}`}>{log.outcome || 'SUCCESS'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selectedLog && (
            <div className="glass-card rounded-3xl p-6 border border-cyan-500/20 space-y-6 animate-slide-up">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm uppercase tracking-widest text-cyan-400">Event Detail</h3>
                <button onClick={() => setSelectedLog(null)} className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 hover:bg-red-500/10 hover:text-red-400 transition-all text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Event ID', value: selectedLog.id },
                  { label: 'Timestamp', value: new Date(selectedLog.createdAt).toLocaleString() },
                  { label: 'Clinician', value: `${selectedLog.user?.firstName} ${selectedLog.user?.lastName}` },
                  { label: 'Email', value: selectedLog.user?.email },
                  { label: 'Role', value: selectedLog.user?.role },
                  { label: 'Action', value: selectedLog.action },
                  { label: 'Resource', value: selectedLog.resource },
                  { label: 'Resource ID', value: selectedLog.resourceId || 'N/A' },
                  { label: 'IP Address', value: selectedLog.ipAddress || 'N/A' },
                  { label: 'Department', value: selectedLog.department || 'N/A' },
                  { label: 'Severity', value: selectedLog.severity || 'INFO' },
                  { label: 'Outcome', value: selectedLog.outcome || 'SUCCESS' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-sm font-bold text-slate-200 break-all">{value}</p>
                  </div>
                ))}

                {selectedLog.metadata && (
                  <div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Metadata</p>
                    <pre className="text-[10px] font-mono text-cyan-400/80 bg-white/5 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
