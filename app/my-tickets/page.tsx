import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {hasDatabase} from '@/lib/config';
import {currentUser} from '@/lib/auth';
export default async function Page(){const user=hasDatabase()?await currentUser((await cookies()).get('tinitix_session')?.value):null;redirect(user?'/account':'/access');}
