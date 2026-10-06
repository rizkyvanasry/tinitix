import {database} from './db';
import {expireOrders} from './orders';
import {processMailJobs} from './mail';

export async function runMaintenance() {
 await expireOrders();
 for (const table of ['rate_limits','sessions','order_access','auth_tokens']) {
  await database().query(`DELETE FROM ${table} WHERE expires_at<now()`);
 }
 return processMailJobs();
}
