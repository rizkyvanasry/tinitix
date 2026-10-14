# Backend performance review

Branch: `perf/backend-load-2026-10-13`. No push or deployment is part of this work. Tests use a local PostgreSQL database only; the load/browser runners reject non-loopback database URLs on this branch.

## Changes and invariants

- `lib/performance.ts`, `lib/db.ts`, API route: opt-in `PERF_METRICS=1` records authentication, connection acquisition, query duration/count, application residual and request duration. Labels are fixed route names. No SQL text, parameters, URL IDs, email, credentials, tokens or QR data are logged. `Server-Timing` contains numbers only. Connection acquisition includes connection establishment when a new connection is needed; query time includes network and database lock waits, not just SQL CPU time. Authentication is a sub-span of database/application totals, so these fields must not all be added together.
- `lib/auth.ts`, API route: `admin/live` reuses the already authenticated user, checks verified admin role, and passes organization scope to the query. Other users still receive 403; another organizer's event returns 404.
- `lib/eo-live.ts`: all panels are derived from one SQL statement and one PostgreSQL MVCC snapshot. Every aggregate derives from the tenant-filtered event. No cache. Live reservation expiry uses one statement timestamp. Existing couple quantities, people capacity, fee amounts, earliest paid timestamp, normalized distinct email and latest buyer gender semantics are retained.
- `lib/orders.ts`: reuse stock already read while holding the event lock; authorize an order and its access grant in one statement; avoid reading the same locked order twice. Simulated payment authorization and settlement share a transaction. Replays lock the same order and return its terminal state or existing reference. Ticket uniqueness constraints and event/order lock ordering remain in place.
- `components/eo-live-panels.tsx`, `lib/live-polling.ts`: one active request, initial/wake jitter, jitter between polls, slower retry after errors or slow responses, pause while hidden, and visible last successful snapshot time even on errors.
- Checkout components: persist the reservation key and exact item payload before sending; retain an uncertain request over reload and prevent changing the cart until it is resolved. A retry uses the same reservation. Buyer/payment requests stay on the same order. A timed-out payment is reconciled rather than interpreted as definite failure. Reservation submission requires usable session storage to make recovery possible.

## Review commands

```powershell
git switch perf/backend-load-2026-10-13
git log --oneline main..HEAD
git diff main...HEAD -- lib app components scripts tests
npm run typecheck
npm run build
# Supply TEST_DATABASE_URL for your local test PostgreSQL, using a secret environment file.
node --env-file=.env.benchmark.local --import tsx --test tests/*.test.ts
node --env-file=.env.benchmark.local --import tsx scripts/test-browser.ts
$env:LOAD_ONE_WAY_MS='33'
$env:LOAD_LABEL='after'
node --env-file=.env.benchmark.local --import tsx scripts/test-load.ts
```

The last command runs the same harness as `npm run test:load`. The environment file is ignored by git. No staging credentials are required. A local TCP latency proxy adds the configured delay in each direction; measured RTT is reported, because Windows timers and the local transport can add overhead. Keep the pool at 3 for both runs. Run each benchmark alone, after tests/build finish. `test-results/load/<label>.json` stores request and server percentiles. Exit code 2 means the SLO failed, not a test-runner crash.

Browser artifacts have their own `test-results/browser-db` directory so they cannot remove load-test output. The baseline worktree uses the pre-optimization application at `d2b85b1`, with the same corrected harness/proxy as the optimized tree. Both are production builds.

## Scope and residual risks

This is a short four-stage ramp over 5,000 seeded paid orders, 10 organizer tenants and up to 50 open dashboard tabs, with 10 closed-loop buyer sessions against one event. The harness keeps the strict fixed 3-second polling schedule; frontend backoff is not used to make benchmark results appear faster. It reports missed polls separately from HTTP errors. After client timeouts, it drains outstanding server work before reconciling stock/revenue.

The local server and PostgreSQL/WSL transport differ from Vercel and the historical staging database. Use the controlled before/after pair for improvement claims, not a direct capacity claim against the October 13 staging numbers. Provider CPU, RAM and IOPS are not measured. Payment-provider latency, outbound email, initial page rendering, sustained 30-minute traffic and synchronized bursts are outside this ramp. Benchmark the actual runtime/region against a separate test database before certifying Vercel capacity.

No pool-size increase, cache, schema migration, staging data change or external service purchase is included. Real payment-provider retries still need the provider's own idempotency contract when such an adapter is introduced; this codebase currently enables simulation only.
## Validation results (14 October 2026, Asia/Jakarta)

