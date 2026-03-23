# Quickstart: GQL Validation & Fix Pipeline

Follow these steps to set up and run the pipeline locally.

## 1. Install prerequisites

- Node.js 22 LTS (Volta pin: 22.21.1)
- pnpm 10.17.1 (`corepack enable && corepack prepare pnpm@10.17.1 --activate`)
- `gh` CLI (authenticated with `gh auth login`)
- `jq` (optional, for pretty-printing benchmark reports)
- Docker + Compose (for server dependencies)

## 2. Clone sibling repos

The pipeline validates operations from two external repos. They must be cloned alongside the server:

```bash
# From the parent directory of the server repo
git clone https://github.com/alkem-io/test-suites.git
git clone https://github.com/alkem-io/client-web.git
```

Verify paths match `.claude/pipeline/.env`:
```bash
cat .claude/pipeline/.env | grep DIR
# TEST_SUITES_DIR should point to your test-suites clone
# CLIENT_WEB_DIR should point to your client-web clone
```

## 3. Start server and dependencies

```bash
pnpm install
pnpm run start:services   # PostgreSQL, RabbitMQ, Redis, Kratos, Elasticsearch
pnpm run migration:run    # Apply database migrations
pnpm start:dev            # Start the server with hot reload
```

Verify the server is running:
```bash
curl -sf http://localhost:3000/api/private/non-interactive/graphql \
  -X POST -H 'Content-Type: application/json' \
  -d '{"query":"{ __typename }"}' && echo " OK"
```

## 4. Initialize pipeline directories

```bash
bash .claude/hooks/setup-pipeline.sh
```

This creates the directory structure under `.claude/pipeline/` (results, live-results, fixes, reviews, benchmarks, signals).

## 5. Authenticate

```bash
bash .scripts/non-interactive-login.sh
```

This logs in via Kratos and stores the session token at `.claude/pipeline/.session-token`. The token is used by all validation and benchmark scripts.

Verify:
```bash
test -f .claude/pipeline/.session-token && echo "Token OK" || echo "Token missing"
```

## 6. Run AST validation

```bash
# Validate both sources
bash .scripts/gql-validate/validate-queries.sh

# Or validate individually
node .scripts/gql-validate/validator.mjs --source test-suites
node .scripts/gql-validate/validator.mjs --source client-web
```

Results appear in `.claude/pipeline/results/<source>/<QueryName>.json`. Check for errors:
```bash
grep -rl '"status": "error"' .claude/pipeline/results/ | wc -l
```

## 7. Run live validation

```bash
bash .scripts/gql-validate/live-validate.sh
```

Results appear in `.claude/pipeline/live-results/` organized by source and phase. Summary:
```bash
cat .claude/pipeline/live-results/_summary.json | jq .aggregate
```

## 8. Run performance benchmark

```bash
# Save a baseline (first run)
bash .scripts/gql-validate/bench-validate.sh both --save-baseline

# Compare against baseline (subsequent runs)
bash .scripts/gql-validate/bench-validate.sh both
```

Baseline: `.claude/pipeline/benchmarks/baseline.json`
Report: `.claude/pipeline/benchmarks/report.json`

## 9. Run the full pipeline (Agent Team)

From Claude Code, use the slash command:
```
/gql-pipeline
```

This launches the three-agent team (runner → fixer → reviewer) with dependency ordering and quality gates.

## 10. Run individual commands

```bash
# Standalone benchmark
/gql-performance-benchmark

# Single GraphQL query
/gql query { me { user { id } } }

# Re-authenticate if token expired
/non-interactive-login
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Server not reachable" | Run `pnpm start:dev` and wait for startup |
| "No session token found" | Run `bash .scripts/non-interactive-login.sh` |
| "401 Unauthorized" | Token expired — re-run `/non-interactive-login` |
| "GraphQL dir not found" | Check `TEST_SUITES_DIR` / `CLIENT_WEB_DIR` in `.claude/pipeline/.env` |
| Stale results | Delete `.claude/pipeline/results/` contents and re-run |
| Benchmark "NO_BASELINE" | Run with `--save-baseline` first |
