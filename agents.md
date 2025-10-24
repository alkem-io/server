# agents.md (Lean Governance Layer)

## Purpose

Operational handbook translating the enduring principles in the constitution into day‑to‑day collaboration between human contributors and AI assistants. Keeps process lightweight while enabling traceability and consistency.

## Hierarchy (Authoritative Order)

1. Constitution (foundational principles, quality & lifecycle gates)
2. agents.md (this file: operationalization & role boundaries)
3. copilot-instructions (machine / tool execution rules; must not redefine policy)
4. Templates, scripts, automation (mechanical enforcement only)

Conflict rule: When divergence occurs, fix the lowest layer that is incorrect. Only amend the constitution if a genuine principle gap exists.

Canonical header to insert (verbatim) at top of lower layers when edited next:

```
Implements constitution & agents.md. Does not introduce new governance.
```

## Workflow Phases (Abbreviated)

| Phase      | Purpose                        | Required Artifacts (Minimal)                               | Exit Criteria                                                      |
| ---------- | ------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| /spec      | Define WHAT & WHY              | `spec.md` (Problem, Outcomes, Constraints, Open Questions) | All critical open questions either answered or explicitly deferred |
| /plan      | High-level HOW & risk handling | `plan.md` (Phases, Risks & Mitigations, Exit Criteria)     | Risks acknowledged; phases sequenced                               |
| /implement | Build & test                   | Code, tests referencing spec ID                            | Phase exit criteria met; no unresolved blockers                    |
| /stabilize | Hardening & docs               | Added docs / tuning                                        | Performance & quality goals met                                    |
| /done      | Close out & measure            | Outcome evidence                                           | Metrics recorded; lessons captured (optional)                      |

## SDD Scaffolding Reference (Intentionally External)

Detailed spec folder scaffolding (file list, optional artifacts, templates) is defined in `copilot-instructions` and the `.specify/templates/` directory.

This file purposefully does NOT enumerate every optional file (e.g., `tasks.md`, `data-model.md`, `contracts/`, `quickstart.md`, `decisions.md`) to avoid duplication and drift. If scaffolding expectations change, update the templates—not this governance layer. Only the governance classification (below) remains here.

## Change Classification & Path Selection

Choose the lightest responsible path. Escalate when uncertainty, scope, or risk increases.

| Path                       | When to Use                                                                                                                      | Required Artifacts                                                                     | Typical Triggers                                                        | Escalate If                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Full SDD                   | Net‑new capability, external contract change (GraphQL/events), cross-domain, multi-sprint, > ~400 touched LOC, or high ambiguity | `spec.md` then `plan.md` before bulk coding                                            | New aggregate, migration with behavioral risk, security/privacy surface | More than 1 unresolved open question after /spec or unclear exit criteria |
| Agentic Flow (Lightweight) | Medium enhancement/refactor with SOME unknowns; multi-file but no new external contract; ≤ ~400 LOC                              | Inline mini-plan (PR description or `plan.md` stub: Goal, Scope, Risks, Exit Criteria) | Internal API adaptation, moderate logic consolidation                   | New contract emerges, risk widens, logic churn > planned                  |
| Manual Direct Fix          | Trivial, fully understood, ≤ ~40 LOC, no architectural or contract impact                                                        | None (optional PR note)                                                                | Typo, guard clause, log tweak, constant change                          | A second unplanned file edit needed OR hidden side-effect appears         |

### Decision Rationale

Avoids “spec theater” for trivial work while preventing silent architectural drift on impactful changes; keeps cognitive load low and clarifies promotion triggers.

### Fallback Rule

If mid-implementation you discover a qualitatively new domain concept or external dependency assumption—pause, capture it, promote the path, and realign before continuing.

## Conflict & Escalation Process

1. Identify conflict (e.g., tool behavior contradicts agents.md).
2. Determine lowest divergent layer.
3. Submit PR correcting that layer; link any higher-level ambiguity.
4. If ambiguity is in principles → open PR amending constitution (label: `governance`).
5. Record rationale in amend PR description (no separate decisions log required yet).

