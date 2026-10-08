export type PriceBreakdown={subtotal:number;taxPercent:number;servicePercent:number;taxAmount:number;serviceAmount:number;total:number};
export function priceBreakdown(subtotal:number,taxPercent=10,servicePercent=3):PriceBreakdown{
 const taxAmount=Math.round(subtotal*Math.round(taxPercent*100)/10000);
 const serviceAmount=Math.round(subtotal*Math.round(servicePercent*100)/10000);
 return {subtotal,taxPercent,servicePercent,taxAmount,serviceAmount,total:subtotal+taxAmount+serviceAmount};
}
