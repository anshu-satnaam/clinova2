'use client';
import { useState, useEffect } from 'react';
import Header from '../components/Header';
import { api } from '../../lib/api';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  lastLoginAt: string;
  mfaEnabled: boolean;
  doctorProfile?: {
    licenseNumber: string;
    specialization: string;
    department?: string;
    bio?: string;
  };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    specialization: '',
    department: '',
    bio: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res && res.ok) {
        const data = await res.json();
        setProfile(data);
        setForm({
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || '',
          specialization: data.doctorProfile?.specialization || '',
          department: data.doctorProfile?.department || '',
          bio: data.doctorProfile?.bio || ''
        });
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const res = await api.post('/auth/profile', {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        doctorProfile: {
          specialization: form.specialization,
          department: form.department,
          bio: form.bio
        }
      });
      if (res && res.ok) {
        setEditing(false);
        fetchProfile();
      }
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0F1419] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F1419] text-white">
      <Header />
      
      <main className="max-w-5xl mx-auto px-8 py-12">
        <section className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="flex items-center gap-8">
            <div className="w-32 h-32 rounded-[40px] bg-gradient-to-br from-cyan-500 to-purple-500 p-1 relative group">
              <div className="w-full h-full rounded-[38px] bg-[#0F1419] overflow-hidden flex items-center justify-center border-4 border-[#0F1419]">
                <span className="text-4xl font-black text-white">{profile?.firstName[0]}{profile?.lastName[0]}</span>
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-black display-font tracking-tight mb-2">
                Dr. {profile?.firstName} <span className="accent-gradient-text">{profile?.lastName}</span>
              </h1>
              <div className="flex items-center gap-3">
                <span className="bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-cyan-500/20">
                  {profile?.doctorProfile?.specialization || 'Clinical Specialist'}
                </span>
                <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                  ID: {profile?.id.slice(0, 8)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            {editing ? (
              <button 
                onClick={handleSave}
                className="px-8 py-4 bg-cyan-500 rounded-2xl font-black text-sm hover:scale-105 transition-all shadow-lg shadow-cyan-500/20"
              >
                Save Changes
              </button>
            ) : (
              <button 
                onClick={() => setEditing(true)}
                className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-sm hover:bg-white/10 transition-all"
              >
                Edit Profile
              </button>
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <div className="glass-card rounded-[40px] p-10 border-white/10">
              <h3 className="text-xl font-bold mb-8 italic">Professional Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {editing ? (
                  <>
                    <InputItem label="First Name" value={form.firstName} onChange={v => setForm({...form, firstName: v})} />
                    <InputItem label="Last Name" value={form.lastName} onChange={v => setForm({...form, lastName: v})} />
                    <InputItem label="Specialization" value={form.specialization} onChange={v => setForm({...form, specialization: v})} />
                    <InputItem label="Department" value={form.department} onChange={v => setForm({...form, department: v})} />
                    <InputItem label="Phone" value={form.phone} onChange={v => setForm({...form, phone: v})} />
                  </>
                ) : (
                  <>
                    <InfoItem label="License Number" value={profile?.doctorProfile?.licenseNumber || 'N/A'} />
                    <InfoItem label="Department" value={profile?.doctorProfile?.department || 'Cardiology'} />
                    <InfoItem label="Email Identity" value={profile?.email || 'N/A'} />
                    <InfoItem label="Primary Phone" value={profile?.phone || 'Not set'} />
                  </>
                )}
              </div>
              
              <div className="mt-12 pt-12 border-t border-white/5">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">Professional Bio</h4>
                {editing ? (
                  <textarea 
                    value={form.bio}
                    onChange={e => setForm({...form, bio: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-sm focus:outline-none focus:border-cyan-500 min-h-[150px]"
                    placeholder="Tell us about your background..."
                  />
                ) : (
                  <p className="text-slate-300 leading-relaxed font-medium">
                    {profile?.doctorProfile?.bio || "No bio provided."}
                  </p>
                )}
              </div>
            </div>

            <div className="glass-card rounded-[40px] p-10 border-white/10">
              <h3 className="text-xl font-bold mb-8 italic">Security & Identity</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5">
                  <div>
                    <p className="font-bold mb-1">Multi-Factor Authentication</p>
                    <p className="text-xs text-slate-500">Add an extra layer of security.</p>
                  </div>
                  <div className={`w-14 h-8 rounded-full relative transition-all cursor-pointer ${profile?.mfaEnabled ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${profile?.mfaEnabled ? 'right-1' : 'left-1'}`} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="glass-card rounded-[40px] p-8 bg-gradient-to-br from-cyan-500/10 to-transparent border-cyan-500/20">
              <h4 className="text-xs font-black uppercase tracking-widest text-cyan-400 mb-6">Activity Summary</h4>
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <p className="text-slate-500 text-[10px] font-black uppercase">Records Signed</p>
                  <p className="text-2xl font-black">128</p>
                </div>
                <div className="h-[1px] bg-white/5" />
                <div>
                  <p className="text-slate-500 text-[10px] font-black uppercase mb-2">Last Login</p>
                  <p className="text-sm font-bold">{profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : 'Just now'}</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => { localStorage.clear(); window.location.href = '/'; }}
              className="w-full py-5 bg-red-500/10 hover:bg-red-500 border border-red-500/20 text-red-500 hover:text-white rounded-[30px] font-black text-xs uppercase tracking-[0.2em] transition-all"
            >
              Terminate Session
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function InfoItem({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function InputItem({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{label}</p>
      <input 
        type="text" 
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500"
      />
    </div>
  );
}
