// Requested channel only. Simulation never creates a real QRIS or bank transfer.
export const paymentChannels = [
 {value:'qris',label:'QRIS'},
 {value:'bank_transfer',label:'Transfer bank'},
 {value:'ewallet',label:'E-wallet'},
] as const;
export type PaymentChannel = typeof paymentChannels[number]['value'];
export const paymentChannelLabel = (value?:string|null) => paymentChannels.find(c=>c.value===value)?.label||'Belum dipilih';
