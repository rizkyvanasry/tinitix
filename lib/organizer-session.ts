import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {currentUser} from './auth';
import {hasDatabase} from './config';

export async function organizerSession(requireOrganization=true){
 const session=(await cookies()).get('tinitix_session')?.value;
 const user=hasDatabase()?await currentUser(session):null;
 if(!user)redirect('/organizer/login');
 if(!user.verified)redirect('/organizer/register');
 if(user.role==='staff')redirect('/organizer/login');
 if(requireOrganization&&user.role!=='admin')redirect('/organizer');
 return user;
}
