'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function VoicePage() {
  const router = useRouter();
  const [patientId, setPatientId] = useState('demo-patient-001');
  const [roomName, setRoomName] = useState('');
  const [token, setToken] = useState('');
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [processingPipeline, setProcessingPipeline] = useState(false);

  const authToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` };

  const startSession = async () => {
    if (!consentGiven) {
      alert('Patient consent is required before starting a voice session (DPDP Act 2023).');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/voice/rooms/create`, {
        method: 'POST', headers,
        body: JSON.stringify({ patient_id: patientId }),
      });
      const data = await res.json();
      setRoomName(data.room_name);
      setToken(data.token);
      setSessionActive(true);
    } catch {
      alert('Failed to create LiveKit room. Check voice service.');
    } finally {
      setLoading(false);
    }
  };

  const endSession = async () => {
    if (roomName) {
      await fetch(`${API}/voice/rooms/${roomName}`, { method: 'DELETE', headers });
    }
    setSessionActive(false);
    setRoomName('');
    setToken('');
  };

  const runPipeline = async () => {
    if (!transcript.trim()) { alert('Enter a transcript first.'); return; }
    if (!consentGiven) { alert('Patient consent required.'); return; }
    setProcessingPipeline(true);
    setAiResponse('');
    try {
      const res = await fetch(`${API}/voice/pipeline/process`, {
        method: 'POST', headers,
        body: JSON.stringify({ transcript, patient_id: patientId, consent_given: consentGiven }),
      });
      const data = await res.json();
      setAiResponse(data.ai_response_text || '');
      setRiskLevel(data.risk_level || '');
    } catch {
      setAiResponse('Pipeline error — ensure all services are running.');
    } finally {
      setProcessingPipeline(false);
    }
  };

  const RISK_COLOR: Record<string, string> = {
    CRITICAL: 'text-red-400', HIGH: 'text-orange-400', MEDIUM: 'text-yellow-400', LOW: 'text-green-400',
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-white text-sm">← Dashboard</button>
        <div>
          <h1 className="font-semibold">🎙️ Voice AI Pipeline</h1>
          <p className="text-xs text-gray-500">LiveKit · Deepgram STT · LangGraph · Cartesia TTS</p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-6">

        {/* DPDP Consent */}
        <div className="bg-gray-900 border border-yellow-700 rounded-xl p-4">
          <h2 className="font-semibold text-yellow-400 mb-2">⚖️ Patient Consent (DPDP Act 2023)</h2>
          <p className="text-sm text-gray-400 mb-3">
            Voice recording and AI processing require explicit patient consent. This session will be audited (HIPAA compliance).
          </p>
          <label className="flex items-center gap-3 cursor-pointer">
            <input id="consent-checkbox" type="checkbox" checked={consentGiven}
              onChange={e => setConsentGiven(e.target.checked)}
              className="w-4 h-4 accent-blue-500" />
            <span className="text-sm text-gray-200">Patient has provided verbal/written consent for AI voice processing</span>
          </label>
        </div>

        {/* Patient + Room Setup */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold">📋 Session Setup</h2>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Patient ID</label>
            <input value={patientId} onChange={e => setPatientId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          {!sessionActive ? (
            <button id="start-session-btn" onClick={startSession} disabled={loading || !consentGiven}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition disabled:opacity-40">
              {loading ? 'Creating room...' : '▶ Start Telehealth Session (LiveKit)'}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="bg-green-900 border border-green-700 rounded-lg p-3 text-sm">
                ✅ <strong>Room Active:</strong> <code className="text-green-300">{roomName}</code>
              </div>
              <p className="text-xs text-gray-500">
                LiveKit token generated. In production, embed the LiveKit React component here to display the WebRTC call UI.
              </p>
              <button onClick={endSession}
                className="w-full bg-red-800 hover:bg-red-700 text-white py-2 rounded-lg text-sm transition">
                ⏹ End Session
              </button>
            </div>
          )}
        </div>

        {/* Full Voice Pipeline */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold">🔄 Full Voice AI Pipeline</h2>
          <p className="text-xs text-gray-500">
            Transcript → LangGraph → FHIR → Audit → Cartesia TTS
          </p>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Transcript (from Deepgram STT)</label>
            <textarea value={transcript} onChange={e => setTranscript(e.target.value)} rows={4}
              placeholder="Paste or type the voice transcription here..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none" />
          </div>
          <button id="run-pipeline-btn" onClick={runPipeline} disabled={processingPipeline || !consentGiven}
            className="w-full bg-purple-700 hover:bg-purple-600 text-white py-3 rounded-lg font-medium transition disabled:opacity-40">
            {processingPipeline ? '⚙️ Processing pipeline...' : '🚀 Run AI Pipeline'}
          </button>

          {aiResponse && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <h3 className="text-sm font-semibold text-white">AI Response</h3>
                {riskLevel && <span className={`text-xs font-bold ${RISK_COLOR[riskLevel] || 'text-gray-400'}`}>Risk: {riskLevel}</span>}
              </div>
              <p className="text-sm text-gray-200 whitespace-pre-wrap">{aiResponse}</p>
              <p className="text-xs text-gray-500">⚠️ Doctor approval required before clinical use</p>
            </div>
          )}
        </div>

        {/* Pipeline diagram */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold mb-3">📊 Pipeline Architecture</h2>
          <div className="flex flex-wrap gap-2 text-xs text-gray-400">
            {['LiveKit Room', '→', 'Deepgram STT', '→', 'LangGraph AI', '→', 'FHIR Format', '→', 'Clinical Audit', '→', 'Cartesia TTS', '→', 'Audio Response'].map((s, i) => (
              <span key={i} className={s === '→' ? 'text-blue-500 font-bold' : 'bg-gray-800 px-2 py-1 rounded'}>{s}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
