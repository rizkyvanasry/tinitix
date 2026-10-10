import {AdminDashboard} from '@/components/admin-dashboard';
import {organizerSession} from '@/lib/organizer-session';
import '../admin.css';
export default async function Page(){await organizerSession();return <AdminDashboard/>;}
