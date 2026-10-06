import nextEnv from '@next/env';
const {loadEnvConfig}=nextEnv;
loadEnvConfig(process.cwd());
const {isProduction}=await import('../lib/config');
if(isProduction()||!process.argv.includes('--demo'))throw new Error('Demo seeding only: npm run db:seed -- --demo. Never seed production.');
const {database,closeDatabase}=await import('../lib/db');
const {seedEvents}=await import('../lib/seed');
const {saveEvent}=await import('../lib/admin');
try{for(const event of seedEvents()){if((await database().query('SELECT id FROM events WHERE slug=$1',[event.slug])).rows.length){console.log('Skipped existing',event.slug);continue;}await saveEvent({...event,id:undefined},{id:'seed',email:'seed@example.invalid',name:'Demo',role:'admin',organizationId:'tinitix',verified:true});console.log('Seeded',event.slug);}}finally{await closeDatabase();}