- Type-check: passed (`npm run typecheck`).
- Production build: passed (`npm run build`).
- Backend: **38 passed, 0 failed, 0 skipped**, using local PostgreSQL 16.15. Includes SQL/Excel reconciliation, tenant isolation, verification, simultaneous last-unit checkout, expiry/settlement races and repeated payments.
- Browser database suite: **5 passed**. Covers organizer onboarding, lost reservation response plus reload/retry, repeated payment, tenant rejection, poll overlap/backoff/recovery, couple purchase/check-in/Excel and staff invitations.
- A final backend rerun initially failed because the local loopback relay had stopped between sessions (ECONNREFUSED). Restarting that local helper resolved the infrastructure failure; the complete rerun above passed. No test was skipped.
- Both load ramps completed and cleaned up their isolated schemas. Both returned the expected failing-SLO exit because 50/10 does not pass.

## Controlled before/after results

Raw data: [before](performance/before.json), [after](performance/after.json). Baseline application `d2b85b1c1ab0b8cf349afa7f7cf452e409e26119`; optimized application `6664ddf26d6778127967dc3f2fdbefe9f7222372`.
Both use Node v24.11.0, PostgreSQL 16.15 in local Ubuntu WSL, a loopback stdio relay, pool max 3 and 33 ms configured TCP delay per direction. SELECT 1 measured mean/p95: before 97.26 / 98.54 ms; after 97.98 / 97.18 ms. Timer/transport overhead makes this about 98 ms, **not** an exact reproduction of the historical 66.5 ms staging p95.
Runs were sequential, with no browser test/build running during either benchmark. The baseline worktree sets only Turbopack root to the shared workspace to resolve its node_modules junction; it uses unchanged pre-optimization application logic plus the same corrected harness/proxy. This is one controlled ramp per version, not a statistically repeated capacity certification.

Historical staging context ([13 October report](load-test-2026-10-13.md)): at 50/10, dashboard p95 15.02 s, journey p95 31.50 s, errors 73.2%, missed polls 791/1000, successful journeys 1/29. Those numbers use a different database/network path and are not the controlled before column below.

### All ramp stages

| EO / buyers | Version | Dashboard p95 (s) | Journey p95 (s) | HTTP/transport errors | Missed / offered polls | Successful journeys | All SLOs |
|---|---|---:|---:|---:|---:|---:|---|
| 1 / 1 | Before | 1.556 | 4.318 | 0.00% | 0 / 10 | 3 / 3 | Fail |
| 1 / 1 | After | 0.619 | 3.458 | 0.00% | 0 / 10 | 3 / 3 | Pass |
| 10 / 2 | Before | 3.856 | 9.684 | 0.00% | 38 / 150 | 6 / 6 | Fail |
| 10 / 2 | After | 0.250 | 4.550 | 0.00% | 0 / 150 | 8 / 8 | Fail |
| 25 / 5 | Before | 10.700 | 31.696 | 2.67% | 252 / 375 | 5 / 9 | Fail |
| 25 / 5 | After | 2.302 | 9.747 | 0.00% | 0 / 375 | 16 / 16 | Fail |
| 50 / 10 | Before | 15.016 | 28.814 | 81.93% | 795 / 1000 | 0 / 28 | Fail |
| 50 / 10 | After | 6.241 | 22.047 | 0.00% | 498 / 1000 | 24 / 24 | Fail |

### 50 dashboards / 10 buyers: client timings

All durations in seconds. Counts differ because buyers are closed-loop and failed journeys stop before later steps. Percentiles include failed/aborted attempts; baseline timeouts are censored near 15 s. Baseline journey percentiles are **not successful-checkout latency** (0 of 28 completed from the client perspective). A server transaction can commit after client timeout.

| Route | Version | Requests | p50 | p95 | p99 | Errors |
|---|---|---:|---:|---:|---:|---:|
| dashboard | Before | 205 | 15.007 | 15.016 | 15.017 | 167 |
| dashboard | After | 502 | 4.838 | 6.241 | 6.361 | 0 |
| reserve | Before | 28 | 15.013 | 15.015 | 15.016 | 25 |
| reserve | After | 24 | 7.065 | 9.161 | 9.323 | 0 |
| buyer | Before | 3 | 13.982 | 15.012 | 15.012 | 1 |
| buyer | After | 24 | 5.543 | 7.283 | 7.436 | 0 |
| simulate | Before | 2 | 15.010 | 15.013 | 15.013 | 2 |
| simulate | After | 24 | 6.109 | 7.623 | 8.243 | 0 |
| journey | Before | 28 | 15.014 | 28.814 | 37.046 | 28 |
| journey | After | 24 | 18.486 | 22.047 | 22.456 | 0 |

