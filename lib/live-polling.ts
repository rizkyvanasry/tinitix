// Delay is measured after completion: a tab never queues overlapping polls.
export function livePollDelay(durationMs:number,failures:number,random=Math.random){
 const base=failures?Math.min(30000,3000*2**Math.min(failures,4)):Math.max(3000,Math.min(30000,durationMs*2));
 return Math.round(Math.min(30000,base*(.85+random()*.3)));
}
