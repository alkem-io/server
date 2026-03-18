---
description: Run GraphQL performance benchmarks against the Alkemio API and compare against a stored baseline
arguments:
  - name: mode
    description: "Source to benchmark: test-suites, client-web, or both (default: both)"
    required: false
  - name: options
    description: "Extra flags: --save-baseline, --threshold-multiplier N, --threshold-absolute N"
    required: false
---

Run GraphQL performance benchmarks against the running Alkemio server.

## Prerequisites

1. Server must be running (`pnpm start:dev`)
2. Valid session token at `.claude/pipeline/.session-token` — if missing, run `/non-interactive-login` first

## Execution

Read `.claude/skills/gql-performance-benchmark.md` for full conventions, then run:

```bash
bash .scripts/gql-validate/bench-validate.sh $arguments.mode $arguments.options
```

## Modes

- **First run** (no baseline exists): automatically saves a baseline and exits
- **`--save-baseline`**: explicitly save current timings as the new baseline (overwrites previous)
- **Compare** (default when baseline exists): runs queries and flags regressions

## Interpreting results

- **OK**: query within thresholds
- **REGRESSION**: query exceeded 2x baseline or +500ms absolute delta
- **NO_BASELINE**: new query not in the baseline — will enter baseline on next `--save-baseline`
- **ERROR**: query failed (schema mismatch, auth error, etc.)

Report is saved to `.claude/pipeline/benchmarks/report.json`. Present a summary of regressions to the user, grouping by severity (absolute delta vs multiplier-only).
