import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {currentUser} from '@/lib/auth';
import {hasDatabase} from '@/lib/config';

export default async function CreateEvent(){
 const session=(await cookies()).get('tinitix_session')?.value;
 const user=hasDatabase()?await currentUser(session):null;
 if(user?.verified&&(user.role==='admin'||user.role==='buyer'))redirect('/organizer');
 if(user&&(!user.verified||user.role==='buyer'))redirect('/organizer/register');
 redirect('/organizer/login');
}
