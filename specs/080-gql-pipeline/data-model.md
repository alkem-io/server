# Data Model: GQL Validation & Fix Pipeline

## Entities

All entities are file-based JSON documents stored under `.claude/pipeline/`. No database tables are involved.

### ValidationResult

- **Description**: Per-operation AST validation outcome stored in `.claude/pipeline/results/<source>/<QueryName>.json`.
- **Key Attributes**:
  - `source`: Origin repo (`test-suites` | `client-web`).
  - `query_name`: Operation name extracted from the GraphQL document.
  - `query_file`: Relative file path to the `.graphql` source.
  - `status`: Validation outcome (`success` | `error`).
  - `errors[]`: Array of error objects with `message`, `category` (SCHEMA_MISMATCH, TYPE_ERROR, VARIABLE_ERROR, FRAGMENT_ERROR), and `locations`.
  - `deprecations[]`: Array of deprecated field usages with `field`, `reason`, and `parentType`.
  - `fragments_used[]`: Fragment names referenced by the operation.
  - `timestamp`: ISO 8601 generation timestamp.
- **Relationships**:
  - One per GraphQL operation per validation run.
  - Consumed by the gql-fixer agent to determine which queries need fixes.

### LiveExecutionResult

- **Description**: Per-operation runtime execution outcome stored in `.claude/pipeline/live-results/<source>/<phase>/<QueryName>.json`.
- **Key Attributes**:
  - `source`: Origin repo.
  - `query_name`: Operation name.
  - `query_file`: Relative file path.
  - `phase`: Execution phase (`phase1-no-vars` | `phase2-resolvable` | `skipped`).
  - `status`: Execution outcome (`success` | `partial` | `error` | `skipped`).
  - `skip_reason`: Reason for skipping (null if executed).
  - `variables_used`: Variables resolved from discovery context.
  - `http_status`: HTTP response status code.
  - `gql_errors[]`: GraphQL errors returned by the server.
  - `data_keys[]`: Top-level keys in the response data.
  - `response_time_ms`: Round-trip time in milliseconds.
  - `timestamp`: ISO 8601 timestamp.
- **Relationships**:
  - One per executed/skipped operation per validation run.
  - Aggregated into `_summary.json`.

### LiveExecutionSummary

- **Description**: Aggregate statistics stored in `.claude/pipeline/live-results/_summary.json`.
- **Key Attributes**:
  - `sources{}`: Per-source counts (total, executed, success, partial, error, skipped).
  - `aggregate{}`: Combined counts across all sources.
  - `timing{}`: Per-source timing (discovery_ms, phase1_ms, phase2_ms).
  - `timestamp`: ISO 8601 timestamp.
- **Relationships**:
  - Derived from all LiveExecutionResult files in a run.

### FixRecord

- **Description**: Per-query fix metadata stored in `.claude/pipeline/fixes/<QueryName>.json`.
- **Key Attributes**:
  - `query_name`: Name of the fixed operation.
  - `source`: Origin repo of the broken operation.
  - `error_category`: Category of the original error.
  - `fix_repo`: Repository where the fix was applied (`test-suites` | `client-web` | `server`).
  - `branch`: Git branch name (`fix/gql-{QueryName}`).
  - `pr_url`: URL of the opened pull request.
  - `files_changed[]`: List of modified file paths.
  - `description`: Human-readable summary of the fix.
  - `timestamp`: ISO 8601 timestamp.
- **Relationships**:
  - One per fixed query.
  - References a ValidationResult as the trigger.
  - Consumed by the gql-reviewer agent.

### ReviewRecord

- **Description**: Per-PR review decision stored in `.claude/pipeline/reviews/<QueryName>.json`.
- **Key Attributes**:
  - `pr_url`: URL of the reviewed pull request.
  - `source`: Origin repo.
  - `decision`: Review outcome (`merged` | `rejected`).
  - `reason`: Justification for the decision.
  - `feedback`: Detailed feedback (null for merges).
  - `timestamp`: ISO 8601 timestamp.
- **Relationships**:
  - One per reviewed PR.
  - References a FixRecord.

### BenchmarkBaseline

- **Description**: Stored performance baseline in `.claude/pipeline/benchmarks/baseline.json`.
- **Key Attributes**:
  - `version`: Schema version (currently `1`).
  - `saved_at`: ISO 8601 timestamp.
  - `endpoint`: GraphQL endpoint URL.
  - `queries{}`: Map of `source::QueryName` to `{ phase, response_time_ms, status }`.
  - `aggregate_stats{}`: Computed statistics — `total_queries`, `avg_ms`, `p50_ms`, `p90_ms`, `p95_ms`, `p99_ms`, `min_ms`, `max_ms`.
- **Relationships**:
  - One per baseline save.
  - Referenced by BenchmarkReport for comparison.

### BenchmarkReport

- **Description**: Performance comparison report in `.claude/pipeline/benchmarks/report.json`.
- **Key Attributes**:
  - `generated_at`: ISO 8601 timestamp.
  - `endpoint`: GraphQL endpoint URL.
  - `summary{}`: Counts — `total`, `ok`, `regressions`, `no_baseline`, `errors`, `threshold_multiplier`, `threshold_absolute_ms`.
  - `regressions[]`: Array of regression entries with `key`, `source`, `query_name`, `baseline_ms`, `current_ms`, `delta_ms`, `ratio`, `reasons[]`.
  - `queryResults[]`: Full per-query comparison with `bench_status` (OK, REGRESSION, NO_BASELINE, ERROR).
- **Relationships**:
  - References one BenchmarkBaseline.
  - One per benchmark comparison run.

## State Lifecycle

1. **Validation run**: Runner produces ValidationResult and LiveExecutionResult files.
2. **Fix cycle**: Fixer reads error results, creates FixRecord files, appends to `.processed`.
3. **Review cycle**: Reviewer reads FixRecords, creates ReviewRecord files, appends to `.processed`.
4. **Benchmark run**: Benchmark produces or updates BenchmarkBaseline, generates BenchmarkReport.
5. **Cycle restart**: Pipeline orchestrator creates a new runner task; previous cycle's results remain for audit.

## Tracking Files

- `.claude/pipeline/fixes/.processed`: Newline-delimited list of query names that have been processed by the fixer.
- `.claude/pipeline/reviews/.processed`: Newline-delimited list of PR URLs that have been reviewed.
- `.claude/pipeline/.processed`: Global processed queries tracker.
- `.claude/pipeline/fixes/{QueryName}-retry-exhausted`: Marker file indicating max fix attempts reached.

## Validation Rules

- Each ValidationResult MUST have a `source` matching an entry in `.claude/pipeline/.env`.
- Each FixRecord MUST reference an existing ValidationResult with `status: "error"`.
- Each ReviewRecord MUST reference an existing FixRecord with a valid `pr_url`.
- BenchmarkBaseline `version` MUST be `1` (current schema version).
- BenchmarkReport `threshold_multiplier` and `threshold_absolute_ms` MUST be positive numbers.
