# GQL Validation Pipeline

The GQL pipeline validates GraphQL operations from `test-suites` and `client-web` against the Alkemio server schema.

## Pipeline Components

### AST Schema Validation (offline)
Validates operations against the schema without a running server. Catches field mismatches, type errors, and deprecations.

```bash
node .scripts/gql-validate/validator.mjs --source test-suites
node .scripts/gql-validate/validator.mjs --source client-web
```

Results: `.claude/pipeline/results/<QueryName>.json`

### Live Execution Validation (requires running server)
Executes queries against the live server to catch runtime errors: resolver crashes, auth failures, missing dependencies.

```bash
# Run both sources
bash .scripts/gql-validate/live-validate.sh

# Run a single source
bash .scripts/gql-validate/live-validate.sh test-suites
bash .scripts/gql-validate/live-validate.sh client-web
```

Results are organized by phase:
- `.claude/pipeline/live-results/<source>/phase-1/<Query>.json` — variable-free queries
- `.claude/pipeline/live-results/<source>/phase-2/<Query>.json` — parameterized queries
- `.claude/pipeline/live-results/<source>/skipped/<Query>.json` — mutations, subscriptions, unresolvable vars

Summary: `.claude/pipeline/live-results/_summary.json`

## Live Results Schema

### Per-operation (`live-results/<source>/<phase>/<QueryName>.json`)

```json
{
  "source": "client-web",
  "query_name": "SpaceCollaborationId",
  "query_file": "src/domain/spaceAdmin/.../SpaceCollaborationId.graphql",
  "phase": "phase1-no-vars|phase2-resolvable|skipped",
  "status": "success|partial|error|skipped",
  "skip_reason": null,
  "variables_used": { "spaceId": "7b8c..." },
  "http_status": 200,
  "gql_errors": [],
  "data_keys": ["lookup"],
  "response_time_ms": 45,
  "timestamp": "2026-02-19T..."
}
```

### Summary (`live-results/_summary.json`)

```json
{
  "sources": {
    "test-suites": { "total": 159, "executed": 52, "success": 50, ... },
    "client-web":  { "total": 340, "executed": 98, "success": 95, ... }
  },
  "aggregate": { "total": 499, "executed": 150, "success": 145, "error": 5, "skipped": 349 },
  "timing": { "test-suites": { "discovery_ms": 800, ... }, "client-web": { ... } },
  "timestamp": "..."
}
```

## Prerequisites

1. Server running: `pnpm start:dev` (or `pnpm start`)
2. Auth credentials configured in `.claude/pipeline/.env`
3. Authenticate: `bash .scripts/non-interactive-login.sh`

## Directory Layout

```
.claude/pipeline/
  .env                          # Config (endpoints, credentials, paths)
  .session-token                # Kratos session token
  results/                      # AST validation results
  live-results/
    _summary.json               # Aggregate summary
    test-suites/
      phase-1/<Query>.json      # Variable-free query results
      phase-2/<Query>.json      # Parameterized query results
      skipped/<Query>.json      # Skipped operations
    client-web/
      phase-1/<Query>.json
      phase-2/<Query>.json
      skipped/<Query>.json
  fixes/                        # Auto-generated fix PRs
  reviews/                      # Review artifacts
  signals/                      # Pipeline signals
```
