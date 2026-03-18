# Implementation Plan: GQL Validation & Fix Pipeline

**Branch**: `feat/graphql-validate-fix-pipeline` | **Date**: 2026-03-18 | **Spec**: [specs/080-gql-pipeline/spec.md](spec.md)
**Input**: Feature specification from `/specs/080-gql-pipeline/spec.md`

## Summary

Build a multi-agent pipeline that validates GraphQL operations from two external repos (test-suites, client-web) against the server schema using both AST analysis and live execution, automatically fixes broken queries via tri-repo PRs, reviews and merges fixes with strict quality gates, and benchmarks query performance against stored baselines. Orchestrated as a Claude Code Agent Team with dependency-chained tasks and quality gate hooks.

## Technical Context

**Language/Version**: Node.js 22 LTS (ES modules), Bash 5.x
**Primary Dependencies**: `graphql` v16.11.0 (schema parsing/validation), `node:fs`/`node:path` (I/O), `gh` CLI (PR management), Kratos API (auth)
**Storage**: File-based JSON results in `.claude/pipeline/` directories
**Testing**: Self-validating — validator output is the test (each query produces a pass/fail JSON). Benchmark comparison is the regression test.
**Target Platform**: Local development environment with running Alkemio server
**Project Type**: Developer tooling / CI automation (no NestJS modules)
**Performance Goals**: AST validation < 30s, live validation < 10 min, benchmark < 10 min
**Constraints**: Must work across three repos (server, test-suites, client-web) with isolated fragment namespaces. Session tokens expire and must be refreshed. No modifications to server source code.
**Scale/Scope**: ~160 operations in test-suites, ~350 in client-web, ~280 fragments total

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Principle 3 – GraphQL Schema as Stable Contract**: Pipeline reinforces schema contract by detecting breakages across consumer repos and automating alignment. ✅
- **Principle 5 – Observability & Operational Readiness**: Structured JSON results, per-query error categories, aggregate summaries, and benchmark reports provide full observability. ✅
- **Principle 6 – Code Quality with Pragmatic Testing**: Pipeline itself serves as a testing tool; no unit tests needed for the scripts (output is self-validating). ✅
- **Principle 10 – Simplicity & Incremental Hardening**: Uses plain Node.js scripts and shell wrappers — no framework dependencies, no build step. ✅
- No constitution violations identified; pipeline does not modify domain logic, modules, or schema. It is a consumer of the schema contract. ✅

## Project Structure

### Documentation (this feature)

```text
specs/080-gql-pipeline/
├── spec.md              # Feature specification
├── plan.md              # This file
└── tasks.md             # Implementation tasks
```

### Source Code (repository root)

```text
.claude/
├── agents/
│   ├── gql-runner.md              # Runner agent definition (haiku model)
│   ├── gql-fixer.md               # Fixer agent definition (sonnet model)
│   └── gql-reviewer.md            # Reviewer agent definition (opus model)
├── commands/
│   ├── gql-pipeline.md            # Pipeline orchestration command
│   └── gql-performance-benchmark.md  # Standalone benchmark command
├── skills/
│   ├── gql-pipeline.md            # Pipeline conventions and schemas
│   ├── gql-performance-benchmark.md  # Benchmark conventions
│   └── validation-loop.md         # Validation loop skill
├── hooks/
│   ├── setup-pipeline.sh          # Pipeline directory initialization
│   ├── on-task-completed.sh       # Quality gates between phases
│   ├── on-teammate-idle.sh        # Idle teammate detection
│   └── on-stop.sh                 # Cleanup on stop
├── pipeline/
│   ├── .env                       # Config (endpoints, credentials, paths)
│   ├── .session-token             # Kratos session token
│   ├── .processed                 # Processed queries tracker
│   ├── results/                   # AST validation results
│   │   ├── test-suites/           # Per-query JSON
│   │   └── client-web/            # Per-query JSON
│   ├── live-results/              # Live execution results
│   │   ├── _summary.json          # Aggregate summary
│   │   ├── test-suites/{phase-1,phase-2,skipped}/
│   │   └── client-web/{phase-1,phase-2,skipped}/
│   ├── benchmarks/
│   │   ├── baseline.json          # Stored performance baseline
│   │   └── report.json            # Latest comparison report
│   ├── fixes/                     # Fix records with PR URLs
│   ├── reviews/                   # Review decision records
│   └── signals/                   # Inter-agent trigger files
└── settings.local.json            # Agent Teams feature flag + permissions

.scripts/gql-validate/
├── validator.mjs                  # AST validation engine
├── live-runner.mjs                # Live execution runner
├── live-validate.sh               # Live execution orchestrator
├── bench-runner.mjs               # Performance benchmark engine
├── bench-validate.sh              # Benchmark entry point
├── gql-runner-lib.mjs             # Shared utilities (discovery, parsing, classification)
├── resolve-fragments.mjs          # Fragment resolution with cycle detection
├── sync-repos.sh                  # Sync test-suites and client-web to latest develop
├── validate-queries.sh            # Full validation entry point (sync + validate)
└── launch-pipeline.sh             # Pipeline launcher script
```

**Structure Decision**: All pipeline code lives in `.claude/` (agent definitions, skills, hooks, pipeline state) and `.scripts/gql-validate/` (execution scripts). No NestJS modules, no `src/` changes. This keeps pipeline tooling cleanly separated from server application code.

## Complexity Tracking

No constitutional exceptions required for this feature.