## Branch & Referencing Conventions (Lean)

- Branch: `feat/NNN-slug` (or `fix/…`, `refactor/…` when non-feature).
- Commits tied to feature MAY append `[NNN]` at end for traceability.
- PR template includes: Spec ID, Phase, Summary, Risk Changes (Yes/No).

## Feature Completion Diff & PR Augmentation (/done Transition)

When a feature transitions to `/done`, augment (or create if not yet opened) the PR description with an authoritative, tool-generated diff summary using the GitHub MCP server. This provides an immutable narrative of what changed relative to the base branch (default: `develop`).

### Purpose

Creates a lightweight, standardized closure artifact without introducing a new file. Ensures reviewers and future maintainers can rapidly understand domain impact, contract changes, and residual risk.

### Trigger

- Phase label (or PR description) updated to `Phase: Done` OR final checklist/exit criteria met.

### Required Actions (Automatable via MCP)

1. Compute compared base: default `develop` (override only if feature branched from a stabilized release branch).
2. List changed files grouped by category: `domain/`, `services/`, `schema`, `migrations`, `platform`, `tests`.
3. Summarize semantic changes:
   - New / modified GraphQL schema elements (types, fields, directives)
   - Added / changed events (name, payload shape deltas)
   - Persistent model changes (new tables, columns, indexes)
4. Extract risk deltas: note any mitigations added/dropped vs original `plan.md`.
5. Map implemented tasks (if tasks list existed) → mark any skipped / deferred.
6. Capture outcome metrics (if measurable yet) or explicitly state: `Metrics pending`.
7. Update PR description section (idempotent replacement guarded by start/end markers).

### PR Description Injection Template

Markers allow safe regeneration.

```
<!-- FEATURE-DIFF:BEGIN -->
### Feature Diff Summary (Spec NNN)
Base Branch: develop

#### File Impact
| Category | Files Changed | Notable Notes |
|----------|---------------|---------------|
| domain   | 3             | e.g. new aggregate `ProfileEngagement` |
| schema   | 1             | added field user.engagementScore |
| tests    | 7             | coverage for new scoring logic |

#### Contract Deltas
GraphQL: +1 type, +1 field, 0 removals
Events: added `profile.engagement.calculated`
Migrations: 1 new table `engagement_metrics`

#### Risk & Mitigations Update
- Removed risk: inaccurate scoring under high load (bench validated p95 < 120ms)
- Remaining risk: backfill job latency (tracked separately)

#### Tasks Coverage
Implemented: 7 / 7 (100%). Deferred: 0. Dropped: 0.

#### Outcomes vs Target
Initial Goal: surface engagement metric in user detail query.
Current Metric Readiness: metrics pending (will be collected after 1 week production exposure).

### Regeneration Rules
- Always fully replace content between markers.
- If no contract changes: include line `No external contract deltas.`
- If tasks absent: omit the Tasks Coverage section entirely.

### AI / MCP Constraints
- Must not invent metrics; if unavailable, state explicitly.
- If diff exceeds practical summary length, collapse file list to counts + top 5 most significant changes with rationale.

### Escalation
If a late diff reveals an untracked external contract change → retroactively create / update spec & plan; do **not** skip—this guards against governance drift.

### Rationale
Keeps closure lightweight (no new files) while ensuring consistent historical trace without bloating repository artifacts.

## Quick Reference Summary

```

constitution > agents.md > copilot-instructions > scripts
Lower layers implement; they never create policy.
Only add artifacts when a recurring pain justifies them.

```

## Change Log

| Date       | Change               | Author      | Notes                      |
| ---------- | -------------------- | ----------- | -------------------------- |
| 2025-10-24 | Initial lean version | (add on PR) | Bootstrap governance layer |

---

End of agents.md
```
