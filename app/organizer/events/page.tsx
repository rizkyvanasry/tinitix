import {organizerSession} from '@/lib/organizer-session';
import {listOrganizerEvents} from '@/lib/organizer-events';
import {OrganizerWorkspace} from '@/components/organizer-workspace';
import '../../admin/admin.css';
import '../organizer.css';
export const metadata={title:'Acara saya'};
export default async function Page(){
 const user=await organizerSession();
 return <OrganizerWorkspace events={await listOrganizerEvents(user)}/>;
}
