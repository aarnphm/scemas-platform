# database connection failure

postgres becomes unreachable. this cascades into ingestion failures, alerting failures, and API degradation.

## detection symptoms

- rust engine fails to start (panics at pool creation if `DATABASE_URL` is missing or invalid)
- rust engine returns 500 on all ingest/rule/alert operations with `"database error: ..."`
- dashboard tRPC calls fail. health router's `ping` returns `{ ok: false }`
- admin health page shows all zeros for ingestion counters (fallback returns zeros on error)
- `ingestion_counters` row for `telemetry_ingestion` stops updating

## likely causes

1. **postgres container is down**. docker-compose only runs one postgres instance with no auto-restart
2. **`DATABASE_URL` is misconfigured or missing**. config will error: "DATABASE_URL not set"
3. **connection pool exhaustion**. `sqlx::PgPool` has default pool limits. under high ingest load the pool saturates
4. **postgres disk full**. the `pgdata` docker volume fills up (`sensor_readings`, `analytics`, `audit_logs` are the biggest tables)
5. **production: hyperdrive binding misconfigured** or the neon/postgres endpoint is unreachable

## step-by-step mitigation

### 1. check postgres container

```sh
docker-compose ps
docker-compose exec postgres pg_isready -U scemas
```

if the container is down:

```sh
docker-compose up -d postgres
```

wait for the healthcheck to pass before proceeding.

### 2. verify connectivity

```sh
psql "$DATABASE_URL" -c "SELECT 1;"
```

### 3. check disk usage

```sh
docker-compose exec postgres df -h /var/lib/postgresql/data
```

if disk is full, check table sizes:

```sql
SELECT relname, pg_size_pretty(pg_total_relation_size(oid))
FROM pg_class
WHERE relkind = 'r'
ORDER BY pg_total_relation_size(oid) DESC
LIMIT 10;
```

for immediate relief, prune old data:

```sql
DELETE FROM sensor_readings WHERE time < now() - interval '30 days';
DELETE FROM analytics WHERE time < now() - interval '30 days';
DELETE FROM ingestion_failures WHERE status = 'resolved' AND resolved_at < now() - interval '7 days';
```

### 4. check connection pool

```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'scemas';
```

if connections are near the max (default 100), check for leaked connections or increase the pool limit.

### 5. restart rust engine after recovery

the sqlx pool reconnects automatically, but if the pool was created during the outage, a restart ensures clean state:

```sh
# kill and restart
cargo run -p scemas-server
```

### 6. verify recovery

```sh
curl http://localhost:3001/internal/health
```

should return ingestion counter JSON with incrementing values.
