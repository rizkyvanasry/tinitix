export async function api<T=any>(path:string,body?:unknown,headers?:Record<string,string>):Promise<T>{
 let response:Response;try{response=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...headers},signal:AbortSignal.timeout(15000),...(body!==undefined?{body:JSON.stringify(body)}:{})});}catch{throw Object.assign(new Error('Respons belum diterima. Status transaksi belum dapat dipastikan; coba lagi pada pesanan yang sama.'),{code:'REQUEST_UNCERTAIN'});}
 const result=await response.json();if(!response.ok)throw Object.assign(new Error(result.error||'Permintaan gagal.'),{code:result.code,status:response.status});return result as T;
}
