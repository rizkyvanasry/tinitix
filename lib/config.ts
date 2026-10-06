export const hasDatabase = () => Boolean(process.env.DATABASE_URL);
export const isProduction = () => process.env.VERCEL_ENV === 'production' || (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview');
export const simulationEnabled = () => !isProduction() && process.env.PAYMENT_PROVIDER === 'simulation';
export const checkoutEnabled = () => hasDatabase() && simulationEnabled() && Boolean(process.env.APP_SECRET && process.env.APP_SECRET.length>=32);
export const appUrl = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/,'');
