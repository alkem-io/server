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

## Roles & Responsibilities

| Role         | Primary Focus                                                  | Key Deliverables                            | Guardrails                                         |
| ------------ | -------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------- |
| Author       | Clarify problem & outcomes                                     | `spec.md`, high-level `plan.md`             | Avoid premature solution detail in /spec phase     |
| Reviewer     | Challenge clarity, scope, risks                                | Review comments, approvals                  | Escalate if outcomes unmeasurable                  |
| AI Assistant | Structural suggestions, ambiguity detection, mechanical checks | Draft scaffolds, highlight missing sections | Must not invent governance or silently relax gates |
| Maintainer   | Steward governance & principles                                | Approvals on amendments                     | Reject scope creep without spec update             |

## Workflow Phases (Abbreviated)

| Phase      | Purpose                        | Required Artifacts (Minimal)                               | Exit Criteria                                                      |
| ---------- | ------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| /spec      | Define WHAT & WHY              | `spec.md` (Problem, Outcomes, Constraints, Open Questions) | All critical open questions either answered or explicitly deferred |
| /plan      | High-level HOW & risk handling | `plan.md` (Phases, Risks & Mitigations, Exit Criteria)     | Risks acknowledged; phases sequenced                               |
| /implement | Build & test                   | Code, tests referencing spec ID                            | Phase exit criteria met; no unresolved blockers                    |
| /stabilize | Hardening & docs               | Added docs / tuning                                        | Performance & quality goals met                                    |
| /done      | Close out & measure            | Outcome evidence                                           | Metrics recorded; lessons captured (optional)                      |

## Minimal Per-Feature Files

Required early:

- `specs/NNN-slug/spec.md`
- `specs/NNN-slug/plan.md` (may start nearly empty—populate before significant coding)
  Optional / add only when needed (pain-driven): `tasks.md`, `data-model.md`, `contracts/`, `quickstart.md`, `decisions.md`.

## Change Classification & Path Selection

Choose the lightest responsible path. Escalate when uncertainty, scope, or risk increases.

| Path                       | When to Use                                                                                                                      | Required Artifacts                                                                     | Typical Triggers                                                        | Escalate If                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Full SDD                   | Net‑new capability, external contract change (GraphQL/events), cross-domain, multi-sprint, > ~400 touched LOC, or high ambiguity | `spec.md` then `plan.md` before bulk coding                                            | New aggregate, migration with behavioral risk, security/privacy surface | More than 1 unresolved open question after /spec or unclear exit criteria |
| Agentic Flow (Lightweight) | Medium enhancement/refactor with SOME unknowns; multi-file but no new external contract; ≤ ~400 LOC                              | Inline mini-plan (PR description or `plan.md` stub: Goal, Scope, Risks, Exit Criteria) | Internal API adaptation, moderate logic consolidation                   | New contract emerges, risk widens, logic churn > planned                  |
| Manual Direct Fix          | Trivial, fully understood, ≤ ~40 LOC, no architectural or contract impact                                                        | None (optional PR note)                                                                | Typo, guard clause, log tweak, constant change                          | A second unplanned file edit needed OR hidden side-effect appears         |

### Escalation Heuristics (Promote one level if ≥2 apply)

- New or deprecated public contract (schema type, event name, REST route)
- Introduces persistence schema changes affecting more than one service or domain
- Requires coordinated rollout (feature flag, data backfill, staged deploy)
- Security / compliance / privacy implication
- Success metric hard to express in one measurable sentence

### Lightweight Agentic Flow Template (Inline)

```
Goal: <single outcome>
Scope: <in / out>
Risks: <top 2>
Exit Criteria: <measurable condition>
Notes: <assumptions / flags>
```

### Decision Rationale

Avoids “spec theater” for trivial work while preventing silent architectural drift on impactful changes; keeps cognitive load low and clarifies promotion triggers.

### Fallback Rule

If mid-implementation you discover a qualitatively new domain concept or external dependency assumption—pause, capture it, promote the path, and realign before continuing.

## AI Assistant Boundaries

Allowed:

- Generate initial folder & file scaffolds.
- Suggest clarifying questions or missing constraints.
- Flag drift between plan and implementation.
- Provide contract diff reminders.

Disallowed:

- Adding detailed implementation design inside `spec.md` pre-/plan.
- Approving its own suggested governance changes.
- Creating new principle-level rules (must propose amendment instead).

## Conflict & Escalation Process

1. Identify conflict (e.g., tool behavior contradicts agents.md).
2. Determine lowest divergent layer.
3. Submit PR correcting that layer; link any higher-level ambiguity.
4. If ambiguity is in principles → open PR amending constitution (label: `governance`).
5. Record rationale in amend PR description (no separate decisions log required yet).

## Amendment Process (Lightweight)

- Open PR with: Context, Proposed Change, Impact, Alternatives.
- Tag maintainers.
- Soft review window: 24h (can merge earlier if unanimous & low risk).
- After merge: propagate wording changes to lower layers.

## Branch & Referencing Conventions (Lean)

- Branch: `feat/NNN-slug` (or `fix/…`, `refactor/…` when non-feature).
- Commits tied to feature MAY append `[NNN]` at end for traceability.
- PR template includes: Spec ID, Phase, Summary, Risk Changes (Yes/No).

## Open Questions (Empty Section Policy)

This section should be present in `spec.md` until cleared. Remove only when answers are captured or deferred consciously in `plan.md`.

## Drift Detection (Manual for Now)

Reviewers ask on PRs: “Is implementation still aligned with `plan.md` phases?” If not → micro update to `plan.md` in same PR.

## Future (Deferred Until Needed)

Introductions intentionally postponed:

- Automated checklist generation
- CI phase gating & schema diff enforcement
- Formal decision log / ADR directory
- Metrics dashboard for spec lifecycle

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
