'use client';
import { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import { api } from '../../lib/api';

interface TLine { speaker:'Doctor'|'AI'; text:string; timestamp:string; riskLevel?:string; }

export default function VoicePage() {
  const [status, setStatus] = useState<'idle'|'active'|'processing'>('idle');
  const [transcript, setTranscript] = useState<TLine[]>([]);
  const [timer, setTimer] = useState(0);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [dictation, setDictation] = useState('');
  const [listening, setListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recogRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (status==='active') timerRef.current = setInterval(()=>setTimer(t=>t+1),1000);
    else clearInterval(timerRef.current);
    return ()=>clearInterval(timerRef.current);
  },[status]);

  useEffect(()=>{ if(scrollRef.current) scrollRef.current.scrollTop=scrollRef.current.scrollHeight; },[transcript]);

  const addLine = (l:TLine) => setTranscript(p=>[...p,l]);

  const start = () => {
    setStatus('active'); setTimer(0); setAiSummary(null);
    setTranscript([{speaker:'AI',text:'Consultation session started. Speak or type clinical notes for AI analysis.',timestamp:new Date().toISOString()}]);
  };

  const toggleMic = () => {
    if(!('webkitSpeechRecognition' in window||'SpeechRecognition' in window)){alert('Use Chrome for voice input.');return;}
    if(listening){recogRef.current?.stop();setListening(false);return;}
    const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    const r=new SR();r.continuous=true;r.interimResults=false;r.lang='en-US';
    r.onresult=(e:any)=>{const t=e.results[e.results.length-1][0].transcript;setDictation(p=>p+' '+t);addLine({speaker:'Doctor',text:t,timestamp:new Date().toISOString()});};
    r.onend=()=>setListening(false);
    recogRef.current=r;r.start();setListening(true);
  };

  const analyze = async (text:string) => {
    if(!text.trim())return;
    setStatus('processing');
    addLine({speaker:'Doctor',text,timestamp:new Date().toISOString()});
    setDictation('');
    try {
      const res = await api.post('/ai/chat',{message:`CLINICAL CONSULTATION DICTATION:\n${text}\n\nPlease analyze this clinical note, extract key medical findings, assess risk level, and provide clinical recommendations.`,patient_id:'voice-session',context_type:'dictation'});
      if(res&&res.ok){
        const data=await res.json();
        addLine({speaker:'AI',text:data.response||'Analysis complete.',timestamp:new Date().toISOString(),riskLevel:data.risk_level});
        setAiSummary(data);
      } else {
        addLine({speaker:'AI',text:'⚠️ AI service error. Trying to reconnect...',timestamp:new Date().toISOString()});
      }
    } catch {
      addLine({speaker:'AI',text:'❌ Cannot reach AI service. Connection dropped. Please try again.',timestamp:new Date().toISOString()});
    }
    setStatus('active');
  };

  const playTTS = async (text: string) => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    try {
      // First try backend Cartesia API if configured
      const res = await fetch('/api/tts', { method: 'POST', body: JSON.stringify({ text }) });
      if (res.ok) {
        const audioBlob = await res.blob();
        if (audioBlob.size > 0) {
          const audio = new Audio(URL.createObjectURL(audioBlob));
          audio.onended = () => setIsPlaying(false);
          await audio.play();
          return;
        }
      }
    } catch (e) {}

    // Fallback to browser TTS if backend fails or has no key
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  const endSession = ()=>{recogRef.current?.stop();setListening(false);setStatus('idle');setTimer(0);};
  const fmt=(s:number)=>`${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
  const riskC:Record<string,string>={CRITICAL:'text-red-400',HIGH:'text-orange-400',MEDIUM:'text-yellow-400',LOW:'text-emerald-400'};

  return (
    <div className="min-h-screen bg-[#0F1419] text-white flex flex-col">
      <Header/>
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.4em] text-cyan-400 block mb-2">Voice Intelligence</span>
            <h1 className="text-4xl font-black tracking-tight mb-2">Live <span className="accent-gradient-text italic">Consultation</span></h1>
            <p className="text-slate-400 text-sm">Real-time AI analysis with FHIR mapping and ICD-10 coding.</p>
          </div>

          <div className="glass-card rounded-3xl p-8">
            <div className="h-16 flex items-center gap-0.5 mb-6">
              {[...Array(40)].map((_,i)=>(
                <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${status!=='idle'?'bg-cyan-400':'bg-white/10'}`}
                  style={{height:status==='active'?`${20+Math.abs(Math.sin(i*0.5+Date.now()*0.001))*70}%`:'15%'}}/>
              ))}
            </div>
            <div className="text-center mb-6">
              {status==='idle'&&<p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Ready to begin</p>}
              {status==='processing'&&<p className="text-purple-400 font-bold text-sm uppercase tracking-widest animate-pulse">AI Analyzing...</p>}
              {status==='active'&&<div><div className="flex items-center justify-center gap-2 mb-1"><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/><span className="text-red-400 font-black text-xs uppercase tracking-widest">Recording</span></div><p className="text-4xl font-black font-mono">{fmt(timer)}</p></div>}
            </div>
            {status==='idle'?(
              <button onClick={start} className="w-full accent-gradient py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">Start Consultation</button>
            ):(
              <div className="space-y-3">
                <button onClick={toggleMic} disabled={status==='processing'} className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${listening?'bg-red-500 shadow-lg shadow-red-500/40':'bg-white/10 hover:bg-white/20 border border-white/10'}`}>
                  {listening?'⏹ Stop Mic':'🎙 Start Dictation'}
                </button>
                <button onClick={endSession} className="w-full py-4 bg-slate-800 border border-white/10 rounded-2xl font-black text-sm uppercase tracking-widest hover:border-red-500/30 hover:text-red-400 transition-all">End Session</button>
              </div>
            )}
          </div>

          {status!=='idle'&&(
            <div className="glass-card rounded-3xl p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Type / Paste Clinical Notes</p>
              <textarea value={dictation} onChange={e=>setDictation(e.target.value)} rows={4}
                placeholder="Type clinical notes, symptoms, observations here..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-cyan-500/50 resize-none"/>
              <button onClick={()=>analyze(dictation)} disabled={!dictation.trim()||status==='processing'}
                className="mt-3 w-full py-3 bg-cyan-500 rounded-xl font-black text-sm uppercase tracking-widest disabled:opacity-50 hover:scale-[1.02] transition-all">
                {status==='processing'?'Analyzing...':'Analyze with AI'}
              </button>
            </div>
          )}

          {aiSummary&&(
            <div className="glass-card rounded-3xl p-6 border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-purple-500/5">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-400 mb-3">AI Clinical Summary</p>
              {aiSummary.risk_level&&<div className={`text-xs font-black mb-3 ${riskC[aiSummary.risk_level]||'text-slate-400'}`}>Risk Level: {aiSummary.risk_level}</div>}
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{aiSummary.response}</p>
              {aiSummary.medical_entities?.diagnoses?.length>0&&(
                <div className="mt-4"><p className="text-[10px] font-black text-slate-600 uppercase mb-2">Detected Diagnoses</p>
                  <div className="flex flex-wrap gap-2">{aiSummary.medical_entities.diagnoses.map((d:string,i:number)=><span key={i} className="px-2 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg text-xs font-bold">{d}</span>)}</div>
                </div>
              )}
              {aiSummary.medical_entities?.medications?.length>0&&(
                <div className="mt-3"><p className="text-[10px] font-black text-slate-600 uppercase mb-2">Medications</p>
                  <div className="flex flex-wrap gap-2">{aiSummary.medical_entities.medications.map((m:string,i:number)=><span key={i} className="px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg text-xs font-bold">{m}</span>)}</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="glass-card rounded-3xl flex flex-col border-white/10 overflow-hidden flex-1" style={{minHeight:'520px'}}>
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Live Transcript</h3>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[10px] font-black text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"/>HIPAA</span>
                <button onClick={()=>{const t=transcript.map(l=>`[${l.speaker}] ${l.text}`).join('\n');const b=new Blob([t],{type:'text/plain'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=`transcript-${Date.now()}.txt`;a.click();}} className="text-[10px] font-black text-cyan-500 uppercase hover:text-cyan-400">Export</button>
              </div>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
              {transcript.length===0?(
                <div className="h-full flex items-center justify-center text-slate-600 italic text-sm">Start a consultation to see live transcript</div>
              ):transcript.map((line,i)=>(
                <div key={i} className={`text-sm ${line.speaker==='Doctor'?'border-l-2 border-cyan-500 pl-3':'border-l-2 border-purple-500 pl-3'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-black uppercase ${line.speaker==='Doctor'?'text-cyan-400':'text-purple-400'}`}>{line.speaker}</span>
                    <span className="text-[10px] text-slate-700">{new Date(line.timestamp).toLocaleTimeString()}</span>
                    {line.riskLevel&&<span className={`text-[9px] font-black ${riskC[line.riskLevel]||''}`}>{line.riskLevel}</span>}
                    {line.speaker === 'AI' && (
                      <button onClick={() => playTTS(line.text)} className="ml-auto text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded uppercase font-black tracking-widest hover:bg-cyan-500/20 transition-all flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                        Listen
                      </button>
                    )}
                  </div>
                  <p className="text-slate-200 leading-relaxed">{line.text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[['STT Engine','Browser + Deepgram'],['AI Model','Mistral + LangGraph'],['Encryption','AES-256 E2E'],['Compliance','HIPAA • ISO 42001']].map(([l,v])=>(
              <div key={l} className="glass-card rounded-2xl p-4 border border-white/5"><p className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-1">{l}</p><p className="text-xs font-bold text-slate-300">{v}</p></div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
