import {OrderStatus} from '@/components/order-status';
import {simulationEnabled} from '@/lib/config';
export const dynamic='force-dynamic';
export default async function OrderPage({params}:{params:Promise<{id:string}>}){return <OrderStatus id={(await params).id} simulation={simulationEnabled()}/>;}
