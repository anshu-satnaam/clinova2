'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  risk?: string;
  requiresApproval?: boolean;
}

const RISK_STYLE: Record<string, string> = {
  CRITICAL: 'border-red-600 bg-red-950',
  HIGH: 'border-orange-600 bg-orange-950',
  MEDIUM: 'border-yellow-700 bg-yellow-950',
  LOW: 'border-green-700 bg-green-950',
};

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: '👋 Hello, Doctor. I am Clinova AI — your clinical decision support assistant.\n\nDescribe patient symptoms and I will assist with:\n• Clinical assessment via LangGraph workflow\n• Differential diagnosis\n• FHIR resource generation\n• ICD-10 coding suggestions\n\n⚠️ All AI outputs require doctor approval before clinical use (ISO 42001).',
  }]);
  const [input, setInput] = useState('');
  const [patientId, setPatientId] = useState('demo-patient-001');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const token = localStorage.getItem('accessToken');
    const text = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', content: text }]);
    setLoading(true);
    try {
      const res = await fetch(`${API}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text, patient_id: patientId }),
      });
      const data = await res.json();
      setMessages(m => [...m, {
        role: 'assistant',
        content: data.response || data.detail || 'Assessment complete.',
        risk: data.risk_level,
        requiresApproval: data.requires_doctor_approval,
      }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: '❌ AI service unreachable. Ensure all Docker services are running.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-white text-sm">← Dashboard</button>
        <div className="flex-1">
          <h1 className="text-white font-semibold">🧠 Clinova AI Clinical Assistant</h1>
          <p className="text-xs text-gray-500">LangGraph + Mistral · 8-node clinical workflow</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">Patient ID:</label>
          <input value={patientId} onChange={e => setPatientId(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white w-44" />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-3xl mx-auto w-full">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xl rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-blue-700 text-white'
                : `bg-gray-900 border text-gray-200 ${m.risk ? (RISK_STYLE[m.risk] || 'border-gray-700') : 'border-gray-800'}`
            }`}>
              {m.role === 'assistant' && m.risk && (
                <p className="text-xs mb-2 opacity-70">
                  Risk: <strong>{m.risk}</strong> · {m.requiresApproval ? '⚠️ Doctor review required' : '✅ Auto-approved'}
                </p>
              )}
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 text-sm text-gray-400 animate-pulse">
              🔄 Running LangGraph clinical workflow...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-800 bg-gray-900 p-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <input id="chat-input" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="e.g. Patient presents with chest pain, 52M, history of hypertension..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <button id="send-btn" onClick={sendMessage} disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 rounded-xl font-medium transition disabled:opacity-50">
            Send
          </button>
        </div>
        <p className="text-xs text-gray-600 text-center mt-2">
          AI outputs require doctor approval · ISO 42001 · HIPAA compliant
        </p>
      </div>
    </div>
  );
}
