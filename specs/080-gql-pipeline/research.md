# Research Summary: GQL Validation & Fix Pipeline

- **Decision**: Use Node.js ES modules (`.mjs`) for all validation and benchmark scripts instead of TypeScript.
  - **Rationale**: Scripts run standalone via `node` without a build step. No NestJS DI or TypeORM needed — pure GraphQL schema parsing and HTTP requests. Avoids ts-node/tsconfig complexity for tooling that lives outside the application.
  - **Alternatives considered**: TypeScript with ts-node (adds startup latency and tsconfig coupling); Python scripts (team has no Python in the stack); Bash-only (insufficient for GraphQL AST parsing).

- **Decision**: Use the `graphql` v16.11.0 `validate()` function for AST validation with isolated per-source fragment namespaces.
  - **Rationale**: The `graphql` package is already a project dependency. Fragment isolation is critical because 18 fragment names overlap between test-suites and client-web with different field selections — shared resolution would produce false positives.
  - **Alternatives considered**: Apollo tooling `graphql-inspector` (heavier dependency, less control over fragment scoping); custom field-by-field comparison (reinvents what `graphql.validate()` already does).

- **Decision**: Three-phase live execution (discovery → variable-free → parameterized) with a shared `DiscoveryContext`.
  - **Rationale**: Many queries require entity IDs as variables. Phase 0 runs hand-crafted discovery queries (me, users, organizations, platform, accounts) to populate a context map. Phase 1 runs queries needing no variables. Phase 2 resolves variables from context. This maximizes coverage without hardcoding test data.
  - **Alternatives considered**: Skip parameterized queries entirely (loses ~60% coverage); require a seed data file (brittle, environment-specific); run all queries with empty variables (most would fail with validation errors).

- **Decision**: File-based JSON pipeline state in `.claude/pipeline/` directories instead of a database or message queue.
  - **Rationale**: Pipeline runs locally on a developer machine. File-based state is transparent (readable with `cat`/`jq`), requires no infrastructure, and works naturally with the Claude Code agent model where agents share a filesystem.
  - **Alternatives considered**: SQLite database (overhead for simple key-value state); Redis (requires running service); in-memory only (state lost between agent invocations).

- **Decision**: Tri-repo fix strategy where the fixer determines which repo to fix based on `result.source` and `git log` on `schema.graphql`.
  - **Rationale**: Schema changes are intentional most of the time — the consumer repos (test-suites, client-web) need to be updated, not the server. But occasionally a field is removed by accident (regression), in which case the server schema should be fixed. Checking `git log` distinguishes intentional changes from regressions.
  - **Alternatives considered**: Always fix consumer repos (misses regressions); always fix server (blocks intentional schema evolution); manual triage (defeats automation purpose).

- **Decision**: Performance benchmark uses a baseline-comparison model with dual thresholds (multiplier and absolute delta).
  - **Rationale**: Multiplier alone flags noise on fast queries (10ms → 25ms = 2.5x but irrelevant). Absolute delta alone misses proportional regressions on slow queries. Dual thresholds reduce false positives while catching real regressions.
  - **Alternatives considered**: Fixed threshold only (too many false positives on fast queries); statistical significance testing (requires multiple runs, too complex for local tooling); percentile-based comparison (requires storing multiple baselines).

- **Decision**: Agent model assignment: runner=haiku, fixer=sonnet, reviewer=opus.
  - **Rationale**: The runner does read-only script execution — haiku is sufficient and cost-effective. The fixer needs to diagnose errors and edit code — sonnet balances capability and speed. The reviewer makes high-stakes merge/reject decisions — opus provides the strongest reasoning.
  - **Alternatives considered**: All opus (expensive, slow for runner tasks); all sonnet (reviewer needs stronger judgment for merge decisions); all haiku (insufficient for code editing and review).

- **Decision**: Authenticate via Kratos native API login flow storing the session token to a file.
  - **Rationale**: The server's non-interactive GraphQL endpoint requires a Kratos session token. The native flow (not browser-based) works from scripts. File-based storage lets multiple scripts share the token without re-authenticating.
  - **Alternatives considered**: API key authentication (not supported by the server); OAuth client credentials (Kratos doesn't support this flow for local dev); per-script login (wastes time and creates session sprawl).
