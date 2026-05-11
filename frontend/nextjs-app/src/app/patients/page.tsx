'use client';
import { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import { api } from '../../lib/api';
import { saveAppointment, addPatientRecord } from '../../lib/patientStore';
import { useRouter } from 'next/navigation';

interface Patient {
  id: string;
  user: { firstName: string; lastName: string; email: string; phone?: string; };
  gender?: string;
  bloodType?: string;
  dateOfBirth?: string;
  fhirPatientId?: string;
  emergencyContact?: string;
  allergies?: string[];
  contactEmails?: { email: string }[];
}

interface NewPatientForm {
  firstName: string; lastName: string; email: string; phone: string;
  gender: string; bloodType: string; dateOfBirth: string;
  emergencyContact: string; allergies: string;
}

const EMPTY_FORM: NewPatientForm = {
  firstName: '', lastName: '', email: '', phone: '',
  gender: 'Male', bloodType: 'O+', dateOfBirth: '',
  emergencyContact: '', allergies: '',
};

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  
  // Forms
  const [form, setForm] = useState<NewPatientForm>(EMPTY_FORM);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  
  const [scheduleForm, setScheduleForm] = useState({ date: '', time: '', type: 'routine', notes: '' });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchPatients(); }, []);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await api.get('/patients');
      if (res && res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.data || []);
        setPatients(list);
      } else {
        setPatients([
          { id: '1', user: { firstName: 'Maria', lastName: 'Jones', email: 'maria@example.com', phone: '+91-9876543210' }, gender: 'Female', bloodType: 'A+', dateOfBirth: '1985-06-15' },
          { id: '2', user: { firstName: 'Raj', lastName: 'Kumar', email: 'raj@example.com', phone: '+91-9876543211' }, gender: 'Male', bloodType: 'B+', dateOfBirth: '1978-03-20' },
        ]);
      }
    } catch {
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      const res = await api.post('/auth/register', {
        firstName: form.firstName, lastName: form.lastName,
        email: form.email, phone: form.phone,
        gender: form.gender, bloodType: form.bloodType,
        dateOfBirth: form.dateOfBirth || undefined,
        emergencyContact: form.emergencyContact,
        allergies: form.allergies.split(',').map(s => s.trim()).filter(Boolean),
        role: 'PATIENT',
        password: `Patient@${Math.random().toString(36).slice(2, 8)}`,
      });
      
      let newPatientId = '';
      if (res && res.ok) {
        const data = await res.json();
        newPatientId = data.id || data.patient?.id || Math.random().toString(36).slice(2);
        
        // Handle file upload if present
        if (uploadFile) {
          const reader = new FileReader();
          reader.onload = async (e) => {
            const content = e.target?.result as string;
            // Generate quick AI summary for the uploaded record
            let aiSummary = "Uploaded medical document.";
            try {
              const aiRes = await api.post('/ai/chat', { 
                message: `Summarize this medical record in 20 words maximum: ${content.slice(0, 500)}`,
                patient_id: newPatientId,
                context_type: 'general'
              });
              if (aiRes && aiRes.ok) {
                const aiData = await aiRes.json();
                aiSummary = aiData.response || aiSummary;
              }
            } catch (err) {}

              addPatientRecord(newPatientId, {
              id: Math.random().toString(36).slice(2),
              fileName: uploadFile.name,
              fileSize: uploadFile.size,
              uploadedAt: new Date().toISOString(),
              content: content.slice(0, 5000), // store up to 5k chars for demo
              aiSummary
            } as any);
          };
          reader.readAsText(uploadFile);
        }

        setShowAddModal(false);
        setForm(EMPTY_FORM);
        setUploadFile(null);
        fetchPatients();
      } else {
        const err = await res?.json().catch(() => ({}));
        setSaveError(Array.isArray(err?.message) ? err.message.join(', ') : (err?.message || 'Failed to save patient'));
      }
    } catch {
      setSaveError('Network error. Please ensure the gateway is running.');
    } finally {
      setSaving(false);
    }
  };

  const handleScheduleAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setSaving(true);
    
    const dateTimeStr = `${scheduleForm.date}T${scheduleForm.time}:00`;
    
    try {
      const appt = {
        id: Math.random().toString(36).slice(2),
        patientId: selectedPatient.id,
        patientName: `${selectedPatient.user?.firstName} ${selectedPatient.user?.lastName}`,
        scheduledAt: dateTimeStr,
        type: scheduleForm.type as any,
        notes: scheduleForm.notes,
        status: 'scheduled' as const,
        createdAt: new Date().toISOString()
      };
      
      saveAppointment(appt);
      
      // Attempt to save via API
      try {
        await api.post('/appointments', {
          patientId: selectedPatient.id,
          doctorId: 'demo-doctor-id',
          scheduledAt: dateTimeStr,
          notes: scheduleForm.notes,
          type: scheduleForm.type
        });
      } catch (e) {}

      // Send Email Notification
      const actualEmail = selectedPatient.contactEmails?.[0]?.email || 
                          (selectedPatient.user?.email && !selectedPatient.user.email.includes('@system.local') ? selectedPatient.user.email : null);
                          
      const hasEmail = !!actualEmail;

      if (hasEmail) {
        try {
          const emailRes = await fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              patientName: appt.patientName,
              patientEmail: actualEmail,
              doctorName: 'Satnaam Singh Gandhi',
              date: scheduleForm.date,
              time: scheduleForm.time,
              status: 'SCHEDULED'
            })
          });
          
          if (!emailRes.ok) {
            const errData = await emailRes.json();
            alert(`Appointment booked but email failed: ${errData.error || 'Unknown error'}`);
          } else {
            alert('Appointment scheduled and email sent!');
          }
        } catch (err) {
          console.error("Email failed", err);
          alert('Appointment booked but email failed to send.');
        }
      } else {
        alert('Appointment booked but no email sent. Register an email id for notifications');
      }

      setShowScheduleModal(false);
      setScheduleForm({ date: '', time: '', type: 'routine', notes: '' });
      setSelectedPatient(null);
    } finally {
      setSaving(false);
    }
  };

  const getAge = (dob?: string) => {
    if (!dob) return 'N/A';
    return Math.floor((Date.now() - new Date(dob).getTime()) / 31536000000).toString();
  };

  const filtered = Array.isArray(patients) ? patients.filter(p =>
    `${p.user?.firstName} ${p.user?.lastName} ${p.user?.email}`.toLowerCase().includes(search.toLowerCase())
  ) : [];

  const bloodColors: Record<string, string> = {
    'O+': 'bg-red-500/10 text-red-400', 'O-': 'bg-red-600/10 text-red-500',
    'A+': 'bg-blue-500/10 text-blue-400', 'A-': 'bg-blue-600/10 text-blue-500',
    'B+': 'bg-emerald-500/10 text-emerald-400', 'B-': 'bg-emerald-600/10 text-emerald-500',
    'AB+': 'bg-purple-500/10 text-purple-400', 'AB-': 'bg-purple-600/10 text-purple-500',
  };

  return (
    <div className="min-h-screen bg-[#0F1419] text-white">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black display-font tracking-tight mb-1">
              Patient <span className="accent-gradient-text">Directory</span>
            </h1>
            <p className="text-slate-500 text-sm">{patients.length} patients registered</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
              <button onClick={() => setView('grid')} className={`p-2 rounded-lg transition-all ${view === 'grid' ? 'bg-white/10 text-cyan-400' : 'text-slate-500 hover:text-white'}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              </button>
              <button onClick={() => setView('list')} className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-white/10 text-cyan-400' : 'text-slate-500 hover:text-white'}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </button>
            </div>
            <button onClick={() => setShowAddModal(true)} className="accent-gradient flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm shadow-lg shadow-cyan-500/20 hover:scale-105 transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 4v16m8-8H4"/></svg>
              Add Patient
            </button>
          </div>
        </section>

        <div className="glass-card rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64"><div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"/></div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map(p => (
              <div key={p.id} className="glass-card rounded-3xl p-6 hover:border-cyan-500/40 transition-all group cursor-pointer relative overflow-hidden" onClick={() => setSelectedPatient(p)}>
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-all"/>
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white/10 group-hover:border-cyan-500/50 transition-all flex-shrink-0">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.user?.firstName}&backgroundColor=0f172a`} alt="Avatar" className="w-full h-full object-cover"/>
                      </div>
                      <div>
                        <h3 className="font-bold text-base group-hover:text-cyan-400 transition-colors">{p.user?.firstName} {p.user?.lastName}</h3>
                        <p className="text-[10px] text-slate-500 truncate max-w-[140px]">{p.contactEmails?.[0]?.email || p.user?.email}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex-shrink-0 ${bloodColors[p.bloodType || ''] || 'bg-slate-500/10 text-slate-400'}`}>{p.bloodType || 'N/A'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-5">
                    {[
                      { label: 'Age', value: getAge(p.dateOfBirth) },
                      { label: 'Gender', value: p.gender?.[0] || 'N/A' },
                      { label: 'Blood', value: p.bloodType || 'N/A' },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-white/5 rounded-xl p-2.5 text-center">
                        <p className="text-[9px] text-slate-600 uppercase font-bold mb-0.5">{label}</p>
                        <p className="text-xs font-black">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); router.push(`/records?patientId=${p.id}`); }} className="flex-1 py-2.5 bg-white/5 hover:bg-cyan-500 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all">View Full Records</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-3xl overflow-hidden border border-white/5">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-slate-500 font-black">
                  {['Patient', 'DOB / Age', 'Blood', 'Gender', 'Phone'].map(h => <th key={h} className="px-5 py-4 text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => setSelectedPatient(p)}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.user?.firstName}&backgroundColor=0f172a`} alt="Avatar" className="w-full h-full"/>
                        </div>
                        <div><p className="font-bold text-sm">{p.user?.firstName} {p.user?.lastName}</p><p className="text-[10px] text-slate-500">{p.contactEmails?.[0]?.email || p.user?.email}</p></div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><p className="text-xs text-slate-300">{p.dateOfBirth || 'N/A'}</p><p className="text-[10px] text-slate-600">{getAge(p.dateOfBirth)} yrs</p></td>
                    <td className="px-5 py-4"><span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${bloodColors[p.bloodType || ''] || 'bg-slate-500/10 text-slate-400'}`}>{p.bloodType || 'N/A'}</span></td>
                    <td className="px-5 py-4 text-xs text-slate-400">{p.gender || 'N/A'}</td>
                    <td className="px-5 py-4 text-xs text-slate-400">{p.user?.phone || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0F1419] border border-white/10 rounded-3xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black italic">Add <span className="accent-gradient-text">New Patient</span></h2>
              <button onClick={() => { setShowAddModal(false); setForm(EMPTY_FORM); setUploadFile(null); setSaveError(''); }} className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 hover:bg-red-500/10 hover:text-red-400 transition-all text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            {saveError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{saveError}</div>}

            <form onSubmit={handleAddPatient} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'First Name', key: 'firstName', type: 'text', req: true },
                  { label: 'Last Name', key: 'lastName', type: 'text', req: true },
                  { label: 'Email', key: 'email', type: 'email', req: true },
                  { label: 'Phone', key: 'phone', type: 'tel', req: false },
                  { label: 'Date of Birth', key: 'dateOfBirth', type: 'date', req: false },
                  { label: 'Emergency Contact', key: 'emergencyContact', type: 'text', req: false },
                ].map(({ label, key, type, req }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}{req && ' *'}</label>
                    <input type={type} required={req} value={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
                    />
                  </div>
                ))}
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Upload Previous Medical Records (Optional)</label>
                <input type="file" onChange={handleFileChange} ref={fileInputRef} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-cyan-500 file:text-white hover:file:bg-cyan-600 transition-all" />
                {uploadFile && <p className="text-xs text-cyan-400 mt-1">Will be processed by AI after registration.</p>}
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={saving} className="w-full accent-gradient py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-cyan-500/20 disabled:opacity-50 hover:scale-[1.02] transition-all">
                  {saving ? 'Registering...' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient Detail Side Panel */}
      {selectedPatient && !showScheduleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-end z-40 p-4">
          <div className="bg-[#0F1419] border border-white/10 rounded-3xl p-6 w-full max-w-sm h-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-sm uppercase tracking-widest text-cyan-400">Patient Profile</h3>
              <button onClick={() => setSelectedPatient(null)} className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 hover:bg-red-500/10 hover:text-red-400 transition-all text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-3xl overflow-hidden border-2 border-cyan-500/30 mx-auto mb-4">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedPatient.user?.firstName}&backgroundColor=0f172a`} alt="Avatar" className="w-full h-full"/>
              </div>
              <h2 className="text-xl font-black">{selectedPatient.user?.firstName} {selectedPatient.user?.lastName}</h2>
              <p className="text-slate-500 text-sm">{selectedPatient.contactEmails?.[0]?.email || selectedPatient.user?.email}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                ['Age', getAge(selectedPatient.dateOfBirth)],
                ['Gender', selectedPatient.gender || 'N/A'],
                ['Blood Type', selectedPatient.bloodType || 'N/A'],
                ['Phone', selectedPatient.user?.phone || 'N/A'],
              ].map(([l, v]) => (
                <div key={l} className="bg-white/5 rounded-xl p-3">
                  <p className="text-[10px] text-slate-600 uppercase font-bold mb-1">{l}</p>
                  <p className="text-sm font-bold">{v}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <button onClick={() => router.push(`/records?patientId=${selectedPatient.id}`)} className="w-full py-3 bg-cyan-500 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] transition-all">View Full Records</button>
              <button onClick={() => setShowScheduleModal(true)} className="w-full py-3 bg-white/5 border border-white/10 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all">Schedule Appointment</button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Appointment Modal */}
      {showScheduleModal && selectedPatient && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0F1419] border border-white/10 rounded-3xl p-8 w-full max-w-md">
            <h2 className="text-xl font-black mb-4">Schedule Appointment for {selectedPatient.user?.firstName}</h2>
            <form onSubmit={handleScheduleAppointment} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Date</label>
                <input type="date" required value={scheduleForm.date} onChange={e => setScheduleForm({...scheduleForm, date: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-cyan-500/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Time</label>
                <input type="time" required value={scheduleForm.time} onChange={e => setScheduleForm({...scheduleForm, time: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-cyan-500/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Type / Status</label>
                <select required value={scheduleForm.type} onChange={e => setScheduleForm({...scheduleForm, type: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none">
                  <option value="routine">Active / Routine</option>
                  <option value="critical">Critical</option>
                  <option value="urgent">Urgent</option>
                  <option value="follow-up">Follow-up</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notes (Optional)</label>
                <textarea rows={2} value={scheduleForm.notes} onChange={e => setScheduleForm({...scheduleForm, notes: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-cyan-500/50" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowScheduleModal(false)} className="flex-1 py-3 bg-white/5 rounded-xl font-black text-sm uppercase tracking-widest">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-cyan-500 rounded-xl font-black text-sm uppercase tracking-widest">{saving ? 'Saving...' : 'Schedule'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
