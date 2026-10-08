export function parseTicketSelection(value:unknown):Record<string,number>{
 if(typeof value!=='string'||value.length>2000)return {};
 try{
  const parsed:unknown=JSON.parse(value);
  if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')return {};
  const entries:[string,number][]=[];
  for(const [id,n] of Object.entries(parsed).slice(0,5)){
   if(id.length<150&&typeof n==='number'&&Number.isInteger(n)&&n>0&&n<=50)entries.push([id,n]);
  }
  return Object.fromEntries(entries);
 }catch{return {};}
}
