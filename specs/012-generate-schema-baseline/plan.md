# Implementation Plan: Automated Schema Baseline Generation

**Branch**: `[012-generate-schema-baseline]` | **Date**: 2025-10-29 | **Spec**: [specs/012-generate-schema-baseline/spec.md](spec.md)
**Input**: Feature specification from `/specs/012-generate-schema-baseline/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create a GitHub Actions workflow that runs after every merge to `develop`, regenerates the GraphQL schema snapshot, compares it with the committed `schema-baseline.graphql`, and when differences exist, produces a signed auto-commit back to `develop` plus a reviewable diff summary. The run must fail loudly on generation issues, queue concurrent executions, and notify maintainers when remediation is required.

## Technical Context

**Language/Version**: TypeScript 5.3 (ts-node) executed on Node 20.x via GitHub Actions
**Primary Dependencies**: pnpm 10.17.1, `actions/checkout@v4`, `actions/setup-node@v4`, `crazy-max/ghaction-import-gpg@v6`, `actions/github-script@v7`, repository schema scripts (`generate-schema.snapshot.ts`, `diff-schema.ts`)
**Storage**: N/A – workflow operates on repository working tree only
**Testing**: Workflow self-checks (`diff-schema.ts`, `schema-gate.ts`) plus existing contract tests that consume `schema-baseline.graphql`
**Target Platform**: GitHub Actions `ubuntu-latest` runners
**Project Type**: Backend GraphQL service with CI automation
**Performance Goals**: Complete regeneration, diff, and commit within 10 minutes p95 as per SC-001
**Constraints**: Commit MUST be GPG-signed, only push when diff detected, concurrency guard to prevent overlapping merges, reuse pinned toolchain for determinism
**Scale/Scope**: Handles all merges to `develop` (multiple per day) and baseline file sizes up to several MB without manual intervention

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Principle 3 – GraphQL Schema as Stable Contract**: Baseline regeneration reinforces schema contract discipline and ensures generated artifact stays authoritative. ✅
- **Principle 5 – Observability & Operational Readiness**: Plan includes failing runs with diagnostics, diff summaries, and explicit maintainer notification paths. ✅
- **Principle 9 – Container & Deployment Determinism**: Workflow pins Node and pnpm versions and reuses deterministic schema generator scripts, preserving reproducibility. ✅
- No constitution violations identified; automation does not introduce domain logic or module boundary changes. ✅
- Post-design review (2025-10-29): Constitution gates remain satisfied with CI-only changes. ✅

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
.github/workflows/
├── schema-contract.yml        # existing contract diff checks
└── schema-baseline.yml        # new post-merge baseline regeneration workflow

scripts/schema/
├── generate-schema.snapshot.ts    # existing snapshot generator reused by workflow
├── diff-schema.ts                 # existing diff tooling reused for reporting
└── publish-baseline.ts            # new helper to format diff summary & exit codes

schema-baseline.graphql            # updated artifact committed by automation
```

**Structure Decision**: Feature work lives in CI automation and schema tooling; no new NestJS modules required. Workflow YAML joins existing `.github/workflows` assets, while helper script sits beside other schema utilities under `scripts/schema/` for reuse and clear ownership.

## Complexity Tracking

No constitutional exceptions required for this feature.
