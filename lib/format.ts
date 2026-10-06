export const rupiah = (n:number) => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
export const dateLabel = (date:string,timezone='Asia/Jakarta') => new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric',timeZone:timezone}).format(new Date(date));
export const shortDate = (date:string,timezone='Asia/Jakarta') => new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric',timeZone:timezone}).format(new Date(date));
export const timeLabel = (date:string,timezone='Asia/Jakarta') => new Intl.DateTimeFormat('id-ID',{hour:'2-digit',minute:'2-digit',timeZone:timezone}).format(new Date(date))+' '+({'Asia/Jakarta':'WIB','Asia/Makassar':'WITA','Asia/Jayapura':'WIT'}[timezone]||timezone);
