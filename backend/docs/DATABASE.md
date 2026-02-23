# Database notes (production readiness)

## UTC timestamps

- **MySQL** (`config/database.js`): `timezone: 'Z'` is set so the driver uses UTC. Store and compare times in UTC; convert to local only for display.
- **PostgreSQL**: Use `TIMESTAMP WITH TIME ZONE` (or `timestamptz`); avoid storing local time without timezone.

## Pagination

- **Logs**: `GET /api/logs` supports `limit` (default 50, max 100) and `offset`. Use these to avoid large responses.
- **Inspections / violations**: Use `limit` and `offset` in the query string where implemented.

## Suggested indexes (MySQL)

Add these if you see slow queries (e.g. on large `log_entries` or `driver_locations`):

```sql
-- Logs by driver and time (list logs, daily summary)
CREATE INDEX idx_log_entries_driver_start ON log_entries(driver_id, start_time DESC);
CREATE INDEX idx_log_entries_driver_end ON log_entries(driver_id, end_time);

-- Active log (current status)
CREATE INDEX idx_log_entries_driver_open ON log_entries(driver_id, end_time) WHERE end_time IS NULL;

-- Location history
CREATE INDEX idx_driver_locations_driver_ts ON driver_locations(driver_id, timestamp DESC);
CREATE INDEX idx_location_history_driver_ts ON location_history(driver_id, timestamp DESC);

-- Sessions
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_driver_expires ON sessions(driver_id, expires_at);

-- Violations
CREATE INDEX idx_violations_driver_resolved ON violations(driver_id, is_resolved);
```

(For MySQL, the “WHERE” in the third index is not supported; use a normal index on `(driver_id, end_time)`.)

## N+1 queries

- Auth middleware loads driver + current status in **one** query (subqueries in SELECT). No N+1 there.
- Admin “active drivers” and “live locations” use a single query with JOINs/subqueries. If you add more nested data later, prefer one query with JOINs or a batch load instead of a loop of queries.