### 50/10: server phase timings

Pool acquisition includes every acquisition in a request, so its sum can exceed a single acquisition timeout. Auth is a nested span and includes its own pool/query time. Checkout here is guest checkout: session authentication is near zero; order-access authorization is part of SQL time. SQL time includes RTT and lock waits. Server total continues beyond a client timeout. Individual p95 values are not additive.

| Route | Version | Statement count (p50) | Auth p95 (s) | Pool p50 / p95 / p99 (s) | SQL p95 (s) | App p95 (ms) | Server total p95 (s) |
|---|---|---:|---:|---|---:|---:|---:|
| dashboard | Before | 13 | 16.812 | 20.371 / 23.545 / 24.841 | 1.121 | 3.57 | 24.597 |
| dashboard | After | 2 | 3.387 | 4.642 / 6.040 / 6.145 | 0.208 | 2.39 | 6.232 |
| reserve | Before | 14 | 0.000 | 20.967 / 24.268 / 24.430 | 1.770 | 3.36 | 25.459 |
| reserve | After | 13 | 0.000 | 5.489 / 7.393 / 7.915 | 1.996 | 3.37 | 9.154 |
| buyer | Before | 11 | 0.000 | 13.047 / 14.203 / 14.203 | 0.930 | 2.20 | 15.126 |
| buyer | After | 9 | 0.000 | 4.285 / 5.723 / 6.044 | 1.984 | 3.20 | 7.280 |
| simulate | Before | 25 | 0.000 | 30.896 / 36.257 / 36.257 | 2.146 | 5.39 | 38.408 |
| simulate | After | 18 | 0.000 | 4.288 / 5.958 / 6.249 | 2.711 | 3.70 | 7.619 |

### Database observations and reconciliation

| 50/10 observation | Before | After |
|---|---:|---:|
| Max app connections | 3 | 3 |
| Mean active connections (sampled) | 0.217 | 0.433 |
| Max active connections (sampled) | 3 | 2 |
| Samples containing a lock wait (of 60) | 3 | 14 |
| Monitor errors | 0 | 0 |
| Dashboard acquisition queue p95 (waiting clients) | 72 | 54 |
| Event-0 paid orders after drain (cumulative, includes 500 seeded + warmup + earlier stages) | 521 | 552 |
| Event-0 gross after drain (IDR) | 58873000 | 62376000 |
| Dashboard vs SQL stock/revenue, every stage | Match | Match |
| Oversold categories, every stage | 0 | 0 |

## Proven causes and remaining target failures

1. **Duplicate session authentication and serial dashboard round trips are confirmed.** The old route authenticates twice and executes 13 statements. The new route executes 2. At 1/1, dashboard median query time falls from 1.094 s to 0.180 s; application processing remains only milliseconds.
2. **Pool queuing dominates under load.** At 50/10, dashboard pool p95 drops from 23.545 s to 6.040 s; application p95 is only 2.39 ms after optimization. Long serial transactions occupy the three connections while round trips complete. This evidence does not establish PostgreSQL CPU exhaustion; CPU, memory and IOPS were not measured.
3. **Checkout had redundant reads and transaction boundaries.** Statement counts drop reserve 14 to 13, buyer 11 to 9, simulate 25 to 18. At high load, more successful purchases also produce more sampled transaction lock waits (3 to 14 samples); this is not a controlled measure of lock duration.
4. **Uncertain responses needed stable retries.** Browser tests deliberately commit a reservation and discard its response. Reload/retry uses the same reservation key; concurrent simulate retries issue one ticket set. This improves correctness during timeouts; it does not increase the benchmark timeout.
5. **50/10 still fails.** After dashboard p95 6.241 s > 1 s; reserve 9.161 s, buyer 7.283 s and simulate 7.623 s > 2 s; complete journey 22.047 s > 10 s; 498/1000 polls missed. Error rate (0%) and reconciliation gates pass. Only the 1/1 ramp passes every gate; 10/2 narrowly misses checkout step limits.

Next performance work should shorten remaining locked checkout round trips and measure SQL plans/lock duration against representative history, then repeat the benchmark. Pool sizing requires deployment-wide connection demand and database headroom measurements first. Cache remains absent; a future cache would need explicit invalidation/expiry guarantees for paid orders and expiring reservations.

Vercel capacity remains unverified. Repeat from the same runtime/region as deployment with a separate test database, followed by sustained and burst tests, before signing off 50/10. No push, deploy, staging database mutation or paid service purchase was performed.
