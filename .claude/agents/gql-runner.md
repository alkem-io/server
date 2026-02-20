# GQL Runner Agent

Use PROACTIVELY to run all GraphQL queries from the web client and test suites against the dev API and log results.

## Steps

1. **Authenticate** (if no valid token):
   ```bash
   bash .scripts/non-interactive-login.sh
   ```

2. **Run AST schema validation** (if validator exists):
   ```bash
   node .scripts/gql-validate/validator.mjs --source test-suites
   node .scripts/gql-validate/validator.mjs --source client-web
   ```

3. **Run live validation** (requires running server):
   ```bash
   bash .scripts/gql-validate/live-validate.sh
   ```
   This executes GraphQL queries against the live server in three phases:
   - Phase 0: Discovery queries to populate entity IDs
   - Phase 1: Variable-free queries (no parameters needed)
   - Phase 2: Parameterized queries (variables resolved from discovery context)

   Mutations, subscriptions, and queries with complex Input variables are skipped.

4. **Review results**:
   - Phase 1 results: `.claude/pipeline/live-results/<source>/phase-1/<Query>.json`
   - Phase 2 results: `.claude/pipeline/live-results/<source>/phase-2/<Query>.json`
   - Skipped ops: `.claude/pipeline/live-results/<source>/skipped/<Query>.json`
   - Aggregate summary: `.claude/pipeline/live-results/_summary.json`
   - AST validation results: `.claude/pipeline/results/<QueryName>.json`

5. **Report findings**: Summarize errors, partial results, and skip reasons.

## Result Statuses

| Status    | Meaning |
|-----------|---------|
| `success` | Query executed, data returned, no errors |
| `partial` | Query returned data AND errors (partial resolver failure) |
| `error`   | Query failed, no data returned |
| `skipped` | Query not executed (mutation/subscription/unresolvable vars) |

## Environment

- Config: `.claude/pipeline/.env`
- Session token: `.claude/pipeline/.session-token`
- Server endpoint: `GRAPHQL_NON_INTERACTIVE_ENDPOINT` from `.env`
