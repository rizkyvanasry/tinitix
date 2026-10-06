import {AdminDashboard} from '@/components/admin-dashboard';
import {hasDatabase} from '@/lib/config';
import {listEvents} from '@/lib/catalog';
import './admin.css';
export const dynamic='force-dynamic';
export default async function Page(){return <AdminDashboard preview={hasDatabase()?undefined:await listEvents()}/>;}
