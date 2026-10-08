export function parseTicketSelection(value:unknown):Record<string,number>{
 if(typeof value!=='string'||value.length>2000)return {};
 try{const parsed=JSON.parse(value);if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')return {};
 return Object.fromEntries(Object.entries(parsed).slice(0,5).filter(([id,n])=>id.length<150&&typeof n==='number'&&Number.isInteger(n)&&n>0&&n<=50));
 }catch{return {};}
}
