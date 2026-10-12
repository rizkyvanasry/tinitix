import {ChevronDown} from 'lucide-react';
import type {Event} from '@/lib/types';

export function EventScheduleLocation({event,onChange}:{event:Event;onChange:(key:keyof Event,value:unknown)=>void}){
 const offset={'Asia/Jakarta':7,'Asia/Makassar':8,'Asia/Jayapura':9}[event.timezone]||7;
 const local=(value:string)=>new Date(Date.parse(value)+offset*3600000).toISOString().slice(0,16);
 const update=(key:'starts'|'ends',part:'date'|'hour'|'minute',value:string)=>{
  if(!value)return;
  const current=local(event[key]),date=part==='date'?value:current.slice(0,10),hour=part==='hour'?value:current.slice(11,13),minute=part==='minute'?value:current.slice(14,16);
  onChange(key,date+'T'+hour+':'+minute+':00+'+String(offset).padStart(2,'0')+':00');
 };
 return <div className="wide event-schedule-location">
  <details className="event-form-section" open><summary><span><strong>Date and time</strong><span>Tentukan tanggal dan waktu mulai serta selesai acara.</span></span><ChevronDown size={24}/></summary>
   <div className="event-form-section-body"><label className="field">Event timezone <span className="required-mark">*</span><select required value={event.timezone} onChange={e=>onChange('timezone',e.target.value)}><option value="Asia/Jakarta">(GMT+7) Jakarta, Indonesia — WIB</option><option value="Asia/Makassar">(GMT+8) Makassar, Indonesia — WITA</option><option value="Asia/Jayapura">(GMT+9) Jayapura, Indonesia — WIT</option></select></label>
   {(['starts','ends'] as const).map((key,index)=><div className="event-date-row" key={key}><label className="field">{index?'End date':'Start date'} <span className="required-mark">*</span><input type="date" required min={index?local(event.starts).slice(0,10):undefined} value={local(event[key]).slice(0,10)} onChange={e=>update(key,'date',e.target.value)}/></label><fieldset className="event-time-fields"><legend>{index?'End time':'Start time'} <span className="required-mark">*</span></legend><div>{(['hour','minute'] as const).map(part=><select required key={part} aria-label={(index?'End':'Start')+(part==='hour'?' hour':' minute')} value={local(event[key]).slice(part==='hour'?11:14,part==='hour'?13:16)} onChange={e=>update(key,part,e.target.value)}>{Array.from({length:part==='hour'?24:60},(_,i)=>String(i).padStart(2,'0')).map(value=><option key={value} value={value}>{value}</option>)}</select>)}</div></fieldset></div>)}</div>
  </details>
  <details className="event-form-section" open><summary><span><strong>Location</strong><span>Beri tahu pengunjung lokasi dan petunjuk menuju acara.</span></span><ChevronDown size={24}/></summary><div className="event-form-section-body"><label className="field">Location name <span className="required-mark">*</span><input required minLength={2} maxLength={120} placeholder="Contoh: The Pallas, SCBD" value={event.venue} onChange={e=>{onChange('venue',e.target.value);onChange('city','');}}/></label><label className="field">Location details<textarea maxLength={300} rows={4} placeholder="Alamat lengkap, lantai, pintu masuk, atau petunjuk menuju lokasi" value={event.address} onChange={e=>onChange('address',e.target.value)}/></label></div></details>
 </div>;
}
