# Data Model: Automated Schema Baseline Generation

## Entities

### SchemaBaselineSnapshot

- **Description**: Authoritative GraphQL SDL stored in `schema-baseline.graphql` after each merge to `develop`.
- **Key Attributes**:
  - `commitSha`: Git commit that introduced the snapshot.
  - `generatedAt`: ISO timestamp captured during workflow run.
  - `schemaHash`: MD5/SHA256 checksum of the SDL for traceability.
  - `sourceBranch`: Expected to be `develop`; retained for auditing.
  - `generatorVersion`: Semantic version (git tag or package.json version) recorded to detect generator drift.
- **Relationships**:
  - Produced by exactly one `BaselineAutomationRun`.
  - Referenced by `BaselineDiffSummary` instances for comparison against previous snapshot.

### BaselineAutomationRun

- **Description**: Metadata about each GitHub Actions execution that regenerates the baseline.
- **Key Attributes**:
  - `runId`: GitHub run identifier.
  - `triggerSha`: Commit SHA that triggered the workflow.
  - `status`: `succeeded` | `noop` | `failed`.
  - `durationMs`: Milliseconds from checkout to completion.
  - `notifications`: Array of delivery attempts (channel, status, timestamp).
  - `concurrencyKey`: Value used to serialize runs (e.g., `schema-baseline-develop`).
- **Relationships**:
  - Generates zero or one `SchemaBaselineSnapshot` depending on diff outcome.
  - Always produces one `BaselineDiffSummary` artifact.

### BaselineDiffSummary

- **Description**: Structured report comparing the regenerated SDL to the previous committed baseline.
- **Key Attributes**:
  - `changeReportPath`: Artifact location for the JSON diff.
  - `humanReadable`: Markdown summary persisted in job summary.
  - `additiveCount`, `breakingCount`, `deprecationCount`: Totals surfaced from `change-report.json`.
  - `initRun`: Boolean flag when no previous baseline existed.
- **Relationships**:
  - Belongs to one `BaselineAutomationRun`.
  - References both the new and prior `SchemaBaselineSnapshot` via commit hashes.

## State Lifecycle

1. `BaselineAutomationRun` starts when GitHub fires a `push` event on `develop`.
2. Run generates a candidate SDL and assembles a `BaselineDiffSummary` by comparing to the existing baseline.
3. If changes exist, a new `SchemaBaselineSnapshot` is committed and the run status becomes `succeeded`; otherwise, it records a `noop`.
4. On failure, status becomes `failed`, no snapshot is produced, and notifications capture escalation details.

## Validation Rules

- `schemaHash` MUST match the checksum of the committed SDL artifact.
- Each `BaselineAutomationRun` MUST capture `triggerSha` and `runId` to enable traceability to workflow logs.
- `BaselineDiffSummary` MUST surface counts that match the `change-report.json` produced by `scripts/schema/diff-schema.ts`.
- Runs MUST produce at most one snapshot; repeated commits in the same run are forbidden.
