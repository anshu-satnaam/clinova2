'use client';
import { useState, useEffect } from 'react';
import Header from '../components/Header';
import { api } from '../../lib/api';
import { getAppointments, saveAppointment, type Appointment } from '../../lib/patientStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { time: '08:00', maria: 72, raj: 120, singh: 95, mariaO2: 98 },
  { time: '10:00', maria: 75, raj: 118, singh: 105, mariaO2: 99 },
  { time: '12:00', maria: 82, raj: 122, singh: 140, mariaO2: 97 },
  { time: '14:00', maria: 78, raj: 125, singh: 130, mariaO2: 98 },
  { time: '16:00', maria: 74, raj: 121, singh: 110, mariaO2: 99 },
  { time: '18:00', maria: 71, raj: 119, singh: 100, mariaO2: 98 },
  { time: '20:00', maria: 68, raj: 115, singh: 90, mariaO2: 99 },
  { time: '22:00', maria: 65, raj: 112, singh: 85, mariaO2: 99 }
];

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalPatients: 0,
    activeSessions: 12, // Mocked for now
    criticalAlerts: 2,  // Mocked for now
    uptime: '99.99%',
  });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [graphMetric, setGraphMetric] = useState('HR');
  const [timeframe, setTimeframe] = useState('Daily');

  useEffect(() => {
    fetchDashboardData();
    // Load appointments from localStorage
    setAppointments(getAppointments().filter(a => a.status === 'scheduled'));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setAppointments(current => {
        const now = new Date();
        let changed = false;
        const updated = current.filter(app => {
          const appDate = new Date(app.scheduledAt);
          if (now >= appDate) {
            alert(`Reminder: Your scheduled appointment with ${app.patientName} is starting now!`);
            saveAppointment({ ...app, status: 'completed' });
            changed = true;
            return false; // remove from upcoming list
          }
          return true;
        });
        return changed ? updated : current;
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [patientsRes, auditRes] = await Promise.all([
        api.get('/patients'),
        api.get('/audit/logs?limit=5'),
      ]);
      if (patientsRes && patientsRes.ok) {
        const pData = await patientsRes.json();
        const total = pData?.meta?.total || (Array.isArray(pData) ? pData.length : 0);
        setStats(prev => ({ ...prev, totalPatients: total }));
      }
      if (auditRes && auditRes.ok) {
        const auData = await auditRes.json();
        setActivities(Array.isArray(auData) ? auData.slice(0,5) : (auData?.data || []).slice(0,5));
      }
    } catch (err) {
      console.error('Dashboard fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1419] text-white">
      <Header />
      
      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Hero Section */}
        <section className="mb-12">
          <h1 className="text-5xl font-black display-font tracking-tight mb-2">
            Clinical <span className="accent-gradient-text uppercase italic">Intelligence</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium tracking-wide">Real-time health monitoring and AI-assisted diagnostics</p>
        </section>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard title="Total Patients" value={stats.totalPatients.toString()} trend="+4%" color="cyan" />
          <StatCard title="Active Sessions" value={stats.activeSessions.toString()} trend="Live" color="purple" />
          <StatCard title="Critical Alerts" value={stats.criticalAlerts.toString()} trend="Action Required" color="red" />
          <StatCard title="System Uptime" value={stats.uptime} trend="Stable" color="emerald" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart/Vitals Area */}
          <div className="lg:col-span-2 space-y-8">
            <div className="glass-card rounded-3xl p-8 border border-white/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8">
                <span className="flex items-center gap-2 text-[10px] font-black text-cyan-400 uppercase tracking-widest bg-cyan-400/10 px-3 py-1 rounded-full border border-cyan-400/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  Real-time Data
                </span>
              </div>
              
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold flex items-center gap-3">
                  <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  Patient Vital Trends
                </h3>
                <div className="flex items-center gap-2">
                  <select value={timeframe} onChange={e=>setTimeframe(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50">
                    <option value="Daily">Daily</option><option value="Weekly">Weekly</option><option value="Monthly">Monthly</option>
                  </select>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {[
                  { id: 'HR', label: 'Heart Rate', color: 'bg-cyan-500' },
                  { id: 'BP', label: 'Blood Pressure', color: 'bg-orange-500' },
                  { id: 'Sugar', label: 'Sugar Level', color: 'bg-purple-500' },
                  { id: 'O2', label: 'Oxygen Level', color: 'bg-emerald-500' },
                  { id: 'Combined', label: 'Combined View', color: 'bg-blue-500' }
                ].map(m => (
                  <button key={m.id} onClick={() => setGraphMetric(m.id)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${graphMetric === m.id ? 'bg-white/10 text-white border border-white/20' : 'bg-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'}`}>
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${graphMetric === m.id ? m.color : 'bg-slate-600'}`}/>
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="h-[300px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 20, 25, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      labelStyle={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}
                    />
                    
                    {(graphMetric === 'HR' || graphMetric === 'Combined') && (
                      <Line type="monotone" dataKey="maria" name="Maria Jones (HR)" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4, fill: '#0F1419', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    )}
                    {(graphMetric === 'BP' || graphMetric === 'Combined') && (
                      <Line type="monotone" dataKey="raj" name="Raj Kumar (BP)" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: '#0F1419', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    )}
                    {(graphMetric === 'Sugar' || graphMetric === 'Combined') && (
                      <Line type="monotone" dataKey="singh" name="A. Singh (Sugar)" stroke="#a855f7" strokeWidth={3} dot={{ r: 4, fill: '#0F1419', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    )}
                    {(graphMetric === 'O2' || graphMetric === 'Combined') && (
                      <Line type="monotone" dataKey="mariaO2" name="Maria Jones (O2)" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#0F1419', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Upcoming Appointments */}
            <div className="glass-card rounded-3xl p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold italic">Upcoming Consultations</h3>
                <button className="text-xs font-black text-cyan-400 uppercase tracking-widest hover:text-cyan-300 transition-colors">View Schedule →</button>
              </div>
              <div className="space-y-4">
                {appointments.length === 0 ? (
                  <div className="text-center py-8 text-slate-600">
                    <p className="text-sm italic">No upcoming appointments.</p>
                    <p className="text-xs mt-1">Schedule one from the Patients page.</p>
                  </div>
                ) : appointments.slice(0,5).map((appt) => {
                  const typeColors: Record<string,string> = {
                    critical:'bg-red-500/10 text-red-400 border-red-500/20',
                    urgent:'bg-orange-500/10 text-orange-400 border-orange-500/20',
                    routine:'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
                    'follow-up':'bg-purple-500/10 text-purple-400 border-purple-500/20',
                  };
                  const d = new Date(appt.scheduledAt);
                  return (
                    <div key={appt.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/20 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center">
                          <span className="text-[10px] font-black text-slate-500 uppercase">{d.toLocaleDateString('en',{month:'short'})}</span>
                          <span className="text-lg font-black text-white leading-none">{d.getDate()}</span>
                          <span className="text-[9px] text-cyan-400 font-black">{d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                        </div>
                        <div>
                          <p className="font-bold text-white">{appt.patientName}</p>
                          <p className="text-[10px] text-cyan-400 font-bold mt-0.5">Dr. Satnaam Singh Gandhi</p>
                          <p className="text-[10px] text-slate-500 font-bold mt-0.5">{appt.notes || 'Scheduled Appointment'}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${typeColors[appt.type] || typeColors.routine}`}>{appt.type}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-8">
            {/* AI Assistant Card */}
            <div className="glass-card rounded-3xl p-8 bg-gradient-to-br from-cyan-600/20 to-purple-600/20 border border-cyan-500/30 relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-4">Clinova AI Assistant</h3>
                <p className="text-sm text-slate-300 mb-6 leading-relaxed">I've analyzed your recent patient logs. 3 patients have abnormal heart rate trends in the last 2 hours.</p>
                <button className="w-full py-4 bg-cyan-500 rounded-2xl font-black text-sm shadow-xl shadow-cyan-500/40 hover:scale-[1.02] transition-all">Review AI Alerts</button>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-cyan-500/20 blur-3xl rounded-full" />
            </div>

            {/* Recent Activity */}
            <div className="glass-card rounded-3xl p-8">
              <h3 className="text-lg font-bold mb-6">Recent Activity</h3>
              <div className="space-y-6">
                {activities.map((act, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="relative">
                      <div className={`w-3 h-3 rounded-full mt-1.5 z-10 relative ${act.action === 'LOGIN' ? 'bg-emerald-500' : 'bg-cyan-500'}`} />
                      {i !== activities.length - 1 && <div className="absolute top-4 left-[5.5px] w-[1px] h-full bg-white/10" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{act.action} - {act.resource}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">
                        {new Date(act.createdAt).toLocaleTimeString()} • {act.user?.firstName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, trend, color }: any) {
  const colors: any = {
    cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400',
    red: 'from-red-500/20 to-red-500/5 border-red-500/20 text-red-400',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
  };

  return (
    <div className={`glass-card rounded-3xl p-6 border bg-gradient-to-br ${colors[color]} group hover:scale-[1.02] transition-all duration-300`}>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">{title}</p>
      <h4 className="text-3xl font-black mb-2">{value}</h4>
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-black uppercase tracking-widest ${color === 'red' ? 'text-red-500 animate-pulse' : ''}`}>{trend}</span>
      </div>
    </div>
  );
}
