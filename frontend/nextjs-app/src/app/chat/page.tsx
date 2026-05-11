'use client';
import { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import { api } from '../../lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sessionId?: string;
  riskLevel?: string;
  medicalEntities?: any;
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  messages: Message[];
}

const STORAGE_KEY = 'clinova_chat_history';

function loadSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveSessions(sessions: ChatSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 20)));
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello Doctor. I'm your clinical AI assistant powered by Mistral + LangGraph. I can help with patient assessments, differential diagnoses, ICD-10 coding, and clinical summaries. How can I assist today?", timestamp: new Date().toISOString() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [patientId, setPatientId] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startNewChat = () => {
    setActiveSessionId(null);
    setMessages([
      { role: 'assistant', content: "New session started. How can I assist with your clinical work today?", timestamp: new Date().toISOString() }
    ]);
  };

  const loadSession = (session: ChatSession) => {
    setActiveSessionId(session.id);
    setMessages(session.messages);
  };

  const deleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== sessionId);
    setSessions(updated);
    saveSessions(updated);
    if (activeSessionId === sessionId) startNewChat();
  };

  const saveCurrentSession = (msgs: Message[]) => {
    const sid = activeSessionId || `session-${Date.now()}`;
    const firstUserMsg = msgs.find(m => m.role === 'user');
    const title = firstUserMsg?.content.slice(0, 50) + '...' || 'New Consultation';

    const session: ChatSession = {
      id: sid,
      title,
      lastMessage: msgs[msgs.length - 1]?.content.slice(0, 60) + '...' || '',
      timestamp: new Date().toISOString(),
      messages: msgs,
    };

    const updated = [session, ...sessions.filter(s => s.id !== sid)];
    setSessions(updated);
    saveSessions(updated);
    if (!activeSessionId) setActiveSessionId(sid);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input, timestamp: new Date().toISOString() };
    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        message: input,
        patient_id: patientId || 'general-consultation',
        context_type: 'clinical',
        history: messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
      });

      if (res && res.ok) {
        const data = await res.json();
        const aiMsg: Message = {
          role: 'assistant',
          content: data.response || 'Assessment complete. Please consult clinical guidelines for final decisions.',
          timestamp: new Date().toISOString(),
          sessionId: data.session_id,
          riskLevel: data.risk_level,
          medicalEntities: data.medical_entities,
        };
        const finalMsgs = [...updatedMsgs, aiMsg];
        setMessages(finalMsgs);
        saveCurrentSession(finalMsgs);
      } else {
        const errData = await res?.json().catch(() => ({}));
        const errorMsg: Message = {
          role: 'assistant',
          content: `⚠️ AI Service Error: ${errData?.message || 'The AI microservice returned an error. Ensure the ai-service is running on port 8001.'}`,
          timestamp: new Date().toISOString(),
        };
        const finalMsgs = [...updatedMsgs, errorMsg];
        setMessages(finalMsgs);
        saveCurrentSession(finalMsgs);
      }
    } catch (err) {
      const errorMsg: Message = {
        role: 'assistant',
        content: `❌ Network Error: Cannot reach the AI Gateway. Please ensure:\n1. Gateway is running on port 3000\n2. AI service is running on port 8001\n3. Run: python3 restart_all.py in the Clinova directory`,
        timestamp: new Date().toISOString(),
      };
      const finalMsgs = [...updatedMsgs, errorMsg];
      setMessages(finalMsgs);
      saveCurrentSession(finalMsgs);
    } finally {
      setLoading(false);
    }
  };

  const QUICK_PROMPTS = [
    'Summarize patient vitals',
    'Generate ICD-10 codes for hypertension',
    'Differential diagnosis for chest pain',
    'FHIR report for current patient',
    'AI risk assessment review',
    'Check medication interactions',
  ];

  const riskColors: Record<string, string> = {
    CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/20',
    HIGH: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    MEDIUM: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    LOW: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  };

  return (
    <div className="h-screen bg-[#0F1419] text-white flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar: Chat History */}
        <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} flex-shrink-0 transition-all duration-300 overflow-hidden bg-[#0A0F14] border-r border-white/5 flex flex-col`}>
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Chat History</h3>
            <button onClick={startNewChat} className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500 hover:text-white transition-all">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 4v16m8-8H4"/></svg>
              New
            </button>
          </div>

          {/* Patient context */}
          <div className="p-3 border-b border-white/5">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1.5">Patient ID (Optional)</p>
            <input
              type="text" value={patientId} onChange={e => setPatientId(e.target.value)}
              placeholder="e.g. patient-uuid-123"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500/50 text-slate-300"
            />
          </div>

          {/* Sessions list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.length === 0 ? (
              <p className="text-center text-slate-600 text-xs italic py-8">No chat history yet</p>
            ) : sessions.map(session => (
              <div
                key={session.id}
                onClick={() => loadSession(session)}
                className={`group p-3 rounded-xl cursor-pointer transition-all relative ${activeSessionId === session.id ? 'bg-cyan-500/10 border border-cyan-500/20' : 'hover:bg-white/5 border border-transparent'}`}
              >
                <p className="text-xs font-bold text-slate-200 truncate mb-1">{session.title}</p>
                <p className="text-[10px] text-slate-600 truncate">{session.lastMessage}</p>
                <p className="text-[10px] text-slate-700 mt-1">{new Date(session.timestamp).toLocaleDateString()}</p>
                <button
                  onClick={e => deleteSession(e, session.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-slate-600 hover:text-red-400 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
          </div>

          {/* Quick prompts */}
          <div className="p-3 border-t border-white/5">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Quick Prompts</p>
            <div className="space-y-1">
              {QUICK_PROMPTS.map(p => (
                <button key={p} onClick={() => setInput(p)} className="w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold text-slate-500 hover:text-white hover:bg-white/5 transition-all truncate">{p}</button>
              ))}
            </div>
          </div>
        </aside>

        {/* Chat Area */}
        <section className="flex-1 flex flex-col overflow-hidden relative">
          {/* Chat header */}
          <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <div>
              <h2 className="font-black text-sm">Clinova Clinical AI</h2>
              <p className="text-[10px] text-slate-500">Powered by Mistral + LangGraph | ISO 42001 Compliant</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">AI Online</span>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] space-y-2`}>
                  <div className={`rounded-3xl p-5 ${
                    msg.role === 'user'
                      ? 'bg-cyan-500 text-white rounded-tr-sm'
                      : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-sm'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {/* AI metadata badges */}
                  {msg.role === 'assistant' && msg.riskLevel && (
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${riskColors[msg.riskLevel] || riskColors.LOW}`}>
                        Risk: {msg.riskLevel}
                      </span>
                      {msg.medicalEntities?.diagnoses?.length > 0 && (
                        <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {msg.medicalEntities.diagnoses.length} diagnosis
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-700 font-bold px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.role === 'assistant' && ' • AI'}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 rounded-3xl rounded-tl-sm px-6 py-4">
                  <div className="flex gap-1.5 items-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mr-2">Analyzing</span>
                    {[0,1,2].map(i => (
                      <div key={i} className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 sm:p-6 bg-black/30 backdrop-blur-xl border-t border-white/5">
            <div className="relative flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Ask a clinical question... (Enter to send, Shift+Enter for new line)"
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-5 pr-5 focus:outline-none focus:border-cyan-500/50 transition-all font-medium text-slate-200 resize-none text-sm"
                />
              </div>
              <button
                onClick={handleSend} disabled={loading || !input.trim()}
                className="w-12 h-12 bg-cyan-500 rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
            <p className="text-[10px] text-center text-slate-700 font-bold uppercase tracking-[0.2em] mt-3">
              AI insights require doctor verification before clinical action
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
