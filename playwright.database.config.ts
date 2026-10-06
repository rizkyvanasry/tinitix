import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/browser-db',timeout:90000,workers:1,fullyParallel:false,
 reporter:process.env.CI?[['list'],['html',{open:'never'}]]:'list',
 use:{baseURL:'http://127.0.0.1:3100',headless:true,trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:{command:'node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100',url:'http://127.0.0.1:3100',reuseExistingServer:false,timeout:120000},
});
