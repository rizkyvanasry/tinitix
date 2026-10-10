import {redirect} from 'next/navigation';
import {organizerSession} from '@/lib/organizer-session';
import {listOrganizerEvents} from '@/lib/organizer-events';
export const dynamic='force-dynamic';
export default async function Page(){
 const user=await organizerSession();
 const events=await listOrganizerEvents(user);
 redirect(events.length===1?'/organizer/events/'+events[0].id:'/organizer/events');
}
