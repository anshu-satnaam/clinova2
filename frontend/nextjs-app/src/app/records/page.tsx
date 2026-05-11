'use client';
import { useState, useEffect, Suspense } from 'react';
import Header from '../components/Header';
import { api } from '../../lib/api';
import { useSearchParams, useRouter } from 'next/navigation';
import { getPatientData, addObservation, addCondition, LocalPatientData } from '../../lib/patientStore';

function RecordsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get('patientId');

  const [patient, setPatient] = useState<any>(null);
  const [data, setData] = useState<LocalPatientData>({ records: [], observations: [], conditions: [] });
  const [loading, setLoading] = useState(true);

  // Modals
  const [showObsModal, setShowObsModal] = useState(false);
  const [showCondModal, setShowCondModal] = useState(false);

  // Forms
  const [obsForm, setObsForm] = useState({ name: '', value: '', unit: '', type: 'vital' as any });
  const [condForm, setCondForm] = useState({ name: '', status: 'active' as any, notes: '' });

  useEffect(() => {
    if (!patientId) {
      router.push('/patients');
      return;
    }
    fetchData();
  }, [patientId]);

  const fetchData = async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      // Get patient details
      const res = await api.get('/patients');
      if (res && res.ok) {
        const pList = await res.json();
        const pts = Array.isArray(pList) ? pList : (pList.data || []);
        const p = pts.find((x:any) => x.id === patientId);
        if (p) setPatient(p);
        else setPatient({ user: { firstName: 'Patient', lastName: patientId } }); // fallback
      } else {
        setPatient({ user: { firstName: 'Demo', lastName: 'Patient' } });
      }

      // Load local patient data (uploaded records + observations + conditions)
      setData(getPatientData(patientId));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddObservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    addObservation(patientId, {
      id: Math.random().toString(36).slice(2),
      name: obsForm.name,
      value: obsForm.value,
      unit: obsForm.unit,
      type: obsForm.type,
      date: new Date().toISOString()
    });
    setData(getPatientData(patientId));
    setShowObsModal(false);
    setObsForm({ name: '', value: '', unit: '', type: 'vital' });
  };

  const handleAddCondition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    addCondition(patientId, {
      id: Math.random().toString(36).slice(2),
      name: condForm.name,
      status: condForm.status,
      notes: condForm.notes,
      diagnosedAt: new Date().toISOString()
    });
    setData(getPatientData(patientId));
    setShowCondModal(false);
    setCondForm({ name: '', status: 'active', notes: '' });
  };

  if (loading) return <div className="min-h-screen bg-[#0F1419] text-white pt-20"><div className="flex justify-center"><div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"/></div></div>;

  const patientName = patient?.user ? `${patient.user.firstName} ${patient.user.lastName}` : 'Patient Records';

  return (
    <div className="min-h-screen bg-[#0F1419] text-white">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <div className="flex items-center gap-4 mb-8 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => router.push('/patients')}>
          <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          <span className="text-sm font-black uppercase tracking-widest text-cyan-400">Back to Patients</span>
        </div>

        <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black display-font tracking-tight mb-2">
              <span className="accent-gradient-text">{patientName}</span> Records
            </h1>
            <p className="text-slate-500 text-sm">Comprehensive medical history and clinical data</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowCondModal(true)} className="px-4 py-2.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-500/20 transition-all">Add Condition</button>
            <button onClick={() => setShowObsModal(true)} className="px-4 py-2.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-cyan-500/20 transition-all">Add Observation</button>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Conditions & Observations */}
          <div className="space-y-8">
            <div className="glass-card rounded-3xl p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-orange-400 mb-4 flex items-center gap-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg> Active Conditions</h3>
              {data.conditions.length === 0 ? <p className="text-slate-500 text-xs italic">No conditions recorded.</p> : (
                <div className="space-y-3">
                  {data.conditions.map(c => (
                    <div key={c.id} className="p-3 bg-white/5 border border-white/5 rounded-xl">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-bold text-sm text-white">{c.name}</p>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{c.status}</span>
                      </div>
                      <p className="text-[10px] text-slate-500">Diagnosed: {new Date(c.diagnosedAt).toLocaleDateString()}</p>
                      {c.notes && <p className="text-xs text-slate-400 mt-2">{c.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card rounded-3xl p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-cyan-400 mb-4 flex items-center gap-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> Clinical Observations</h3>
              {data.observations.length === 0 ? <p className="text-slate-500 text-xs italic">No observations recorded.</p> : (
                <div className="space-y-3">
                  {data.observations.map(o => (
                    <div key={o.id} className="flex justify-between items-center p-3 bg-white/5 border border-white/5 rounded-xl">
                      <div>
                        <p className="font-bold text-sm text-white">{o.name}</p>
                        <p className="text-[9px] text-slate-500 uppercase font-black">{new Date(o.date).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-lg text-cyan-400">{o.value} <span className="text-[10px] text-slate-500 uppercase">{o.unit}</span></p>
                        <p className="text-[9px] text-slate-600 uppercase font-bold">{o.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Uploaded Documents & Reports */}
          <div className="lg:col-span-2">
            <div className="glass-card rounded-3xl p-6 h-full border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-transparent">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-300 mb-6 flex items-center gap-2"><svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Uploaded Medical Reports</h3>
              
              {data.records.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
                  <p className="text-slate-500 text-sm italic">No medical documents uploaded.</p>
                  <p className="text-[10px] uppercase font-black text-slate-600 mt-2 tracking-widest">Upload files when adding a patient</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.records.map(r => (
                    <div key={r.id} className="p-5 bg-black/40 border border-white/10 rounded-2xl hover:border-cyan-500/40 transition-colors">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="font-bold text-sm text-white truncate">{r.fileName}</p>
                          <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-0.5">{new Date(r.uploadedAt).toLocaleDateString()} • {(r.fileSize / 1024).toFixed(0)} KB</p>
                        </div>
                      </div>
                      
                      <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-xl relative">
                        <span className="absolute -top-2 left-3 bg-[#0F1419] px-1 text-[8px] font-black uppercase tracking-widest text-purple-400">AI Summary</span>
                        <p className="text-xs text-purple-100/80 leading-relaxed font-medium italic mt-1">&quot;{r.aiSummary || 'Document processed securely. No critical findings extracted.'}&quot;</p>
                      </div>
                      
                      <button className="w-full mt-4 py-2 bg-white/5 hover:bg-cyan-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-cyan-400">View Document</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Observation Modal */}
      {showObsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0F1419] border border-white/10 rounded-3xl p-8 w-full max-w-md">
            <h2 className="text-xl font-black mb-4">Add Observation</h2>
            <form onSubmit={handleAddObservation} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Observation Name</label>
                <select required value={obsForm.name} onChange={e => setObsForm({...obsForm, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-cyan-500">
                  <option value="">Select Observation...</option>
                  <option value="Heart Rate">Heart Rate</option>
                  <option value="Blood Pressure">Blood Pressure</option>
                  <option value="Sugar Level">Sugar Level</option>
                  <option value="Oxygen Saturation">Oxygen Saturation</option>
                  <option value="Temperature">Temperature</option>
                  <option value="Respiratory Rate">Respiratory Rate</option>
                  <option value="Custom">Custom / Other</option>
                </select>
                {obsForm.name === 'Custom' && <input placeholder="Enter custom name" onChange={e => setObsForm({...obsForm, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm mt-2 focus:border-cyan-500" />}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Value</label>
                  <input required value={obsForm.value} onChange={e => setObsForm({...obsForm, value: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-cyan-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Unit</label>
                  <select required value={obsForm.unit} onChange={e => setObsForm({...obsForm, unit: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-cyan-500">
                    <option value="">Select Unit...</option>
                    <option value="bpm">bpm</option>
                    <option value="mmHg">mmHg</option>
                    <option value="mg/dL">mg/dL</option>
                    <option value="%">%</option>
                    <option value="°C">°C</option>
                    <option value="°F">°F</option>
                    <option value="breaths/min">breaths/min</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Type</label>
                <select value={obsForm.type} onChange={e => setObsForm({...obsForm, type: e.target.value as any})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-cyan-500">
                  <option value="vital">Vital Sign</option>
                  <option value="lab">Lab Result</option>
                  <option value="note">Clinical Note</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowObsModal(false)} className="flex-1 py-3 bg-white/5 rounded-xl font-black text-sm uppercase">Cancel</button>
                <button type="submit" className="flex-1 bg-cyan-500 rounded-xl font-black text-sm uppercase">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Condition Modal */}
      {showCondModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0F1419] border border-white/10 rounded-3xl p-8 w-full max-w-md">
            <h2 className="text-xl font-black mb-4">Add Condition</h2>
            <form onSubmit={handleAddCondition} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Condition Name</label>
                <input required value={condForm.name} onChange={e => setCondForm({...condForm, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-cyan-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</label>
                <select value={condForm.status} onChange={e => setCondForm({...condForm, status: e.target.value as any})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-cyan-500">
                  <option value="active">Active</option>
                  <option value="chronic">Chronic</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notes</label>
                <textarea rows={2} value={condForm.notes} onChange={e => setCondForm({...condForm, notes: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-cyan-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCondModal(false)} className="flex-1 py-3 bg-white/5 rounded-xl font-black text-sm uppercase">Cancel</button>
                <button type="submit" className="flex-1 bg-orange-500 rounded-xl font-black text-sm uppercase">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RecordsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0F1419] text-white pt-20 flex justify-center"><div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"/></div>}>
      <RecordsContent />
    </Suspense>
  );
}
