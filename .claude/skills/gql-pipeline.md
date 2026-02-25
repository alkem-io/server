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

## Pipeline Directories

All pipeline state lives under `.claude/pipeline/`:

| Directory   | Purpose                              | Written by  | Read by         |
|-------------|--------------------------------------|-------------|-----------------|
| `results/`  | AST validation results (JSON per query) | runner   | fixer           |
| `results/test-suites/` | Results for test-suites operations | runner | fixer |
| `results/client-web/`  | Results for client-web operations  | runner | fixer |
| `live-results/` | Live execution results by phase  | runner      | fixer           |
| `fixes/`    | Fix summaries with PR URLs (JSON)    | fixer       | reviewer        |
| `reviews/`  | Review decisions (JSON)              | reviewer    | fixer (rejects) |
| `signals/`  | Inter-agent trigger files            | hooks       | all             |

### Multi-Source Fragment Isolation

Each source repo gets its **own isolated fragment namespace**. This is critical because 18 fragment names overlap between client-web and test-suites (e.g., `TagsetDetails`, `CalloutDetails`) with **different field selections**. Cross-source fragment resolution would produce false errors.

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

### AST Result Schema (`results/<source>/<QueryName>.json`)

```json
{
  "source": "test-suites",
  "query_name": "GetSpaceData",
  "query_file": "lib/src/scenario/graphql/queries/space/getSpaceData.graphql",
  "status": "error|success",
  "errors": [
    {
      "message": "Cannot query field 'legacyId' on type 'Space'",
      "category": "SCHEMA_MISMATCH",
      "locations": [{"line": 5, "column": 7}]
    }
  ],
  "deprecations": [
    {
      "field": "oldField",
      "reason": "Use newField instead",
      "parentType": "Space"
    }
  ],
  "fragments_used": ["SpaceData", "ProfileData"],
  "timestamp": "2026-02-19T10:30:00Z"
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

## Error Categories

| Category          | Meaning                                     | Fix approach                        |
|-------------------|---------------------------------------------|-------------------------------------|
| SCHEMA_MISMATCH   | Field in query doesn't exist in schema      | Remove or rename field              |
| TYPE_ERROR        | Field type differs from expected            | Update type annotation or transform |
| DEPRECATED        | Query uses deprecated field                 | Replace with successor field        |
| VARIABLE_ERROR    | Missing or wrong variable types             | Fix variable definitions            |
| FRAGMENT_ERROR    | Unknown or unused fragment reference        | Fix fragment spread or definition   |

## Tri-Repo Fix Strategy

The fixer operates across three repositories:

1. **Primary — test-suites** (`alkem-io/test-suites`):
   - Fix when `result.source === "test-suites"` and schema changed intentionally
   - Query/mutation/fragment files in `lib/src/scenario/graphql/`
   - PRs target `develop` branch

2. **Secondary — client-web** (`alkem-io/client-web`):
   - Fix when `result.source === "client-web"` and schema changed intentionally
   - `.graphql` files throughout `src/` (mixed operation+fragment files)
   - PRs target `develop` branch

3. **Tertiary — server** (`alkem-io/server`):
   - Only if the schema itself is wrong (regression, typo, missing field)
   - Fix the resolver/entity, regenerate schema: `pnpm run schema:print && pnpm run schema:sort`
   - PRs target `develop` branch

**Decision logic**: Check `result.source` to identify the repo, then check `git log` on `schema.graphql`. If the field was intentionally removed/renamed in a recent commit, fix the source repo. If it looks like a regression, fix the server.

## Query Discovery

Operations come from two source repos:

**test-suites** (`$TEST_SUITES_DIR`):
- `lib/src/scenario/graphql/queries/` — query files
- `lib/src/scenario/graphql/mutations/` — mutation files
- `lib/src/scenario/graphql/fragments/` — shared fragments

**client-web** (`$CLIENT_WEB_DIR`):
- `src/**/*.graphql` — operations and fragments (mixed files, 43 files contain both)
- Excludes `src/core/apollo/generated/` (codegen output)

The paths are configured in `.claude/pipeline/.env`.

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

## Branch Conventions

- **Runner**: works on current branch (read-only, no commits)
- **Fixer**: creates branches `fix/gql-{QueryName}` from `develop` in the appropriate repo
- **Reviewer**: merges to `develop` via squash merge, deletes branch

## Running Validation Manually

```bash
# Full cycle (sync both repos + validate)
bash .scripts/gql-validate/validate-queries.sh

# Just validation (no sync)
node .scripts/gql-validate/validator.mjs

# Check summary
cat .claude/pipeline/results/_summary.json
```
