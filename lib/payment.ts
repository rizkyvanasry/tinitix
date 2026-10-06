import {z} from 'zod';
import {simulationEnabled,appUrl} from './config';
import {AppError,safeEqual,sign} from './security';
export const paymentSchema=z.object({id:z.string().min(8).max(150),orderId:z.string().min(8),reference:z.string(),merchant:z.literal('tinitix-simulation'),amount:z.number().int().nonnegative(),currency:z.literal('IDR'),status:z.enum(['paid','failed'])});
export type PaymentEvent=z.infer<typeof paymentSchema>;
export interface PaymentAdapter {
 createPayment(orderId:string):Promise<{reference:string;url:string}>;
 verifyWebhook(body:string,signature:string):PaymentEvent;
 getPaymentStatus(reference:string):Promise<string>;
 expirePayment(reference:string):Promise<void>;
}
export const simulationAdapter:PaymentAdapter={
 async createPayment(orderId){if(!simulationEnabled())throw new AppError(503,'Pembayaran belum tersedia.');return {reference:'sim_'+orderId,url:appUrl()+'/orders/'+orderId};},
 verifyWebhook(body,signature){if(!simulationEnabled()||!safeEqual(sign('webhook:'+body),signature))throw new AppError(401,'Signature pembayaran tidak valid.');return paymentSchema.parse(JSON.parse(body));},
 async getPaymentStatus(){if(!simulationEnabled())throw new AppError(503,'Adapter simulasi tidak tersedia.');return 'pending';},
 async expirePayment(){if(!simulationEnabled())throw new AppError(503,'Adapter simulasi tidak tersedia.');}
};
export function paymentAdapter():PaymentAdapter{if(!simulationEnabled())throw new AppError(503,'Pembayaran nyata belum diaktifkan.');return simulationAdapter;}
