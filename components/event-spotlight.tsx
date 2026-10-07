'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,Pause,Play} from 'lucide-react';
import type {PublicEvent} from '@/lib/types';
import {shortDate} from '@/lib/format';

export function EventSpotlight({events}:{events:PublicEvent[]}) {
 const [index,setIndex]=useState(0),[paused,setPaused]=useState(false),[hovered,setHovered]=useState(false),[focused,setFocused]=useState(false),[reduced,setReduced]=useState(false);
 useEffect(()=>{const preference=matchMedia('(prefers-reduced-motion: reduce)');const sync=()=>setReduced(preference.matches);sync();preference.addEventListener('change',sync);return()=>preference.removeEventListener('change',sync);},[]);
 useEffect(()=>{if(paused||hovered||focused||reduced||events.length<2)return;const timer=setInterval(()=>{if(!document.hidden)setIndex(current=>(current+1)%events.length);},5000);return()=>clearInterval(timer);},[paused,hovered,focused,reduced,events.length]);
 if(!events.length)return <div className="spotlight-empty"><h2>Panggung berikutnya segera hadir.</h2><p>Event terbaru akan muncul di sini.</p></div>;
 const active=index%events.length;
 return <section className="event-spotlight" aria-label="Event pilihan" aria-roledescription="carousel" onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false);}}>
  <div className="spotlight-window"><div className="spotlight-track" style={{transform:`translateX(-${active*100}%)`}}>{events.map((event,i)=><div className="spotlight-slide" key={event.id} aria-hidden={i!==active} inert={i!==active}><Link href={'/events/'+event.slug} tabIndex={i===active?0:-1} aria-label={'Lihat event '+event.name}><div className="spotlight-art"><img src={event.poster} alt={'Poster '+event.name} width={900} height={700} loading={i===0?'eager':'lazy'} fetchPriority={i===0?'high':'auto'}/></div><div className="spotlight-caption"><div><p>{shortDate(event.starts,event.timezone)} · {event.city}</p><h2>{event.name}</h2></div><ArrowUpRight size={26}/></div></Link></div>)}</div></div>
  {events.length>1&&<div className="spotlight-controls"><div className="spotlight-dots" aria-label="Posisi poster">{events.map((event,i)=><span key={event.id} className={i===active?'current':''} aria-label={i===active?'Poster aktif: '+event.name:undefined}/>)}</div><button type="button" className="spotlight-pause" onClick={()=>{if(reduced){setReduced(false);setPaused(false);}else setPaused(!paused);}} aria-label={paused||reduced?'Putar poster otomatis':'Jeda poster otomatis'}>{paused||reduced?<Play size={15}/>:<Pause size={15}/>}<span>{paused||reduced?'Putar':'Jeda'}</span></button></div>}
 </section>;
}
