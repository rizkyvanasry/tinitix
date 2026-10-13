# Dashboard and checkout load test

## Target and acceptance

Initial target: **50 simultaneously open dashboard tabs and 10 concurrent buyer sessions**. The 50 tabs span 10 organizer tenants/events. Each event starts with 500 paid orders (5,000 total). Each buyer completes reservation -> buyer details -> simulated payment against one popular event, then thinks for 10 seconds. Buyer count includes think time; it is not ten continuously executing requests or a promised transaction arrival rate.

Thresholds: dashboard p95 <= 1 second; each checkout request p95 <= 2 seconds; checkout journey p95 <= 10 seconds; HTTP errors < 1%; no missed scheduled polls; dashboard stock/revenue agree with SQL; no oversold category. These are proposed acceptance targets, not a capacity claim.

## Run

Use a dedicated local PostgreSQL test database. This branch rejects non-loopback TEST_DATABASE_URL hosts to prevent accidental staging writes. The harness creates a random `load_<uuid>` schema, applies migrations, seeds fixtures, starts a local production Next server, and removes only that schema on normal completion/error. It never accepts an external load-test URL. Email delivery and cloud uploads are disabled; payments are simulated. No customer accounts are used.

```powershell
npm run build
# Supply TEST_DATABASE_URL through your local secret environment; never commit it.
npm run test:load
```

Optional `LOAD_ONE_WAY_MS` adds TCP delay in each direction; use the same value for both builds and compare the measured RTT. `LOAD_LABEL` selects `test-results/load/<label>.json` (default `results`). `PERF_METRICS=1` is set by the runner and adds numeric request phase percentiles to the report. Optional `LOAD_PORT` defaults to 3200. The port must be unused. Exit code 2 means the performance target failed; other nonzero exits mean harness/setup failure. Output: `test-results/load/results.json` (ignored by git). Do not run multiple harnesses concurrently. A force-killed process may require removal of its exact generated schema after confirming ownership; never delete schemas using a broad wildcard.

## Method

- Ramps: 1 dashboard / 1 buyer for 30s; 10 / 2 for 45s; 25 / 5 for 45s; 50 / 10 for 60s. Warmup excluded.
- Polls are scheduled every 3 seconds, staggered across tabs. One in-flight poll per tab; missed opportunities are counted. This intentionally demands a stricter cadence than the UI, which uses jitter and adaptive backoff **after** each response and pauses hidden tabs.
- Requests time out after 15 seconds. Status `0` denotes transport failure/timeout, not a server HTTP status. Timed-out transactions may still commit; reconciliation waits for five consecutive idle database observations, then compares the dashboard with PostgreSQL after each stage.
- Buyers use distinct synthetic IP identities so rate limits continue to execute without modeling every buyer behind a single IP. Authentication uses seeded verified EO sessions. Login, email provider, real payment gateway, browser rendering, QR/order-page polling, and internet/CDN latency are outside this test.
- Stop higher ramps if more than 20% of HTTP requests time out or return 5xx. Track attempted requests, errors, p50/p95/p99, missed polls, scheduling delay, and completed journeys. RPS uses the scheduled stage duration; tail requests can complete afterward.
- Sample `pg_stat_activity` once per second, filtered to the test app's unique application name: connections, active statements, wait categories, and lock samples. This is sampled activity, not CPU utilization or precise lock duration. Fixture connections are excluded in the current harness.
- Collect per-schema table statistics, and 20 database round trips before load. PostgreSQL counters are cumulative for the isolated fixture plus test, not per-stage query counts. SQL execution statistics and provider CPU/IOPS/connection limits require additional monitoring.
- A single local Next process uses the application's existing pool of 3 connections. Results include the network path from the test machine to PostgreSQL and cannot certify Vercel autoscaling capacity.

## Before production capacity sign-off

Repeat from the same region/runtime as the intended deployment, using an independently provisioned database with representative order history. Add a 30-minute steady-state run, synchronized dashboard refresh burst, abrupt ticket-sale burst, expired-hold maintenance, and approved payment-provider sandbox traffic. Observe provider CPU, I/O, memory and aggregate connections across instances. Short ramp results only expose early bottlenecks.
