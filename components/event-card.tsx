import Link from 'next/link';
import {MapPin} from 'lucide-react';
import type {PublicEvent} from '@/lib/types';
import {rupiah,timeLabel} from '@/lib/format';
import {Badge} from './ui';
export function EventCard({event}:{event:PublicEvent}){
 const date=new Intl.DateTimeFormat('id-ID',{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:event.timezone}).format(new Date(event.starts));
 return <Link href={'/events/'+event.slug} className="ds-event-card event-card"><div className="ds-poster"><img src={event.poster} alt={'Poster '+event.name} width={600} height={800} loading="lazy"/>{event.saleState!=='Tersedia'&&<Badge>{event.saleState==='Segera dijual'?'Penjualan segera':event.saleState}</Badge>}</div><div className="ds-event-info"><p className="ds-event-date"><time dateTime={event.starts}>{date}<span>{timeLabel(event.starts,event.timezone)}</span></time></p><h3>{event.name}</h3>{(event.venue||event.city)&&<p className="ds-event-location"><MapPin size={20} aria-hidden="true"/><span>{[event.venue,event.city].filter(Boolean).join(', ')}</span></p>}{event.startingPrice!==null&&<p className="ds-event-price"><span>Mulai dari </span><strong>{rupiah(event.startingPrice)}</strong>{event.startingPeople===2&&<small> / paket 2 orang</small>}</p>}</div></Link>;
}
export function EventGrid({events}:{events:PublicEvent[]}){return <div className="ds-event-grid">{events.map(event=><EventCard key={event.id} event={event}/>)}</div>;}
