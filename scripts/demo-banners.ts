import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const {isProduction}=await import('../lib/config');
if(isProduction()||!process.argv.includes('--demo'))throw new Error('Demo staging only. Pass --demo.');
const {transaction,closeDatabase}=await import('../lib/db');
const {seedEvents}=await import('../lib/seed');
try{await transaction(async db=>{for(const event of seedEvents()){
 const result=await db.query("UPDATE events SET data=jsonb_set(data,'{banner}',to_jsonb($1::text)) WHERE slug=$2 AND organization_id=$3 AND data->>'poster'=$4 AND (COALESCE(data->>'banner','')='' OR data->>'banner'=$1) RETURNING id",[event.banner,event.slug,event.organizationId,event.poster]);
 console.log(event.slug+': '+result.rows.length+' demo banner updated');
}});}finally{await closeDatabase();}
