export interface PatientRecord { id:string; fileName:string; fileSize:number; uploadedAt:string; content:string; aiSummary?:string; }
export interface PatientObservation { id:string; name:string; value:string; unit?:string; date:string; type:'vital'|'lab'|'note'; }
export interface PatientCondition { id:string; name:string; status:'active'|'resolved'|'chronic'; icdCode?:string; diagnosedAt:string; notes?:string; }
export interface LocalPatientData { records:PatientRecord[]; observations:PatientObservation[]; conditions:PatientCondition[]; }
export interface Appointment { id:string; patientId:string; patientName:string; scheduledAt:string; type:'routine'|'urgent'|'critical'|'follow-up'; notes:string; status:'scheduled'|'completed'|'cancelled'; createdAt:string; }

const PD = 'clinova_patient_data';
const AK = 'clinova_appointments';

export function getPatientData(pid:string):LocalPatientData {
  if(typeof window==='undefined') return {records:[],observations:[],conditions:[]};
  try { const a=JSON.parse(localStorage.getItem(PD)||'{}'); return a[pid]||{records:[],observations:[],conditions:[]}; } catch { return {records:[],observations:[],conditions:[]}; }
}
export function savePatientData(pid:string,data:LocalPatientData) {
  try { const a=JSON.parse(localStorage.getItem(PD)||'{}'); a[pid]=data; localStorage.setItem(PD,JSON.stringify(a)); } catch {}
}
export function addPatientRecord(pid:string,r:PatientRecord){const d=getPatientData(pid);d.records=[r,...d.records];savePatientData(pid,d);}
export function addObservation(pid:string,o:PatientObservation){const d=getPatientData(pid);d.observations=[o,...d.observations];savePatientData(pid,d);}
export function addCondition(pid:string,c:PatientCondition){const d=getPatientData(pid);d.conditions=[c,...d.conditions];savePatientData(pid,d);}
export function getAppointments():Appointment[]{if(typeof window==='undefined')return[];try{return JSON.parse(localStorage.getItem(AK)||'[]');}catch{return[];}}
export function saveAppointment(a:Appointment){const all=getAppointments();localStorage.setItem(AK,JSON.stringify([a,...all.filter(x=>x.id!==a.id)]));}
export function deleteAppointment(id:string){localStorage.setItem(AK,JSON.stringify(getAppointments().filter(a=>a.id!==id)));}
