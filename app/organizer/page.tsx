import {organizerSession} from '@/lib/organizer-session';
import {database} from '@/lib/db';
import {appUrl} from '@/lib/config';
import {OrganizerHome} from '@/components/organizer-home';
import './organizer-home.css';
export const metadata={title:'Organizer saya'};
export default async function OrganizerPage(){
 const user=await organizerSession(false);
 const organization=user.role==='admin'?(await database().query('SELECT id,name,slug,organizer_type FROM organizations WHERE id=$1',[user.organizationId])).rows[0]:null;
 return <OrganizerHome organization={organization?{id:organization.id,name:organization.name,slug:organization.slug,organizer_type:organization.organizer_type}:null} urlPrefix={appUrl()+'/o/'}/>;
}
