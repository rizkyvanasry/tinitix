import {notFound} from 'next/navigation';
import {getEvent} from '@/lib/catalog';
import {AppError} from '@/lib/security';
import {checkoutEnabled} from '@/lib/config';
import {parseTicketSelection} from '@/lib/ticket-selection';
import {Checkout} from '@/components/checkout';
export const dynamic='force-dynamic';
export default async function BuyerPage({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{selection?:string}>}){const {slug}=await params;let event;try{event=await getEvent(slug);}catch(e){if(e instanceof AppError&&e.status===404)notFound();throw e;}return <Checkout initialEvent={event} enabled={checkoutEnabled()} step="buyer" initialQuantities={parseTicketSelection((await searchParams).selection)}/>;}
