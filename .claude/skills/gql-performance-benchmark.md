# GQL Performance Benchmarking

Benchmark GraphQL query response times against a stored baseline to detect performance regressions.

## Overview

The benchmark runner executes all discoverable GraphQL queries from `test-suites` and `client-web` against the running server, records response times, and compares them against a stored baseline using configurable thresholds.

**Scripts involved:**
- `.scripts/gql-validate/bench-validate.sh` — entry point (auth, server check, report)
- `.scripts/gql-validate/bench-runner.mjs` — benchmark engine (discovery, execution, comparison)

## Prerequisites

### 1. Running Server

The Alkemio server must be running:
```bash
pnpm run start:services  # infrastructure
pnpm start:dev           # server
```

### 2. Session Token

A valid session token must exist at `.claude/pipeline/.session-token`.

```bash
test -f .claude/pipeline/.session-token && echo "OK" || echo "Missing - run /non-interactive-login"
```

If missing or expired, the benchmark script will attempt to re-authenticate using credentials from `.claude/pipeline/.env`.

### 3. Pipeline Config

Ensure `.claude/pipeline/.env` has:
- `PIPELINE_USER` / `PIPELINE_PASSWORD` — service account credentials
- `GRAPHQL_NON_INTERACTIVE_ENDPOINT` — API endpoint
- `TEST_SUITES_GRAPHQL_DIR` / `CLIENT_WEB_GRAPHQL_DIR` — source repo paths

## Running Benchmarks

### Save a baseline

```bash
bash .scripts/gql-validate/bench-validate.sh both --save-baseline
```

Baseline is saved to `.claude/pipeline/benchmarks/baseline.json`. Only successful queries are included. For stable baselines, run on a warm server after a few requests.

### Compare against baseline

```bash
# All sources
bash .scripts/gql-validate/bench-validate.sh both

# Single source
bash .scripts/gql-validate/bench-validate.sh test-suites
bash .scripts/gql-validate/bench-validate.sh client-web
```

### Custom thresholds

```bash
bash .scripts/gql-validate/bench-validate.sh both --threshold-multiplier 3.0 --threshold-absolute 1000
```

Default thresholds: 2x multiplier, 500ms absolute delta.

## Exit Codes

| Code | Meaning |
|------|---------|
| `0`  | All queries within thresholds (or baseline saved) |
| `1`  | Fatal error (auth failure, server unreachable) |
| `2`  | Regressions detected |

## Output Files

| File | Purpose |
|------|---------|
| `.claude/pipeline/benchmarks/baseline.json` | Stored baseline timings (per-query + aggregate stats) |
| `.claude/pipeline/benchmarks/report.json` | Comparison report with regressions and per-query results |

### Baseline schema

```json
{
  "version": 1,
  "saved_at": "ISO timestamp",
  "endpoint": "http://...",
  "queries": {
    "source::QueryName": { "phase": "...", "response_time_ms": 42, "status": "success" }
  },
  "aggregate_stats": {
    "total_queries": 166,
    "avg_ms": 211, "p50_ms": 36, "p90_ms": 167, "p95_ms": 423, "p99_ms": 1602,
    "min_ms": 7, "max_ms": 12805
  }
}
```

### Report schema

```json
{
  "generated_at": "ISO timestamp",
  "endpoint": "http://...",
  "summary": {
    "total": 210, "ok": 143, "regressions": 23, "no_baseline": 0, "errors": 44,
    "threshold_multiplier": 2.0, "threshold_absolute_ms": 500
  },
  "regressions": [
    {
      "key": "client-web::UserAccountLookup",
      "source": "client-web",
      "query_name": "UserAccountLookup",
      "baseline_ms": 12, "current_ms": 3613, "delta_ms": 3601, "ratio": 301.08,
      "reasons": ["301.08x baseline (threshold: 2x)", "+3601ms (threshold: 500ms)"]
    }
  ],
  "queryResults": [ ... ]
}
```

## Regression Severity

When presenting results, group regressions by severity:

- **Critical** (both thresholds exceeded): large absolute spike AND high multiplier
- **Moderate** (absolute threshold only): big delta on already-slow queries
- **Minor** (multiplier only): high ratio but small absolute times — often noise on sub-50ms queries

## Tips

- Save baselines on a **warm** server (after a few requests) for stable numbers
- Run comparison 2-3 times to distinguish real regressions from run-to-run variance
- Queries that timeout (15s) indicate resolver issues worth investigating regardless of baseline
