'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowLeft,ArrowUpRight,BarChart3,CalendarDays,MapPin,MoreVertical,Pencil,Plus,Search,Ticket} from 'lucide-react';
import {EventEditor,blankEvent} from './admin-dashboard';
import {shortDate} from '@/lib/format';
import type {Event} from '@/lib/types';

const statusLabels:Record<Event['status'],string>={draft:'Draft',published:'Dipublikasikan',closed:'Penjualan ditutup',cancelled:'Dibatalkan'};
export function OrganizerWorkspace({events,selectedEvent}:{events:Event[];selectedEvent?:Event}){
 const router=useRouter();
 const [query,setQuery]=useState('');
 const [editing,setEditing]=useState<Event|null>(null);
 const filtered=events.filter(event=>event.name.toLocaleLowerCase('id').includes(query.trim().toLocaleLowerCase('id')));
 return <section className="eo-workspace">
  <div className="eo-container">
   <nav className="eo-personal-links" aria-label="Akses akun"><Link href="/"><Ticket size={17}/> Cari tiket <ArrowUpRight size={15}/></Link><Link href="/account">Tiket & pesanan saya</Link></nav>
   {selectedEvent?<>
    <Link className="eo-back" href="/organizer/events"><ArrowLeft size={18}/> Semua acara</Link>
    <header className="eo-heading"><div><p className="eo-kicker">DASHBOARD ACARA</p><h1>{selectedEvent.name}</h1></div><button className="button eo-add" onClick={()=>setEditing(selectedEvent)}><Pencil size={18}/> Edit acara</button></header>
    <div className="eo-event-summary"><img src={selectedEvent.poster} alt=""/><div><span className={'eo-status '+selectedEvent.status}>{statusLabels[selectedEvent.status]}</span><p><CalendarDays size={18}/>{shortDate(selectedEvent.starts,selectedEvent.timezone)}</p><p><MapPin size={18}/>{selectedEvent.venue}, {selectedEvent.city}</p>{selectedEvent.status!=='draft'&&<Link href={'/events/'+selectedEvent.slug}>Lihat halaman acara <ArrowUpRight size={16}/></Link>}</div></div>
    <section className="eo-report-empty" aria-labelledby="eo-report-title"><BarChart3 size={32} strokeWidth={1.5}/><h2 id="eo-report-title">Laporan penjualan</h2><p>Laporan penjualan untuk acara ini belum tersedia.</p></section>
   </>:<>
    <Link className="eo-back" href="/organizer"><ArrowLeft size={18}/> Organizer saya</Link>
    <header className="eo-heading"><h1>Acara saya</h1><div className="eo-tools"><label className="eo-search"><Search size={23}/><span className="sr-only">Cari nama acara</span><input type="search" placeholder="Cari nama acara" value={query} onChange={event=>setQuery(event.target.value)}/></label><button className="button eo-add" onClick={()=>setEditing(blankEvent())}><Plus size={24}/> Tambah acara</button></div></header>
    {filtered.length?<div className="eo-event-grid">{filtered.map(event=><article className="eo-event-card" key={event.id}>
     <Link className="eo-event-link" href={'/organizer/events/'+event.id}><img src={event.poster} alt=""/><div><h2>{event.name}</h2><p>{shortDate(event.starts,event.timezone)} · {event.city}</p><span className={'eo-status '+event.status}>{statusLabels[event.status]}</span></div></Link>
     <details className="eo-card-menu"><summary aria-label={'Menu acara '+event.name}><MoreVertical size={23}/></summary><div><button onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');setEditing(event);}}><Pencil size={15}/> Edit acara</button><Link href={'/organizer/events/'+event.id}>Buka dashboard</Link></div></details>
    </article>)}</div>:<div className="eo-empty"><CalendarDays size={38} strokeWidth={1.4}/><h2>{query?'Acara tidak ditemukan':'Mulai dengan acara pertamamu'}</h2><p>{query?'Coba nama lain atau kosongkan pencarian.':'Acara yang kamu buat akan tampil di sini.'}</p>{query?<button className="text-button" onClick={()=>setQuery('')}>Hapus pencarian</button>:<button className="button eo-add" onClick={()=>setEditing(blankEvent())}><Plus size={18}/> Tambah acara</button>}</div>}
   </>}
  </div>
  {editing&&<EventEditor event={editing} demo={false} onClose={()=>setEditing(null)} onSaved={()=>{setEditing(null);router.refresh();}}/>}
 </section>;
}
