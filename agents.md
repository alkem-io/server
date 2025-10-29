# agents.md v1.0 (Lean Governance Layer)

## Purpose

Operational handbook translating the enduring principles in the **constitution** into day-to-day collaboration between human contributors and AI assistants.
Keeps process lightweight while enabling traceability, consistency, and adaptive governance.

See: [`./.specify/memory/constitution.md`](./.specify/memory/constitution.md)

---

## Operational Summary

- Follow hierarchy: **constitution → agents.md → copilot-instructions → templates/scripts**
- Choose the _lightest responsible path_ (`Manual → Agentic → Full SDD`)
- Tools and AI assistants **implement** policy — they never define it
- Schema baseline automation pushes signed updates to `schema-baseline.graphql` after merges to `develop`; treat workflow failures as blocking until resolved and avoid manual commits unless coordinated with owners.
- Mid-way discoveries of new domains or dependencies → **promote the path** before continuing
- At `/done`, generate a **feature diff summary** via MCP and inject into PR

---

## Hierarchy (Authoritative Order)

1. **Constitution** – Foundational principles, quality & lifecycle gates
2. **agents.md** – Operationalization & role boundaries
3. **copilot-instructions** – Machine / tool execution rules (must not redefine policy)
4. **Templates, scripts, automation** – Mechanical enforcement only

**Conflict rule:** Fix the _lowest incorrect layer._
Amend the constitution only when a true principle gap exists.

**Canonical header to include in lower layers:**

Implements constitution & agents.md. Does not introduce new governance.

---

## Agent Boundaries

| Category         | Allowed                          | Not Allowed                            |
| ---------------- | -------------------------------- | -------------------------------------- |
| Code generation  | Implement scoped plan/spec tasks | Create new specs or change governance  |
| File ops         | Inside repo only                 | Writing outside workspace              |
| External calls   | Via approved MCP tools only      | Raw HTTP to non-approved domains       |
| Governance edits | Draft PRs referencing this file  | Directly modify constitution/agents.md |

---

## Workflow Phases (Abbreviated)

| Phase        | Purpose                        | Minimal Artifacts                          | Exit Criteria                         | Signal                   |
| ------------ | ------------------------------ | ------------------------------------------ | ------------------------------------- | ------------------------ |
| `/spec`      | Define **WHAT & WHY**          | `spec.md` (Problem, Outcomes, Constraints) | Open questions resolved or deferred   | `Phase: Spec` label      |
| `/plan`      | Define **HOW & risk handling** | `plan.md` (Phases, Risks, Exit Criteria)   | Risks acknowledged; sequence approved | `Phase: Plan` label      |
| `/implement` | Build & test                   | Code/tests referencing spec ID             | Phase exit criteria met               | `Phase: Implement` label |
| `/stabilize` | Hardening, docs, tuning        | Added docs, tuning PRs                     | Quality & performance targets met     | `Phase: Stabilize` label |
| `/done`      | Close-out & measure            | PR diff summary, metrics                   | Outcomes verified or pending          | `Phase: Done` label      |

---

## Change Classification & Path Selection

Choose the lightest responsible path; escalate as uncertainty or risk increases.

| Path             | When to Use                                                         | Required Artifacts                                                         | Typical Triggers                                   | Escalate If                                          |
| ---------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------- |
| **Full SDD**     | Net-new capability, external contract, multi-sprint, high ambiguity | `spec.md`, `plan.md` before coding                                         | New aggregate, migration, security/privacy surface | >1 unresolved open question or unclear exit criteria |
| **Agentic Flow** | Medium enhancement or refactor; some unknowns; ≤ ~400 LOC           | Inline mini-plan (PR or `plan.md` stub: Goal, Scope, Risks, Exit Criteria) | Internal API change, logic consolidation           | Contract emerges, risk widens, churn > plan          |
| **Manual Fix**   | Trivial, fully understood, ≤ ~40 LOC, no contract impact            | None (optional PR note)                                                    | Typo, guard clause, constant tweak                 | Second unplanned file edit or hidden side-effect     |

**Decision Rationale:**
Prevents “spec theater” for trivial work while stopping silent architectural drift.

**Fallback Rule:**
If you discover a new domain concept or dependency assumption mid-way, **pause → capture → promote** the path before continuing.

---

## Conflict & Escalation Process

1. Identify conflict (e.g., tool behavior contradicts `agents.md`).
2. Find the **lowest divergent layer.**
3. Submit PR fixing that layer; link any higher-level ambiguity.
4. If ambiguity touches principles → PR to amend constitution (`label: governance-change`).
5. Record rationale in PR description (no separate decisions log required).

---

## Branch & Referencing Conventions

- **Branch:** `feat/NNN-slug` (or `fix/…`, `refactor/…` when non-feature)
- **Commits:** append `[NNN]` for traceability if linked to a spec/plan/task ID
- **PR template includes:** Spec ID, Phase, Summary, Risk Changes (Yes/No)

---

## Feature Closure Automation (via MCP Diff)

When a feature transitions to `/done`, the PR must include an authoritative **feature diff summary**, generated via the GitHub MCP server.

### Purpose

Creates a standardized closure artifact — lightweight, no new file — providing reviewers a narrative of what changed and residual risks.

### Trigger

Phase label → `Phase: Done` OR checklist exit criteria met.

### Required Actions (automatable via MCP)

1. Compare base branch (default: `develop`, override if branched from release).
2. Group changed files by category: `domain/`, `services/`, `schema`, `migrations`, `tests`.
3. Summarize semantic changes: new GraphQL types, events, model fields, migrations.
4. Note any risk mitigations added/dropped from `plan.md`.
5. Map implemented tasks (if list existed); mark skipped/deferred.
6. If measurable, record outcome metrics; else write `Metrics pending.`
7. Replace PR description section between markers:

<!-- FEATURE-DIFF:BEGIN -->

Feature Diff Summary (Spec NNN)

Base: develop

File Impact
Category Files Notes
domain 3 Added aggregate ProfileEngagement
schema 1 Added user.engagementScore
tests 7 Coverage for scoring logic
Contract Deltas

GraphQL: +1 type, +1 field, 0 removals
Events: +profile.engagement.calculated
Migrations: 1 new table engagement_metrics

Risk & Mitigations

✅ Mitigated: inaccurate scoring (p95 <120 ms)

⚠️ Remaining: backfill latency (tracked separately)

Outcomes vs Target

Goal: expose engagement metric in query
Metric readiness: pending

<!-- FEATURE-DIFF:END -->

**AI/MCP Constraints**

- Don’t invent metrics; if missing, mark explicitly.
- For large diffs, collapse file list and show top 5 changes.
- If an untracked external contract change appears, create/update spec + plan retroactively.

---

## Quick Reference Summary

constitution > agents.md > copilot-instructions > templates/scripts
Lower layers implement, never create, governance.
Add new artifacts only when recurring pain justifies them.

---

## Change Control

| Date       | Change               | Author      | Notes                      |
| ---------- | -------------------- | ----------- | -------------------------- |
| 2025-10-24 | Initial lean version | (add on PR) | Bootstrap governance layer |

**PRs touching this file or the constitution must carry label:** `governance-change`

---

## Maintenance Checklist

- [ ] Canonical header present in lower layers
- [ ] `copilot-instructions` aligns with this version
- [ ] Templates reflect current spec scaffolding
- [ ] MCP diff injection works and markers validated
- [ ] File < 1100 words; links resolve

---

✅ **End of agents.md**
