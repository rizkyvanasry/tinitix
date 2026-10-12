'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import type {PublicEvent} from '@/lib/types';
export function EventHero({events}:{events:PublicEvent[]}){
 const [index,setIndex]=useState(0);
 if(!events.length)return null;
 const active=index%events.length,event=events[active];
 const change=(delta:number)=>setIndex((active+delta+events.length)%events.length);
 return <section className="ds-hero" aria-label="Event pilihan" aria-roledescription={events.length>1?'carousel':undefined}><Link className="ds-hero-art" href={'/events/'+event.slug} aria-label={'Lihat detail '+event.name}><img src={event.banner||event.poster} alt={'Banner '+event.name} width={1440} height={533} fetchPriority="high"/></Link>{events.length>1&&<div className="ds-hero-controls"><button type="button" className="icon-button" onClick={()=>change(-1)} aria-label="Event sebelumnya"><ChevronLeft/></button><span className="ds-hero-position" aria-hidden="true">{active+1} / {events.length}</span><div className="ds-hero-dots">{events.map((item,i)=><button type="button" key={item.id} aria-label={'Tampilkan '+item.name} aria-current={i===active?'true':undefined} onClick={()=>setIndex(i)}><span/></button>)}</div><button type="button" className="icon-button" onClick={()=>change(1)} aria-label="Event berikutnya"><ChevronRight/></button><span className="sr-only" aria-live="polite">{active+1} dari {events.length}: {event.name}</span></div>}</section>;
}
